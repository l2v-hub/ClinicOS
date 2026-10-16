import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { execute } from '../../../scripts/automation/install-claude-review-cron.mjs';
test('actual child boundary removes inherited PowerShell module paths only for powershell.exe without mutating parent environment', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'qa-powershell-env-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const env = {
    PATH: process.env.PATH,
    PSModulePath: 'synthetic-ps7',
    pSmOdUlEpAtH: 'synthetic-case',
    KEEP_VALUE: 'synthetic-keep',
  };
  const body = `#!${process.execPath}\nprocess.stdout.write(JSON.stringify({modules:Object.keys(process.env).filter(k=>k.toLowerCase()==='psmodulepath'),keep:process.env.KEEP_VALUE}));\n`;
  for (const name of ['powershell.exe', 'other.exe'])
    await writeFile(path.join(dir, name), body, { mode: 0o700 });
  const restricted = await execute(path.join(dir, 'powershell.exe'), [], { env });
  assert.equal(restricted.ok, true);
  assert.deepEqual(JSON.parse(restricted.stdout), { modules: [], keep: 'synthetic-keep' });
  const other = await execute(path.join(dir, 'other.exe'), [], { env });
  assert.equal(other.ok, true);
  assert.deepEqual(JSON.parse(other.stdout), {
    modules: ['PSModulePath', 'pSmOdUlEpAtH'],
    keep: 'synthetic-keep',
  });
  assert.equal(env.PSModulePath, 'synthetic-ps7');
  assert.equal(env.pSmOdUlEpAtH, 'synthetic-case');
});
