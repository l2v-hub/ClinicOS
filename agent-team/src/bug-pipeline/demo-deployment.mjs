import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { createMainVerifier } from '../../../scripts/automation/configure-demo-source.mjs';

export const DEMO_TARGET = Object.freeze({
  projectId: 'bddf5d1b-ee83-4362-8238-a79721f795e5',
  environmentId: '8021987e-8eaa-4bc8-a102-20566db5e6b4',
  serviceId: 'c000f011-0349-4ea9-9b56-13c625b5767b',
  domain: 'clinicos-backend-demo.up.railway.app',
});
const REPO = 'l2v-hub/ClinicOS';
const SHA = /^[a-f0-9]{40}(?![\s\S])/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?![\s\S])/i;
const DIGEST = /^sha256:[a-f0-9]{64}$/;
const WORKFLOW = '.github/workflows/deploy-backend.yml';
const EXACT_WORKFLOW = '.github/workflows/deploy-demo-exact-commit.yml';
export const DEMO_SOURCE_POLICIES = Object.freeze({
  trigger: 'main-trigger-v1',
  exact: 'native-exact-commit-v1',
});
const API = 'https://api.github.com';
const RAILWAY_API = 'https://backboard.railway.app/graphql/v2';
const MAX_BYTES = 1024 * 1024;
export class DemoProofError extends Error {}
export class DemoTransientReadError extends DemoProofError {}
// Includes initial inspections, 30s reads/main checks, 20s readiness and all delays/rechecks.
export const DEMO_DEPLOY_BUDGET_MS = 25 * 60 * 1000;
const SETTLED_STATUSES = ['SUCCESS', 'FAILED', 'CRASHED', 'REMOVED', 'SKIPPED'];
function requireIdleDemo(data) {
  const inventory = data?.deployments;
  const active = data?.serviceInstance?.activeDeployments;
  const latest = data?.serviceInstance?.latestDeployment;
  if (
    inventory?.pageInfo?.hasNextPage !== false ||
    !Array.isArray(inventory.edges) ||
    inventory.edges.length !== 0 ||
    !Array.isArray(active) ||
    active.length > 1 ||
    active.some((d) => !UUID.test(d?.id ?? '') || d.status !== 'SUCCESS') ||
    latest === undefined ||
    (latest === null && active.length !== 0) ||
    (latest !== null && (!UUID.test(latest?.id ?? '') || !SETTLED_STATUSES.includes(latest.status)))
  )
    fail(
      'complete idle demo deployment inventory required; an overlapping rollout cannot be submitted',
    );
}
function previousActive(data) {
  const active = data.serviceInstance.activeDeployments;
  if (active.length !== 1) return null;
  return {
    id: active[0].id,
    commitHash: SHA.test(active[0].meta?.commitHash ?? '') ? active[0].meta.commitHash : null,
  };
}
const fail = (message) => {
  throw new DemoProofError(`Demo deployment proof rejected: ${message}`);
};
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const integer = (n) => Number.isSafeInteger(n) && n > 0;

// Check the actual bytes written, including JSON escaping, without reflecting a rejected value.
export function serializeDemoMetadata(value, { forbiddenValues = [] } = {}) {
  const json = JSON.stringify(value, null, 2);
  if (
    typeof json !== 'string' ||
    forbiddenValues.some(
      (secret) =>
        typeof secret === 'string' &&
        secret.length > 0 &&
        (json.includes(secret) || json.includes(JSON.stringify(secret).slice(1, -1))),
    )
  )
    fail('credential-free metadata required');
  return `${json}\n`;
}

// Use the platform's actual header normalization, not an assumed credential format.
function headerCredential(raw) {
  if (raw === undefined || raw === null || raw === '') return { raw, effective: raw, valid: true };
  try {
    if (typeof raw !== 'string') return { raw, valid: false };
    // Headers can trim CR/LF at the edges and can retain other control bytes
    // that the HTTP transport rejects. Retain its alias even when failing closed.
    const effective = new Headers({ 'Project-Access-Token': raw }).get('Project-Access-Token');
    return { raw, effective, valid: !/[\x00-\x08\x0a-\x1f\x7f]/.test(raw) };
  } catch {
    return { raw, valid: false };
  }
}

function captureDemoBindings(env) {
  const railway = headerCredential(env.RAILWAY_TOKEN);
  const github = headerCredential(env.GITHUB_TOKEN);
  return Object.freeze({
    railwayToken: railway.effective,
    githubToken: github.effective,
    valid: railway.valid && github.valid,
    forbiddenValues: Object.freeze([railway.raw, railway.effective, github.raw, github.effective]),
  });
}

const requireValidBindings = (bindings) => {
  if (!bindings.valid) fail('valid HTTP credential bindings required');
};

