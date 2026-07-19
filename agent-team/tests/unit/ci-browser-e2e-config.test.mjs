import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// QA-263-012 / AC6: the browser-e2e CI job builds the production Vite frontend; without an
// explicit VITE_API_URL the build bakes in the Railway production fallback from
// frontend/src/config.ts and the browser test can never reach the CI backend on :3001.
// This deterministic validation pins the workflow binding and the untouched prod fallback.

const repoRoot = path.resolve('.');
const workflowPath = path.join(repoRoot, '.github', 'workflows', 'ai-import-e2e.yml');
const configPath = path.join(repoRoot, 'frontend', 'src', 'config.ts');

async function browserE2eJobSection() {
  const workflow = await readFile(workflowPath, 'utf8');
  const start = workflow.search(/^ {2}browser-e2e:/m);
  assert.notEqual(start, -1, 'ai-import-e2e.yml must contain the browser-e2e job');
  const body = workflow.slice(start + '  browser-e2e:'.length);
  const next = body.search(/^ {2}[A-Za-z0-9_-]+:\s*$/m); // next top-level job key ends the section
  return next === -1 ? body : body.slice(0, next);
}

test('browser-e2e job binds the production frontend build to the local CI backend (QA-263-012)', async () => {
  const section = await browserE2eJobSection();
  assert.match(
    section,
    /VITE_API_URL:\s*['"]?http:\/\/localhost:3001['"]?/,
    'browser-e2e must set VITE_API_URL=http://localhost:3001 so the built frontend calls the CI backend instead of the Railway production fallback',
  );
  assert.match(section, /npm run build/, 'browser-e2e must still build the frontend it serves');
});

test('production fallback behavior in frontend config is unchanged (QA-263-012 constraint)', async () => {
  const config = await readFile(configPath, 'utf8');
  assert.match(
    config,
    /PROD_BACKEND_URL = 'https:\/\/clinicos-backend-production-df88\.up\.railway\.app'/,
    'the Railway production fallback must remain',
  );
  assert.match(
    config,
    /import\.meta\.env\.PROD \? PROD_BACKEND_URL : 'http:\/\/localhost:3001'/,
    'the PROD/dev fallback selection must remain',
  );
});
