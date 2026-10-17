import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const TARGET = Object.freeze({
  projectId: 'bddf5d1b-ee83-4362-8238-a79721f795e5',
  environmentId: '8021987e-8eaa-4bc8-a102-20566db5e6b4',
  serviceId: 'c000f011-0349-4ea9-9b56-13c625b5767b',
  repository: 'l2v-hub/ClinicOS',
  branch: 'main',
  domain: 'clinicos-backend-demo.up.railway.app',
});
export const ENDPOINT = 'https://backboard.railway.app/graphql/v2';
export const INVENTORY_QUERY = `query($projectId:String!,$environmentId:String!,$serviceId:String!){
  projectToken{project{id} environment{id name}}
  serviceInstance(environmentId:$environmentId,serviceId:$serviceId){
    serviceId environmentId rootDirectory source{repo}
    domains{serviceDomains{domain} customDomains{domain}}
  }
  deploymentTriggers(projectId:$projectId,environmentId:$environmentId,serviceId:$serviceId,first:2){
    pageInfo{hasNextPage}
    edges{node{id provider projectId environmentId serviceId repository branch checkSuites baseEnvironmentOverrideId}}
  }
}`;
export const UPDATE_BRANCH = `mutation($id:String!,$input:DeploymentTriggerUpdateInput!){
  deploymentTriggerUpdate(id:$id,input:$input){id branch}
}`;
export const CREATE_MAIN = `mutation($input:DeploymentTriggerCreateInput!){
  deploymentTriggerCreate(input:$input){
    id provider projectId environmentId serviceId repository branch checkSuites baseEnvironmentOverrideId
  }
}`;
export const MAIN_ENDPOINT = 'https://api.github.com/repos/l2v-hub/ClinicOS/git/ref/heads/main';
const MAX_BYTES = 262_144;
// GraphQL ID is opaque: accept bounded identifiers without assuming UUID storage.
const ID = /^[A-Za-z0-9][A-Za-z0-9_:/+=.-]{0,199}(?![\s\S])/;
const SHA = /^[a-f0-9]{40}(?![\s\S])/;
const DIGEST = /^[a-f0-9]{64}(?![\s\S])/;
const SECRET = /(?:gh[pousr]_[A-Za-z0-9]|github_pat_|sk-(?:ant-|proj-)|eyJ[A-Za-z0-9_-]{10,}\.)/;

export class ConfigurationError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
const fail = (code) => {
  throw new ConfigurationError(code);
};
const freeze = (value) => {
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') freeze(child);
  }
  return Object.freeze(value);
};
export const inventoryDigest = (inventory) =>
  createHash('sha256').update(JSON.stringify(inventory)).digest('hex');

function projectTrigger(node) {
  if (
    node?.projectId !== TARGET.projectId ||
    node?.environmentId !== TARGET.environmentId ||
    node?.serviceId !== TARGET.serviceId
  )
    fail('DEMO_SOURCE_TRIGGER_TARGET_MISMATCH');
  if (node.repository !== TARGET.repository) fail('DEMO_SOURCE_FOREIGN_REPOSITORY');
  if (typeof node.provider !== 'string' || node.provider.toLowerCase() !== 'github')
    fail('DEMO_SOURCE_FOREIGN_PROVIDER');
  if (
    typeof node.id !== 'string' ||
    !ID.test(node.id) ||
    SECRET.test(node.id) ||
    typeof node.branch !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}(?![\s\S])/.test(node.branch) ||
    SECRET.test(node.branch) ||
    typeof node.checkSuites !== 'boolean' ||
    (node.baseEnvironmentOverrideId !== null &&
      (typeof node.baseEnvironmentOverrideId !== 'string' ||
        !ID.test(node.baseEnvironmentOverrideId) ||
        SECRET.test(node.baseEnvironmentOverrideId)))
  )
    fail('DEMO_SOURCE_INVALID_METADATA');
  return {
    id: node.id,
    provider: node.provider,
    projectId: node.projectId,
    environmentId: node.environmentId,
    serviceId: node.serviceId,
    repository: node.repository,
    branch: node.branch,
    checkSuites: node.checkSuites,
    baseEnvironmentOverrideId: node.baseEnvironmentOverrideId,
  };
}

