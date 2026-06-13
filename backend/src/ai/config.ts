// Server-side AI configuration for the discharge-letter import flow (REQ-013).
//
// All secrets and provider selection live here, backend-only. Nothing in this
// module is ever exposed to the frontend bundle or to logs.

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXTRACTION_PROMPT_VERSION, EXTRACTION_SCHEMA_VERSION } from './version.js';

// backend/{dist|src}/ai -> backend root -> ai-assets. Works in dev (tsx) and prod (node dist).
const HERE = dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = resolve(HERE, '..', '..');
const DEFAULT_ASSET_DIR = resolve(BACKEND_ROOT, 'ai-assets');
const DEFAULT_SCHEMA_PATH = resolve(DEFAULT_ASSET_DIR, 'clinicos-extraction.it.json');
const DEFAULT_PROMPT_PATH = resolve(DEFAULT_ASSET_DIR, 'extraction-prompt.it.txt');

export type AiProvider = 'google' | 'mock';

export interface AiConfig {
  provider: AiProvider;
  model: string;
  /** Optional separate model for structured output (REQ-015 fallback). */
  structuredModel?: string;
  schemaPath: string;
  promptPath: string;
  timeoutMs: number;
  maxRetries: number;
  maxFiles: number;
  maxTotalMb: number;
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
  const schemaPath = process.env.AI_EXTRACTION_SCHEMA_PATH?.trim() || DEFAULT_SCHEMA_PATH;
  const promptPath = process.env.AI_EXTRACTION_PROMPT_PATH?.trim() || DEFAULT_PROMPT_PATH;
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

  // Secret only required for the real google provider.
  if (provider === 'google' && !apiKey) {
    errors.push('GEMINI_API_KEY mancante: servizio AI non disponibile');
  }

  cached = {
    provider: provider === 'mock' ? 'mock' : 'google',
    model,
    structuredModel,
    schemaPath,
    promptPath,
    timeoutMs: intEnv('AI_TIMEOUT_MS', 60_000),
    maxRetries: intEnv('AI_MAX_RETRIES', 2),
    maxFiles: intEnv('AI_MAX_FILES', 10),
    maxTotalMb: intEnv('AI_MAX_TOTAL_MB', 25),
    available: errors.length === 0,
    errors,
    apiKey,
  };
  return cached;
}

/** Load the versioned extraction schema asset. */
export function loadExtractionSchema(cfg = loadAiConfig()): unknown {
  return JSON.parse(readFileSync(cfg.schemaPath, 'utf8'));
}

/** Load the versioned Italian extraction prompt asset. */
export function loadExtractionPrompt(cfg = loadAiConfig()): string {
  return readFileSync(cfg.promptPath, 'utf8');
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
