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
  await assert.rejects(harness({data: valid}).run(), /DUPLICATE_TRIGGERS/);
});
test('inventory drift prevents a receipt', async () => {
  await assert.rejects(harness({modify: ({phase, body, inventories}) => {
    if (phase === 'INVENTORY' && inventories === 2) body.data.serviceInstance.rootDirectory = '/different';
    return response(body);
  }}).run(), /INVENTORY_DRIFT/);
});
test('transport, redirects, GraphQL, malformed JSON and bounds retain distinct constant causes', async () => {
  const invalid = 'IDENTITY_RESPONSE_INVALID';
  const cases = [
    [() => {throw new Error('raw-private-provider-error https://private.invalid/token');}, 'IDENTITY_NETWORK'],
    [() => {throw new DOMException('raw-private-provider-error', 'TimeoutError');}, 'IDENTITY_TIMEOUT'],
    [() => response({data: null, errors: [{message: 'raw-private-provider-error', extensions:{code:'arbitrary-private'}}]}), 'IDENTITY_GRAPHQL_REJECTED'],
    [() => response({data: fixture().IDENTITY, errors: []}), invalid],
    [() => response({errors: 'poisoned'}), invalid],
    [() => response({}, 'https://evil.invalid'), invalid],
    [() => ({}), invalid],
    [() => response({},ENDPOINT,{headers:{'content-length':'bad'}}), invalid],
    [() => {throw {name:'TimeoutError',message:'untrusted-error-name'};}, 'IDENTITY_NETWORK'],
    [() => response({}, ENDPOINT, {status: 403}), 'IDENTITY_HTTP_403'],
    [() => response({}, ENDPOINT, {status: 401}), 'IDENTITY_HTTP_401'],
    [() => response({padding: 'x'.repeat(262145)}), invalid],
    [() => {const r=response({}); Object.defineProperty(r,'status',{value:601}); return r;}, invalid],
    [() => {const r=response({}); Object.defineProperty(r,'status',{value:'403'}); return r;}, invalid],
    [() => {const r=response({},ENDPOINT,{headers:{'content-length':'262145'}}); return r;}, invalid],
    [() => {const r=response({}); Object.defineProperty(r,'redirected',{value:true}); return r;}, invalid],
    [() => {const r=new Response('{broken'); Object.defineProperty(r,'url',{value:ENDPOINT}); return r;}, invalid],
    [() => {const r=new Response(new ReadableStream({pull(controller){controller.error(new Error('raw-stream-private'));}})); Object.defineProperty(r,'url',{value:ENDPOINT}); return r;}, 'IDENTITY_NETWORK'],
  ];
  for (const [modify, code] of cases) await assert.rejects(harness({modify}).run(), (error) => error.message === `DEMO_BEARER_${code}`);
});
test('all fixed phases retain HTTP and GraphQL classification and reject malformed projected shapes', async () => {
  for (const phase of Object.keys(QUERIES)) {
    for (const [reply, expected] of [
      [()=>response({},ENDPOINT,{status:403}), `DEMO_BEARER_${phase}_HTTP_403`],
      [()=>response({errors:[{message:'private'}]}),`DEMO_BEARER_${phase}_GRAPHQL_REJECTED`],
      [()=>response({data:{}}), phase === 'IDENTITY' ? 'DEMO_BEARER_IDENTITY_RESPONSE_INVALID' : (phase === 'ACCESS' || phase === 'INVENTORY' ? 'DEMO_BEARER_TARGET' : 'DEMO_BEARER_METADATA')],
    ]) {
      await assert.rejects(harness({modify: (request)=>request.phase===phase ? reply() : response(request.body)}).run(),
        (error)=>error.message===expected);
    }
  }
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
  assert.match(workflow, /group: demo-bearer-readiness/);
  const production = await readFile(new URL('../../.github/workflows/deploy-backend.yml', import.meta.url), 'utf8');
  assert.notEqual(workflow.match(/group: ([^\n]+)/)[1], production.match(/group: ([^\n]+)/)[1]);
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
  data.INVENTORY.deploymentTriggers.edges = [{node:{...trigger(), privateExtra:'never-publish'}}];
  data.ACCESS.environment.privateExtra = 'never-publish';
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
  assert.ok(!/opaque-user|unrequested|synthetic-railway|synthetic-github|never-publish|privateExtra/.test(receipt));
  const printed = JSON.parse(child.stdout.slice('DEMO_BEARER_READINESS_RECEIPT '.length));
  const keys = (object) => Object.keys(object).sort();
  assert.deepEqual(keys(printed), ['schemaVersion','repository','reviewedSha','runId','runAttempt','capturedAt','credentialBinding','authTransport','credentialKind','userIdentityObserved','projectWideVisibility','serviceConnectAllowed','mutationAllowed','deployVerified','outcome','target','observations','inventorySha256'].sort());
  assert.deepEqual(keys(printed.target), ['projectId','environmentId','serviceId','repository','branch','domain'].sort());
  assert.deepEqual(keys(printed.observations), ['environment','repositoryAccess','inventory'].sort());
  assert.deepEqual(keys(printed.observations.environment), ['id','name','canAccess'].sort());
  assert.deepEqual(keys(printed.observations.repositoryAccess), ['hasAccess','isPublic'].sort());
  assert.deepEqual(keys(printed.observations.inventory), ['projectId','environmentId','serviceId','repository','rootDirectory','domains','triggers'].sort());
  assert.deepEqual(keys(printed.observations.inventory.domains[0]), ['kind','domain'].sort());
  assert.deepEqual(keys(printed.observations.inventory.triggers[0]), ['id','provider','projectId','environmentId','serviceId','repository','branch','checkSuites','baseEnvironmentOverrideId'].sort());
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

test('poisoned provider errors never cross actual CLI stderr and constants preserve their causes', async () => {
  const directory = await mkdtemp(`${tmpdir()}/demo-bearer-poison-`);
  const poison = 'synthetic-railway-credential https://credential:private@private.invalid/identity ghp_private';
  for (const [failure, code] of [
    [`throw new Error(${JSON.stringify(poison)})`, 'NETWORK'],
    [`throw new DOMException(${JSON.stringify(poison)},'TimeoutError')`, 'TIMEOUT'],
    [`return fixed({errors:[{message:${JSON.stringify(poison)},extensions:{code:'INFERRED_ACCOUNT_SCOPE'}}]})`, 'GRAPHQL_REJECTED'],
    [`return fixed({},403)`, 'HTTP_403'],
    [`return fixed('malformed')`, 'RESPONSE_INVALID'],
  ]) {
    const preload = `const fixed=(body,status=200)=>{const r=new Response(JSON.stringify(body),{status});Object.defineProperty(r,'url',{value:${JSON.stringify(ENDPOINT)}});return r;};
      globalThis.fetch=async(url)=>{if(url===${JSON.stringify(MAIN_ENDPOINT)}) {const r=new Response(JSON.stringify({ref:'refs/heads/main',object:{type:'commit',sha:${JSON.stringify(sha)}}}));Object.defineProperty(r,'url',{value:url});return r;} ${failure};};`;
    const child = spawnSync(process.execPath, ['--import',`data:text/javascript,${encodeURIComponent(preload)}`,new URL('./inspect-demo-bearer-readiness.mjs',import.meta.url).pathname],
      {cwd:directory,env:{...env,PATH:process.env.PATH,RAILWAY_TOKEN:'synthetic-railway-credential',GITHUB_TOKEN:'synthetic-github-credential'},encoding:'utf8'});
    assert.equal(child.status,1);
    assert.equal(child.stdout,'');
    assert.equal(child.stderr,`::error::DEMO_BEARER_IDENTITY_${code}\nDEMO_BEARER_IDENTITY_${code}\n`);
    await assert.rejects(stat(`${directory}/demo-bearer-readiness-receipt.json`));
  }
  const cliCases = [];
  const duplicate = fixture();
  duplicate.INVENTORY.deploymentTriggers.edges = [{node:{...trigger(), privateExtra:poison}},{node:{...trigger(), privateExtra:poison}}];
  cliCases.push([duplicate, 'DEMO_BEARER_DUPLICATE_TRIGGERS']);
  const wrongEnvironment = fixture();
  wrongEnvironment.ACCESS.environment.name = `production-${poison}`;
  cliCases.push([wrongEnvironment, 'DEMO_BEARER_TARGET']);
  const missingIdentity = fixture();
  missingIdentity.IDENTITY = {privateExtra: poison};
  cliCases.push([missingIdentity, 'DEMO_BEARER_IDENTITY_RESPONSE_INVALID']);
  for (const [data, expected] of cliCases) {
    const preload = `const data=${JSON.stringify(data)}; const queries=${JSON.stringify(QUERIES)};
      globalThis.fetch=async(url,options)=>{
        let body;
        if(url===${JSON.stringify(MAIN_ENDPOINT)}) body={ref:'refs/heads/main',object:{type:'commit',sha:${JSON.stringify(sha)}}};
        else { const request=JSON.parse(options.body); const phase=Object.keys(queries).find(key=>queries[key]===request.query); body={data:data[phase]}; }
        const r=new Response(JSON.stringify(body)); Object.defineProperty(r,'url',{value:url}); return r;
      };`;
    const child = spawnSync(process.execPath, ['--import',`data:text/javascript,${encodeURIComponent(preload)}`,new URL('./inspect-demo-bearer-readiness.mjs',import.meta.url).pathname],
      {cwd:directory,env:{...env,PATH:process.env.PATH,RAILWAY_TOKEN:'synthetic-railway-credential',GITHUB_TOKEN:'synthetic-github-credential'},encoding:'utf8'});
    assert.equal(child.status,1);
    assert.equal(child.stdout,'');
    assert.equal(child.stderr,`::error::${expected}\n${expected}\n`);
    assert.ok(!child.stderr.includes(poison));
    await assert.rejects(stat(`${directory}/demo-bearer-readiness-receipt.json`));
  }
});

test('own request timeout reason classifies interrupted body reads without parsing arbitrary messages', async () => {
  const original=AbortSignal.timeout;
  AbortSignal.timeout=(ms)=>{
    if(ms!==15000) return original(ms);
    const controller=new AbortController();
    controller.abort(new DOMException('private-timeout-message','TimeoutError'));
    return controller.signal;
  };
  try {
    await assert.rejects(harness({modify:()=>{
      const r=new Response(new ReadableStream({pull(controller){controller.error(new TypeError('arbitrary-body-read-failure'));}}));
      Object.defineProperty(r,'url',{value:ENDPOINT});return r;
    }}).run(),(error)=>error.message==='DEMO_BEARER_IDENTITY_TIMEOUT');
  } finally {AbortSignal.timeout=original;}
});
