// Server-side AI configuration for the discharge-letter import flow (REQ-013).
//
// All secrets and provider selection live here, backend-only. Nothing in this
// module is ever exposed to the frontend bundle or to logs.

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXTRACTION_PROMPT_VERSION, EXTRACTION_SCHEMA_VERSION } from './version.js';

// backend/{dist|src}/ai -> backend root -> ai-assets. Works in dev (tsx) and prod (node dist).
const HERE = dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = resolve(HERE, '..', '..');
const DEFAULT_ASSET_DIR = resolve(BACKEND_ROOT, 'ai-assets');
const DEFAULT_SCHEMA_PATH = resolve(DEFAULT_ASSET_DIR, 'clinicos-extraction.it.json');
const DEFAULT_PROMPT_PATH = resolve(DEFAULT_ASSET_DIR, 'extraction-prompt.it.txt');
const DEFAULT_OUTPUT_SCHEMA_PATH = resolve(DEFAULT_ASSET_DIR, 'clinicos-extraction.schema.json');

export type AiProvider = 'google' | 'mock';

export interface AiConfig {
  provider: AiProvider;
  model: string;
  /** Optional separate model for structured output (REQ-015 fallback). */
  structuredModel?: string;
  /** Function-calling model for the ExtractionAgent loop (REQ-021). */
  agentModel: string;
  /** Async worker (REQ-022): per-request model timeout, overall job cap, poll interval. */
  requestTimeoutMs: number;
  jobMaxDurationMs: number;
  jobPollIntervalMs: number;
  schemaPath: string;
  promptPath: string;
  /** JSON Schema used to validate extraction OUTPUT (REQ-015). */
  outputSchemaPath: string;
  timeoutMs: number;
  maxRetries: number;
  maxFiles: number;
  maxTotalMb: number;
  /** Temp storage dir for uploaded import files (REQ-014). */
  uploadDir: string;
  /** Minutes before an import job + its files expire and are swept (REQ-014/019). */
  jobRetentionMin: number;
  /** Order conflict candidates most-recent-first on merge (still never auto-resolves) (REQ-016). */
  mergePreferRecent: boolean;
  /** True only when the provider has everything it needs to run (e.g. API key present). */
  available: boolean;
  /** Human-readable reasons the service is unavailable (no secrets). */
  errors: string[];
  /** Present only in-process; never serialized to clients or logs. */
  apiKey?: string;
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw.trim() === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

let cached: AiConfig | null = null;

/** Load + validate AI config. Never throws on missing secrets — reports via `available`/`errors`. */
export function loadAiConfig(force = false): AiConfig {
  if (cached && !force) return cached;

  const provider = (process.env.AI_PROVIDER ?? 'google').trim().toLowerCase() as AiProvider;
  const model = (process.env.AI_MODEL ?? 'gemma-4-31b-it').trim();
  const structuredModel = process.env.AI_STRUCTURED_MODEL?.trim() || undefined;
  const agentModel = process.env.AI_AGENT_MODEL?.trim() || 'gemini-2.0-flash';
  const schemaPath = process.env.AI_EXTRACTION_SCHEMA_PATH?.trim() || DEFAULT_SCHEMA_PATH;
  const promptPath = process.env.AI_EXTRACTION_PROMPT_PATH?.trim() || DEFAULT_PROMPT_PATH;
  const outputSchemaPath = process.env.AI_EXTRACTION_OUTPUT_SCHEMA_PATH?.trim() || DEFAULT_OUTPUT_SCHEMA_PATH;
  const apiKey = process.env.GEMINI_API_KEY?.trim() || undefined;

  const errors: string[] = [];

  if (provider !== 'google' && provider !== 'mock') {
    errors.push(`AI_PROVIDER non supportato: "${provider}" (ammessi: google, mock)`);
  }
  if (!model) errors.push('AI_MODEL mancante');

  // Assets must be present and readable (versioned in repo, no secrets).
  try {
    readFileSync(schemaPath, 'utf8');
  } catch {
    errors.push(`Schema di estrazione non leggibile: ${schemaPath}`);
  }
  try {
    readFileSync(promptPath, 'utf8');
  } catch {
    errors.push(`Prompt di estrazione non leggibile: ${promptPath}`);
  }
  try {
    JSON.parse(readFileSync(outputSchemaPath, 'utf8'));
  } catch {
    errors.push(`Schema di validazione output non leggibile: ${outputSchemaPath}`);
  }

  // Secret only required for the real google provider.
  if (provider === 'google' && !apiKey) {
    errors.push('GEMINI_API_KEY mancante: servizio AI non disponibile');
  }

  cached = {
    provider: provider === 'mock' ? 'mock' : 'google',
    model,
    structuredModel,
    agentModel,
    schemaPath,
    promptPath,
    outputSchemaPath,
    timeoutMs: intEnv('AI_TIMEOUT_MS', 60_000),
    maxRetries: intEnv('AI_MAX_RETRIES', 2),
    maxFiles: intEnv('AI_MAX_FILES', 10),
    maxTotalMb: intEnv('AI_MAX_TOTAL_MB', 25),
    uploadDir: process.env.AI_UPLOAD_DIR?.trim() || resolve(tmpdir(), 'clinicos-imports'),
    jobRetentionMin: intEnv('AI_JOB_RETENTION_MIN', 60),
    mergePreferRecent: (process.env.AI_MERGE_PREFER_RECENT ?? 'true').trim().toLowerCase() !== 'false',
    requestTimeoutMs: intEnv('AI_REQUEST_TIMEOUT_MS', 300_000),
    jobMaxDurationMs: intEnv('AI_JOB_MAX_DURATION_MS', 900_000),
    jobPollIntervalMs: intEnv('AI_JOB_POLL_INTERVAL_MS', 2_000),
    available: errors.length === 0,
    errors,
    apiKey,
  };
  return cached;
}

/** Load the JSON Schema used to validate extraction output (REQ-015). */
export function loadOutputSchema(cfg = loadAiConfig()): object {
  return JSON.parse(readFileSync(cfg.outputSchemaPath, 'utf8'));
}

/** Load the versioned extraction schema asset. */
export function loadExtractionSchema(cfg = loadAiConfig()): unknown {
  return JSON.parse(readFileSync(cfg.schemaPath, 'utf8'));
}

/** Load the versioned Italian extraction prompt asset. */
export function loadExtractionPrompt(cfg = loadAiConfig()): string {
  return readFileSync(cfg.promptPath, 'utf8');
}

/**
 * Convert the verbose canonical schema into a MODEL-FRIENDLY shape (REQ-015 tuning).
 * The model was OMITTING list fields because `{_template, valori:[]}` is not a clear
 * output instruction. We render each list as an example array `[{...fields}]` so the
 * model sees the array-of-objects shape and fills one item per finding. Leaves and
 * nested groups (with their Italian descriptions) are kept — they already work.
 * The canonical schema asset is untouched.
 */
export function buildModelSchema(schema: unknown): unknown {
  const stripUnderscore = (o: Record<string, unknown>): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(o)) if (!k.startsWith('_')) out[k] = walk(o[k]);
    return out;
  };
  const walk = (node: unknown): unknown => {
    if (node == null || typeof node !== 'object') return node;
    if (Array.isArray(node)) return node.map(walk);
    const obj = node as Record<string, unknown>;
    // list field: { _template, valori } -> [ <one example item> ] keeping the field
    // { valore, descrizione } shape (flattening item fields to option-hint strings made
    // the model emit an empty cartella — keep the descriptions that drive accuracy).
    if ('_template' in obj) return [stripUnderscore(obj._template as Record<string, unknown>)];
    // leaf field: { valore, descrizione } -> keep (model flattens to the value itself)
    if ('valore' in obj) return obj;
    // group / root: recurse, dropping underscore meta keys
    return stripUnderscore(obj);
  };
  return walk(schema);
}

/** Public, secret-free view of the config for the status endpoint and logs. */
export interface AiPublicStatus {
  available: boolean;
  provider: AiProvider;
  model: string;
  structuredModel?: string;
  schemaVersion: string;
  promptVersion: string;
  limits: { maxFiles: number; maxTotalMb: number; timeoutMs: number; maxRetries: number };
  errors: string[];
}

export function publicStatus(cfg = loadAiConfig()): AiPublicStatus {
  return {
    available: cfg.available,
    provider: cfg.provider,
    model: cfg.model,
    structuredModel: cfg.structuredModel,
    schemaVersion: EXTRACTION_SCHEMA_VERSION,
    promptVersion: EXTRACTION_PROMPT_VERSION,
    limits: {
      maxFiles: cfg.maxFiles,
      maxTotalMb: cfg.maxTotalMb,
      timeoutMs: cfg.timeoutMs,
      maxRetries: cfg.maxRetries,
    },
    errors: cfg.errors,
  };
}