async function boundedBytes(response, max = MAX_BYTES) {
  if (!response.ok) fail('HTTP request did not succeed');
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > max) {
      await response.body.cancel().catch(() => {});
      fail('response too large');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function fetchJson(
  url,
  { fetchImpl = fetch, transientRead = false, ...options } = {},
) {
  const response = await fetchImpl(url, {
    ...options,
    redirect: 'error',
    signal: AbortSignal.timeout(30_000),
  });
  try {
    return JSON.parse((await boundedBytes(response)).toString('utf8'));
  } catch (error) {
    if (
      transientRead &&
      (error instanceof TypeError || ['AbortError', 'TimeoutError'].includes(error?.name))
    )
      throw new DemoTransientReadError(
        'Demo deployment proof rejected: transient Railway read unavailable',
      );
    fail('invalid bounded JSON response');
  }
}

function sourcePolicy(value = DEMO_SOURCE_POLICIES.trigger) {
  if (!Object.values(DEMO_SOURCE_POLICIES).includes(value)) fail('unknown source policy');
  return value;
}

function policyWorkflow(policy) {
  return sourcePolicy(policy) === DEMO_SOURCE_POLICIES.exact ? EXACT_WORKFLOW : WORKFLOW;
}

export function validateTarget(data, policy = DEMO_SOURCE_POLICIES.trigger) {
  policy = sourcePolicy(policy);
  const token = data?.projectToken;
  const instance = data?.serviceInstance;
  if (
    token?.project?.id !== DEMO_TARGET.projectId ||
    token?.environment?.id !== DEMO_TARGET.environmentId ||
    token?.environment?.name !== 'demo' ||
    instance?.serviceId !== DEMO_TARGET.serviceId ||
    instance?.environmentId !== DEMO_TARGET.environmentId ||
    instance?.source?.repo !== REPO
  )
    fail('token, source, or target mismatch');
  const triggers = data?.deploymentTriggers?.edges;
  const exact = policy === DEMO_SOURCE_POLICIES.exact;
  if (
    data?.deploymentTriggers?.pageInfo?.hasNextPage === true ||
    (exact &&
      (data?.deploymentTriggers?.pageInfo?.hasNextPage !== false ||
        !Array.isArray(instance.domains?.serviceDomains) ||
        !Array.isArray(instance.domains?.customDomains)))
  )
    fail('complete source and domain inventory required');
  if (
    !Array.isArray(triggers) ||
    (exact ? triggers.length !== 0 : triggers.length !== 1) ||
    triggers.some(
      (edge) =>
        edge?.node?.branch !== 'main' ||
        edge.node.repository !== REPO ||
        edge.node.environmentId !== DEMO_TARGET.environmentId ||
        edge.node.serviceId !== DEMO_TARGET.serviceId ||
        edge.node.projectId !== DEMO_TARGET.projectId,
    )
  )
    fail('exact main repository trigger required');
  const domains = [
    ...(instance.domains?.serviceDomains ?? []),
    ...(instance.domains?.customDomains ?? []),
  ];
  if (!domains.some((d) => d.domain === DEMO_TARGET.domain)) fail('demo domain mapping absent');
  return structuredClone(DEMO_TARGET);
}

function hasUniqueActiveDeployment(data, deploymentId) {
  const active = data?.serviceInstance?.activeDeployments;
  return (
    Array.isArray(active) &&
    active.length === 1 &&
    active[0]?.id === deploymentId &&
    active[0]?.status === 'SUCCESS'
  );
}

export function validateActiveDeployment(data, mergeSha, deploymentId, policy) {
  validateTarget(data, policy);
  const deployment = data.deployment;
  if (
    !SHA.test(mergeSha ?? '') ||
    !UUID.test(deploymentId ?? '') ||
    deployment?.id !== deploymentId ||
    deployment.status !== 'SUCCESS' ||
    deployment.projectId !== DEMO_TARGET.projectId ||
    deployment.environmentId !== DEMO_TARGET.environmentId ||
    deployment.serviceId !== DEMO_TARGET.serviceId ||
    deployment.meta?.commitHash !== mergeSha ||
    !hasUniqueActiveDeployment(data, deploymentId)
  )
    fail('deployment is not the successful exact-commit active demo deployment');
  return { id: deploymentId, status: 'SUCCESS', commitHash: mergeSha };
}

// Commas in quoted extension values do not delimit directives. Only a bare no-store
// directive establishes this proof; extension names/values containing it cannot do so.
function hasNoStoreDirective(value) {
  const httpToken = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
  const quotedValue = /^"(?:[\t\x20\x21\x23-\x5b\x5d-\x7e\x80-\xff]|\\[\t\x20-\x7e\x80-\xff])*"$/;
  const trimOws = (text) => text.replace(/^[ \t]+|[ \t]+$/g, '');
  let quoted = false,
    escaped = false,
    token = '',
    found = false,
    valid = true;
  const finish = () => {
    const separator = token.indexOf('=');
    const name = trimOws(separator < 0 ? token : token.slice(0, separator));
    const argument = separator < 0 ? null : trimOws(token.slice(separator + 1));
    if (
      /[\r\n]/.test(token) ||
      !httpToken.test(name) ||
      (argument !== null && !httpToken.test(argument) && !quotedValue.test(argument))
    )
      valid = false;
    if (name.toLowerCase() === 'no-store') {
      if (argument === null) found = true;
      else valid = false;
    }
    token = '';
  };
  for (const char of value) {
    if (escaped) escaped = false;
    else if (quoted && char === '\\') escaped = true;
    else if (char === '"') quoted = !quoted;
    else if (!quoted && char === ',') {
      finish();
      continue;
    }
    token += char;
  }
  if (quoted || escaped) return false;
  finish();
  return valid && found;
}

export async function verifyLiveReady(deploymentId, { fetchImpl = fetch } = {}) {
  if (!UUID.test(deploymentId ?? '')) fail('invalid deployment identity');
  const response = await fetchImpl(`https://${DEMO_TARGET.domain}/ready`, {
    redirect: 'error',
    signal: AbortSignal.timeout(20_000),
    headers: { 'Cache-Control': 'no-cache' },
  });
  if (!response.ok || !hasNoStoreDirective(response.headers.get('cache-control') ?? ''))
    fail('uncached demo readiness unavailable');
  let body;
  try {
    body = JSON.parse((await boundedBytes(response, 16_384)).toString('utf8'));
  } catch {
    fail('invalid readiness response');
  }
  if (
    body.status !== 'ready' ||
    body.tier !== 'demo' ||
    body.deploymentId !== deploymentId ||
    body.checks?.database !== 'ok' ||
    body.checks?.policy !== 'ok'
  )
    fail('live demo does not serve this healthy deployment');
  return { status: 'ready', tier: 'demo', deploymentId };
}

// Shapes verified against Railway CLI v5.66.0 schema and EnvironmentInstances / ProjectToken queries.
const TARGET_QUERY = `query($projectId:String!,$environmentId:String!,$serviceId:String!){
  projectToken{project{id} environment{id name}}
  deploymentTriggers(projectId:$projectId,environmentId:$environmentId,serviceId:$serviceId,first:2){pageInfo{hasNextPage} edges{node{projectId environmentId serviceId repository branch}}}
  serviceInstance(environmentId:$environmentId,serviceId:$serviceId){
    serviceId environmentId source{repo}
    domains{serviceDomains{domain} customDomains{domain}}
    activeDeployments{id status meta}
    latestDeployment{id status}
  }
  deployments(input:{projectId:$projectId,environmentId:$environmentId,serviceId:$serviceId,status:{notIn:[SUCCESS,FAILED,CRASHED,REMOVED,SKIPPED]}},first:1){
    pageInfo{hasNextPage} edges{node{id status}}
  }
}`;
const DEPLOYMENT_QUERY = `query($projectId:String!,$environmentId:String!,$serviceId:String!,$id:String!){
  projectToken{project{id} environment{id name}}
  deploymentTriggers(projectId:$projectId,environmentId:$environmentId,serviceId:$serviceId,first:2){pageInfo{hasNextPage} edges{node{projectId environmentId serviceId repository branch}}}
  serviceInstance(environmentId:$environmentId,serviceId:$serviceId){
    serviceId environmentId source{repo}
    domains{serviceDomains{domain} customDomains{domain}}
    activeDeployments{id status meta}
    latestDeployment{id status}
  }
  deployments(input:{projectId:$projectId,environmentId:$environmentId,serviceId:$serviceId,status:{notIn:[SUCCESS,FAILED,CRASHED,REMOVED,SKIPPED]}},first:1){
    pageInfo{hasNextPage} edges{node{id status}}
  }
  deployment(id:$id){id status projectId environmentId serviceId meta}
}`;

export function createRailwayClient({ token, fetchImpl = fetch } = {}) {
  const credential = headerCredential(token);
  if (!credential.valid) fail('valid HTTP credential bindings required');
  token = credential.effective;
  if (!token) fail('dedicated demo binding missing');
  return async (query, variables) => {
    const body = await fetchJson(RAILWAY_API, {
      transientRead: !query.startsWith('mutation'),
      fetchImpl: async (...args) => {
        let response;
        try {
          response = await fetchImpl(...args);
        } catch (error) {
          if (
            !query.startsWith('mutation') &&
            (error instanceof TypeError || ['AbortError', 'TimeoutError'].includes(error?.name))
          )
            throw new DemoTransientReadError(
              'Demo deployment proof rejected: transient Railway read unavailable',
            );
          fail('Railway transport unavailable');
        }
        if (
          !query.startsWith('mutation') &&
          [408, 429, 500, 502, 503, 504].includes(response.status)
        )
          throw new DemoTransientReadError(
            'Demo deployment proof rejected: transient Railway read unavailable',
          );
        return response;
      },
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Project-Access-Token': token,
      },
      body: JSON.stringify({ query, variables }),
    });
    if (body.errors || !body.data) fail('Railway request denied or unsupported');
    return body.data;
  };
}