// Only these validated metadata fields may enter an artifact. Provider errors,
// variables, URLs, headers, response extensions and arbitrary object keys never do.
export function projectInventory(data) {
  const token = data?.projectToken;
  const instance = data?.serviceInstance;
  if (
    token?.project?.id !== TARGET.projectId ||
    token?.environment?.id !== TARGET.environmentId ||
    token?.environment?.name !== 'demo' ||
    instance?.serviceId !== TARGET.serviceId ||
    instance?.environmentId !== TARGET.environmentId ||
    instance?.source?.repo !== TARGET.repository
  )
    fail('DEMO_SOURCE_TARGET_MISMATCH');
  const rootDirectory = instance.rootDirectory;
  if (
    rootDirectory !== null &&
    (typeof rootDirectory !== 'string' ||
      rootDirectory.length > 256 ||
      !/^\/?[A-Za-z0-9._/-]*(?![\s\S])/.test(rootDirectory) ||
      SECRET.test(rootDirectory))
  )
    fail('DEMO_SOURCE_INVALID_METADATA');
  const domains = [];
  for (const kind of ['serviceDomains', 'customDomains']) {
    const entries = instance.domains?.[kind];
    if (!Array.isArray(entries) || entries.length > 32) fail('DEMO_SOURCE_INVALID_METADATA');
    for (const entry of entries) {
      const domain = entry?.domain;
      if (
        typeof domain !== 'string' ||
        domain.length > 253 ||
        !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?![\s\S])/.test(domain) ||
        SECRET.test(domain)
      )
        fail('DEMO_SOURCE_INVALID_METADATA');
      domains.push({ kind, domain });
    }
  }
  if (!domains.some(({ domain }) => domain === TARGET.domain)) fail('DEMO_SOURCE_DOMAIN_MISMATCH');
  domains.sort((a, b) => a.kind.localeCompare(b.kind) || a.domain.localeCompare(b.domain));
  const connection = data?.deploymentTriggers;
  if (
    !Array.isArray(connection?.edges) ||
    connection.edges.length > 2 ||
    typeof connection?.pageInfo?.hasNextPage !== 'boolean'
  )
    fail('DEMO_SOURCE_INVALID_METADATA');
  const triggers = connection.edges.map((edge) => projectTrigger(edge?.node));
  if (new Set(triggers.map(({ id }) => id)).size !== triggers.length)
    fail('DEMO_SOURCE_INVALID_METADATA');
  triggers.sort((a, b) => a.id.localeCompare(b.id));
  return freeze({
    schemaVersion: 1,
    projectId: TARGET.projectId,
    environmentId: TARGET.environmentId,
    environmentName: 'demo',
    serviceId: TARGET.serviceId,
    repository: TARGET.repository,
    rootDirectory,
    domains,
    triggers,
    hasMoreTriggers: connection.pageInfo.hasNextPage,
  });
}

export function classify(inventory) {
  if (inventory.hasMoreTriggers || inventory.triggers.length > 1) return 'duplicate-triggers';
  if (!inventory.triggers.length) return 'missing-trigger';
  return inventory.triggers[0].branch === TARGET.branch ? 'already-main' : 'branch-change-required';
}

async function readBoundedJson(response, endpoint) {
  if (!response.ok || response.redirected || (response.url && response.url !== endpoint))
    fail('DEMO_SOURCE_REQUEST_FAILED');
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > MAX_BYTES) fail('DEMO_SOURCE_RESPONSE_TOO_LARGE');
    chunks.push(Buffer.from(chunk));
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    fail('DEMO_SOURCE_INVALID_RESPONSE');
  }
}

