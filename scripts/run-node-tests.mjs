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

// Lo stub CSS va caricato DOPO tsx: tsx registra la trasformazione TypeScript, lo stub intercetta
// i soli fogli di stile, che Node altrimenti rifiuta con ERR_UNKNOWN_FILE_EXTENSION appena un test
// raggiunge un componente che importa il proprio CSS.
const stubCss = new URL('./stub-css-loader.mjs', import.meta.url).href;

console.log(`run-node-tests: running ${files.length} test file(s) via node --import tsx --test`);
const childEnv = { ...process.env };
const isBackendWorkspace = process.cwd().split(/[\\/]/).at(-1) === 'backend';
if (isBackendWorkspace) {
  // Synthetic identities must be an explicit test-harness decision. Application
  // code stays fail-closed when AUTH_MODE is absent or misspelled.
  if (!Object.hasOwn(childEnv, 'AUTH_MODE')) childEnv.AUTH_MODE = 'demo';
  if (!Object.hasOwn(childEnv, 'NODE_ENV')) childEnv.NODE_ENV = 'test';
}
// Suites that page through the roster assert on the GLOBAL roster epoch (bumped by any Patient /
// PatientTherapy / room write). Run concurrently with other DB-writing files they fail with
// «Elenco aggiornato» or an unexpected epoch: they run in a second, isolated pass (one at a time).
const EPOCH_SENSITIVE = [
  'src/roster/__tests__/order-key-db.test.ts',
  'src/roster/__tests__/roster-pagination-db.test.ts',
  'src/roster/__tests__/preferences-db.test.ts',
  'src/patients/__tests__/alphabetical-pages-db.test.ts',
  'src/patients/__tests__/room-filter-db.test.ts',
];
const isolated = files.filter((f) => EPOCH_SENSITIVE.includes(f));
const concurrent = files.filter((f) => !EPOCH_SENSITIVE.includes(f));
const run = (list, extra = []) =>
  list.length === 0
    ? 0
    : (spawnSync(process.execPath, ['--import', 'tsx', '--import', stubCss, '--test', ...extra, ...list], {
        stdio: 'inherit',
        env: childEnv,
      }).status ?? 1);
const first = run(concurrent);
if (isolated.length) console.log(`run-node-tests: isolated pass for ${isolated.length} roster-epoch suite(s)`);
const second = run(isolated, ['--test-concurrency=1']);
process.exit(first || second);
