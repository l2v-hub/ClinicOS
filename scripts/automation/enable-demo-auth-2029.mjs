import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createMainVerifier } from './configure-demo-source.mjs';
import { createDemo2029Controller, validateDemo2029Request, selectDemo2029, EXPIRY_2029, KEY } from './demo-2029-controller.mjs';
import { createGitHub } from '../../agent-team/src/bug-pipeline/github.mjs';
import { createRunner } from '../../agent-team/src/bug-pipeline/process.mjs';
import { historyDigest } from '../../agent-team/src/bug-pipeline/attempt-budget.mjs';
import { DEMO_TARGET, DEMO_SOURCE_POLICIES, inspectDemo, createRailwayClient, createProofReader } from '../../agent-team/src/bug-pipeline/demo-deployment.mjs';

// One fixed finite expiry only; staging never triggers a rollout or changes flags.
export const DEMO_2029_MUTATION = 'mutation($input:VariableUpsertInput!){variableUpsert(input:$input)}';
const FAILED_DEPLOYMENT_QUERY = 'query($id:String!){deployment(id:$id){id status projectId environmentId serviceId meta}}';
const REPO = 'l2v-hub/ClinicOS';
const SHA = /^[a-f0-9]{40}(?![\s\S])/, HASH = /^[a-f0-9]{64}(?![\s\S])/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?![\s\S])/i;
const clone = structuredClone;
export function validateDemo2029Context(env) {
  assert.equal(env.GITHUB_ACTIONS, 'true'); assert.equal(env.GITHUB_REPOSITORY, REPO);
  assert.equal(env.GITHUB_REF, 'refs/heads/main'); assert.equal(env.GITHUB_EVENT_NAME, 'workflow_dispatch');
  assert.equal(env.GITHUB_WORKFLOW_REF, `${REPO}/.github/workflows/enable-demo-auth-2029.yml@refs/heads/main`);
  assert.equal(env.GITHUB_ACTOR, 'l2v-hub'); assert.equal(env.GITHUB_TRIGGERING_ACTOR, env.GITHUB_ACTOR);
  assert.match(env.GITHUB_SHA ?? '', SHA); assert.equal(env.DEMO2029_REVIEWED_SHA, env.GITHUB_SHA);
  assert.equal(env.GITHUB_WORKFLOW_SHA, env.GITHUB_SHA); assert.equal(env.GITHUB_RUN_ATTEMPT, '1');
  assert.match(env.GITHUB_RUN_ID ?? '', /^[1-9][0-9]{0,19}(?![\s\S])/);
  return { reviewedSha: env.GITHUB_SHA, runId: env.GITHUB_RUN_ID, runAttempt: 1 };
}
export async function inspectDemo2029Target({ request: raw, client, readPublic, assertFreshMain }) {
  const request = validateDemo2029Request(raw); assert.equal(typeof assertFreshMain, 'function'); await assertFreshMain();
  const data = await inspectDemo(client, DEMO_SOURCE_POLICIES.exact), instance = data.serviceInstance;
  assert.equal(data.projectToken.environment.name, 'demo');
  assert.equal(data.deployments?.pageInfo?.hasNextPage, false); assert.deepEqual(data.deployments.edges, []);
  const active = instance.activeDeployments; assert.ok(Array.isArray(active) && active.length === 1);
  assert.equal(active[0].status, 'SUCCESS'); assert.equal(active[0].id, request.activeDeploymentId);
  assert.equal(active[0].meta?.commitHash, request.activeSourceSha); assert.notEqual(active[0].meta.commitHash, request.reviewedSha);
  const latest = instance.latestDeployment;
  assert.equal(latest?.id, request.failedDeploymentId); assert.equal(latest.status, 'FAILED');
  const failure = (await client(FAILED_DEPLOYMENT_QUERY, { id: request.failedDeploymentId })).deployment;
  assert.equal(failure?.id, request.failedDeploymentId); assert.equal(failure.status, 'FAILED');
  assert.equal(failure.projectId, DEMO_TARGET.projectId); assert.equal(failure.environmentId, DEMO_TARGET.environmentId);
  assert.equal(failure.serviceId, DEMO_TARGET.serviceId); assert.equal(failure.meta?.commitHash, request.failedSourceSha);
  const status = await readPublic(`https://${DEMO_TARGET.domain}/auth/status`);
  assert.equal(status.mode, 'disabled'); assert.equal(status.simulator, false);
  assert.equal(status.temporaryDemo, false); assert.equal(status.syntheticOnly, true);
  assert.ok(status.permanentDemo === undefined || status.permanentDemo === false);
  assert.ok(typeof status.expiresAt === 'string' &&
    [request.previousExpiry, new Date(request.previousExpiry).toISOString()].includes(status.expiresAt));
  const ready = await readPublic(`https://${DEMO_TARGET.domain}/ready`);
  assert.equal(ready.status, 'ready'); assert.equal(ready.tier, 'demo'); assert.equal(ready.deploymentId, active[0].id);
  assert.equal(ready.checks?.database, 'ok'); assert.equal(ready.checks?.policy, 'ok');
  await assertFreshMain();
  const snapshot = { target: DEMO_TARGET, reviewedSha: request.reviewedSha, activeDeploymentId: active[0].id,
    activeSourceSha: active[0].meta.commitHash, latestDeploymentId: latest.id, latestStatus: latest.status,
    authMode: status.mode, simulator: status.simulator, syntheticOnly: true, previousExpiry: request.previousExpiry,
    failedDeploymentId: request.failedDeploymentId, failedSourceSha: request.failedSourceSha };
  return { ...snapshot, fingerprint: historyDigest(snapshot) };
}
export async function stageDemo2029({ selector, actor, runId, controller, inspect, client, onProgress = () => {} }) {
  selector = Object.freeze(selectDemo2029(selector));
  const prepared = await controller.prepare(selector), request = Object.freeze(clone(prepared.request));
  const fresh = () => inspect(clone(request)), snapshot = Object.freeze(clone(await fresh()));
  const claim = await controller.claim(selector, { actor, runId, fingerprint: snapshot.fingerprint, fresh });
  let attempted = false, acknowledged = false;
  const receipt = (status, code) => ({ schemaVersion: 1, status, code, ...selector,
    authorizationDigest: prepared.authorizationDigest, priorOperationsDigest: prepared.priorOperationsDigest,
    fingerprint: snapshot.fingerprint, activeDeploymentId: request.activeDeploymentId, activeSourceSha: request.activeSourceSha,
    previousExpiry: request.previousExpiry, newExpiry: EXPIRY_2029, failedDeploymentId: request.failedDeploymentId,
    mutationAttempted: attempted, deploymentTriggered: false });
  onProgress(receipt('claimed-before-write', 'DEMO2029_CLAIMED'));
  try {
    await controller.assertOwned(claim, 'claimed'); assert.equal((await fresh()).fingerprint, snapshot.fingerprint);
    await controller.intent(claim); await controller.assertOwned(claim, 'write-intent');
    assert.equal((await fresh()).fingerprint, snapshot.fingerprint);
    await controller.assertOwned(claim, 'write-intent'); // LAST async source/ownership fence before mutation.
    attempted = true; onProgress(receipt('mutation-uncertain-do-not-retry', 'DEMO2029_WRITE_INTENT'));
    const result = await client(DEMO_2029_MUTATION, { input: {
      projectId: DEMO_TARGET.projectId, environmentId: DEMO_TARGET.environmentId, serviceId: DEMO_TARGET.serviceId,
      name: KEY, value: EXPIRY_2029, skipDeploys: true,
    } });
    assert.equal(result?.variableUpsert, true); acknowledged = true;
    await controller.finish(claim, 'staged'); return receipt('staged-awaiting-explicit-deployment', 'DEMO2029_STAGED');
  } catch {
    try { await controller.finish(claim, attempted ? 'uncertain' : 'blocked-before-write'); } catch { /* Durable intent remains; never retry. */ }
    return receipt(attempted ? 'mutation-uncertain-do-not-retry' : 'blocked-before-write',
      acknowledged ? 'DEMO2029_ACKNOWLEDGED_RECORD_UNCERTAIN' : attempted ? 'DEMO2029_WRITE_UNCERTAIN' : 'DEMO2029_BLOCKED');
  }
}
export async function runDemo2029Operation({ mode = 'inspect', ...options }) {
  assert.ok(['inspect', 'stage'].includes(mode)); if (mode === 'stage') return stageDemo2029(options);
  const request = (await options.controller.inspectRequest(options.selector)).request;
  const snapshot = await options.inspect(clone(request));
  return { schemaVersion: 1, status: 'inspection-passed-awaiting-stage', code: 'DEMO2029_INSPECTED', ...options.selector,
    fingerprint: snapshot.fingerprint, activeDeploymentId: request.activeDeploymentId, activeSourceSha: request.activeSourceSha,
    mutationAttempted: false, deploymentTriggered: false };
}
const fields = new Set(['schemaVersion', 'status', 'code', 'subjectId', 'reviewedSha', 'operationNonce', 'authorizationDigest',
  'priorOperationsDigest', 'fingerprint', 'activeDeploymentId', 'activeSourceSha', 'previousExpiry', 'newExpiry', 'failedDeploymentId', 'mutationAttempted', 'deploymentTriggered']);
