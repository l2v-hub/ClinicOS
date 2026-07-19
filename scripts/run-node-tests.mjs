#!/usr/bin/env node
'use strict';
// Cross-platform test discovery + runner for node:test suites written in TypeScript.
// Node 20's `node --test` does NOT expand positional globs (added in Node 21), and neither
// does tsx — so a bare `tsx --test "src/**/*.test.ts"` finds nothing on Windows/Node 20.
// This script walks the workspace's src/ tree, collects every *.test.ts, and runs them all
// through `node --import tsx --test <files...>`. Run it with cwd = the workspace package dir
// (npm's `-w` already does this), e.g. `node ../scripts/run-node-tests.mjs`.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const ROOT = 'src';

let entries;
try {
  entries = readdirSync(ROOT, { recursive: true, encoding: 'utf8' });
} catch {
  console.error(`run-node-tests: no ${ROOT}/ directory under ${process.cwd()}`);
  process.exit(1);
}

const files = entries
  .map((p) => p.split('\\').join('/'))
  .filter((p) => p.endsWith('.test.ts'))
  .map((p) => `${ROOT}/${p}`)
  .sort();

if (files.length === 0) {
  console.log('run-node-tests: no *.test.ts files found.');
  process.exit(0);
}

console.log(`run-node-tests: running ${files.length} test file(s) via node --import tsx --test`);
const res = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...files], {
  stdio: 'inherit',
});
process.exit(res.status ?? 1);
