import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, realpath, rename, stat, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
const root = await realpath(process.cwd());
const artifact = resolve(root, 'artifacts/task-validation/po-15-catalogo/backend');
const target = resolve(artifact, 'regression-output');
const names = ['gds15-long.pdf', 'gds15-normal.pdf', 'gds15-long.snapshot.json', 'gds15-normal.snapshot.json',
  'mna-full-long.pdf', 'mna-full-normal.pdf', 'mna-screening-partial.pdf', 'mna-full-long.snapshot.json',
  'mna-full-normal.snapshot.json', 'mna-screening-partial.snapshot.json', 'painad-long.pdf', 'painad-normal.pdf',
  'tinetti-long.pdf', 'tinetti-normal.pdf', 'transfers-long.pdf', 'transfers-normal.pdf'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = JSON.parse(await readFile(resolve(artifact, 'focused-tests.json'), 'utf8'));
assert(receipt.databaseClosed && receipt.sourceUnchanged && receipt.results.length === 24);
assert(receipt.results.every(row => row.exitCode === 0));
const within = path => { const rel = relative(root, path); assert(!rel.startsWith('..') && !isAbsolute(rel)); };
within(target);
await mkdir(target, { recursive: true });
assert.equal(await realpath(target), target);
const files = [];
for (const name of names) {
  assert(!name.includes('/') && !name.includes('\\'));
  const source = resolve(root, name), destination = resolve(target, name);
  within(source); within(destination);
  const bytes = await readFile(source), info = await stat(source);
  assert(info.isFile());
  await assert.rejects(stat(destination), error => error.code === 'ENOENT');
  files.push({ formerPath: name, path: 'regression-output/' + name, bytes: bytes.length, sha256: sha(bytes), createdAt: info.birthtime.toISOString(), modifiedAt: info.mtime.toISOString() });
}
for (const row of files) {
  await rename(resolve(root, row.formerPath), resolve(artifact, row.path));
  assert.equal(sha(await readFile(resolve(artifact, row.path))), row.sha256);
}
const runnerPath = resolve(artifact, 'run-focused-tests.mjs');
const runner = await readFile(runnerPath, 'utf8');
assert.equal((runner.match(/_PDF_QA_DIRECTORY: ''/g) ?? []).length, 5);
await writeFile(resolve(artifact, 'run-focused-tests.executed.mjs'), runner);
await writeFile(runnerPath, runner.replace(/(\w+_PDF_QA_DIRECTORY): ''/g, "$1: resolve(artifactRoot, 'regression-output')"));
const result = { sourceTreeSha256: receipt.sourceTreeSha256, databaseClosed: true, sourceApplicationUnchanged: true,
  reason: 'Existing regression tests always export PDF fixtures; empty QA directory resolves to worktree root instead of disabling exports.',
  action: 'Moved only the 16 known generated files to the private regression-output directory, with exact bytes preserved and no overwritten destination.',
  executedRunner: { path: 'run-focused-tests.executed.mjs', sha256: sha(runner) },
  reusableRunner: { path: 'run-focused-tests.mjs', sha256: sha(await readFile(runnerPath)), change: 'Only five export environment values now name the private artifact directory.', rerunRequired: false },
  pdfFiles: 11, snapshotFiles: 5, files, visuallyInspected: false, includedInHandoff: false,
  limitation: 'Renderer and font source are unchanged; these are existing regression outputs, not a new PO15 visual QA claim.' };
await writeFile(resolve(artifact, 'regression-output-receipt.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ relocated: files.length, pdfFiles: result.pdfFiles, snapshotFiles: result.snapshotFiles, sourceUnchanged: true }));