export function createClient({ token, fetchImpl = fetch } = {}) {
  if (typeof token !== 'string' || !token.trim()) fail('DEMO_SOURCE_TOKEN_MISSING');
  return async (query, variables) => {
    try {
      const response = await fetchImpl(ENDPOINT, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
        headers: { 'Content-Type': 'application/json', 'Project-Access-Token': token },
        body: JSON.stringify({ query, variables }),
      });
      const body = await readBoundedJson(response, ENDPOINT);
      if (!body?.data || body.errors) fail('DEMO_SOURCE_API_REJECTED');
      return body.data;
    } catch (error) {
      if (error instanceof ConfigurationError) throw error;
      fail('DEMO_SOURCE_REQUEST_FAILED');
    }
  };
}

export function createMainVerifier({ token, reviewedSha, fetchImpl = fetch } = {}) {
  if (typeof token !== 'string' || !token.trim() || !SHA.test(reviewedSha ?? ''))
    fail('DEMO_SOURCE_MAIN_HEAD_UNAVAILABLE');
  return async () => {
    let body;
    try {
      const response = await fetchImpl(MAIN_ENDPOINT, {
        method: 'GET',
        redirect: 'error',
        cache: 'no-store',
        signal: AbortSignal.timeout(30_000),
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Cache-Control': 'no-cache',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'ClinicOS-demo-source-configuration',
        },
      });
      body = await readBoundedJson(response, MAIN_ENDPOINT);
    } catch {
      fail('DEMO_SOURCE_MAIN_HEAD_UNAVAILABLE');
    }
    if (
      body?.ref !== 'refs/heads/main' ||
      body?.object?.type !== 'commit' ||
      !SHA.test(body?.object?.sha ?? '')
    )
      fail('DEMO_SOURCE_MAIN_HEAD_UNAVAILABLE');
    if (body.object.sha !== reviewedSha) fail('DEMO_SOURCE_CURRENT_MAIN_DRIFT');
  };
}

export function validateContext(env) {
  if (
    env.GITHUB_EVENT_NAME !== 'workflow_dispatch' ||
    env.GITHUB_REPOSITORY !== TARGET.repository ||
    env.GITHUB_REF !== 'refs/heads/main' ||
    !SHA.test(env.GITHUB_SHA ?? '') ||
    env.CONFIGURE_DEMO_REVIEWED_SHA !== env.GITHUB_SHA ||
    !/^[1-9][0-9]{0,19}(?![\s\S])/.test(env.GITHUB_RUN_ID ?? '') ||
    !/^[1-9][0-9]{0,9}(?![\s\S])/.test(env.GITHUB_RUN_ATTEMPT ?? '')
  )
    fail('DEMO_SOURCE_TRUSTED_MAIN_REQUIRED');
  return {
    repository: TARGET.repository,
    reviewedSha: env.GITHUB_SHA,
    runId: env.GITHUB_RUN_ID,
    runAttempt: env.GITHUB_RUN_ATTEMPT,
  };
}

const matchesCreatePolicy = (trigger) =>
  trigger?.branch === TARGET.branch &&
  trigger.checkSuites === true &&
  trigger.baseEnvironmentOverrideId === null;