export async function inspectDemo(client, policy) {
  const data = await client(TARGET_QUERY, DEMO_TARGET);
  validateTarget(data, policy);
  return data;
}

export async function inspectDeployment(client, deploymentId, mergeSha, policy) {
  const data = await client(DEPLOYMENT_QUERY, {
    ...DEMO_TARGET,
    id: deploymentId,
  });
  return validateActiveDeployment(data, mergeSha, deploymentId, policy);
}

function context(env, policy) {
  policy = sourcePolicy(policy);
  const runId = Number(env.GITHUB_RUN_ID),
    runAttempt = Number(env.GITHUB_RUN_ATTEMPT);
  if (
    env.GITHUB_REPOSITORY !== REPO ||
    env.GITHUB_REF !== 'refs/heads/main' ||
    !SHA.test(env.GITHUB_SHA ?? '') ||
    !integer(runId) ||
    !integer(runAttempt)
  )
    fail('trusted main Actions context required');
  if (
    env.GITHUB_ACTIONS !== 'true' ||
    env.GITHUB_WORKFLOW_REF !== `${REPO}/${policyWorkflow(policy)}@refs/heads/main` ||
    !(policy === DEMO_SOURCE_POLICIES.exact
      ? env.GITHUB_EVENT_NAME === 'workflow_dispatch'
      : ['push', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME))
  )
    fail('source policy requires its fixed main deployment workflow');
  if (
    policy === DEMO_SOURCE_POLICIES.exact &&
    (!SHA.test(env.CLINICOS_REVIEWED_SHA ?? '') || env.CLINICOS_REVIEWED_SHA !== env.GITHUB_SHA)
  )
    fail('exact source policy requires the reviewed workflow SHA');
  return {
    repository: REPO,
    sourceRef: 'refs/heads/main',
    mergeSha: env.GITHUB_SHA,
    runId,
    runAttempt,
    ...(policy === DEMO_SOURCE_POLICIES.exact ? { reviewedSha: env.CLINICOS_REVIEWED_SHA } : {}),
  };
}

