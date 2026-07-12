import test from 'node:test';
import assert from 'node:assert/strict';
import { runProcess } from '../../src/adapters/process-runner.mjs';
import { sanitizeText } from '../../src/core/sanitize.mjs';

test('sanitizeText removes credentials and authorization values', () => {
  const value = sanitizeText('Authorization: Bearer secret-token OPENAI_API_KEY=sk-live patientId=12345');
  assert.equal(value.includes('secret-token'), false);
  assert.equal(value.includes('sk-live'), false);
  assert.equal(value.includes('12345'), false);
});

test('runProcess reports a missing executable without throwing', async () => {
  const result = await runProcess({ command: 'definitely-missing-clinicos-cli', args: [], cwd: process.cwd(), timeoutMs: 1000, maxOutputBytes: 1024 });
  assert.equal(result.ok, false);
  assert.equal(result.code, null);
  assert.match(result.error, /ENOENT|not found/i);
});
