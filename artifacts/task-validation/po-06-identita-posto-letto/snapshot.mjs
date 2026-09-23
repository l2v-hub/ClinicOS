import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const root = process.cwd();
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
const scopes = ['frontend/src', 'backend/src', 'tests/fixtures/po06-identity.mjs', 'tests/integration/po06-identity.test.mts'];
const paths = [...new Set([...git('diff', '--name-only', 'HEAD', '--', ...scopes).trim().split('\n'), ...git('ls-files', '--others', '--exclude-standard', '--', ...scopes).trim().split('\n')].filter(Boolean))].sort();
const files = [];
for (const path of paths) {
  const bytes = await readFile(resolve(root, path));
  files.push({ path, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length });
}
const treeHash = createHash('sha256').update(files.map(f => `${f.path}\0${f.sha256}\n`).join('')).digest('hex');
const output = { baseline: git('rev-parse', 'HEAD').trim(), at: new Date().toISOString(), files, treeHash };
await writeFile(resolve(root, 'artifacts/task-validation/po-06-identita-posto-letto/root-source-manifest.json'), JSON.stringify(output, null, 2));
console.log(JSON.stringify({ files: files.length, treeHash }));
