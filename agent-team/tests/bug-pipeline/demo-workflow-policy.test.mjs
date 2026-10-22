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

function assertBackendWorkflowPolicy(backend) {
  assert.deepEqual(jobs(backend), ['deploy'], 'backend workflow must contain only the production deploy job');
  assert.match(backend, /^  workflow_dispatch:\s*$/m, 'manual production dispatch must remain enabled');
  assert.doesNotMatch(backend, /^    inputs:\s*$/m, 'manual dispatch must not define operation inputs');
  assert.doesNotMatch(backend, /\binputs\.operation\b|\boperation:/, 'manual dispatch must not select preflight or deploy');
  assert.match(backend, /^    if: github\.ref == 'refs\/heads\/main'$/m, 'deploy job must run only on main');
  assert.match(backend, /RAILWAY_TOKEN: \$\{\{ secrets\.RAILWAY_TOKEN \}\}/);
  assert.match(backend, /railway up --ci/);
  assert.doesNotMatch(backend, /RAILWAY_DEMO_TOKEN|demo-deployment\.mjs|^  demo:/m);
}

test('demo deployment is isolated to the fixed-main exact-commit workflow', async () => {
  const backend = await readFile(backendWorkflowPath, 'utf8');
  const exact = await readFile(exactWorkflowPath, 'utf8');

  assertBackendWorkflowPolicy(backend);
  assert.equal((backend.match(/RAILWAY_DEMO_TOKEN/g) ?? []).length, 0);

  const old737WorkflowFixture = backend
    .replace('  workflow_dispatch:\n', `  workflow_dispatch:\n    inputs:\n      operation:\n        description: Read-only target preflight, or deployment of this exact main commit\n        type: choice\n        options: [preflight, deploy]\n        default: preflight\n        required: true\n`)
    .replace(
      "if: github.ref == 'refs/heads/main'",
      "if: github.ref == 'refs/heads/main' && (github.event_name == 'push' || inputs.operation == 'deploy')",
    );
  assert.notEqual(old737WorkflowFixture, backend, 'old 737 workflow fixture must restore the preflight selector');
  assert.throws(() => assertBackendWorkflowPolicy(old737WorkflowFixture), /manual dispatch must not define operation inputs/);

  const wrongMainFixture = backend.replace(
    "if: github.ref == 'refs/heads/main'",
    "if: github.ref == 'refs/heads/release'",
  );
  assert.notEqual(wrongMainFixture, backend, 'wrong-main fixture must alter the job condition');
  assert.throws(() => assertBackendWorkflowPolicy(wrongMainFixture), /deploy job must run only on main/);

  const legacyDemoFixture = backend.replace(
    '\njobs:\n  deploy:\n',
    '\njobs:\n  demo:\n    runs-on: ubuntu-latest\n  deploy:\n',
  );
  assert.notEqual(legacyDemoFixture, backend, 'legacy-demo fixture must add a second job');
  assert.throws(() => assertBackendWorkflowPolicy(legacyDemoFixture), /only the production deploy job/);

  assertExactWorkflowPolicy(exact);
  const missingPreflightFixture = exact.replace(
    'demo-deployment.mjs preflight-exact',
    'demo-deployment.mjs preflight-removed',
  );
  assert.notEqual(missingPreflightFixture, exact, 'fixture must remove the real preflight command');
  assert.throws(() => assertExactWorkflowPolicy(missingPreflightFixture), /preflight-exact/);
});
