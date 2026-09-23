import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const [commit] = process.argv.slice(2);
if (!/^[a-f0-9]{40}$/.test(commit || '')) throw new Error('A full immutable commit is required');
const root = process.cwd();
const folder = resolve(root, 'artifacts/task-validation/po-05-scansioni-lunghe');
const output = resolve(folder, 'releases', `${commit}-runtime`);
if (existsSync(output)) throw new Error('Never overwrite an existing release export');
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024 });
const files = [];
for (const entry of git('ls-tree', '-r', '-z', commit, '--', 'clinicos-ai-runtime').toString('utf8').split('\0').filter(Boolean)) {
  const [, mode, type, blob, path] = /^(\d+) (\w+) ([a-f0-9]+)\t(.+)$/.exec(entry);
  if (type !== 'blob' || mode === '120000' || /(^|\/)\.env($|\.)/.test(path)) continue;
  const target = resolve(output, path);
  if (relative(output, target).startsWith('..')) throw new Error('Export outside release directory');
  const bytes = git('cat-file', 'blob', blob);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes);
  if (!readFileSync(target).equals(bytes)) throw new Error(`Export mismatch: ${path}`);
  files.push({ path, gitBlob: blob, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
for (const required of ['clinicos-ai-runtime/Dockerfile', 'clinicos-ai-runtime/requirements.txt', 'clinicos-ai-runtime/railway.json', 'clinicos-ai-runtime/clinicos_ai/main.py']) {
  if (!files.some(file => file.path === required)) throw new Error(`Missing runtime input: ${required}`);
}
const receipt = { commit, service: 'runtime', output, exportedAt: new Date().toISOString(), configuredRoot: '/clinicos-ai-runtime', configuredConfig: '/clinicos-ai-runtime/railway.json', excluded: ['Environment files', 'Uncommitted files', 'All other applications'], files };
writeFileSync(resolve(folder, 'runtime-release-inputs.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ commit, output, files: files.length }));
