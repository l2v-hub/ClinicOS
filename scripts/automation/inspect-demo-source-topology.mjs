import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import {
  TARGET,
  INVENTORY_QUERY,
  ConfigurationError,
  createClient,
  createMainVerifier,
  projectInventory,
  inventoryDigest,
  validateContext,
} from './configure-demo-source.mjs';

export const ENVIRONMENTS_QUERY = `query($projectId:String!,$after:String){
  project(id:$projectId){id environments(first:50,after:$after){
    pageInfo{hasNextPage endCursor} edges{node{
      id projectId name canAccess isEphemeral sourceEnvironment{id projectId}
    }}
  }}
}`;
export const SERVICES_QUERY = `query($projectId:String!,$after:String){
  project(id:$projectId){id services(first:50,after:$after){
    pageInfo{hasNextPage endCursor} edges{node{id name projectId}}
  }}
}`;
export const INSTANCES_QUERY = `query($projectId:String!,$environmentId:String!,$after:String){
  environment(id:$environmentId,projectId:$projectId){id projectId serviceInstances(first:50,after:$after){
    pageInfo{hasNextPage endCursor} edges{node{id environmentId serviceId rootDirectory source{repo}}}
  }}
}`;
export const TRIGGERS_QUERY = `query($projectId:String!,$environmentId:String!,$after:String){
  environment(id:$environmentId,projectId:$projectId){id projectId deploymentTriggers(first:50,after:$after){
    pageInfo{hasNextPage endCursor} edges{node{
      id projectId environmentId serviceId repository provider branch checkSuites baseEnvironmentOverrideId
    }}
  }}
}`;
const ID = /^[A-Za-z0-9][A-Za-z0-9_:/+=.-]{0,199}$/;
const NAME = /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,79}$/;
const REPO = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
const SECRET = /(?:gh[pousr]_|github_pat_|sk-(?:ant-|proj-)|eyJ[A-Za-z0-9_-]{10,}\.)/;
const inspectedResults = new WeakSet();
const freeze = (value) => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
const fail = (code) => {
  throw new ConfigurationError(`DEMO_TOPOLOGY_${code}`);
};
const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const safe = (value, pattern = ID) => {
  if (
    typeof value !== 'string' ||
    !pattern.test(value) ||
    /[\r\n]/.test(value) ||
    SECRET.test(value)
  )
    fail('INVALID_METADATA');
  return value;
};
const owned = (value, expected) => {
  if (value !== expected) fail('OWNERSHIP_MISMATCH');
  return value;
};
const nullable = (value, pattern) => (value === null ? null : safe(value, pattern));
const sort = (values) => values.sort((a, b) => a.id.localeCompare(b.id));
const connection = async (readPage, project, max = 400) => {
  const values = [],
    ids = new Set(),
    cursors = new Set();
  let after = null;
  for (let page = 0; page < 8; page++) {
    const data = await readPage(after);
    if (
      !data ||
      !Array.isArray(data.edges) ||
      data.edges.length > 50 ||
      typeof data.pageInfo?.hasNextPage !== 'boolean' ||
      !(data.pageInfo.endCursor === null || typeof data.pageInfo.endCursor === 'string')
    )
      fail('INCOMPLETE_INVENTORY');
    for (const edge of data.edges) {
      const value = project(edge?.node);
      if (ids.has(value.id)) fail('DUPLICATE_ENTITY');
      ids.add(value.id);
      values.push(value);
      if (values.length > max) fail('INVENTORY_LIMIT');
    }
    if (!data.pageInfo.hasNextPage) return sort(values);
    const cursor = safe(data.pageInfo.endCursor);
    if (!data.edges.length || cursors.has(cursor)) fail('PAGINATION_STALLED');
    cursors.add(cursor);
    after = cursor;
  }
  fail('INVENTORY_LIMIT');
};

