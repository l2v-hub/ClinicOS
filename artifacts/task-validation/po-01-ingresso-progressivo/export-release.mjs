import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';

const [commit, service] = process.argv.slice(2);
if (!/^[a-f0-9]{40}$/.test(commit ?? '') || !['backend', 'frontend'].includes(service)) throw new Error('Explicit immutable commit and backend/frontend target required');
const root = process.cwd();
const base = resolve(root, 'artifacts/task-validation/po-01-ingresso-progressivo');
const output = resolve(base, 'releases', `${commit}-${service}`);
if (existsSync(output)) throw new Error('Release export already exists; do not overwrite');
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 128 * 1024 * 1024 });
const paths = service === 'frontend'
  ? ['frontend', 'package.json', 'package-lock.json', '.vercelignore']
  : ['backend', 'frontend', 'prisma', 'scripts', 'package.json', 'package-lock.json', 'prisma.config.ts', '.railwayignore', '.gitignore'];
const entries = git('ls-tree', '-r', '-z', commit, '--', ...paths).toString('utf8').split('\0').filter(Boolean);
const files = [];
for (const entry of entries) {
  const [, , kind, blob, path] = /^(\d+) (\w+) ([a-f0-9]+)\t(.+)$/.exec(entry);
  if (kind !== 'blob' || /(^|\/)\.env($|\.)/.test(path)) continue;
  const target = resolve(output, path);
  if (relative(output, target).startsWith('..')) throw new Error('Export path outside target');
  const bytes = git('cat-file', 'blob', blob);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes);
  if (!readFileSync(target).equals(bytes)) throw new Error(`Export differs: ${path}`);
  files.push({ path, gitBlob: blob, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
if (!files.length) throw new Error('Empty release export is never deployable');
const receipt = { commit, service, output, exportedAt: new Date().toISOString(), excluded: ['Environment files', 'Uncommitted files', 'railway.json: preserve configured demo service build/predeploy/start settings'], files };
writeFileSync(resolve(base, `${service}-release-inputs.json`), JSON.stringify(receipt, null, 2));
console.log(JSON.stringify({ commit, service, output, files: files.length }));
