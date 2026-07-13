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

test('sanitizeText strips trailing whitespace deterministically so captured evidence passes git diff --check', () => {
  assert.equal(sanitizeText('line one   \nline two\t\t\r\nline three \n'), 'line one\nline two\r\nline three\n');
});

test('runProcess reports a missing executable without throwing', async () => {
  const result = await runProcess({ command: 'definitely-missing-clinicos-cli', args: [], cwd: process.cwd(), timeoutMs: 1000, maxOutputBytes: 1024 });
  assert.equal(result.ok, false);
  assert.equal(result.code, null);
  assert.match(result.error, /ENOENT|not found/i);
});

test('runProcess timeout escalates to a process-tree kill so no owned child survives (QA-263-011)', async () => {
  const killed = [];
  const result = await runProcess({
    command: 'node', args: ['-e', 'setTimeout(() => {}, 5000)'], cwd: process.cwd(),
    timeoutMs: 200, maxOutputBytes: 1024,
    killTree: (child) => { killed.push(child.pid); child.kill('SIGKILL'); }
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /timeout/);
  assert.equal(killed.length, 1);
  assert.equal(Number.isInteger(killed[0]), true);
});

test('runProcess default timeout kill actually terminates the spawned process', async () => {
  const result = await runProcess({ command: 'node', args: ['-e', 'setTimeout(() => {}, 10000)'], cwd: process.cwd(), timeoutMs: 300, maxOutputBytes: 1024 });
  assert.equal(result.ok, false);
  assert.match(result.error, /timeout/);
  assert.equal(Number.isInteger(result.pid), true, 'the result must expose the child pid for liveness verification');
  let alive = true;
  for (let attempt = 0; attempt < 30 && alive; attempt += 1) {
    try { process.kill(result.pid, 0); await new Promise((resolve) => setTimeout(resolve, 100)); } catch { alive = false; }
  }
  assert.equal(alive, false, 'the timed-out child must be dead after runProcess resolves');
});