function mainVerifier(bindings, source, policy, fetchImpl) {
  if (policy !== DEMO_SOURCE_POLICIES.exact) return async () => {};
  // This fixed, bounded, read-only verifier receives only the Actions GitHub binding.
  const verify = createMainVerifier({
    token: bindings.githubToken,
    reviewedSha: source.reviewedSha,
    fetchImpl,
  });
  return async () => {
    try {
      await verify();
    } catch {
      fail('reviewed current main unavailable or changed');
    }
  };
}

export async function prepareDemo({
  env = process.env,
  client,
  sourcePolicy: policy,
  fetchImpl = fetch,
  bindings = captureDemoBindings(env),
} = {}) {
  policy = sourcePolicy(policy);
  const source = context(env, policy);
  serializeDemoMetadata(
    { source, target: DEMO_TARGET },
    { forbiddenValues: bindings.forbiddenValues },
  );
  requireValidBindings(bindings);
  await mainVerifier(bindings, source, policy, fetchImpl)();
  await inspectDemo(
    client ?? createRailwayClient({ token: bindings.railwayToken, fetchImpl }),
    policy,
  );
  return {
    schemaVersion: 1,
    kind: 'clinicos-demo-preflight',
    ...source,
    sourcePolicy: policy,
    target: structuredClone(DEMO_TARGET),
    verifiedAt: new Date().toISOString(),
  };
}

export async function deployDemo({
  env = process.env,
  client,
  fetchImpl = fetch,
  delay = (ms) => new Promise((r) => setTimeout(r, ms)),
  attempts = 180,
  now = Date.now,
  onProgress = async () => {},
  sourcePolicy: policy,
  bindings = captureDemoBindings(env),
} = {}) {
  policy = sourcePolicy(policy);
  const source = context(env, policy);
  const forbiddenValues = bindings.forbiddenValues;
  serializeDemoMetadata({ source, target: DEMO_TARGET }, { forbiddenValues });
  requireValidBindings(bindings);
  const deadline = now() + DEMO_DEPLOY_BUDGET_MS;
  const budget = (cost) => {
    if (!Number.isFinite(now()) || now() + cost > deadline)
      fail('aggregate deployment deadline exceeded');
  };
  let deploymentId = null,
    reused = false;
  const progress = async (status, errorCode = null) => {
    const metadata = {
      schemaVersion: 1,
      kind: 'clinicos-demo-deployment-progress',
      target: structuredClone(DEMO_TARGET),
      mergeSha: source.mergeSha,
      deploymentId,
      status,
      errorCode,
    };
    serializeDemoMetadata(metadata, { forbiddenValues });
    await onProgress(metadata);
  };
  await progress('checking');
  try {
    if (!integer(attempts) || attempts > 180) fail('bounded polling attempts required');
    const assertCurrentMain = mainVerifier(bindings, source, policy, fetchImpl);
    budget(30_000);
    await assertCurrentMain();
    client ??= createRailwayClient({ token: bindings.railwayToken, fetchImpl });
    budget(30_000);
    const initial = await inspectDemo(client, policy);
    serializeDemoMetadata(
      {
        active: initial.serviceInstance.activeDeployments?.map((d) => ({
          id: d?.id,
          commitHash: d?.meta?.commitHash,
        })),
        latestId: initial.serviceInstance.latestDeployment?.id,
      },
      { forbiddenValues },
    );
    let previous = null;
    if (policy === DEMO_SOURCE_POLICIES.exact) {
      requireIdleDemo(initial);
      previous = previousActive(initial);
      if (previous?.commitHash === source.mergeSha) {
        deploymentId = previous.id;
        reused = true;
      }
    }
    budget(30_000);
    await assertCurrentMain();
    if (!reused) {
      // Only one mutation. A denied or uncertain submission is never retried.
      budget(30_000);
      const result = await client(
        `mutation($environmentId:String!,$serviceId:String!,$commitSha:String){
        serviceInstanceDeployV2(environmentId:$environmentId,serviceId:$serviceId,commitSha:$commitSha)
      }`,
        { ...DEMO_TARGET, commitSha: source.mergeSha },
      );
      if (!UUID.test(result?.serviceInstanceDeployV2 ?? ''))
        fail('Railway returned invalid deployment identity');
      serializeDemoMetadata({ deploymentId: result.serviceInstanceDeployV2 }, { forbiddenValues });
      deploymentId = result.serviceInstanceDeployV2;
    }
    await progress(reused ? 'verifying-existing' : 'submitted');
    let transientErrors = 0;
    for (let attempt = 0; attempt < attempts; attempt++) {
      budget(30_000);
      let data;
      try {
        data = await client(DEPLOYMENT_QUERY, {
          ...DEMO_TARGET,
          id: deploymentId,
        });
      } catch (error) {
        if (!(error instanceof DemoTransientReadError) || ++transientErrors > 3) throw error;
      }
      if (data) {
        validateTarget(data, policy);
        if (
          ['FAILED', 'CRASHED', 'REMOVED', 'CANCELLED', 'SKIPPED'].includes(data.deployment?.status)
        )
          fail('demo deployment failed');
        if (
          data.deployment?.status === 'SUCCESS' &&
          hasUniqueActiveDeployment(data, deploymentId)
        ) {
          if (policy === DEMO_SOURCE_POLICIES.exact) requireIdleDemo(data);
          const deployment = validateActiveDeployment(data, source.mergeSha, deploymentId, policy);
          let ready;
          budget(20_000 + 60_000);
          try {
            ready = await verifyLiveReady(deploymentId, { fetchImpl });
          } catch {
            // Routing can converge after Railway reports SUCCESS. Final failure stays closed.
          }
          if (ready) {
            // Reinspect after readiness and recheck current main before issuing proof.
            budget(60_000);
            const final = await client(DEPLOYMENT_QUERY, {
              ...DEMO_TARGET,
              id: deploymentId,
            });
            validateActiveDeployment(final, source.mergeSha, deploymentId, policy);
            if (policy === DEMO_SOURCE_POLICIES.exact) requireIdleDemo(final);
            await assertCurrentMain();
            const receipt = {
              schemaVersion: 1,
              kind: 'clinicos-demo-backend',
              ...source,
              sourcePolicy: policy,
              target: structuredClone(DEMO_TARGET),
              deployment,
              ready,
              ...(policy === DEMO_SOURCE_POLICIES.exact
                ? {
                    deploymentReused: reused,
                    previousActiveDeployment: previous,
                    migrations: {
                      command: 'npm run db:migrate',
                      direction: 'forward-only',
                      delta: 'unproven',
                      deploymentSubmittedByThisRun: !reused,
                    },
                  }
                : {}),
              verifiedAt: new Date().toISOString(),
            };
            serializeDemoMetadata(receipt, { forbiddenValues });
            await progress('verified');
            return receipt;
          }
        }
      }
      if (attempt + 1 < attempts) {
        budget(10_000 + 30_000);
        await delay(10_000);
      }
    }
    fail('exact deployment readiness timed out');
  } catch (error) {
    await progress('failed', 'DEPLOYMENT_PROOF_FAILED');
    throw error;
  }
}

