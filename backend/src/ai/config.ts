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
import { aiEnabled, aiRuntimeConfigured } from '../lib/ai-flags.js';

// backend/{dist|src}/ai -> backend root -> ai-assets. Works in dev (tsx) and prod (node dist).
const HERE = dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = resolve(HERE, '..', '..');
const DEFAULT_ASSET_DIR = resolve(BACKEND_ROOT, 'ai-assets');
const DEFAULT_SCHEMA_PATH = resolve(DEFAULT_ASSET_DIR, 'clinicos-extraction.it.json');
const DEFAULT_PROMPT_PATH = resolve(DEFAULT_ASSET_DIR, 'extraction-prompt.it.txt');
const DEFAULT_OUTPUT_SCHEMA_PATH = resolve(DEFAULT_ASSET_DIR, 'clinicos-extraction.schema.json');

/** 'runtime' = the configured AI runtime (provider chosen there); 'mock' = in-process CI mock. */
export type AiProvider = 'runtime' | 'mock';

export interface AiConfig {
  provider: AiProvider;
  /** Logical model role used for extraction ('vision'); the actual model is per job. */
  model: string;
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
  /** True only when extraction can run (runtime configured and AI enabled, or mock). */
  available: boolean;
  /** Human-readable reasons the service is unavailable (no secrets). */
  errors: string[];
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

  // Phase 9: the backend never selects a vendor. Extraction runs in the AI runtime (VISION role,
  // provider/model from the runtime configuration). AI_PROVIDER=mock keeps the in-process mock
  // for local/CI runs without a runtime; any other value means "the configured AI runtime".
  const provider: AiProvider =
    (process.env.AI_PROVIDER ?? '').trim().toLowerCase() === 'mock' ? 'mock' : 'runtime';
  const model = provider === 'mock' ? 'mock-extractor' : 'vision';
  const schemaPath = process.env.AI_EXTRACTION_SCHEMA_PATH?.trim() || DEFAULT_SCHEMA_PATH;
  const promptPath = process.env.AI_EXTRACTION_PROMPT_PATH?.trim() || DEFAULT_PROMPT_PATH;
  const outputSchemaPath =
    process.env.AI_EXTRACTION_OUTPUT_SCHEMA_PATH?.trim() || DEFAULT_OUTPUT_SCHEMA_PATH;

  const errors: string[] = [];

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
  if (!aiEnabled()) errors.push('AI disattivata (AI_ENABLED=false)');
  if (provider === 'runtime' && !aiRuntimeConfigured()) {
    errors.push('AI runtime non configurato (AI_RUNTIME_URL / AI_RUNTIME_SERVICE_TOKEN)');
  }

  cached = {
    provider,
    model,
    schemaPath,
    promptPath,
    outputSchemaPath,
    timeoutMs: intEnv('AI_TIMEOUT_MS', 60_000),
    maxRetries: intEnv('AI_MAX_RETRIES', 2),
    maxFiles: intEnv('AI_MAX_FILES', 10),
    maxTotalMb: intEnv('AI_MAX_TOTAL_MB', 25),
    uploadDir: process.env.AI_UPLOAD_DIR?.trim() || resolve(tmpdir(), 'clinicos-imports'),
    jobRetentionMin: intEnv('AI_JOB_RETENTION_MIN', 60),
    mergePreferRecent:
      (process.env.AI_MERGE_PREFER_RECENT ?? 'true').trim().toLowerCase() !== 'false',
    requestTimeoutMs: intEnv('AI_REQUEST_TIMEOUT_MS', 300_000),
    jobMaxDurationMs: intEnv('AI_JOB_MAX_DURATION_MS', 900_000),
    jobPollIntervalMs: intEnv('AI_JOB_POLL_INTERVAL_MS', 2_000),
    available: errors.length === 0,
    errors,
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