export async function configure({
  client,
  operation = 'inspect',
  expectedDigest,
  assertFreshContext = async () => {},
} = {}) {
  if (!['inspect', 'set-main', 'create-main'].includes(operation))
    fail('DEMO_SOURCE_INVALID_OPERATION');
  if (operation !== 'inspect' && !DIGEST.test(expectedDigest ?? ''))
    fail('DEMO_SOURCE_EXPECTED_DIGEST_REQUIRED');
  const variables = {
    projectId: TARGET.projectId,
    environmentId: TARGET.environmentId,
    serviceId: TARGET.serviceId,
  };
  const inspect = async () => projectInventory(await client(INVENTORY_QUERY, variables));
  await assertFreshContext();
  const before = await inspect();
  const beforeDigest = inventoryDigest(before);
  if (operation === 'inspect') {
    await assertFreshContext();
    return {
      operation,
      outcome: classify(before),
      inventory: before,
      inventorySha256: beforeDigest,
    };
  }
  if (beforeDigest !== expectedDigest) fail('DEMO_SOURCE_INVENTORY_DRIFT');
  const decision = classify(before);
  if (decision === 'duplicate-triggers') fail('DEMO_SOURCE_DUPLICATE_TRIGGERS');
  const creating = operation === 'create-main';
  if (!creating && decision === 'missing-trigger') fail('DEMO_SOURCE_MISSING_TRIGGER');
  if (creating && before.triggers.length && !matchesCreatePolicy(before.triggers[0]))
    fail('DEMO_SOURCE_CREATE_CONFLICT');
  await assertFreshContext();
  const fresh = await inspect();
  if (inventoryDigest(fresh) !== beforeDigest) fail('DEMO_SOURCE_INVENTORY_DRIFT');
  if (decision === 'already-main') {
    await assertFreshContext();
    return { operation, outcome: 'unchanged', inventory: fresh, inventorySha256: beforeDigest };
  }
  // Railway offers no trigger revision/CAS field. Re-read immediately before the
  // one write and verify afterwards; any detected concurrent drift blocks success.
  const expectedAfter = structuredClone(before);
  if (creating) {
    const result = await client(CREATE_MAIN, {
      input: {
        ...variables,
        repository: TARGET.repository,
        branch: TARGET.branch,
        // Official schema leaves provider as String. No alternate literal retry.
        provider: 'github',
        checkSuites: true,
        rootDirectory: before.rootDirectory,
      },
    });
    let created;
    try {
      created = projectTrigger(result?.deploymentTriggerCreate);
    } catch {
      fail('DEMO_SOURCE_CREATE_UNCONFIRMED');
    }
    if (!matchesCreatePolicy(created)) fail('DEMO_SOURCE_CREATE_UNCONFIRMED');
    expectedAfter.triggers = [created];
  } else {
    expectedAfter.triggers[0].branch = TARGET.branch;
    const trigger = before.triggers[0];
    const result = await client(UPDATE_BRANCH, {
      id: trigger.id,
      input: { branch: TARGET.branch },
    });
    if (
      result?.deploymentTriggerUpdate?.id !== trigger.id ||
      result.deploymentTriggerUpdate.branch !== TARGET.branch
    )
      fail('DEMO_SOURCE_UPDATE_UNCONFIRMED');
  }
  const after = await inspect();
  if (inventoryDigest(after) !== inventoryDigest(expectedAfter))
    fail(creating ? 'DEMO_SOURCE_POST_CREATE_DRIFT' : 'DEMO_SOURCE_POST_UPDATE_DRIFT');
  await assertFreshContext();
  return {
    operation,
    outcome: creating ? 'trigger-created' : 'branch-updated',
    previousInventorySha256: beforeDigest,
    inventory: after,
    inventorySha256: inventoryDigest(after),
  };
}