function validateRun(run, mergeSha, policy = DEMO_SOURCE_POLICIES.trigger) {
  if (
    !integer(run?.id) ||
    !integer(run.run_attempt) ||
    run.status !== 'completed' ||
    run.conclusion !== 'success' ||
    run.head_branch !== 'main' ||
    run.head_sha !== mergeSha ||
    run.repository?.full_name !== REPO ||
    run.head_repository?.full_name !== REPO ||
    run.path !== policyWorkflow(policy) ||
    !(policy === DEMO_SOURCE_POLICIES.exact
      ? run.event === 'workflow_dispatch'
      : ['push', 'workflow_dispatch'].includes(run.event))
  )
    fail('trusted completed main deployment workflow required');
}

export function validateReceipt(
  receipt,
  run,
  kind = 'clinicos-demo-backend',
  now = Date.now(),
  expectedPolicy,
) {
  // Receipts predating policy selection retain the original strict trigger policy.
  const policy = sourcePolicy(receipt?.sourcePolicy);
  if (expectedPolicy !== undefined && policy !== sourcePolicy(expectedPolicy))
    fail('receipt source policy mismatch');
  validateRun(run, receipt?.mergeSha, policy);
  if (
    receipt?.schemaVersion !== 1 ||
    receipt.kind !== kind ||
    receipt.repository !== REPO ||
    receipt.sourceRef !== 'refs/heads/main' ||
    !SHA.test(receipt.mergeSha ?? '') ||
    receipt.runId !== run.id ||
    receipt.runAttempt !== run.run_attempt ||
    Object.keys(DEMO_TARGET).some((key) => receipt.target?.[key] !== DEMO_TARGET[key]) ||
    !Number.isFinite(Date.parse(receipt.verifiedAt)) ||
    Date.parse(receipt.verifiedAt) > now + 300_000
  )
    fail('receipt source, attempt, or target mismatch');
  if (policy === DEMO_SOURCE_POLICIES.exact && receipt.reviewedSha !== receipt.mergeSha)
    fail('receipt reviewed workflow SHA mismatch');
  if (kind === 'clinicos-demo-preflight') {
    if (now - Date.parse(receipt.verifiedAt) > 24 * 60 * 60 * 1000) fail('demo preflight expired');
  } else if (
    !UUID.test(receipt.deployment?.id ?? '') ||
    receipt.deployment.status !== 'SUCCESS' ||
    receipt.deployment.commitHash !== receipt.mergeSha ||
    receipt.ready?.status !== 'ready' ||
    receipt.ready?.tier !== 'demo' ||
    receipt.ready?.deploymentId !== receipt.deployment.id
  )
    fail('receipt lacks successful exact deployment and live proof');
  return receipt;
}

