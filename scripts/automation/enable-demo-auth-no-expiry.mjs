import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createMainVerifier } from './configure-demo-source.mjs';
import { historyDigest } from '../../agent-team/src/bug-pipeline/attempt-budget.mjs';
import { createGitHub } from '../../agent-team/src/bug-pipeline/github.mjs';
import { createRunner } from '../../agent-team/src/bug-pipeline/process.mjs';
import { DEMO_TARGET, DEMO_SOURCE_POLICIES, createRailwayClient, inspectDemo } from '../../agent-team/src/bug-pipeline/demo-deployment.mjs';
import { ACTION, KEY, CONFIG, MUTATION, validateNoExpiryContext, validatePrerequisites,
  FAILED_DEPLOYMENT, selectNoExpiry, createNoExpiryController, stageNoExpiry, serializeNoExpiryReceipt } from './demo-no-expiry-controller.mjs';

const REPO = 'l2v-hub/ClinicOS';
const SAFE = (message, forbidden) => {
  const text = String(message);
  const aliases = forbidden.filter(x => typeof x === 'string' && x).flatMap(raw => {
    let normalized; try { normalized = new Headers({ 'X-Credential': raw }).get('X-Credential'); } catch { normalized = null; }
    return [raw, normalized].filter(Boolean).flatMap(x => [x, JSON.stringify(x).slice(1, -1)]);
  });
  if (!aliases.some(x => text.includes(x)))
    console.log(text);
};
async function publicJson(path) {
  const url = `https://${DEMO_TARGET.domain}${path}`;
  if (![`https://${DEMO_TARGET.domain}/ready`, `https://${DEMO_TARGET.domain}/auth/status`].includes(url)) throw Error('URL');
  const response = await fetch(url, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw Error('HTTP');
  const chunks = []; let size = 0;
  for await (const chunk of response.body) { size += chunk.length; if (size > 16384) throw Error('SIZE'); chunks.push(Buffer.from(chunk)); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
const VARIABLE_QUERY = `query($projectId:String!,$environmentId:String!,$serviceId:String){variables(projectId:$projectId,environmentId:$environmentId,serviceId:$serviceId)}`;
const FAILED_QUERY = 'query($id:String!){deployment(id:$id){id status projectId environmentId serviceId meta}}';
export async function inspectNoExpiryTarget({ client, readPublic, assertFreshMain, request }) {
  await assertFreshMain();
  const target = await inspectDemo(client, DEMO_SOURCE_POLICIES.exact);
  if (target.projectToken?.project?.id !== DEMO_TARGET.projectId || target.projectToken?.environment?.id !== DEMO_TARGET.environmentId ||
      target.serviceInstance?.serviceId !== DEMO_TARGET.serviceId || target.serviceInstance?.environmentId !== DEMO_TARGET.environmentId)
    throw Error('TARGET');
  // Read the provider-resolved map only after fixed target identity is proved. Never log,
  // hash, persist, or include this map or any secret value in a receipt.
  if (target.serviceInstance?.latestDeployment?.id !== FAILED_DEPLOYMENT.id || target.serviceInstance.latestDeployment.status !== 'FAILED')
    throw Error('LATEST');
  const failure = (await client(FAILED_QUERY, { id: FAILED_DEPLOYMENT.id }))?.deployment;
  if (failure?.id !== FAILED_DEPLOYMENT.id || failure.status !== 'FAILED' ||
      failure.projectId !== DEMO_TARGET.projectId || failure.environmentId !== DEMO_TARGET.environmentId ||
      failure.serviceId !== DEMO_TARGET.serviceId || failure.meta?.commitHash !== FAILED_DEPLOYMENT.sourceSha) throw Error('FAILED_PROOF');
  const response = await client(VARIABLE_QUERY, DEMO_TARGET), variables = response?.variables;
  if (Array.isArray(variables)) { variables.fill(undefined); throw Error('VARIABLES'); }
  if (!variables || typeof variables !== 'object') throw Error('VARIABLES');
  let ready, authStatus, secretConfigured = false;
  try {
    ready = await readPublic('/ready'); authStatus = await readPublic('/auth/status');
    validatePrerequisites({ target, ready, authStatus, config: variables });
    secretConfigured = variables.ROLE_SIMULATOR_SECRET.length >= 32;
    if (target.deployments?.pageInfo?.hasNextPage !== false || target.deployments.edges.length !== 0)
      throw Error('rollout');
    const active = target.serviceInstance.activeDeployments;
    if (!Array.isArray(active) || active.length !== 1 || active[0].status !== 'SUCCESS' ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(active[0].id ?? '') ||
        !/^[a-f0-9]{40}$/.test(active[0].meta?.commitHash ?? '') ||
        active[0].meta.commitHash === failure.meta.commitHash ||
        active[0].id === FAILED_DEPLOYMENT.id || target.serviceInstance.latestDeployment?.id === active[0].id ||
        ready.deploymentId !== active[0].id || ready.checks?.database !== 'ok' || ready.checks?.policy !== 'ok') throw Error('active');
    if (request !== undefined && (!request || typeof request !== 'object' || Array.isArray(request) ||
        request.activeDeploymentId !== active[0].id || request.activeSourceSha !== active[0].meta.commitHash ||
        request.failedDeploymentId !== failure.id || request.failedSourceSha !== failure.meta.commitHash ||
        !/^[a-f0-9]{40}$/.test(request.reviewedSha ?? '') || request.reviewedSha === active[0].meta.commitHash))
      throw Error('REQUEST_BINDING');
    await assertFreshMain();
    return { activeSourceSha: active[0].meta.commitHash, activeDeploymentId: active[0].id,
      failedDeploymentId: failure.id, failedSourceSha: failure.meta.commitHash, prerequisitesVerified: true,
      fingerprint: historyDigest({ target: DEMO_TARGET, activeDeploymentId: active[0].id,
        activeSourceSha: active[0].meta.commitHash, failedDeploymentId: failure.id, failedSourceSha: failure.meta.commitHash,
        ready: { status: ready.status, tier: ready.tier }, auth: { mode: authStatus.mode,
          simulator: authStatus.simulator, syntheticOnly: authStatus.syntheticOnly,
          authEnabled: authStatus.authEnabled, authSigningSecretConfigured: secretConfigured } }) };
  }
  finally { for (const key of Object.keys(variables)) delete variables[key]; }
}
export async function runNoExpiry(mode, env = process.env) {
  if (!['inspect', 'stage', 'metadata'].includes(mode)) throw Error('MODE');
  const context = validateNoExpiryContext(env);
  const selector = selectNoExpiry({ subjectId: env.NO_EXPIRY_SUBJECT_ID,
    operationNonce: env.NO_EXPIRY_OPERATION_NONCE, reviewedSha: context.reviewedSha });
  const client = createRailwayClient({ token: env.RAILWAY_TOKEN });
  const assertFreshMain = createMainVerifier({ token: env.GITHUB_TOKEN, reviewedSha: context.reviewedSha });
  const inspect = request => inspectNoExpiryTarget({ client, readPublic: publicJson, assertFreshMain, request });
  if (mode === 'metadata') return { schemaVersion: 1, status: 'metadata-readonly-verified', code: 'NO_EXPIRY_METADATA',
    reviewedSha: selector.reviewedSha, ...await inspect(), mutationAttempted: false, deploymentTriggered: false };
  const github = createGitHub({ repo: REPO, cwd: process.cwd(), run: createRunner({ runtimeRoot: '.demo-auth-no-expiry-runtime' }) });
  const controller = createNoExpiryController({ github, assertCurrentMain: assertFreshMain });
  if (mode === 'inspect') {
    const request = (await controller.inspectRequest(selector, env.GITHUB_ACTOR)).request;
    const snapshot = await inspect(request);
    return { schemaVersion: 1, status: 'inspection-passed-awaiting-stage', code: 'NO_EXPIRY_INSPECTED',
      reviewedSha: selector.reviewedSha, operationNonce: selector.operationNonce, ...snapshot,
      mutationAttempted: false, deploymentTriggered: false };
  }
  if (MUTATION !== 'mutation($input:VariableCollectionUpsertInput!){variableCollectionUpsert(input:$input)}' ||
      ACTION !== 'enable-demo-auth-no-expiry' || KEY !== 'DEMO_AUTH_NO_EXPIRY' ||
      JSON.stringify(CONFIG) !== JSON.stringify({ CLINICOS_ENV: 'demo', DEMO_AUTH_NO_EXPIRY: 'true' })) throw Error('CONFIG');
  return stageNoExpiry({ selector, actor: env.GITHUB_ACTOR, runId: context.runId, controller, inspect, client });
}
async function main() {
  const env = process.env, forbidden = [env.RAILWAY_TOKEN, env.GH_TOKEN, env.GITHUB_TOKEN];
  let result = { schemaVersion: 1, status: 'blocked-before-write', code: 'NO_EXPIRY_BLOCKED', mutationAttempted: false, deploymentTriggered: false };
  try { result = await runNoExpiry(process.argv[2] ?? 'inspect', env); } catch { /* provider details never escape */ }
  await writeFile('demo-auth-no-expiry-receipt.json', serializeNoExpiryReceipt(result, forbidden), { flag: 'wx', mode: 0o600 });
  SAFE(`DEMO_AUTH_NO_EXPIRY ${result.status}`, forbidden);
  if (!['inspection-passed-awaiting-stage', 'staged-awaiting-explicit-deployment', 'metadata-readonly-verified'].includes(result.status)) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(() => {
  SAFE('DEMO_AUTH_NO_EXPIRY_RECEIPT_FAILED', [process.env.RAILWAY_TOKEN, process.env.GH_TOKEN, process.env.GITHUB_TOKEN]); process.exitCode = 1;
});
