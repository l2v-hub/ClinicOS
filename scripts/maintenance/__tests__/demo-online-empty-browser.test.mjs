import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertSafeTrace, FRONTEND, BACKEND } from '../demo-online-empty-browser.mjs';
test('only actual intended online endpoints are configured', () => {
  assert.equal(FRONTEND, 'https://clinicos-eosin.vercel.app');
  assert.equal(BACKEND, 'https://clinicos-backend-demo.up.railway.app');
});
test('artifact privacy rejects network headers and session secrets in a real trace zip', async () => {
  const dir = await fs.mkdtemp(join(tmpdir(), 'clinicos-470-trace-'));
  try {
    for (const [name, network, trace, secret, pass] of [
      ['safe', '', '{"type":"after","method":"reload"}\n', 'synthetic-secret', true],
      [
        'headers',
        '{"headers":{"Authorization":"Bearer synthetic-secret"}}',
        '{}',
        'synthetic-secret',
        false,
      ],
      ['token', '', '{"result":"synthetic-secret"}', 'synthetic-secret', false],
      ['bearer', '', '{"authorization":"Bearer other-value"}', 'synthetic-secret', false],
    ]) {
      const directory = join(dir, name);
      await fs.mkdir(directory);
      await fs.writeFile(join(directory, 'trace.network'), network);
      await fs.writeFile(join(directory, 'trace.trace'), trace);
      const zip = join(dir, name + '.zip');
      execFileSync('zip', ['-q', zip, 'trace.network', 'trace.trace'], {
        cwd: directory,
        stdio: 'pipe',
      });
      if (pass) assert.equal(assertSafeTrace(zip, secret), true);
      else assert.throws(() => assertSafeTrace(zip, secret));
    }
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