async function snapshot(client) {
  const projectPage = async (query, field, after) => {
    const data = await client(query, { projectId: TARGET.projectId, after });
    owned(data?.project?.id, TARGET.projectId);
    return data.project[field];
  };
  const environments = await connection(
    (after) => projectPage(ENVIRONMENTS_QUERY, 'environments', after),
    (node) => {
      if (typeof node?.canAccess !== 'boolean' || typeof node.isEphemeral !== 'boolean')
        fail('INVALID_METADATA');
      const parent = node.sourceEnvironment;
      if (parent !== null && (!parent || parent.projectId !== TARGET.projectId))
        fail('OWNERSHIP_MISMATCH');
      return {
        id: safe(node.id),
        projectId: owned(node.projectId, TARGET.projectId),
        name: safe(node.name, NAME),
        canAccess: node.canAccess,
        isEphemeral: node.isEphemeral,
        sourceEnvironmentId: parent === null ? null : safe(parent.id),
      };
    },
    32,
  );
  const demo = environments.find(({ id }) => id === TARGET.environmentId);
  if (!demo || demo.name !== 'demo' || !demo.canAccess) fail('TARGET_ENVIRONMENT_UNAVAILABLE');
  const services = await connection(
    (after) => projectPage(SERVICES_QUERY, 'services', after),
    (node) => ({
      id: safe(node?.id),
      name: safe(node?.name, NAME),
      projectId: owned(node?.projectId, TARGET.projectId),
    }),
    100,
  );
  const serviceIds = new Set(services.map(({ id }) => id));
  if (!serviceIds.has(TARGET.serviceId)) fail('TARGET_SERVICE_UNAVAILABLE');
  for (const environment of environments) {
    environment.instances = null;
    environment.triggers = null;
    if (!environment.canAccess) continue;
    const environmentPage = async (query, field, after) => {
      const data = await client(query, {
        projectId: TARGET.projectId,
        environmentId: environment.id,
        after,
      });
      owned(data?.environment?.id, environment.id);
      owned(data.environment.projectId, TARGET.projectId);
      return data.environment[field];
    };
    const serviceId = (id) => {
      safe(id);
      if (!serviceIds.has(id)) fail('FOREIGN_SERVICE');
      return id;
    };
    environment.instances = await connection(
      (after) => environmentPage(INSTANCES_QUERY, 'serviceInstances', after),
      (node) => ({
        id: safe(node?.id),
        serviceId: serviceId(node?.serviceId),
        environmentId: owned(node?.environmentId, environment.id),
        repository: node?.source === null ? null : nullable(node?.source?.repo, REPO),
        rootDirectory: nullable(node?.rootDirectory, /^\/?[A-Za-z0-9._/-]{0,256}$/),
      }),
    );
    if (
      new Set(environment.instances.map(({ serviceId: id }) => id)).size !==
      environment.instances.length
    )
      fail('DUPLICATE_SERVICE_INSTANCE');
    environment.triggers = await connection(
      (after) => environmentPage(TRIGGERS_QUERY, 'deploymentTriggers', after),
      (node) => {
        if (typeof node?.checkSuites !== 'boolean') fail('INVALID_METADATA');
        return {
          id: safe(node.id),
          projectId: owned(node.projectId, TARGET.projectId),
          environmentId: owned(node.environmentId, environment.id),
          serviceId: serviceId(node.serviceId),
          repository: safe(node.repository, REPO),
          provider: safe(node.provider, NAME),
          branch: safe(node.branch, /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/),
          checkSuites: node.checkSuites,
          baseEnvironmentOverrideId: nullable(node.baseEnvironmentOverrideId),
        };
      },
    );
  }
  const scoped = projectInventory(
    await client(INVENTORY_QUERY, {
      projectId: TARGET.projectId,
      environmentId: TARGET.environmentId,
      serviceId: TARGET.serviceId,
    }),
  );
  const demoInstance = demo.instances.find(({ serviceId }) => serviceId === TARGET.serviceId);
  if (
    !demoInstance ||
    demoInstance.repository !== TARGET.repository ||
    demoInstance.rootDirectory !== scoped.rootDirectory
  )
    fail('TARGET_SOURCE_MISMATCH');
  const demoTriggers = demo.triggers.filter(({ serviceId }) => serviceId === TARGET.serviceId);
  if (
    scoped.hasMoreTriggers ||
    demoTriggers.length !== scoped.triggers.length ||
    !scoped.triggers.every((trigger, index) =>
      Object.entries(trigger).every(([key, value]) => demoTriggers[index][key] === value),
    )
  )
    fail('SCOPED_TRIGGER_MISMATCH');
  return {
    projectId: TARGET.projectId,
    environments,
    services,
    scopedInventory: scoped,
    scopedInventorySha256: inventoryDigest(scoped),
    visiblePaginationComplete: environments.every(({ canAccess }) => canAccess),
    observedConstraints: [
      ...(environments.some(({ id }) => id !== TARGET.environmentId)
        ? ['OTHER_VISIBLE_ENVIRONMENTS']
        : []),
      ...(environments.some(({ canAccess }) => !canAccess)
        ? ['INACCESSIBLE_VISIBLE_ENVIRONMENTS']
        : []),
      ...(environments.some(
        ({ isEphemeral, sourceEnvironmentId }) => isEphemeral || sourceEnvironmentId !== null,
      )
        ? ['FORKED_OR_EPHEMERAL_ENVIRONMENTS']
        : []),
      ...(!scoped.triggers.length ? ['MISSING_TARGET_TRIGGER'] : []),
    ],
    credentialScope: 'project-environment',
    projectWideVisibility: 'unproven',
    serviceConnectAllowed: false,
    refusalReason: 'PROJECT_WIDE_VISIBILITY_UNPROVEN',
  };
}

