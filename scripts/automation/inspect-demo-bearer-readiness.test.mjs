import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { TARGET, ENDPOINT, MAIN_ENDPOINT } from './configure-demo-source.mjs';
import { QUERIES, createRunner, serializeReceipt } from './inspect-demo-bearer-readiness.mjs';
const sha = 'a'.repeat(40);
const env = { GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REPOSITORY: TARGET.repository, GITHUB_REF: 'refs/heads/main', GITHUB_SHA: sha, CONFIGURE_DEMO_REVIEWED_SHA: sha, GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1' };
const clone = (x) => structuredClone(x);
function fixture() {
  return {
    IDENTITY: { me: { id: 'opaque-user-id-do-not-publish', email: 'unrequested@example.invalid' } },
    ACCESS: { project: { id: TARGET.projectId }, environment: { id: TARGET.environmentId, projectId: TARGET.projectId, name: 'demo', canAccess: true } },
    REPOSITORY: { gitHubRepoAccessAvailable: { hasAccess: true, isPublic: false } },
    INVENTORY: { serviceInstance: { serviceId: TARGET.serviceId, environmentId: TARGET.environmentId, rootDirectory: '/backend', source: { repo: TARGET.repository }, domains: { serviceDomains: [{domain: TARGET.domain}], customDomains: [] } }, deploymentTriggers: { pageInfo: {hasNextPage: false}, edges: [] } },
  };
}
function response(body, url = ENDPOINT, init = {}) {
  const result = new Response(JSON.stringify(body), init);
  Object.defineProperty(result, 'url', {value: url});
  return result;
}
function harness({ data = fixture(), modify, mainMove = 0 } = {}) {
  const calls = []; let mains = 0, inventories = 0;
  const fetchImpl = async (url, options) => {
    calls.push({url, options});
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    if (url === MAIN_ENDPOINT) {
      mains++;
      return response({ref: 'refs/heads/main', object: {type: 'commit', sha: mains === mainMove ? 'b'.repeat(40) : sha}}, url);
    }
    assert.equal(url, ENDPOINT);
    assert.deepEqual(Object.keys(options.headers).sort(), ['Authorization', 'Content-Type']);
    assert.equal(options.headers.Authorization, 'Bearer synthetic-railway-credential');
    const {query, variables} = JSON.parse(options.body);
    assert.ok(!/mutation|projectToken|email|config|variables\s*\{/i.test(query));
    const phase = Object.keys(QUERIES).find((key) => QUERIES[key] === query);
    assert.ok(phase);
    if (phase === 'REPOSITORY') assert.deepEqual(variables, {fullRepoName: TARGET.repository});
    if (phase === 'INVENTORY') inventories++;
    const body = {data: clone(data[phase])};
    return modify?.({phase, body, inventories}) ?? response(body);
  };
  return {calls, run: (context = env) => createRunner({railwayToken: 'synthetic-railway-credential', githubToken: 'synthetic-github-credential', fetchImpl})(context)};
}
test('trusted runner uses fixed bearer reads, discards identity and freezes exact projected receipt', async () => {
  const h = harness(); const result = await h.run();
  assert.equal(h.calls.length, 11);
  assert.equal(result.credentialKind, 'unattested');
  assert.equal(result.mutationAllowed, false);
  assert.equal(result.deployVerified, false);
  assert.ok(Object.isFrozen(result.observations.inventory.domains));
  const json = serializeReceipt(result);
  assert.ok(!json.includes('opaque-user') && !json.includes('email'));
  assert.equal(result.inventorySha256.length, 64);
  assert.throws(() => serializeReceipt(clone(result)), /RECEIPT/);
  assert.throws(() => serializeReceipt(result, {forbiddenValues: ['/backend']}), /RECEIPT/);
});
test('invalid context or initial main prevents all provider reads', async () => {
  const h = harness(); await assert.rejects(h.run({...env, GITHUB_REF: 'refs/heads/other'}), /CONTEXT/); assert.equal(h.calls.length, 0);
  const drift = harness({mainMove: 1}); await assert.rejects(drift.run(), /MAIN/); assert.equal(drift.calls.length, 1);
});
test('main moving between phases or snapshots fails closed', async () => {
  for (const mainMove of [2,3,4]) await assert.rejects(harness({mainMove}).run(), /MAIN/);
});
test('false access is a truthful observation and never authorization', async () => {
  for (const field of ['environment','repository']) {
    const data = fixture();
    if (field === 'environment') data.ACCESS.environment.canAccess = false;
    else data.REPOSITORY.gitHubRepoAccessAvailable.hasAccess = false;
    const result = await harness({data}).run();
    assert.equal(result.outcome, 'observed-access-false');
    assert.equal(result.serviceConnectAllowed, false);
    if (field === 'environment') assert.equal(result.observations.inventory, null);
  }
});
test('identity, target, partial, null and boolean shapes reject', async () => {
  const mutations = [
    (d) => d.IDENTITY.me.id = '', (d) => d.IDENTITY.me = null,
    (d) => d.ACCESS.project.id = 'foreign', (d) => d.ACCESS.environment.projectId = 'foreign',
    (d) => d.ACCESS.environment.name = 'production', (d) => d.ACCESS.environment.canAccess = null,
    (d) => d.REPOSITORY.gitHubRepoAccessAvailable.hasAccess = 'true',
    (d) => d.INVENTORY.serviceInstance = null,
    (d) => d.INVENTORY.serviceInstance.source.repo = 'foreign/repo',
    (d) => d.INVENTORY.serviceInstance.rootDirectory = 'ghp_sensitive',
    (d) => d.INVENTORY.serviceInstance.rootDirectory = '/backend\n',
    (d) => d.INVENTORY.serviceInstance.domains.serviceDomains = [],
    (d) => d.INVENTORY.serviceInstance.domains.customDomains = [{domain: TARGET.domain}],
    (d) => d.INVENTORY.deploymentTriggers.pageInfo.hasNextPage = true,
    (d) => d.INVENTORY.deploymentTriggers.edges = null,
  ];
  for (const mutate of mutations) { const data = fixture(); mutate(data); await assert.rejects(harness({data}).run()); }
});
const trigger = () => ({id: 'trigger-1', provider: 'github', projectId: TARGET.projectId, environmentId: TARGET.environmentId, serviceId: TARGET.serviceId, repository: TARGET.repository, branch: 'main', checkSuites: true, baseEnvironmentOverrideId: null});
test('trigger ownership, duplication and metadata reject; bounded valid trigger accepted', async () => {
  const valid = fixture(); valid.INVENTORY.deploymentTriggers.edges = [{node: trigger()}];
  assert.equal((await harness({data: valid}).run()).observations.inventory.triggers.length, 1);
  for (const key of ['projectId','environmentId','serviceId','repository','provider','branch','checkSuites']) {
    const data = clone(valid); data.INVENTORY.deploymentTriggers.edges[0].node[key] = key === 'branch' ? 'bad\n' : 'foreign';
    await assert.rejects(harness({data}).run());
  }
  valid.INVENTORY.deploymentTriggers.edges.push({node: trigger()});
  await assert.rejects(harness({data: valid}).run(), /DUPLICATE/);
});
test('inventory drift prevents a receipt', async () => {
  await assert.rejects(harness({modify: ({phase, body, inventories}) => {
    if (phase === 'INVENTORY' && inventories === 2) body.data.serviceInstance.rootDirectory = '/different';
    return response(body);
  }}).run(), /INVENTORY_DRIFT/);
});
test('transport, redirects, errors, malformed JSON and response bounds use constant errors', async () => {
  const cases = [
    () => {throw new Error('raw-private-provider-error');},
    () => response({data: null, errors: [{message: 'raw-private-provider-error'}]}),
    () => response({data: fixture().IDENTITY, errors: []}),
    () => response({}, 'https://evil.invalid'),
    () => response({}, ENDPOINT, {status: 403}),
    () => response({padding: 'x'.repeat(262145)}),
    () => { const r = response({}); Object.defineProperty(r, 'redirected', {value: true}); return r; },
    () => { const r = new Response('{broken'); Object.defineProperty(r, 'url', {value: ENDPOINT}); return r; },
  ];
  for (const modify of cases) await assert.rejects(harness({modify}).run(), (error) => error.message === 'DEMO_BEARER_IDENTITY_READ_FAILED');
});
test('missing credentials and all CLI failures are sanitized with annotation and constant console code', async () => {
  const directory = await mkdtemp(`${tmpdir()}/demo-bearer-cli-`);
  const child = spawnSync(process.execPath, [new URL('./inspect-demo-bearer-readiness.mjs', import.meta.url).pathname], {cwd: directory, env: {PATH: process.env.PATH}, encoding: 'utf8'});
  assert.equal(child.status, 1);
  assert.match(child.stderr, /::error::DEMO_BEARER_/);
  assert.ok(!child.stderr.includes('Error:') && !child.stderr.includes(' at '));
  await assert.rejects(stat(`${directory}/demo-bearer-readiness-receipt.json`));
});
test('workflow keeps exact main, fixed existing secret, readonly scope and offline tests before credentials', async () => {
  const workflow = await readFile(new URL('../../.github/workflows/inspect-demo-bearer-readiness.yml', import.meta.url), 'utf8');
  assert.equal((workflow.match(/secrets\./g) ?? []).length, 1);
  assert.match(workflow, /RAILWAY_TOKEN: \$\{\{ secrets.RAILWAY_TOKEN \}\}/);
  assert.match(workflow, /group: railway-backend/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /inputs.reviewed_sha == github.sha/);
  assert.match(workflow, /environment: 'glistening-friendship \/ demo'/);
  assert.ok(workflow.indexOf('run: node --test') < workflow.indexOf('secrets.RAILWAY_TOKEN'));
  assert.equal((workflow.match(/uses: [^\n]+@[a-f0-9]{40}/g) ?? []).length, 2);
  assert.ok(!/contents: write|RAILWAY_DEMO_TOKEN|operation:|serviceConnect|upload-artifact/.test(workflow));
});

test('real CLI success writes exclusive mode0600 receipt and identical console marker without credentials or identity', async () => {
  const directory = await mkdtemp(`${tmpdir()}/demo-bearer-success-`);
  const data = fixture();
  const preload = `const data=${JSON.stringify(data)}; const queries=${JSON.stringify(QUERIES)};
    globalThis.fetch=async(url,options)=>{
      let body;
      if(url===${JSON.stringify(MAIN_ENDPOINT)}) body={ref:'refs/heads/main',object:{type:'commit',sha:${JSON.stringify(sha)}}};
      else { const request=JSON.parse(options.body); const phase=Object.keys(queries).find(key=>queries[key]===request.query); if(!phase) throw Error('unexpected'); body={data:data[phase]}; }
      const response=new Response(JSON.stringify(body)); Object.defineProperty(response,'url',{value:url}); return response;
    };`;
  const childEnv = {...env, PATH: process.env.PATH, RAILWAY_TOKEN: 'synthetic-railway-credential', GITHUB_TOKEN: 'synthetic-github-credential'};
  const args = ['--import', `data:text/javascript,${encodeURIComponent(preload)}`, new URL('./inspect-demo-bearer-readiness.mjs', import.meta.url).pathname];
  const child = spawnSync(process.execPath, args, {cwd: directory, env: childEnv, encoding:'utf8'});
  assert.equal(child.status, 0, child.stderr);
  const receiptPath = `${directory}/demo-bearer-readiness-receipt.json`;
  const receipt = await readFile(receiptPath, 'utf8');
  assert.equal((await stat(receiptPath)).mode & 0o777, 0o600);
  assert.equal(child.stdout, `DEMO_BEARER_READINESS_RECEIPT ${receipt}`);
  assert.ok(!/opaque-user|unrequested|synthetic-railway|synthetic-github/.test(receipt));
  const retry = spawnSync(process.execPath, args, {cwd: directory, env: childEnv, encoding:'utf8'});
  assert.equal(retry.status, 1);
  assert.equal(await readFile(receiptPath, 'utf8'), receipt);
  assert.ok(!retry.stdout.includes('RECEIPT'));
});
test('timeouts are installed on each request and credential/request sizes stay bounded', async () => {
  const original = AbortSignal.timeout; const deadlines = [];
  AbortSignal.timeout = (ms) => {deadlines.push(ms); return original(ms);};
  try {
    const h = harness(); await h.run();
    assert.equal(deadlines.filter(ms=>ms===15000).length, 7);
    assert.equal(deadlines.filter(ms=>ms===30000).length, 4);
    for (const {url,options} of h.calls) if(url===ENDPOINT) assert.ok(Buffer.byteLength(options.body)<4096);
  } finally {AbortSignal.timeout=original;}
  let providerCalls = 0;
  await assert.rejects(createRunner({railwayToken:'x'.repeat(8193), githubToken:'synthetic', fetchImpl:async(url)=>{
    if(url===ENDPOINT) providerCalls++;
    return response({ref:'refs/heads/main',object:{type:'commit',sha}},url);
  }})(env), /CREDENTIAL/);
  assert.equal(providerCalls, 0);
});
