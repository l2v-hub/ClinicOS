import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadAiConfig, publicStatus, loadExtractionSchema, loadExtractionPrompt } from '../config.js';
import { createExtractionProvider } from '../provider-factory.js';
import { maskSecret, redactForLog, truncateForLog } from '../redact.js';
import { MockExtractionProvider } from '../providers/mock.js';

function resetEnv(overrides: Record<string, string | undefined>) {
  for (const k of [
    'AI_PROVIDER', 'AI_MODEL', 'GEMINI_API_KEY', 'AI_STRUCTURED_MODEL',
    'AI_TIMEOUT_MS', 'AI_MAX_RETRIES', 'AI_MAX_FILES', 'AI_MAX_TOTAL_MB',
    'AI_EXTRACTION_SCHEMA_PATH', 'AI_EXTRACTION_PROMPT_PATH',
  ]) {
    delete process.env[k];
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

test('valid config: google provider with key is available', () => {
  resetEnv({ AI_PROVIDER: 'google', AI_MODEL: 'gemma-4-31b-it', GEMINI_API_KEY: 'AIzaTESTKEY1234567890' });
  const cfg = loadAiConfig(true);
  assert.equal(cfg.available, true);
  assert.equal(cfg.provider, 'google');
  assert.equal(cfg.model, 'gemma-4-31b-it');
  assert.deepEqual(cfg.errors, []);
});

test('absent config: missing GEMINI_API_KEY produces controlled error, never throws', () => {
  resetEnv({ AI_PROVIDER: 'google', GEMINI_API_KEY: undefined });
  const cfg = loadAiConfig(true);
  assert.equal(cfg.available, false);
  assert.ok(cfg.errors.some((e) => e.includes('GEMINI_API_KEY')));
});

test('changing AI_MODEL changes the model (no frontend change needed)', () => {
  resetEnv({ AI_PROVIDER: 'google', AI_MODEL: 'gemini-2.0-flash', GEMINI_API_KEY: 'AIzaTESTKEY1234567890' });
  const cfg = loadAiConfig(true);
  assert.equal(cfg.model, 'gemini-2.0-flash');
  assert.equal(publicStatus(cfg).model, 'gemini-2.0-flash');
});

test('mock provider is selectable without a key (CI path)', () => {
  resetEnv({ AI_PROVIDER: 'mock', GEMINI_API_KEY: undefined });
  const cfg = loadAiConfig(true);
  assert.equal(cfg.available, true);
  const provider = createExtractionProvider(cfg);
  assert.ok(provider instanceof MockExtractionProvider);
});

test('factory throws controlled config error when google selected but unavailable', () => {
  resetEnv({ AI_PROVIDER: 'google', GEMINI_API_KEY: undefined });
  const cfg = loadAiConfig(true);
  assert.throws(() => createExtractionProvider(cfg), /non disponibile|config/i);
});

test('schema and prompt assets load and are versioned', () => {
  resetEnv({ AI_PROVIDER: 'mock' });
  const cfg = loadAiConfig(true);
  const schema = loadExtractionSchema(cfg) as Record<string, unknown>;
  assert.ok(schema.anagrafica, 'schema has anagrafica section');
  const prompt = loadExtractionPrompt(cfg);
  assert.match(prompt, /NON inventare/i);
  const status = publicStatus(cfg);
  assert.equal(status.schemaVersion, '1.0.0');
  assert.equal(status.promptVersion, '1.0.0');
});

test('publicStatus never leaks the API key', () => {
  resetEnv({ AI_PROVIDER: 'google', GEMINI_API_KEY: 'AIzaSUPERSECRETVALUE0987654321' });
  const status = publicStatus(loadAiConfig(true));
  const serialized = JSON.stringify(status);
  assert.ok(!serialized.includes('AIzaSUPERSECRETVALUE0987654321'), 'status must not contain the key');
  assert.ok(!('apiKey' in status), 'status has no apiKey field');
});

test('redaction: secrets masked, long content truncated', () => {
  assert.equal(maskSecret('AIzaSUPERSECRETVALUE0987654321').includes('SUPERSECRET'), false);
  const redacted = redactForLog({ apiKey: 'AIzaSUPERSECRETVALUE0987654321', note: 'hi' }) as Record<string, unknown>;
  assert.ok(!JSON.stringify(redacted).includes('SUPERSECRETVALUE'));
  assert.equal(redacted.note, 'hi');
  const long = 'x'.repeat(200);
  assert.ok(truncateForLog(long).length < 200);
});

test('limits parse from env with sane fallbacks', () => {
  resetEnv({ AI_PROVIDER: 'mock', AI_MAX_FILES: '7', AI_MAX_TOTAL_MB: '40', AI_TIMEOUT_MS: 'bad' });
  const cfg = loadAiConfig(true);
  assert.equal(cfg.maxFiles, 7);
  assert.equal(cfg.maxTotalMb, 40);
  assert.equal(cfg.timeoutMs, 60_000); // bad value -> fallback
});
