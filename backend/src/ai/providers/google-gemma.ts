// GoogleGemmaExtractionProvider (REQ-013).
//
// Uses the Google GenAI SDK (@google/genai), loaded lazily so the backend builds
// and runs without the package when the AI flow is unused (mock path). Applies
// timeout + bounded retry. Never logs the API key or full document content.

import { EXTRACTION_PROMPT_VERSION, EXTRACTION_SCHEMA_VERSION } from '../version.js';
import { truncateForLog } from '../redact.js';
import {
  AiExtractionError,
  type AiExtractionProvider,
  type ExtractionRequest,
  type ExtractionResult,
  type ProviderCapabilities,
} from '../types.js';

interface GoogleGemmaOptions {
  apiKey: string;
  model: string;
  timeoutMs: number;
  maxRetries: number;
}

// Gemma instruction-tuned models do not accept a response JSON schema; we ask for
// strict JSON in the prompt and validate server-side (REQ-015). Larger Gemini
// models advertise structured output — keep this conservative and model-driven.
function inferStructuredOutput(model: string): boolean {
  return !/gemma/i.test(model);
}

export class GoogleGemmaExtractionProvider implements AiExtractionProvider {
  readonly name = 'google';
  readonly model: string;
  private readonly opts: GoogleGemmaOptions;

  constructor(opts: GoogleGemmaOptions) {
    this.opts = opts;
    this.model = opts.model;
  }

  async capabilities(): Promise<ProviderCapabilities> {
    return {
      images: true,
      documents: true,
      structuredOutput: inferStructuredOutput(this.model),
    };
  }

  private async client(): Promise<any> {
    let mod: any;
    try {
      mod = await import('@google/genai');
    } catch {
      throw new AiExtractionError(
        'provider_unavailable',
        'SDK @google/genai non installato nel backend',
      );
    }
    const GoogleGenAI = mod.GoogleGenAI ?? mod.default?.GoogleGenAI;
    if (!GoogleGenAI) {
      throw new AiExtractionError('provider_unavailable', 'GoogleGenAI non disponibile nel modulo SDK');
    }
    return new GoogleGenAI({ apiKey: this.opts.apiKey });
  }

  private buildContents(request: ExtractionRequest) {
    const parts: any[] = [
      { text: request.prompt },
      { text: `SCHEMA:\n${JSON.stringify(request.schema)}` },
    ];
    for (const file of request.files) {
      parts.push({
        inlineData: { mimeType: file.mimeType, data: file.data.toString('base64') },
      });
    }
    return [{ role: 'user', parts }];
  }

  private async callOnce(request: ExtractionRequest): Promise<string> {
    const ai = await this.client();
    const contents = this.buildContents(request);

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new AiExtractionError('timeout', `Timeout dopo ${this.opts.timeoutMs}ms`)),
        this.opts.timeoutMs,
      );
    });

    const call = ai.models.generateContent({ model: this.model, contents });
    const res: any = await Promise.race([call, timeout]);
    const text: string | undefined = res?.text ?? res?.response?.text?.();
    if (!text) {
      throw new AiExtractionError('provider_error', 'Risposta vuota dal modello');
    }
    return text;
  }

  async extract(request: ExtractionRequest): Promise<ExtractionResult> {
    const warnings: ExtractionResult['warnings'] = [];
    let lastErr: unknown;

    for (let attempt = 0; attempt <= this.opts.maxRetries; attempt++) {
      try {
        const raw = await this.callOnce(request);
        let data: unknown;
        let valid = false;
        try {
          // Models may wrap JSON in code fences; strip a leading/trailing fence.
          const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
          data = JSON.parse(cleaned);
          valid = true; // full schema validation is REQ-015
        } catch {
          warnings.push({ code: 'invalid_json', message: 'Output non JSON; validazione schema in REQ-015' });
          data = null;
        }
        return {
          jobId: request.jobId,
          model: this.model,
          schemaVersion: EXTRACTION_SCHEMA_VERSION,
          promptVersion: EXTRACTION_PROMPT_VERSION,
          data,
          warnings,
          valid,
        };
      } catch (err) {
        lastErr = err;
        if (err instanceof AiExtractionError && err.kind === 'provider_unavailable') throw err;
        // brief log without secrets / content
        console.warn(
          `[ai] extract attempt ${attempt + 1}/${this.opts.maxRetries + 1} failed: ` +
            truncateForLog(err instanceof Error ? err.message : String(err)),
        );
      }
    }
    if (lastErr instanceof AiExtractionError) throw lastErr;
    throw new AiExtractionError('provider_error', 'Estrazione fallita dopo i retry');
  }
}