// Artifacts contain one small JSON file. Verify GitHub's ZIP digest before bounded extraction;
// never execute archive paths, follow symlinks or extract into the checkout.
export function extractReceipt(zip, expectedName) {
  if (!Buffer.isBuffer(zip) || zip.length > MAX_BYTES || zip.length < 22)
    fail('invalid receipt archive');
  let end = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--)
    if (zip.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  if (
    end < 0 ||
    zip.readUInt16LE(end + 4) ||
    zip.readUInt16LE(end + 6) ||
    zip.readUInt16LE(end + 8) !== 1 ||
    zip.readUInt16LE(end + 10) !== 1 ||
    end + 22 + zip.readUInt16LE(end + 20) !== zip.length
  )
    fail('single-file archive required');
  const central = zip.readUInt32LE(end + 16);
  if (
    central + 46 > end ||
    central + zip.readUInt32LE(end + 12) !== end ||
    zip.readUInt32LE(central) !== 0x02014b50
  )
    fail('invalid central directory');
  const flags = zip.readUInt16LE(central + 8),
    method = zip.readUInt16LE(central + 10);
  const compressed = zip.readUInt32LE(central + 20),
    size = zip.readUInt32LE(central + 24);
  const nameLength = zip.readUInt16LE(central + 28),
    local = zip.readUInt32LE(central + 42);
  if (
    flags & 1 ||
    ![0, 8].includes(method) ||
    size > 32_768 ||
    compressed > MAX_BYTES ||
    central + 46 + nameLength > end ||
    zip.toString('utf8', central + 46, central + 46 + nameLength) !== expectedName ||
    local + 30 > central ||
    zip.readUInt32LE(local) !== 0x04034b50 ||
    zip.readUInt16LE(local + 8) !== method
  )
    fail('invalid receipt archive entry');
  const localName = zip.readUInt16LE(local + 26),
    extra = zip.readUInt16LE(local + 28);
  const start = local + 30 + localName + extra;
  if (
    zip.toString('utf8', local + 30, local + 30 + localName) !== expectedName ||
    start + compressed > central
  )
    fail('invalid local receipt entry');
  let bytes;
  try {
    bytes =
      method === 0
        ? zip.subarray(start, start + compressed)
        : inflateRawSync(zip.subarray(start, start + compressed), {
            maxOutputLength: 32_768,
          });
  } catch {
    fail('invalid compressed receipt');
  }
  if (bytes.length !== size) fail('receipt size mismatch');
  try {
    return {
      receipt: JSON.parse(bytes.toString('utf8')),
      receiptSha256: digest(bytes),
    };
  } catch {
    fail('invalid receipt JSON');
  }
}

export function createProofReader({ token, fetchImpl = fetch } = {}) {
  if (!token) fail('GitHub deployment proof binding missing');
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const getJson = (route) => fetchJson(`${API}/repos/${REPO}/${route}`, { fetchImpl, headers });
  async function artifact(run, kind) {
    const name = `${kind === 'clinicos-demo-preflight' ? 'demo-preflight' : 'demo-deployment'}-${run.id}-${run.run_attempt}`;
    const list = await getJson(`actions/runs/${run.id}/artifacts?per_page=100`);
    const matches = list.artifacts?.filter((a) => a.name === name && a.expired === false);
    if (
      matches?.length !== 1 ||
      !integer(matches[0].id) ||
      !DIGEST.test(matches[0].digest ?? '') ||
      !integer(matches[0].size_in_bytes) ||
      matches[0].size_in_bytes > MAX_BYTES ||
      matches[0].workflow_run?.id !== run.id ||
      matches[0].workflow_run?.head_sha !== run.head_sha
    )
      fail('trusted immutable artifact absent');
    const saved = matches[0];
    const response = await fetchImpl(`${API}/repos/${REPO}/actions/artifacts/${saved.id}/zip`, {
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(30_000),
    });
    if (response.status !== 302) fail('artifact download redirect absent');
    let destination;
    try {
      destination = new URL(response.headers.get('location'));
    } catch {
      fail('invalid artifact redirect');
    }
    if (
      destination.protocol !== 'https:' ||
      destination.username ||
      destination.password ||
      !['.blob.core.windows.net', '.actions.githubusercontent.com', '.githubusercontent.com'].some(
        (suffix) => destination.hostname.endsWith(suffix),
      )
    )
      fail('artifact redirect outside trusted storage');
    // Signed storage URL receives no GitHub Authorization header. Never log it.
    const zip = await boundedBytes(
      await fetchImpl(destination, {
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
      }),
    );
    if (`sha256:${digest(zip)}` !== saved.digest) fail('artifact archive digest mismatch');
    const extracted = extractReceipt(
      zip,
      `${kind === 'clinicos-demo-preflight' ? 'demo-preflight' : 'demo-deployment'}-receipt.json`,
    );
    validateReceipt(extracted.receipt, run, kind);
    return { ...extracted, artifactId: saved.id, artifactDigest: saved.digest };
  }
  return { getJson, artifact };
}

export async function verifyDemoPreflight({ reader, sourcePolicy: policy } = {}) {
  policy = sourcePolicy(policy);
  const head = await reader.getJson('commits/main');
  if (!SHA.test(head.sha ?? '')) fail('trusted main head unavailable');
  const policies = [policy];
  for (const selected of policies) {
    const workflow = policyWorkflow(selected).split('/').at(-1);
    const list = await reader.getJson(
      `actions/workflows/${workflow}/runs?branch=main&status=success&head_sha=${head.sha}&per_page=20`,
    );
    for (const run of list.workflow_runs ?? []) {
      try {
        validateRun(run, head.sha, selected);
        const proof = await reader.artifact(run, 'clinicos-demo-preflight');
        validateReceipt(proof.receipt, run, 'clinicos-demo-preflight', Date.now(), selected);
        return {
          ...proof,
          runUrl: `https://github.com/${REPO}/actions/runs/${run.id}`,
        };
      } catch {
        /* A receipt can authorize only its policy's fixed workflow. */
      }
    }
  }
  fail('current trusted main has no successful demo target preflight');
}

