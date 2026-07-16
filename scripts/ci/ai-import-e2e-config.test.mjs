// Issue #267: deterministic guard for the browser-e2e CI path.
//
// The browser-e2e job must (1) build the frontend against the LOCAL backend —
// a production Vite build with no VITE_API_URL falls back to the real Railway
// backend (frontend/src/config.ts), which silently pointed CI at production —
// (2) install Playwright from the lockfile with no dynamic fallback, and
// (3) not mask failures with continue-on-error.
//
// Plain node + node:test, no extra dependencies:
//   node --test scripts/ci/ai-import-e2e-config.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const workflow = readFileSync(resolve(root, '.github/workflows/ai-import-e2e.yml'), 'utf8');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const lock = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8'));

/** Extract the browser-e2e job block (up to the next top-level job key). */
function browserE2eBlock(yml) {
  const start = yml.indexOf('\n  browser-e2e:');
  assert.notEqual(start, -1, 'browser-e2e job must exist in ai-import-e2e.yml');
  const rest = yml.slice(start + 1);
  const next = rest.slice(1).search(/\n {2}[a-zA-Z][\w-]*:/);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

const job = browserE2eBlock(workflow);

test('browser-e2e builds the frontend against the local backend (VITE_API_URL)', () => {
  assert.match(
    job,
    /VITE_API_URL:\s*http:\/\/localhost:3001/,
    'browser-e2e must set VITE_API_URL=http://localhost:3001 so the production-mode ' +
    'Vite build cannot fall back to the real Railway backend (frontend/src/config.ts)',
  );
});

test('playwright is a pinned root devDependency present in the lockfile', () => {
  assert.ok(
    pkg.devDependencies?.playwright,
    'playwright must be declared in root devDependencies',
  );
  assert.ok(
    lock.packages?.['node_modules/playwright']?.version,
    'playwright must be resolved in package-lock.json',
  );
});

test('Playwright install step is deterministic (no npm-install fallback)', () => {
  assert.ok(
    job.includes('node_modules/playwright/cli.js install'),
    'browser-e2e must invoke the lockfile-installed Playwright CLI',
  );
  assert.ok(
    !/npm i(?:nstall)? [^\n]*playwright/.test(job),
    'browser-e2e must not dynamically npm-install playwright as a fallback',
  );
});

test('browser-e2e failures are not masked by continue-on-error', () => {
  // Match the YAML key itself, not prose in comments.
  assert.ok(
    !/\n\s*continue-on-error\s*:/.test(job),
    'browser-e2e must be a blocking job (no continue-on-error)',
  );
});
