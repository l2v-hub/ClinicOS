import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../../../', import.meta.url);
const exactWorkflowPath = new URL('.github/workflows/deploy-demo-exact-commit.yml', root);
const backendWorkflowPath = process.env.DEMO_WORKFLOW_POLICY_BACKEND_PATH
  ? new URL(`file://${process.env.DEMO_WORKFLOW_POLICY_BACKEND_PATH}`)
  : new URL('.github/workflows/deploy-backend.yml', root);

function jobs(workflow) {
  const start = workflow.indexOf('\njobs:\n');
  assert.notEqual(start, -1, 'workflow must declare jobs');
  const section = workflow.slice(start + '\njobs:\n'.length);
  return [...section.matchAll(/^  ([A-Za-z0-9_-]+):\n/gm)].map((match) => match[1]);
}

function assertExactWorkflowPolicy(exact) {
  assert.deepEqual(jobs(exact), ['demo']);
  assert.match(exact, /if: github\.repository == 'l2v-hub\/ClinicOS' && github\.ref == 'refs\/heads\/main'/);
  assert.match(exact, /environment: 'glistening-friendship \/ demo'/);
  assert.match(exact, /RAILWAY_TOKEN: \$\{\{ secrets\.RAILWAY_DEMO_TOKEN \}\}/);

  const preflightIndex = exact.indexOf('demo-deployment.mjs preflight-exact');
  const deployIndex = exact.indexOf('demo-deployment.mjs deploy-exact');
  assert.ok(preflightIndex >= 0, 'exact workflow must include preflight-exact');
  assert.ok(deployIndex > preflightIndex, 'exact workflow must preflight before deployment');
  assert.equal((exact.match(/demo-deployment\.mjs deploy-exact/g) ?? []).length, 1);
}

test('demo deployment is isolated to the fixed-main exact-commit workflow', async () => {
  const backend = await readFile(backendWorkflowPath, 'utf8');
  const exact = await readFile(exactWorkflowPath, 'utf8');

  assert.deepEqual(jobs(backend), ['deploy']);
  assert.match(backend, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(backend, /RAILWAY_TOKEN: \$\{\{ secrets\.RAILWAY_TOKEN \}\}/);
  assert.match(backend, /railway up --ci/);
  assert.doesNotMatch(backend, /RAILWAY_DEMO_TOKEN|demo-deployment\.mjs|^  demo:/m);
  assert.equal((backend.match(/RAILWAY_DEMO_TOKEN/g) ?? []).length, 0);

  assertExactWorkflowPolicy(exact);
  const missingPreflightFixture = exact.replace(
    'demo-deployment.mjs preflight-exact',
    'demo-deployment.mjs preflight-removed',
  );
  assert.notEqual(missingPreflightFixture, exact, 'fixture must remove the real preflight command');
  assert.throws(() => assertExactWorkflowPolicy(missingPreflightFixture), /preflight-exact/);
});
