import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const app = '30f0b14d63ae69acec66cd82dcaee1d0abbb1cf6', root = 'artifacts/task-validation/pdf-multipage-preview';
const git = args => { const r = spawnSync('git', args, { encoding: 'utf8', windowsHide: true }); assert.equal(r.status, 0); return r.stdout.trim(); };
assert.equal(git(['rev-parse', 'HEAD']), app); assert.equal(git(['diff', 'HEAD', '--name-only', '--', 'frontend', 'package-lock.json']), '');
const paths = git(['ls-files', 'frontend', 'package-lock.json']).split('\n');
const batch = spawnSync('git', ['cat-file', '--batch'], { input: paths.map(p => app + ':' + p).join('\n') + '\n', windowsHide: true, maxBuffer: 150e6 });
assert.equal(batch.status, 0); let at = 0; const files = [];
const sha = b => createHash('sha256').update(b).digest('hex');
for (const path of paths) {
  const end = batch.stdout.indexOf(10, at), parts = batch.stdout.subarray(at, end).toString().split(' '); assert.equal(parts[1], 'blob');
  const size = Number(parts[2]); at = end + 1; const canonical = batch.stdout.subarray(at, at + size); at += size; assert.equal(batch.stdout[at++], 10);
  const physical = readFileSync(path); let normalized = false;
  if (!physical.equals(canonical)) {
    assert.ok(!/\.(?:png|jpe?g|pdf|zip|webm|woff2?|ttf)$/.test(path));
    assert.ok(Buffer.from(new TextDecoder('utf-8', { fatal: true }).decode(physical).replace(/\r\n/g, '\n')).equals(canonical)); normalized = true;
  }
  files.push({ path, gitBlobSha256: sha(canonical), physicalSha256: sha(physical), utf8CrLfNormalizationOnly: normalized });
}
assert.equal(at, batch.stdout.length);
const command = spawnSync(process.execPath, ['scripts/security/scan-frontend-secrets.mjs', 'frontend/src', 'frontend/config', 'frontend/dist'], { encoding: 'utf8', windowsHide: true });
writeFileSync(root + '/root-secrets.log', command.stdout + command.stderr); assert.equal(command.status, 0);
writeFileSync(root + '/source-binding.json', JSON.stringify({ applicationCommit: app, decision: 'EXACT PHYSICAL SOURCE BOUND TO CLEAN GIT APPLICATION', files, sourceCount: files.length, productionPatientTestMutations: 0, at: new Date().toISOString() }, null, 2));
console.log('PASS canonical application source binding ' + files.length + ' files and root source/config/dist secrets scan');