const statuses = new Set(['blocked-before-write', 'inspection-passed-awaiting-stage', 'claimed-before-write',
  'mutation-uncertain-do-not-retry', 'staged-awaiting-explicit-deployment']);
const codes = new Set(['DEMO2029_BLOCKED', 'DEMO2029_INSPECTED', 'DEMO2029_CLAIMED', 'DEMO2029_WRITE_INTENT',
  'DEMO2029_STAGED', 'DEMO2029_ACKNOWLEDGED_RECORD_UNCERTAIN', 'DEMO2029_WRITE_UNCERTAIN']);
function reflected(text, values) {
  return values.filter(v => typeof v === 'string' && v).some(raw => {
    let effective = raw; try { effective = new Headers({ 'X-Credential': raw }).get('X-Credential'); } catch { /* raw checked */ }
    return [raw, effective].filter(Boolean).some(v => text.includes(v) || text.includes(JSON.stringify(v).slice(1, -1)));
  });
}
export function serializeDemo2029Receipt(receipt, forbidden = []) {
  assert.ok(receipt && Object.keys(receipt).every(k => fields.has(k))); assert.equal(receipt.schemaVersion, 1);
  assert.ok(statuses.has(receipt.status) && codes.has(receipt.code));
  assert.equal(typeof receipt.mutationAttempted, 'boolean'); assert.equal(receipt.deploymentTriggered, false);
  if (receipt.subjectId !== undefined) assert.equal(receipt.subjectId, 'standalone-pr-525');
  if (receipt.operationNonce !== undefined) assert.match(receipt.operationNonce, UUID);
  if (receipt.activeDeploymentId !== undefined) assert.match(receipt.activeDeploymentId, UUID);
  if (receipt.failedDeploymentId !== undefined) assert.match(receipt.failedDeploymentId, UUID);
  if (receipt.newExpiry !== undefined) assert.equal(receipt.newExpiry, EXPIRY_2029);
  if (receipt.previousExpiry !== undefined) {
    assert.ok(typeof receipt.previousExpiry === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(receipt.previousExpiry));
    assert.equal(new Date(receipt.previousExpiry).toISOString().replace('.000Z', 'Z'), receipt.previousExpiry);
  }
  for (const k of ['reviewedSha', 'activeSourceSha']) if (receipt[k] !== undefined) assert.match(receipt[k], SHA);
  for (const k of ['authorizationDigest', 'priorOperationsDigest', 'fingerprint']) if (receipt[k] !== undefined) assert.match(receipt[k], HASH);
  const text = JSON.stringify(receipt, null, 2) + '\n'; assert.ok(Buffer.byteLength(text) <= 8192 && !reflected(text, forbidden)); return text;
}
async function readPublic(url) {
  assert.ok([`https://${DEMO_TARGET.domain}/auth/status`, `https://${DEMO_TARGET.domain}/ready`].includes(url));
  const response = await fetch(url, { redirect: 'error', cache: 'no-store', headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(20000) });
  assert.equal(response.ok, true); const chunks = []; let length = 0;
  for await (const chunk of response.body) { length += chunk.length; assert.ok(length <= 16384); chunks.push(Buffer.from(chunk)); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
async function main() {
  const env = process.env, forbidden = [env.RAILWAY_TOKEN, env.GH_TOKEN, env.GITHUB_TOKEN];
  let result = { schemaVersion: 1, status: 'blocked-before-write', code: 'DEMO2029_BLOCKED', mutationAttempted: false, deploymentTriggered: false };
  const output = text => { if (!reflected(text, forbidden)) console.log(text); };
  try {
    const context = validateDemo2029Context(env), selector = selectDemo2029({ subjectId: env.DEMO2029_SUBJECT_ID,
      operationNonce: env.DEMO2029_OPERATION_NONCE, reviewedSha: context.reviewedSha });
    const github = createGitHub({ repo: REPO, cwd: process.cwd(), run: createRunner({ runtimeRoot: '.demo-auth-2029-runtime' }) });
    const reader = createProofReader({ token: env.GH_TOKEN });
    const assertFreshMain = createMainVerifier({ token: env.GITHUB_TOKEN, reviewedSha: context.reviewedSha });
    const controller = createDemo2029Controller({ github, readRun: id => reader.getJson(`actions/runs/${id}`), assertCurrentMain: assertFreshMain });
    const client = createRailwayClient({ token: env.RAILWAY_TOKEN });
    result = await runDemo2029Operation({ mode: process.argv[2] ?? 'inspect', selector, actor: env.GITHUB_ACTOR, runId: context.runId,
      controller, client, inspect: request => inspectDemo2029Target({ request, client, readPublic, assertFreshMain }), onProgress: v => { result = v; } });
  } catch { /* No provider/credential response crosses the boundary. */ }
  await writeFile('demo-auth-2029-receipt.json', serializeDemo2029Receipt(result, forbidden), { flag: 'wx', mode: 0o600 });
  output(`DEMO2029_STAGE ${result.status}`);
  if (!['inspection-passed-awaiting-stage', 'staged-awaiting-explicit-deployment'].includes(result.status)) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(() => {
  if (!reflected('DEMO2029_RECEIPT_FAILED_DO_NOT_RETRY', [process.env.RAILWAY_TOKEN, process.env.GH_TOKEN, process.env.GITHUB_TOKEN]))
    console.error('DEMO2029_RECEIPT_FAILED_DO_NOT_RETRY'); process.exitCode = 1;
});
