// GeminiAgentProvider (REQ-021): real ExtractionAgent loop via Gemini function
// calling. The model reads the documents, calls real tools (find existing patient,
// read their cartella), and submits a proposal targeting a new or existing patient.
// Requires a function-calling-capable model (gemini-*); Gemma does not support tools.
// Never logs the API key or full document content.

import { truncateForLog } from '../redact.js';
import { findExistingPatient, getPatientCartella } from './tools.js';
import {
  AiExtractionError,
} from '../types.js';
import type {
  AgentExtractionProvider, AgentExtractionRequest, AgentResult, AgentProposalInput,
} from './types.js';

interface Opts { apiKey: string; model: string; timeoutMs: number; maxIterations: number }

const TOOL_DECLS = [
  {
    name: 'find_existing_patient',
    description: 'Cerca un paziente già esistente per nome, cognome, data di nascita (AAAA-MM-GG) e/o codice fiscale. Usa SEMPRE prima di proporre, per evitare duplicati.',
    parameters: {
      type: 'object',
      properties: {
        firstName: { type: 'string' }, lastName: { type: 'string' },
        dateOfBirth: { type: 'string' }, codiceFiscale: { type: 'string' },
      },
    },
  },
  {
    name: 'get_patient_cartella',
    description: 'Legge la cartella clinica di un paziente esistente (per non sovrascrivere dati e proporre un aggiornamento sensato).',
    parameters: { type: 'object', properties: { patientId: { type: 'string' } }, required: ['patientId'] },
  },
  {
    name: 'submit_proposal',
    description: 'Invia la proposta finale per la revisione umana. mode="new" crea un paziente, mode="existing" aggiorna quello indicato da patientId. Non inventare dati: lascia vuoto ciò che non è nei documenti.',
    parameters: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['new', 'existing'] },
        patientId: { type: 'string' },
        reason: { type: 'string' },
        patient: { type: 'object' },
        clinical: { type: 'object' },
        conflicts: { type: 'array', items: { type: 'object' } },
      },
      required: ['mode', 'patient'],
    },
  },
];

export class GeminiAgentProvider implements AgentExtractionProvider {
  readonly name = 'gemini-agent';
  readonly model: string;
  private readonly opts: Opts;

  constructor(opts: Opts) {
    this.opts = opts;
    this.model = opts.model;
  }

  private async client(): Promise<any> {
    let mod: any;
    try { mod = await import('@google/genai'); }
    catch { throw new AiExtractionError('provider_unavailable', 'SDK @google/genai non installato'); }
    const GoogleGenAI = mod.GoogleGenAI ?? mod.default?.GoogleGenAI;
    if (!GoogleGenAI) throw new AiExtractionError('provider_unavailable', 'GoogleGenAI non disponibile');
    return new GoogleGenAI({ apiKey: this.opts.apiKey });
  }

  private async dispatch(name: string, args: any): Promise<unknown> {
    if (name === 'find_existing_patient') return findExistingPatient(args ?? {});
    if (name === 'get_patient_cartella') return getPatientCartella(String(args?.patientId ?? ''));
    return { error: `tool sconosciuto: ${name}` };
  }

  async run(request: AgentExtractionRequest): Promise<AgentResult> {
    const ai = await this.client();
    const toolTrace: string[] = [];

    const firstParts: any[] = [
      { text: request.prompt },
      { text: `SCHEMA ClinicOS (compila i valori, non inventare):\n${JSON.stringify(request.schema)}` },
      { text: 'Procedura: leggi i documenti, estrai i dati; chiama find_existing_patient; se esiste, get_patient_cartella; infine submit_proposal (mode new|existing). Segnala i conflitti tra documenti.' },
    ];
    for (const f of request.files) {
      firstParts.push({ inlineData: { mimeType: f.mimeType, data: f.data.toString('base64') } });
    }

    const chat = ai.chats.create({ model: this.model, config: { tools: [{ functionDeclarations: TOOL_DECLS }] } });

    const deadline = Date.now() + this.opts.timeoutMs;
    let message: any = firstParts;
    let submitted: AgentProposalInput | null = null;

    for (let i = 0; i < this.opts.maxIterations && !submitted; i++) {
      if (Date.now() > deadline) throw new AiExtractionError('timeout', `Agent timeout dopo ${this.opts.timeoutMs}ms`);
      let resp: any;
      try {
        resp = await chat.sendMessage({ message });
      } catch (err) {
        throw new AiExtractionError('provider_error', `Agente: ${truncateForLog(err instanceof Error ? err.message : String(err), 200)}`);
      }
      const calls: any[] = resp.functionCalls ?? resp.response?.functionCalls ?? [];
      if (!calls.length) {
        // Model answered without a tool call — nudge it once to submit.
        message = [{ text: 'Chiama submit_proposal con la proposta finale.' }];
        continue;
      }
      const fnResponses: any[] = [];
      for (const c of calls) {
        toolTrace.push(c.name);
        if (c.name === 'submit_proposal') {
          submitted = c.args as AgentProposalInput;
          fnResponses.push({ functionResponse: { name: c.name, response: { ok: true } } });
        } else {
          const result = await this.dispatch(c.name, c.args);
          fnResponses.push({ functionResponse: { name: c.name, response: { result } } });
        }
      }
      message = fnResponses;
    }

    if (!submitted) throw new AiExtractionError('provider_error', 'Agente non ha prodotto una proposta (submit_proposal mancante)');
    return { model: this.model, input: submitted, toolTrace };
  }
}
