import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRunner } from '../../src/bug-pipeline/process.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'clinicos-process-output-'));
  const runtimeRoot = path.join(root, 'runtime');
  await mkdir(runtimeRoot);
  t.after(() => rm(root, { recursive: true, force: true }));
  return { root, runtimeRoot };
}

async function childScript(root, content) {
  const script = path.join(root, 'child.mjs');
  await writeFile(script, content);
  return script;
}

function runner(runtimeRoot, CODEX_CLI_PATH) {
  return createRunner({ runtimeRoot, env: { PATH: process.env.PATH, CODEX_CLI_PATH } });
}

test('synthetic model child permits separate progress and structured-result channels above 64 KiB', async (t) => {
  const { root, runtimeRoot } = await fixture(t);
  const script = await childScript(root, `
    process.stdout.write(JSON.stringify({type:'progress', text:'x'.repeat(80 * 1024)}) + '\\n');
    process.stderr.write('terminal stderr marker\\n');
    process.exit(0);
  `);
  const run = runner(runtimeRoot, script);
  const result = await run({
    command: 'codex', args: [], cwd: root, envMode: 'model', timeoutMs: 3000,
    maxOutputBytes: 2 * 1024 * 1024, maxCapturedBytesPerStream: 32 * 1024, captureTail: true, maxStderrBytes: 64 * 1024,
  });
  assert.equal(result.ok, true);
  assert.equal(result.stdoutBytes, Buffer.byteLength(JSON.stringify({ type: 'progress', text: 'x'.repeat(80 * 1024) }) + '\n'));
  assert.equal(Buffer.byteLength(result.stdout), 32 * 1024);
  assert.match(result.stderr, /terminal stderr marker/);
  assert.ok(result.stderrBytes < 32 * 1024);
});

test('synthetic runner fails on independent total and stderr limits', async (t) => {
  const { root, runtimeRoot } = await fixture(t);
  const tooMuch = await childScript(root, `process.stdout.write('x'.repeat(2 * 1024 * 1024 + 1));`);
  const total = await runner(runtimeRoot, tooMuch)({ command: 'codex', cwd: root, envMode: 'model', timeoutMs: 3000, maxOutputBytes: 2 * 1024 * 1024, maxCapturedBytesPerStream: 1024, captureTail: true, maxStderrBytes: 64 * 1024 });
  assert.equal(total.error, 'output-limit');
  const stderr = await childScript(root, `process.stderr.write('x'.repeat(64 * 1024 + 1));`);
  const err = await runner(runtimeRoot, stderr)({ command: 'codex', cwd: root, envMode: 'model', timeoutMs: 3000, maxOutputBytes: 2 * 1024 * 1024, maxCapturedBytesPerStream: 1024, captureTail: true, maxStderrBytes: 64 * 1024 });
  assert.equal(err.error, 'stderr-limit');
  assert.equal(Buffer.byteLength(err.stderr) <= 1024, true);
});

test('runner option validation rejects unbounded or invalid limits', async (t) => {
  const { root, runtimeRoot } = await fixture(t);
  const script = await childScript(root, 'process.exit(0);');
  const run = runner(runtimeRoot, script);
  for (const value of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, Infinity]) {
    await assert.rejects(() => run({ command: 'codex', cwd: root, envMode: 'model', maxCapturedBytesPerStream: value }), /invalid.*limit/i);
  }
});


test('timed out process groups terminate surviving descendants', async (t) => {
  const { root, runtimeRoot } = await fixture(t);
  const marker = path.join(root, 'descendant-survived');
  const childCode = `setTimeout(() => require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'survived'), 1500)`;
  const script = await childScript(root, `
    const { spawn } = await import('node:child_process');
    const { writeFile } = await import('node:fs/promises');
    const child = spawn(process.execPath, ['-e', ${JSON.stringify(childCode)}], { stdio: 'ignore' });
    await writeFile(${JSON.stringify(path.join(root, 'child.pid'))}, String(child.pid));
    setInterval(() => {}, 1000);
  `);
  const result = await runner(runtimeRoot, script)({ command: 'codex', cwd: root, envMode: 'model', timeoutMs: 700, maxOutputBytes: 64 * 1024 });
  assert.equal(result.error, 'timeout', JSON.stringify(result));
  await new Promise((resolve) => setTimeout(resolve, 1700));
  await assert.rejects(() => import('node:fs/promises').then(({ stat }) => stat(marker)), { code: 'ENOENT' });
});

test('runner defaults retain the existing combined ceiling and prefix capture', async (t) => {
  const { root, runtimeRoot } = await fixture(t);
  const script = await childScript(root, `process.stdout.write('a'.repeat(6)); process.stdout.write('b'.repeat(6));`);
  const result = await runner(runtimeRoot, script)({ command: 'codex', cwd: root, envMode: 'model', timeoutMs: 3000, maxOutputBytes: 10 });
  assert.equal(result.error, 'output-limit');
  assert.equal(result.stdout, 'a'.repeat(6));
  assert.equal(result.stdoutCapturedBytes, 6);
});
