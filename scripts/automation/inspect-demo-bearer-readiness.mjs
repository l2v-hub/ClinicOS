import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { TARGET, ENDPOINT, createMainVerifier, validateContext } from './configure-demo-source.mjs';

export const QUERIES = Object.freeze({
  IDENTITY: 'query{me{id}}',
  ACCESS: `query($projectId:String!,$environmentId:String!){project(id:$projectId){id} environment(id:$environmentId,projectId:$projectId){id projectId name canAccess}}`,
  REPOSITORY: 'query($fullRepoName:String!){gitHubRepoAccessAvailable(fullRepoName:$fullRepoName){hasAccess isPublic}}',
  INVENTORY: `query($projectId:String!,$environmentId:String!,$serviceId:String!){
    serviceInstance(environmentId:$environmentId,serviceId:$serviceId){serviceId environmentId rootDirectory source{repo} domains{serviceDomains{domain} customDomains{domain}}}
    deploymentTriggers(projectId:$projectId,environmentId:$environmentId,serviceId:$serviceId,first:2){pageInfo{hasNextPage} edges{node{id provider projectId environmentId serviceId repository branch checkSuites baseEnvironmentOverrideId}}}
  }`,
});
const VARIABLES = Object.freeze({
  IDENTITY: Object.freeze({}),
  ACCESS: Object.freeze({ projectId: TARGET.projectId, environmentId: TARGET.environmentId }),
  REPOSITORY: Object.freeze({ fullRepoName: TARGET.repository }),
  INVENTORY: Object.freeze({ projectId: TARGET.projectId, environmentId: TARGET.environmentId, serviceId: TARGET.serviceId }),
});
const SECRET = /(?:gh[pousr]_|github_pat_|sk-(?:ant-|proj-)|eyJ[A-Za-z0-9_-]{10,}\.)/;
const ID = /^[A-Za-z0-9][A-Za-z0-9_:/+=.-]{0,199}$/;
const minted = new WeakSet();
const safeErrors = new WeakSet();
const fail = (code) => { const error = new Error(`DEMO_BEARER_${code}`); safeErrors.add(error); throw error; };
const freeze = (value) => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const safe = (value, regex = ID) => { if (typeof value !== 'string' || /[\r\n]/.test(value) || !regex.test(value) || SECRET.test(value)) fail('METADATA'); return value; };
const exact = (actual, expected) => { if (actual !== expected) fail('TARGET'); return actual; };
const bool = (value) => { if (typeof value !== 'boolean') fail('METADATA'); return value; };

// A separate bearer projection: no projectToken query or fabricated token identity.
function inventory(data) {
  const instance = data?.serviceInstance;
  exact(instance?.serviceId, TARGET.serviceId);
  exact(instance.environmentId, TARGET.environmentId);
  exact(instance.source?.repo, TARGET.repository);
  const rootDirectory = instance.rootDirectory === null ? null : safe(instance.rootDirectory, /^\/?[A-Za-z0-9._/-]{0,256}$/);
  const domains = [];
  for (const kind of ['serviceDomains', 'customDomains']) {
    const entries = instance.domains?.[kind];
    if (!Array.isArray(entries) || entries.length > 32) fail('METADATA');
    for (const entry of entries) domains.push({ kind, domain: safe(entry?.domain, /^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/) });
  }
  if (!domains.some(({domain}) => domain === TARGET.domain) || new Set(domains.map(({domain}) => domain)).size !== domains.length) fail('DOMAINS');
  domains.sort((a,b) => a.kind.localeCompare(b.kind) || a.domain.localeCompare(b.domain));
  const connection = data?.deploymentTriggers;
  if (!Array.isArray(connection?.edges) || connection.edges.length > 2 || bool(connection?.pageInfo?.hasNextPage)) fail('TRIGGERS');
  const triggers = connection.edges.map(({node}) => ({
    id: safe(node?.id), provider: exact(node.provider, 'github'),
    projectId: exact(node.projectId, TARGET.projectId), environmentId: exact(node.environmentId, TARGET.environmentId),
    serviceId: exact(node.serviceId, TARGET.serviceId), repository: exact(node.repository, TARGET.repository),
    branch: safe(node.branch, /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/), checkSuites: bool(node.checkSuites),
    baseEnvironmentOverrideId: node.baseEnvironmentOverrideId === null ? null : safe(node.baseEnvironmentOverrideId),
  }));
  if (triggers.length > 1 || new Set(triggers.map(({id}) => id)).size !== triggers.length) fail('DUPLICATE_TRIGGERS');
  return { projectId: TARGET.projectId, environmentId: TARGET.environmentId, serviceId: TARGET.serviceId, repository: TARGET.repository, rootDirectory, domains, triggers };
}