// Serialize a validated projection, never the provider response or caller extras.
export function serializeReceipt(
  context,
  result,
  { capturedAt = new Date().toISOString(), forbiddenValues = [] } = {},
) {
  const safeContext = validateContext({
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_REF: 'refs/heads/main',
    GITHUB_REPOSITORY: context.repository,
    GITHUB_SHA: context.reviewedSha,
    CONFIGURE_DEMO_REVIEWED_SHA: context.reviewedSha,
    GITHUB_RUN_ID: context.runId,
    GITHUB_RUN_ATTEMPT: context.runAttempt,
  });
  const raw = result.inventory;
  const kinds = ['serviceDomains', 'customDomains'];
  if (
    raw?.schemaVersion !== 1 ||
    !Array.isArray(raw.domains) ||
    raw.domains.length > 64 ||
    raw.domains.some((entry) => !kinds.includes(entry?.kind)) ||
    !Array.isArray(raw.triggers)
  )
    fail('DEMO_SOURCE_INVALID_RECEIPT');
  const inventory = projectInventory({
    projectToken: {
      project: { id: raw.projectId },
      environment: { id: raw.environmentId, name: raw.environmentName },
    },
    serviceInstance: {
      serviceId: raw.serviceId,
      environmentId: raw.environmentId,
      rootDirectory: raw.rootDirectory,
      source: { repo: raw.repository },
      domains: Object.fromEntries(
        kinds.map((kind) => [
          kind,
          raw.domains.filter((entry) => entry.kind === kind).map(({ domain }) => ({ domain })),
        ]),
      ),
    },
    deploymentTriggers: {
      pageInfo: { hasNextPage: raw.hasMoreTriggers },
      edges: raw.triggers.map((node) => ({ node })),
    },
  });
  const outcomes = {
    inspect: ['missing-trigger', 'duplicate-triggers', 'already-main', 'branch-change-required'],
    'set-main': ['unchanged', 'branch-updated'],
    'create-main': ['unchanged', 'trigger-created'],
  };
  if (
    !Object.hasOwn(outcomes, result.operation) ||
    !outcomes[result.operation].includes(result.outcome) ||
    result.inventorySha256 !== inventoryDigest(inventory) ||
    typeof capturedAt !== 'string' ||
    !Number.isFinite(Date.parse(capturedAt)) ||
    new Date(capturedAt).toISOString() !== capturedAt
  )
    fail('DEMO_SOURCE_INVALID_RECEIPT');
  const changed = ['branch-updated', 'trigger-created'].includes(result.outcome);
  if (changed && !DIGEST.test(result.previousInventorySha256 ?? ''))
    fail('DEMO_SOURCE_INVALID_RECEIPT');
  const receipt = {
    schemaVersion: 1,
    ...safeContext,
    capturedAt,
    operation: result.operation,
    outcome: result.outcome,
    ...(changed ? { previousInventorySha256: result.previousInventorySha256 } : {}),
    inventory,
    inventorySha256: result.inventorySha256,
  };
  const json = JSON.stringify(receipt);
  if (
    Buffer.byteLength(json) > 32_768 ||
    SECRET.test(json) ||
    forbiddenValues.some(
      (value) => typeof value === 'string' && value.length > 0 && json.includes(value),
    )
  )
    fail('DEMO_SOURCE_INVALID_RECEIPT');
  return json;
}

async function main() {
  const context = validateContext(process.env);
  const result = await configure({
    client: createClient({ token: process.env.RAILWAY_TOKEN }),
    operation: process.env.CONFIGURE_DEMO_OPERATION || 'inspect',
    expectedDigest: process.env.CONFIGURE_DEMO_EXPECTED_DIGEST,
    assertFreshContext: createMainVerifier({
      token: process.env.GITHUB_TOKEN,
      reviewedSha: context.reviewedSha,
    }),
  });
  const receipt = serializeReceipt(context, result, {
    forbiddenValues: [process.env.RAILWAY_TOKEN, process.env.GITHUB_TOKEN],
  });
  await writeFile('demo-source-configuration-receipt.json', `${receipt}\n`, {
    flag: 'wx',
    mode: 0o600,
  });
  console.log(`DEMO_SOURCE_CONFIGURATION_RECEIPT ${receipt}`);
  console.log(`DEMO_SOURCE_CONFIGURATION_OK ${result.outcome} ${result.inventorySha256}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(
      error instanceof ConfigurationError ? error.code : 'DEMO_SOURCE_CONFIGURATION_FAILED',
    );
    process.exitCode = 1;
  });
}
