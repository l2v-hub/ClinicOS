import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadAiConfig,
  publicStatus,
  loadExtractionSchema,
  loadExtractionPrompt,
} from '../config.js';
import { maskSecret, redactForLog, truncateForLog } from '../redact.js';
import { MockExtractionProvider } from '../providers/mock.js';

function resetEnv(overrides: Record<string, string | undefined>) {
  for (const k of [
    'AI_PROVIDER',
    'AI_MODEL',
    'GEMINI_API_KEY',
    'AI_RUNTIME_URL',
    'AI_RUNTIME_SERVICE_TOKEN',
    'AI_ENABLED',
    'AI_STRUCTURED_MODEL',
    'AI_TIMEOUT_MS',
    'AI_MAX_RETRIES',
    'AI_MAX_FILES',
    'AI_MAX_TOTAL_MB',
    'AI_EXTRACTION_SCHEMA_PATH',
    'AI_EXTRACTION_PROMPT_PATH',
  ]) {
    delete process.env[k];
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

test('Phase 9: extraction availability = AI runtime configured, never a vendor key', () => {
  resetEnv({
    AI_RUNTIME_URL: 'http://127.0.0.1:1',
    AI_RUNTIME_SERVICE_TOKEN: 'service-token-test',
    GEMINI_API_KEY: undefined,
  });
  const cfg = loadAiConfig(true);
  assert.equal(cfg.available, true);
  assert.equal(cfg.provider, 'runtime');
  assert.equal(cfg.model, 'vision', 'logical role, not a model name');
  assert.deepEqual(cfg.errors, []);
});

test('runtime not configured: controlled error, never throws, no vendor variable named', () => {
  resetEnv({ AI_RUNTIME_URL: undefined, AI_RUNTIME_SERVICE_TOKEN: undefined });
  const cfg = loadAiConfig(true);
  assert.equal(cfg.available, false);
  assert.ok(cfg.errors.some((e) => e.includes('AI runtime non configurato')));
  assert.ok(!cfg.errors.join(' ').match(/GEMINI|OPENAI|AZURE|GOOGLE/i));
});

test('vendor variables are irrelevant to the backend (legacy AI_PROVIDER/AI_MODEL ignored)', () => {
  resetEnv({
    AI_PROVIDER: 'google',
    AI_MODEL: 'gemini-2.0-flash',
    AI_RUNTIME_URL: 'http://127.0.0.1:1',
    AI_RUNTIME_SERVICE_TOKEN: 'service-token-test',
  });
  const cfg = loadAiConfig(true);
  assert.equal(cfg.provider, 'runtime');
  assert.equal(publicStatus(cfg).model, 'vision');
});

test('mock provider is selectable without a runtime (CI path)', () => {
  resetEnv({ AI_PROVIDER: 'mock' });
  const cfg = loadAiConfig(true);
  assert.equal(cfg.available, true);
  assert.equal(cfg.provider, 'mock');
  assert.ok(new MockExtractionProvider() instanceof MockExtractionProvider);
});

test('AI_ENABLED=false makes extraction unavailable (master switch)', () => {
  resetEnv({
    AI_ENABLED: 'false',
    AI_RUNTIME_URL: 'http://127.0.0.1:1',
    AI_RUNTIME_SERVICE_TOKEN: 'service-token-test',
  });
  const cfg = loadAiConfig(true);
  assert.equal(cfg.available, false);
  assert.ok(cfg.errors.some((e) => e.includes('AI_ENABLED=false')));
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
  resetEnv({ AI_PROVIDER: 'google', GEMINI_API_KEY: 'FAKEKEYSUPERSECRETVALUE0987654321xx' });
  const status = publicStatus(loadAiConfig(true));
  const serialized = JSON.stringify(status);
  assert.ok(
    !serialized.includes('FAKEKEYSUPERSECRETVALUE0987654321xx'),
    'status must not contain the key',
  );
  assert.ok(!('apiKey' in status), 'status has no apiKey field');
});

test('redaction: secrets masked, long content truncated', () => {
  assert.equal(maskSecret('FAKEKEYSUPERSECRETVALUE0987654321xx').includes('SUPERSECRET'), false);
  const redacted = redactForLog({
    apiKey: 'FAKEKEYSUPERSECRETVALUE0987654321xx',
    note: 'hi',
  }) as Record<string, unknown>;
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