export async function verifyDemoRelease({
  reader,
  runUrl,
  mergeSha,
  reviewedSha,
  client,
  fetchImpl = fetch,
  sourcePolicy: policy,
} = {}) {
  if (policy !== undefined) sourcePolicy(policy);
  if (!SHA.test(mergeSha ?? '') || !SHA.test(reviewedSha ?? ''))
    fail('invalid reviewed or merged revision');
  const match = /^https:\/\/github\.com\/l2v-hub\/ClinicOS\/actions\/runs\/([1-9][0-9]*)$/.exec(
    runUrl ?? '',
  );
  if (!match) fail('invalid deployment run URL');
  const run = await reader.getJson(`actions/runs/${match[1]}`);
  if (run.id !== Number(match[1])) fail('deployment run identity mismatch');
  const proof = await reader.artifact(run, 'clinicos-demo-backend');
  validateReceipt(proof.receipt, run, 'clinicos-demo-backend', Date.now(), policy);
  const boundPolicy = sourcePolicy(proof.receipt.sourcePolicy);
  validateRun(run, mergeSha, boundPolicy);
  await inspectDeployment(client, proof.receipt.deployment.id, mergeSha, boundPolicy);
  await verifyLiveReady(proof.receipt.deployment.id, { fetchImpl });
  await inspectDeployment(client, proof.receipt.deployment.id, mergeSha, boundPolicy);
  return { ...proof, reviewedSha, runUrl };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const operation = process.argv[2];
  const bindings = captureDemoBindings(process.env);
  const forbiddenValues = bindings.forbiddenValues;
  let cliProgress;
  const saveProgress = async (progress) => {
    const json = serializeDemoMetadata(progress, { forbiddenValues });
    await writeFile('demo-deployment-progress.json', json, { mode: 0o600 });
    cliProgress = progress;
  };
  try {
    const receipt =
      operation === 'preflight' || operation === 'preflight-exact'
        ? await prepareDemo({
            bindings,
            sourcePolicy: operation === 'preflight-exact' ? DEMO_SOURCE_POLICIES.exact : undefined,
          })
        : operation === 'deploy' || operation === 'deploy-exact'
          ? await deployDemo({
              bindings,
              sourcePolicy: operation === 'deploy-exact' ? DEMO_SOURCE_POLICIES.exact : undefined,
              ...(operation === 'deploy-exact' ? { onProgress: saveProgress } : {}),
            })
          : fail('unsupported operation');
    await writeFile(
      `${receipt.kind === 'clinicos-demo-preflight' ? 'demo-preflight' : 'demo-deployment'}-receipt.json`,
      serializeDemoMetadata(receipt, { forbiddenValues }),
      { mode: 0o600 },
    );
    console.log(
      serializeDemoMetadata(
        {
          status:
            receipt.kind === 'clinicos-demo-preflight' ? 'target-verified' : 'live-demo-verified',
          mergeSha: receipt.mergeSha,
        },
        { forbiddenValues },
      ).trim(),
    );
  } catch (error) {
    if (['preflight-exact', 'deploy-exact'].includes(operation) && !cliProgress) {
      try {
        const source = context(process.env, DEMO_SOURCE_POLICIES.exact);
        await saveProgress({
          schemaVersion: 1,
          kind: 'clinicos-demo-deployment-progress',
          target: structuredClone(DEMO_TARGET),
          mergeSha: source.mergeSha,
          deploymentId: null,
          status: 'failed',
          errorCode: 'DEPLOYMENT_PROOF_FAILED',
        });
      } catch {
        /* Untrusted context or unavailable local artifact cannot supply deployment proof. */
      }
    }
    // Only constant proof errors are printable. Provider/network bodies may contain private data.
    const diagnostic =
      error instanceof DemoProofError
        ? error.message
        : 'Demo target or deployment proof failed; no issue can be closed from this result.';
    try {
      serializeDemoMetadata(diagnostic, { forbiddenValues });
      console.error(diagnostic);
    } catch {
      /* Even a fixed diagnostic must not coincide with a bound credential. */
    }
    process.exitCode = 1;
  }
}