// Only fixed phase identifiers are accepted; callers cannot submit GraphQL text or variables.
function bearerReader(token, fetchImpl) {
  if (typeof token !== 'string' || !token.trim() || token.length > 8192 || /[\r\n]/.test(token)) fail('CREDENTIAL');
  let requests = 0;
  const started = Date.now();
  return async (phase) => {
    if (!Object.hasOwn(QUERIES, phase) || ++requests > 8 || Date.now() - started > 90_000) fail('READ_LIMIT');
    try {
      const response = await fetchImpl(ENDPOINT, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15_000),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: QUERIES[phase], variables: VARIABLES[phase] }),
      });
      if (!response.ok || response.url !== ENDPOINT || response.redirected || !response.body || Number(response.headers.get('content-length')) > 262144) fail('RESPONSE');
      const reader = response.body.getReader();
      const chunks = []; let bytes = 0;
      try {
        for (;;) {
          const {done,value} = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > 262144) fail('RESPONSE');
          chunks.push(Buffer.from(value));
        }
      } finally { await reader.cancel().catch(() => {}); }
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!body?.data || Object.hasOwn(body, 'errors')) fail('RESPONSE');
      return body.data;
    } catch { fail(`${phase}_READ_FAILED`); }
  };
}

export function createRunner({ railwayToken, githubToken, fetchImpl = fetch } = {}) {
  // Construction does not contact either provider. Context validation precedes all requests.
  return async (env) => {
    let context;
    try { context = validateContext(env); } catch { fail('CONTEXT'); }
    let verify;
    try { verify = createMainVerifier({ token: githubToken, reviewedSha: context.reviewedSha, fetchImpl }); } catch { fail('MAIN'); }
    const fresh = async () => { try { await verify(); } catch { fail('MAIN'); } };
    await fresh();
    const read = bearerReader(railwayToken, fetchImpl);
    const identity = await read('IDENTITY');
    try { safe(identity?.me?.id); } catch { fail('IDENTITY_SHAPE'); }
    // Identity ID is deliberately discarded here.
    const snapshot = async () => {
      const access = await read('ACCESS');
      exact(access?.project?.id, TARGET.projectId);
      exact(access?.environment?.id, TARGET.environmentId);
      exact(access.environment.projectId, TARGET.projectId);
      exact(access.environment.name, 'demo');
      const canAccess = bool(access.environment.canAccess);
      const repo = (await read('REPOSITORY'))?.gitHubRepoAccessAvailable;
      const repositoryAccess = { hasAccess: bool(repo?.hasAccess), isPublic: bool(repo?.isPublic) };
      // A false access observation is retained without claiming service inventory access.
      return { environment: { id: TARGET.environmentId, name: 'demo', canAccess }, repositoryAccess, inventory: canAccess ? inventory(await read('INVENTORY')) : null };
    };
    await fresh();
    const before = await snapshot();
    await fresh();
    const after = await snapshot();
    if (hash(before) !== hash(after)) fail('INVENTORY_DRIFT');
    await fresh();
    const result = freeze({ schemaVersion: 1, ...context, capturedAt: new Date().toISOString(),
      credentialBinding: 'RAILWAY_TOKEN', authTransport: 'authorization-bearer', credentialKind: 'unattested',
      userIdentityObserved: true, projectWideVisibility: 'unproven', serviceConnectAllowed: false, mutationAllowed: false, deployVerified: false,
      outcome: after.environment.canAccess && after.repositoryAccess.hasAccess ? 'observed-access-visibility-unproven' : 'observed-access-false',
      target: { ...TARGET }, observations: after, inventorySha256: hash(after),
    });
    minted.add(result);
    return result;
  };
}

export function serializeReceipt(result, { forbiddenValues = [] } = {}) {
  if (!minted.has(result) || !Object.isFrozen(result)) fail('RECEIPT');
  const json = JSON.stringify(result);
  if (Buffer.byteLength(json) > 32768 || SECRET.test(json) || forbiddenValues.some((value) => typeof value === 'string' && value && json.includes(value))) fail('RECEIPT');
  return json;
}

async function main() {
  const result = await createRunner({ railwayToken: process.env.RAILWAY_TOKEN, githubToken: process.env.GITHUB_TOKEN })(process.env);
  const json = serializeReceipt(result, { forbiddenValues: [process.env.RAILWAY_TOKEN, process.env.GITHUB_TOKEN] });
  await writeFile('demo-bearer-readiness-receipt.json', `${json}\n`, { flag: 'wx', mode: 0o600 });
  console.log(`DEMO_BEARER_READINESS_RECEIPT ${json}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const code = safeErrors.has(error) ? error.message : 'DEMO_BEARER_READINESS_FAILED';
    console.error(`::error::${code}`);
    console.error(code);
    process.exitCode = 1;
  });
}
