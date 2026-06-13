// Provider-neutral contract for the "Importa lettera di dimissione" extraction flow.
//
// The route and UI depend ONLY on these types, never on a concrete provider.
// Swapping model/provider (REQ-013 acceptance) must not require route/UI changes.

/** A single document/photo handed to the model. */
export interface ExtractionFile {
  /** Stable id within the job (used for provenance). */
  id: string;
  /** Original filename (sanitized upstream). */
  filename: string;
  /** Real, sniffed MIME type. */
  mimeType: string;
  /** Raw bytes of the file. */
  data: Buffer;
}

export interface ExtractionRequest {
  jobId: string;
  files: ExtractionFile[];
  /** JSON extraction schema (loaded from AI_EXTRACTION_SCHEMA_PATH). */
  schema: unknown;
  /** Italian extraction prompt (loaded from AI_EXTRACTION_PROMPT_PATH). */
  prompt: string;
}

export interface ExtractionWarning {
  code: string;
  message: string;
}

export interface ExtractionResult {
  jobId: string;
  /** Model actually used (e.g. gemma-4-31b-it). */
  model: string;
  schemaVersion: string;
  promptVersion: string;
  /** Validated extraction payload conforming to the ClinicOS schema. */
  data: unknown;
  warnings: ExtractionWarning[];
  /** True when output passed schema validation (REQ-015 wires AJV/Zod). */
  valid: boolean;
}

/** Distinguishes provider/transport errors from schema/validation errors (REQ-015). */
export type AiErrorKind =
  | 'config'
  | 'provider_unavailable'
  | 'timeout'
  | 'provider_error'
  | 'schema_validation'
  | 'capability';

export class AiExtractionError extends Error {
  kind: AiErrorKind;
  constructor(kind: AiErrorKind, message: string) {
    super(message);
    this.name = 'AiExtractionError';
    this.kind = kind;
  }
}

/** What a model says it can handle. Used to avoid assuming schema/image support. */
export interface ProviderCapabilities {
  images: boolean;
  documents: boolean;
  structuredOutput: boolean;
}

export interface AiExtractionProvider {
  readonly name: string;
  readonly model: string;
  /** Probe capabilities without sending clinical data. */
  capabilities(): Promise<ProviderCapabilities>;
  /** Run extraction. Implementations apply timeout + retry internally. */
  extract(request: ExtractionRequest): Promise<ExtractionResult>;
}