// Production and demo are separate gates. This reader never dispatches or reruns a workflow.
export async function verifyProductionBackend({ reader, deploymentSha, runUrl = '' }) {
  const blocked = (code) => {
    const error = new Error(code);
    error.code = code;
    throw error;
  };
  if (!SHA.test(deploymentSha ?? '') || !reader?.getJson) blocked('PRODUCTION_PROOF_FAILED');
  const newest = async () => {
    const list = await reader.getJson(
      `actions/workflows/deploy-backend.yml/runs?branch=main&head_sha=${deploymentSha}&per_page=100`,
    );
    if (
      !Array.isArray(list?.workflow_runs) ||
      !Number.isSafeInteger(list.total_count) ||
      list.total_count > 100 ||
      list.total_count < 0 ||
      list.workflow_runs.length !== list.total_count ||
      new Set(list.workflow_runs.map((run) => run.id)).size !== list.total_count ||
      list.workflow_runs.some(
        (run) =>
          !integer(run.id) ||
          !integer(run.run_attempt) ||
          run.head_sha !== deploymentSha ||
          run.repository?.full_name !== REPO ||
          run.head_repository?.full_name !== REPO ||
          run.path !== WORKFLOW ||
          run.head_branch !== 'main' ||
          !['push', 'workflow_dispatch'].includes(run.event),
      )
    )
      blocked('PRODUCTION_PROOF_FAILED');
    if (!list.workflow_runs.length) blocked('PRODUCTION_RUN_REQUIRED');
    const ordered = [...list.workflow_runs].sort((a, b) => b.id - a.id);
    for (const older of ordered.slice(1)) {
      if (older.status !== 'completed') {
        if (
          ['queued', 'in_progress', 'waiting', 'pending', 'requested'].includes(older.status) &&
          older.conclusion === null
        )
          blocked('PRODUCTION_RUN_PENDING');
        blocked('PRODUCTION_PROOF_FAILED');
      }
    }
    return ordered[0];
  };
  const latest = await newest();
  let id = latest.id;
  if (runUrl) {
    const match = /^https:\/\/github\.com\/l2v-hub\/ClinicOS\/actions\/runs\/([1-9][0-9]*)$/.exec(
      runUrl,
    );
    if (!match || Number(match[1]) !== id) blocked('PRODUCTION_PROOF_FAILED');
  }
  const read = async () => {
    const run = await reader.getJson(`actions/runs/${id}`);
    if (
      !integer(id) ||
      run?.id !== id ||
      run.run_attempt !== 1 ||
      run.head_sha !== deploymentSha ||
      run.repository?.full_name !== REPO ||
      run.head_repository?.full_name !== REPO ||
      run.path !== WORKFLOW ||
      run.head_branch !== 'main' ||
      !['push', 'workflow_dispatch'].includes(run.event)
    )
      blocked('PRODUCTION_PROOF_FAILED');
    if (['queued', 'in_progress', 'waiting', 'pending', 'requested'].includes(run.status)) {
      if (run.conclusion !== null) blocked('PRODUCTION_PROOF_FAILED');
      blocked('PRODUCTION_RUN_PENDING');
    }
    if (run.status !== 'completed' || run.conclusion !== 'success')
      blocked('PRODUCTION_PROOF_FAILED');
    const jobs = await reader.getJson(`actions/runs/${id}/jobs?filter=latest&per_page=100`);
    if (
      !Array.isArray(jobs?.jobs) ||
      jobs.total_count !== jobs.jobs.length ||
      jobs.total_count > 100
    )
      blocked('PRODUCTION_PROOF_FAILED');
    const matches = jobs.jobs.filter((job) => job.name === 'deploy');
    const job = matches[0];
    if (
      matches.length !== 1 ||
      !integer(job.id) ||
      job.run_id !== id ||
      job.run_attempt !== 1 ||
      job.head_sha !== deploymentSha ||
      job.status !== 'completed' ||
      job.conclusion !== 'success' ||
      !Array.isArray(job.steps) ||
      !job.steps.some(
        (step) =>
          step.name === 'Deploy to Railway' &&
          step.status === 'completed' &&
          step.conclusion === 'success',
      )
    )
      blocked('PRODUCTION_PROOF_FAILED');
    return {
      repository: REPO,
      sha: deploymentSha,
      runId: id,
      runAttempt: 1,
      jobId: job.id,
      path: WORKFLOW,
      event: run.event,
      status: 'success',
      runUrl: `https://github.com/${REPO}/actions/runs/${id}`,
    };
  };
  const proof = await read();
  if (JSON.stringify(proof) !== JSON.stringify(await read())) blocked('PRODUCTION_PROOF_FAILED');
  const finalLatest = await newest();
  if (
    ['queued', 'in_progress', 'waiting', 'pending', 'requested'].includes(finalLatest.status) &&
    finalLatest.conclusion === null
  )
    blocked('PRODUCTION_RUN_PENDING');
  if (
    finalLatest.id !== id ||
    finalLatest.run_attempt !== 1 ||
    finalLatest.status !== 'completed' ||
    finalLatest.conclusion !== 'success'
  )
    blocked('PRODUCTION_PROOF_FAILED');
  return {
    ...proof,
    proofSha256: createHash('sha256').update(JSON.stringify(proof)).digest('hex'),
  };
}

export async function waitForProductionBackend({
  verify,
  guard = async () => {},
  now = Date.now,
  delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  timeoutMs = 60 * 60_000,
  pollMs = 10_000,
}) {
  const failWait = (code) => {
    const error = new Error(code);
    error.code = code;
    throw error;
  };
  if (
    typeof verify !== 'function' ||
    typeof guard !== 'function' ||
    typeof delay !== 'function' ||
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0 ||
    timeoutMs > 60 * 60_000 ||
    !Number.isFinite(pollMs) ||
    pollMs <= 0 ||
    pollMs > 60_000
  )
    throw new TypeError('bounded production wait dependencies required');
  const started = now();
  let previous = started;
  if (!Number.isSafeInteger(started) || started < 0) failWait('PRODUCTION_PROOF_FAILED');
  const clock = () => {
    const value = now();
    if (!Number.isSafeInteger(value) || value < previous) failWait('PRODUCTION_PROOF_FAILED');
    previous = value;
    return value;
  };
  for (let polls = 0; polls <= Math.ceil(timeoutMs / pollMs); polls++) {
    await guard();
    clock();
    try {
      const proof = await verify();
      await guard();
      if (clock() - started > timeoutMs) failWait('PRODUCTION_RUN_PENDING_TIMEOUT');
      return proof;
    } catch (error) {
      // Only identity-validated missing/pending observations may be polled.
      if (!['PRODUCTION_RUN_REQUIRED', 'PRODUCTION_RUN_PENDING'].includes(error?.code)) throw error;
    }
    await guard();
    const remaining = timeoutMs - (clock() - started);
    if (remaining <= 0) failWait('PRODUCTION_RUN_PENDING_TIMEOUT');
    const beforeSleep = previous;
    await delay(Math.min(pollMs, remaining));
    if (clock() <= beforeSleep) failWait('PRODUCTION_PROOF_FAILED');
  }
  failWait('PRODUCTION_RUN_PENDING_TIMEOUT');
}
