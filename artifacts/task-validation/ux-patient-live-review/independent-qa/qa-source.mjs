import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const head = git('rev-parse', 'HEAD');
const lines = git('ls-tree', '-r', head, '--', 'frontend', 'tests/ux-turno', 'package.json', 'package-lock.json', 'scripts/stub-css-loader.mjs').split('\n');
const entries = lines.filter(Boolean).map(line => {
  const [meta, path] = line.split('\t');
  const expected = meta.split(' ')[2];
  const actual = git('hash-object', '--path=' + path, path);
  return { path, beforeCandidateBlob: expected, afterWorktreeBlob: actual, matches: expected === actual };
});
const digest = field => createHash('sha256').update(entries.map(item => `${item.path}\t${item[field]}\n`).join('')).digest('hex');
const receipt = { candidate: head, tree: git('rev-parse', 'HEAD^{tree}'),
  baseline: 'a3ab80f796ec390c09435fddf2c77c2cfb0b7443',
  beforeSourceHash: digest('beforeCandidateBlob'), afterSourceHash: digest('afterWorktreeBlob'),
  method: 'Candidate Git blob inventory bound to initial HEAD/status; after tests every build/frontend/QA input rehashed with Git normalization. No application writer operated in this checkout.',
  mismatches: entries.filter(item => !item.matches),
  excludedUnrelatedDirtyPaths: ['run-claude-queue.ps1', 'start-claude-team.ps1'], entries };
writeFileSync(new URL('source-identity.json', import.meta.url), JSON.stringify(receipt, null, 2));
console.log(JSON.stringify({ candidate: head, beforeSourceHash: receipt.beforeSourceHash, afterSourceHash: receipt.afterSourceHash, files: entries.length, mismatches: receipt.mismatches.length }));
if (receipt.mismatches.length) process.exitCode = 1;