export async function inspectTopology({ client, operation = 'inspect', assertFreshContext } = {}) {
  if (operation !== 'inspect') fail('READ_ONLY_OPERATION_REQUIRED');
  if (typeof client !== 'function' || typeof assertFreshContext !== 'function')
    fail('TRUSTED_CONTEXT_REQUIRED');
  const started = Date.now();
  let reads = 0;
  const boundedClient = async (query, variables) => {
    if (++reads > 200 || Date.now() - started > 90_000) fail('READ_LIMIT');
    if (
      ![
        ENVIRONMENTS_QUERY,
        SERVICES_QUERY,
        INSTANCES_QUERY,
        TRIGGERS_QUERY,
        INVENTORY_QUERY,
      ].includes(query)
    )
      fail('READ_ONLY_OPERATION_REQUIRED');
    try {
      return await client(query, variables);
    } catch (error) {
      const phase = new Map([
        [ENVIRONMENTS_QUERY, 'ENVIRONMENTS'],
        [SERVICES_QUERY, 'SERVICES'],
        [INSTANCES_QUERY, 'INSTANCES'],
        [TRIGGERS_QUERY, 'TRIGGERS'],
        [INVENTORY_QUERY, 'SCOPED_SOURCE'],
      ]).get(query);
      if (error instanceof ConfigurationError && error.code === 'DEMO_SOURCE_API_REJECTED')
        fail(`${phase}_QUERY_REJECTED`);
      if (error instanceof ConfigurationError && error.code === 'DEMO_SOURCE_REQUEST_FAILED')
        fail(`${phase}_REQUEST_FAILED`);
      fail(`${phase}_READ_FAILED`);
    }
  };
  await assertFreshContext();
  const before = await snapshot(boundedClient);
  await assertFreshContext();
  const after = await snapshot(boundedClient);
  if (digest(before) !== digest(after)) fail('INVENTORY_DRIFT');
  await assertFreshContext();
  const result = freeze({
    operation: 'inspect',
    outcome: 'inspected-visibility-unproven',
    inventory: after,
    inventorySha256: digest(after),
    readRequests: reads,
  });
  inspectedResults.add(result);
  return result;
}

export function serializeTopologyReceipt(context, result, { forbiddenValues = [] } = {}) {
  const safeContext = validateContext({
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_REPOSITORY: context?.repository,
    GITHUB_REF: 'refs/heads/main',
    GITHUB_SHA: context?.reviewedSha,
    CONFIGURE_DEMO_REVIEWED_SHA: context?.reviewedSha,
    GITHUB_RUN_ID: context?.runId,
    GITHUB_RUN_ATTEMPT: context?.runAttempt,
  });
  // Only an immutable result produced by this inspector may cross the artifact
  // boundary; caller-created objects and unvalidated provider extras never do.
  if (
    !inspectedResults.has(result) ||
    result?.operation !== 'inspect' ||
    result.outcome !== 'inspected-visibility-unproven' ||
    result.inventory?.credentialScope !== 'project-environment' ||
    result.inventory?.projectWideVisibility !== 'unproven' ||
    result.inventory?.serviceConnectAllowed !== false ||
    result.inventory?.refusalReason !== 'PROJECT_WIDE_VISIBILITY_UNPROVEN' ||
    result.inventorySha256 !== digest(result.inventory) ||
    !Number.isInteger(result.readRequests) ||
    result.readRequests < 1 ||
    result.readRequests > 200
  )
    fail('INVALID_RECEIPT');
  const receipt = {
    schemaVersion: 1,
    ...safeContext,
    capturedAt: new Date().toISOString(),
    operation: result.operation,
    outcome: result.outcome,
    inventory: result.inventory,
    inventorySha256: result.inventorySha256,
    readRequests: result.readRequests,
  };
  const json = JSON.stringify(receipt);
  if (
    Buffer.byteLength(json) > 131_072 ||
    SECRET.test(json) ||
    forbiddenValues.some((value) => typeof value === 'string' && value && json.includes(value))
  )
    fail('INVALID_RECEIPT');
  return json;
}

async function main() {
  const context = validateContext(process.env);
  const result = await inspectTopology({
    operation: process.env.DEMO_TOPOLOGY_OPERATION || 'inspect',
    client: createClient({ token: process.env.RAILWAY_TOKEN }),
    assertFreshContext: createMainVerifier({
      token: process.env.GITHUB_TOKEN,
      reviewedSha: context.reviewedSha,
    }),
  });
  const receipt = serializeTopologyReceipt(context, result, {
    forbiddenValues: [process.env.RAILWAY_TOKEN, process.env.GITHUB_TOKEN],
  });
  await writeFile('demo-source-topology-receipt.json', `${receipt}\n`, { flag: 'wx', mode: 0o600 });
  console.log(`DEMO_SOURCE_TOPOLOGY_RECEIPT ${receipt}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof ConfigurationError ? error.code : 'DEMO_TOPOLOGY_FAILED');
    process.exitCode = 1;
  });
}
