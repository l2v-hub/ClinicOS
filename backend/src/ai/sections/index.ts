// Public API for the faithful clinical-sections extraction (REQ-026).

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProfile } from './profile.js';
import { buildSectionsPrompt } from './prompt.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = resolve(HERE, '..', '..', '..');

function schemaPath(): string {
  return process.env.AI_SECTIONS_SCHEMA_PATH?.trim() || resolve(BACKEND_ROOT, 'ai-assets', 'clinicos-sections.schema.json');
}

/** Build the {schema, prompt} pair the model-agnostic runtime needs for a sections pass. */
export function buildSectionsRequest(): { schema: object; prompt: string } {
  const profile = loadProfile();
  return {
    schema: JSON.parse(readFileSync(schemaPath(), 'utf8')),
    prompt: buildSectionsPrompt(profile),
  };
}

export * from './profile.js';
export * from './prompt.js';
export * from './validate.js';
export * from './narrative.js';
