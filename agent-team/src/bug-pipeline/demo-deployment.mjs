import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

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
export const DEMO_SOURCE_POLICIES = Object.freeze({
  trigger: 'main-trigger-v1',
  exact: 'native-exact-commit-v1',
});
const API = 'https://api.github.com';
const RAILWAY_API = 'https://backboard.railway.app/graphql/v2';
const MAX_BYTES = 1024 * 1024;
export class DemoProofError extends Error {}
const fail = (message) => {
  throw new DemoProofError(`Demo deployment proof rejected: ${message}`);
};
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const integer = (n) => Number.isSafeInteger(n) && n > 0;

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

export async function fetchJson(url, { fetchImpl = fetch, ...options } = {}) {
  const response = await fetchImpl(url, {
    ...options,
    redirect: 'error',
    signal: AbortSignal.timeout(30_000),
  });
  try {
    return JSON.parse((await boundedBytes(response)).toString('utf8'));
  } catch {
    fail('invalid bounded JSON response');
  }
}

function sourcePolicy(value = DEMO_SOURCE_POLICIES.trigger) {
  if (!Object.values(DEMO_SOURCE_POLICIES).includes(value)) fail('unknown source policy');
  return value;
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
    (exact ? triggers.length > 1 : triggers.length !== 1) ||
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
    activeDeployments{id status}
  }
}`;
const DEPLOYMENT_QUERY = `query($projectId:String!,$environmentId:String!,$serviceId:String!,$id:String!){
  projectToken{project{id} environment{id name}}
  deploymentTriggers(projectId:$projectId,environmentId:$environmentId,serviceId:$serviceId,first:2){pageInfo{hasNextPage} edges{node{projectId environmentId serviceId repository branch}}}
  serviceInstance(environmentId:$environmentId,serviceId:$serviceId){
    serviceId environmentId source{repo}
    domains{serviceDomains{domain} customDomains{domain}}
    activeDeployments{id status}
  }
  deployment(id:$id){id status projectId environmentId serviceId meta}
}`;

export function createRailwayClient({ token, fetchImpl = fetch } = {}) {
  if (!token) fail('dedicated demo binding missing');
  return async (query, variables) => {
    const body = await fetchJson(RAILWAY_API, {
      fetchImpl,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Project-Access-Token': token },
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
  const data = await client(DEPLOYMENT_QUERY, { ...DEMO_TARGET, id: deploymentId });
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
    policy === DEMO_SOURCE_POLICIES.exact &&
    (env.GITHUB_ACTIONS !== 'true' ||
      env.GITHUB_WORKFLOW_REF !== `${REPO}/${WORKFLOW}@refs/heads/main` ||
      !['push', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME))
  )
    fail('exact source policy requires the fixed main deployment workflow');
  return {
    repository: REPO,
    sourceRef: 'refs/heads/main',
    mergeSha: env.GITHUB_SHA,
    runId,
    runAttempt,
  };
}

export async function prepareDemo({ env = process.env, client, sourcePolicy: policy } = {}) {
  policy = sourcePolicy(policy);
  const source = context(env, policy);
  await inspectDemo(client ?? createRailwayClient({ token: env.RAILWAY_TOKEN }), policy);
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
  sourcePolicy: policy,
} = {}) {
  policy = sourcePolicy(policy);
  const source = context(env, policy);
  client ??= createRailwayClient({ token: env.RAILWAY_TOKEN, fetchImpl });
  await inspectDemo(client, policy);
  // Unlike `railway up`, this official source-deploy mutation accepts an exact commitSha.
  // Never change the source configuration or substitute an arbitrary deploy message as proof.
  const result = await client(
    `mutation($environmentId:String!,$serviceId:String!,$commitSha:String){
    serviceInstanceDeployV2(environmentId:$environmentId,serviceId:$serviceId,commitSha:$commitSha)
  }`,
    { ...DEMO_TARGET, commitSha: source.mergeSha },
  );
  const deploymentId = result.serviceInstanceDeployV2;
  if (!UUID.test(deploymentId ?? '')) fail('Railway returned invalid deployment identity');
  for (let attempt = 0; attempt < attempts; attempt++) {
    const data = await client(DEPLOYMENT_QUERY, { ...DEMO_TARGET, id: deploymentId });
    validateTarget(data, policy);
    if (['FAILED', 'CRASHED', 'REMOVED', 'CANCELLED'].includes(data.deployment?.status))
      fail('demo deployment failed');
    if (data.deployment?.status === 'SUCCESS' && hasUniqueActiveDeployment(data, deploymentId)) {
      const deployment = validateActiveDeployment(data, source.mergeSha, deploymentId, policy);
      let ready;
      try {
        ready = await verifyLiveReady(deploymentId, { fetchImpl });
      } catch {
        // Routing can converge after Railway reports SUCCESS. Final failure stays closed.
      }
      if (ready) {
        // Reinspect after readiness: a source/target or active-deployment change cannot issue proof.
        await inspectDeployment(client, deploymentId, source.mergeSha, policy);
        return {
          schemaVersion: 1,
          kind: 'clinicos-demo-backend',
          ...source,
          sourcePolicy: policy,
          target: structuredClone(DEMO_TARGET),
          deployment,
          ready,
          verifiedAt: new Date().toISOString(),
        };
      }
    }
    if (attempt + 1 < attempts) await delay(10_000);
  }
  fail('exact deployment readiness timed out');
}

function validateRun(run, mergeSha) {
  if (
    !integer(run?.id) ||
    !integer(run.run_attempt) ||
    run.status !== 'completed' ||
    run.conclusion !== 'success' ||
    run.head_branch !== 'main' ||
    run.head_sha !== mergeSha ||
    run.repository?.full_name !== REPO ||
    run.head_repository?.full_name !== REPO ||
    run.path !== WORKFLOW ||
    !['push', 'workflow_dispatch'].includes(run.event)
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
  validateRun(run, receipt?.mergeSha);
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
        : inflateRawSync(zip.subarray(start, start + compressed), { maxOutputLength: 32_768 });
  } catch {
    fail('invalid compressed receipt');
  }
  if (bytes.length !== size) fail('receipt size mismatch');
  try {
    return { receipt: JSON.parse(bytes.toString('utf8')), receiptSha256: digest(bytes) };
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
      await fetchImpl(destination, { redirect: 'error', signal: AbortSignal.timeout(30_000) }),
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
  if (policy !== undefined) sourcePolicy(policy);
  const head = await reader.getJson('commits/main');
  if (!SHA.test(head.sha ?? '')) fail('trusted main head unavailable');
  const list = await reader.getJson(
    `actions/workflows/deploy-backend.yml/runs?branch=main&status=success&head_sha=${head.sha}&per_page=20`,
  );
  for (const run of list.workflow_runs ?? []) {
    try {
      validateRun(run, head.sha);
      const proof = await reader.artifact(run, 'clinicos-demo-preflight');
      validateReceipt(proof.receipt, run, 'clinicos-demo-preflight', Date.now(), policy);
      return { ...proof, runUrl: `https://github.com/${REPO}/actions/runs/${run.id}` };
    } catch {
      /* Older workflows may have no mandatory demo proof; they cannot authorize merge. */
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
  validateRun(run, mergeSha);
  const proof = await reader.artifact(run, 'clinicos-demo-backend');
  validateReceipt(proof.receipt, run, 'clinicos-demo-backend', Date.now(), policy);
  const boundPolicy = sourcePolicy(proof.receipt.sourcePolicy);
  await inspectDeployment(client, proof.receipt.deployment.id, mergeSha, boundPolicy);
  await verifyLiveReady(proof.receipt.deployment.id, { fetchImpl });
  await inspectDeployment(client, proof.receipt.deployment.id, mergeSha, boundPolicy);
  return { ...proof, reviewedSha, runUrl };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const operation = process.argv[2];
    const receipt =
      operation === 'preflight' || operation === 'preflight-exact'
        ? await prepareDemo({
            sourcePolicy: operation === 'preflight-exact' ? DEMO_SOURCE_POLICIES.exact : undefined,
          })
        : operation === 'deploy' || operation === 'deploy-exact'
          ? await deployDemo({
              sourcePolicy: operation === 'deploy-exact' ? DEMO_SOURCE_POLICIES.exact : undefined,
            })
          : fail('unsupported operation');
    await writeFile(
      `${receipt.kind === 'clinicos-demo-preflight' ? 'demo-preflight' : 'demo-deployment'}-receipt.json`,
      `${JSON.stringify(receipt, null, 2)}\n`,
      { mode: 0o600 },
    );
    console.log(
      JSON.stringify({
        status:
          receipt.kind === 'clinicos-demo-preflight' ? 'target-verified' : 'live-demo-verified',
        mergeSha: receipt.mergeSha,
      }),
    );
  } catch (error) {
    // Only constant proof errors are printable. Provider/network bodies may contain private data.
    console.error(
      error instanceof DemoProofError
        ? error.message
        : 'Demo target or deployment proof failed; no issue can be closed from this result.',
    );
    process.exitCode = 1;
  }
}
