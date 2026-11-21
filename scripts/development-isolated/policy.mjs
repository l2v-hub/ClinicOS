import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const REPOSITORY = 'l2v-hub/ClinicOS';
export const APP = Object.freeze({
  sha: 'b5e79ae7bec869af894f12ed6676547f21172db4',
  tree: '131b244c873c521500f732d0615f4edd0f8a5731',
});
export const TARGET = Object.freeze({
  projectId: '30bfd0c6-2b4d-4fcd-b219-f1fbfe1d9820',
  environmentId: 'e54fd397-76c8-4a14-ac03-4d8a4d580173',
  environmentName: 'development',
});
export const SERVICES = Object.freeze({
  backend: 'f46547d5-1eb2-42a0-bd13-de2a1f7feca1',
  runtime: 'b3bf897a-4e0f-41a1-aa58-3687d9a66443',
  database: '8cc1c795-5a61-4ead-b6f4-020b2c29a91b',
});
export const ENVIRONMENT = 'clinicos-development-isolated / development';
export const WORKFLOW = '.github/workflows/deploy-development-exact.yml';
export const REQUIRED_CHECKS = Object.freeze([
  'bug-pipeline-tests',
  'secret-scan',
  'frontend-tests',
  'archive-tests',
  'gate',
  'browser-e2e',
  'development-release-tests',
]);
export const SHA = /^[a-f0-9]{40}$/;
export const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function request(input) {
  assert.deepEqual(
    Object.keys(input).sort(),
    ['action', 'dispatchId', 'service', 'workflowSha'].sort(),
  );
  assert.ok(['preflight', 'stage-source', 'commit-source', 'deploy'].includes(input.action));
  assert.ok(['backend', 'runtime'].includes(input.service));
  assert.match(input.dispatchId, UUID);
  assert.match(input.workflowSha, SHA);
  return Object.freeze({ ...input, ...TARGET, serviceId: SERVICES[input.service], app: APP });
}
export function sourcePatch(service) {
  assert.ok(['backend', 'runtime'].includes(service));
  return {
    services: {
      [SERVICES[service]]: {
        source: {
          repo: REPOSITORY,
          commitSha: APP.sha,
          branch: null,
          rootDirectory: service === 'runtime' ? '/clinicos-ai-runtime' : '',
        },
      },
    },
  };
}
export function validateContext(env, req) {
  assert.equal(env.GITHUB_REPOSITORY, REPOSITORY);
  assert.equal(env.GITHUB_EVENT_NAME, 'workflow_dispatch');
  assert.equal(env.GITHUB_REF, 'refs/heads/main');
  assert.equal(env.GITHUB_SHA, req.workflowSha);
  assert.equal(env.GITHUB_WORKFLOW_SHA, req.workflowSha);
  assert.equal(env.GITHUB_WORKFLOW_REF, `${REPOSITORY}/${WORKFLOW}@refs/heads/main`);
  assert.equal(env.GITHUB_RUN_ATTEMPT, '1', 'Reruns cannot replay a provider mutation');
  assert.equal(env.GITHUB_ACTOR, env.GITHUB_TRIGGERING_ACTOR);
  assert.ok(env.GITHUB_ACTOR);
}
export function validateInventory(data, req) {
  assert.equal(data?.projectToken?.project?.id, TARGET.projectId);
  assert.equal(data?.projectToken?.environment?.id, TARGET.environmentId);
  assert.equal(data?.projectToken?.environment?.name, TARGET.environmentName);
  const e = data.environment;
  assert.equal(e?.id, TARGET.environmentId);
  assert.equal(e.projectId, TARGET.projectId);
  assert.equal(e.name, TARGET.environmentName);
  assert.equal(e.isEphemeral, false);
  assert.equal(e.serviceInstances?.pageInfo?.hasNextPage, false);
  assert.equal(e.deploymentTriggers?.pageInfo?.hasNextPage, false);
  assert.deepEqual(e.deploymentTriggers.edges, [], 'Auto-deploy triggers must be absent');
  const rows = e.serviceInstances.edges.map(({ node }) => node);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((r) => r.serviceId).sort(), Object.values(SERVICES).sort());
  for (const row of rows) {
    assert.equal(row.environmentId, TARGET.environmentId);
    assert.ok(Array.isArray(row.activeDeployments));
    assert.ok(row.activeDeployments.length <= 1);
    assert.ok(row.activeDeployments.every((d) => d.status === 'SUCCESS'));
    assert.ok(
      row.latestDeployment === null ||
        ['SUCCESS', 'FAILED', 'CRASHED', 'REMOVED', 'SKIPPED'].includes(
          row.latestDeployment?.status,
        ),
    );
  }
  const row = rows.find((r) => r.serviceId === req.serviceId);
  assert.ok(row);
  return row;
}
export function validateReleaseProof(
  { pr, reviews, checks, mainSha, appTree, workflowTree, reviewedTree },
  req,
) {
  assert.equal(mainSha, req.workflowSha);
  assert.equal(appTree, APP.tree);
  assert.equal(pr.state, 'closed');
  assert.equal(pr.merged, true);
  assert.equal(pr.base?.ref, 'main');
  assert.equal(pr.base?.repo?.full_name, REPOSITORY);
  assert.equal(pr.head?.repo?.full_name, REPOSITORY);
  assert.equal(pr.merge_commit_sha, req.workflowSha);
  assert.match(workflowTree, SHA);
  assert.equal(workflowTree, reviewedTree, 'Merged workflow must equal the reviewed tree');
  const latest = new Map();
  for (const review of reviews) {
    if (['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state))
      latest.set(review.user?.login, review);
  }
  const approval = [...latest.values()].find(
    (r) =>
      r.state === 'APPROVED' &&
      r.commit_id === pr.head.sha &&
      r.user?.type === 'User' &&
      r.user.login !== pr.user?.login,
  );
  assert.ok(approval, 'Independent native human approval required');
  assert.equal(checks.total_count, checks.check_runs.length);
  assert.ok(checks.total_count < 100);
  assert.ok(
    checks.check_runs.every(
      (c) =>
        c.name === 'Vercel' ||
        (c.status === 'completed' && ['success', 'skipped'].includes(c.conclusion)),
    ),
    'Unknown optional failures cannot authorize release',
  );
  for (const name of REQUIRED_CHECKS) {
    const named = checks.check_runs.filter((c) => c.name === name);
    assert.equal(named.length, 1, 'Required check inventory must be unique');
    assert.equal(named[0].status, 'completed');
    assert.equal(named[0].conclusion, 'success');
    assert.equal(named[0].head_sha, pr.head.sha);
    assert.equal(named[0].app?.slug, 'github-actions');
  }
  return approval.user.login;
}
