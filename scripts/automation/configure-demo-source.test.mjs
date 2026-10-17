import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import test from 'node:test';
import {
  TARGET,
  ENDPOINT,
  INVENTORY_QUERY,
  UPDATE_BRANCH,
  ConfigurationError,
  classify,
  configure,
  createClient,
  inventoryDigest,
  projectInventory,
  validateContext,
} from './configure-demo-source.mjs';

const triggerId = '11111111-1111-4111-8111-111111111111';
const clone = (value) => structuredClone(value);
function fixture(branch = 'old-demo-branch') {
  return {
    projectToken: {
      project: { id: TARGET.projectId },
      environment: { id: TARGET.environmentId, name: 'demo' },
    },
    serviceInstance: {
      serviceId: TARGET.serviceId,
      environmentId: TARGET.environmentId,
      rootDirectory: '/',
      source: { repo: TARGET.repository },
      domains: { serviceDomains: [{ domain: TARGET.domain }], customDomains: [] },
    },
    deploymentTriggers: {
      pageInfo: { hasNextPage: false },
      edges: [
        {
          node: {
            id: triggerId,
            provider: 'github',
            projectId: TARGET.projectId,
            environmentId: TARGET.environmentId,
            serviceId: TARGET.serviceId,
            repository: TARGET.repository,
            branch,
            checkSuites: true,
            baseEnvironmentOverrideId: null,
          },
        },
      ],
    },
  };
}
const digest = (data) => inventoryDigest(projectInventory(data));
function scripted(responses) {
  const calls = [];
  return {
    calls,
    client: async (query, variables) => {
      calls.push({ query, variables: clone(variables) });
      assert.ok(responses.length, 'unexpected provider request');
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return clone(response);
    },
  };
}
const rejectCode = (code) => (error) => {
  assert.ok(error instanceof ConfigurationError);
  assert.equal(error.message, code);
  assert.equal(error.code, code);
  return true;
};

test('inspection reads once, emits only immutable allowlisted metadata, and never updates', async () => {
  const data = fixture();
  data.variables = { PRIVATE: 'NEVER_PUBLISH_THIS' };
  data.serviceInstance.source.privateKey = 'NEVER_PUBLISH_THIS';
  data.deploymentTriggers.edges[0].node.untrusted = 'NEVER_PUBLISH_THIS';
  const api = scripted([data]);
  const result = await configure({ client: api.client });
  assert.equal(result.outcome, 'branch-change-required');
  assert.equal(result.inventorySha256, digest(data));
  assert.equal(api.calls.length, 1);
  assert.equal(api.calls[0].query, INVENTORY_QUERY);
  assert.doesNotMatch(JSON.stringify(result), /NEVER_PUBLISH_THIS|privateKey|variables|untrusted/);
  assert.throws(() => {
    result.inventory.triggers[0].branch = 'mutated';
  }, TypeError);
  data.deploymentTriggers.edges[0].node.branch = 'later-provider-mutation';
  assert.equal(result.inventory.triggers[0].branch, 'old-demo-branch');
});

test('unique existing trigger changes only branch, after two fresh reads and exact after-read', async () => {
  const before = fixture();
  const after = fixture('main');
  const api = scripted([
    before,
    before,
    { deploymentTriggerUpdate: { id: triggerId, branch: 'main' } },
    after,
  ]);
  const result = await configure({
    client: api.client,
    operation: 'set-main',
    expectedDigest: digest(before),
  });
  assert.equal(result.outcome, 'branch-updated');
  assert.equal(result.previousInventorySha256, digest(before));
  assert.equal(result.inventorySha256, digest(after));
  assert.deepEqual(
    api.calls.map(({ query }) => query),
    [INVENTORY_QUERY, INVENTORY_QUERY, UPDATE_BRANCH, INVENTORY_QUERY],
  );
  assert.deepEqual(api.calls[2].variables, { id: triggerId, input: { branch: 'main' } });
  const expected = clone(projectInventory(before));
  expected.triggers[0].branch = 'main';
  assert.deepEqual(result.inventory, expected);
});

test('already-main is idempotent with two reads and zero writes', async () => {
  const data = fixture('main');
  const api = scripted([data, data]);
  const result = await configure({
    client: api.client,
    operation: 'set-main',
    expectedDigest: digest(data),
  });
  assert.equal(result.outcome, 'unchanged');
  assert.equal(api.calls.length, 2);
  assert.ok(api.calls.every(({ query }) => query === INVENTORY_QUERY));
});

test('opaque GraphQL trigger IDs are preserved exactly without assuming UUID storage', async () => {
  const before = fixture();
  before.deploymentTriggers.edges[0].node.id = 'VHJpZ2dlcjpvcGFxdWU=';
  const after = clone(before);
  after.deploymentTriggers.edges[0].node.branch = 'main';
  const id = before.deploymentTriggers.edges[0].node.id;
  const api = scripted([
    before,
    before,
    { deploymentTriggerUpdate: { id, branch: 'main' } },
    after,
  ]);
  const result = await configure({
    client: api.client,
    operation: 'set-main',
    expectedDigest: digest(before),
  });
  assert.equal(result.inventory.triggers[0].id, id);
  assert.deepEqual(api.calls[2].variables, { id, input: { branch: 'main' } });
});

for (const operation of ['deploy', 'create', 'delete', 'serviceConnect', 'inspect\n']) {
  test(`forbidden operation ${JSON.stringify(operation)} makes no request`, async () => {
    const api = scripted([]);
    await assert.rejects(
      configure({ client: api.client, operation }),
      rejectCode('DEMO_SOURCE_INVALID_OPERATION'),
    );
    assert.equal(api.calls.length, 0);
  });
}

for (const expectedDigest of [
  undefined,
  '',
  '0'.repeat(63),
  'A'.repeat(64),
  `${'0'.repeat(64)}\n`,
]) {
  test(`invalid update digest ${JSON.stringify(expectedDigest)} blocks before read`, async () => {
    const api = scripted([]);
    await assert.rejects(
      configure({ client: api.client, operation: 'set-main', expectedDigest }),
      rejectCode('DEMO_SOURCE_EXPECTED_DIGEST_REQUIRED'),
    );
    assert.equal(api.calls.length, 0);
  });
}

test('stale expected inventory blocks before mutation', async () => {
  const api = scripted([fixture()]);
  await assert.rejects(
    configure({ client: api.client, operation: 'set-main', expectedDigest: '0'.repeat(64) }),
    rejectCode('DEMO_SOURCE_INVENTORY_DRIFT'),
  );
  assert.equal(api.calls.length, 1);
});

for (const [name, mutate] of [
  [
    'branch',
    (data) => {
      data.deploymentTriggers.edges[0].node.branch = 'concurrent';
    },
  ],
  [
    'check policy',
    (data) => {
      data.deploymentTriggers.edges[0].node.checkSuites = false;
    },
  ],
  [
    'root directory',
    (data) => {
      data.serviceInstance.rootDirectory = '/backend';
    },
  ],
  [
    'domain mapping',
    (data) => {
      data.serviceInstance.domains.customDomains.push({ domain: 'example.test' });
    },
  ],
]) {
  test(`fresh ${name} drift aborts before write`, async () => {
    const before = fixture();
    const changed = clone(before);
    mutate(changed);
    const api = scripted([before, changed]);
    await assert.rejects(
      configure({ client: api.client, operation: 'set-main', expectedDigest: digest(before) }),
      rejectCode('DEMO_SOURCE_INVENTORY_DRIFT'),
    );
    assert.equal(api.calls.length, 2);
    assert.ok(api.calls.every(({ query }) => query === INVENTORY_QUERY));
  });
}

for (const [name, mutate, code] of [
  [
    'missing',
    (data) => {
      data.deploymentTriggers.edges = [];
    },
    'DEMO_SOURCE_MISSING_TRIGGER',
  ],
  [
    'duplicate',
    (data) => {
      const duplicate = clone(data.deploymentTriggers.edges[0]);
      duplicate.node.id = '22222222-2222-4222-8222-222222222222';
      data.deploymentTriggers.edges.push(duplicate);
    },
    'DEMO_SOURCE_DUPLICATE_TRIGGERS',
  ],
  [
    'more pages',
    (data) => {
      data.deploymentTriggers.pageInfo.hasNextPage = true;
    },
    'DEMO_SOURCE_DUPLICATE_TRIGGERS',
  ],
]) {
  test(`${name} trigger is inspectable but update blocks before write`, async () => {
    const data = fixture();
    mutate(data);
    const inspection = await configure({ client: scripted([data]).client });
    assert.match(inspection.outcome, /missing-trigger|duplicate-triggers/);
    const api = scripted([data]);
    await assert.rejects(
      configure({ client: api.client, operation: 'set-main', expectedDigest: digest(data) }),
      rejectCode(code),
    );
    assert.equal(api.calls.length, 1);
  });
}

for (const [name, mutate, code] of [
  [
    'project token',
    (data) => {
      data.projectToken.project.id = 'foreign';
    },
    'DEMO_SOURCE_TARGET_MISMATCH',
  ],
  [
    'environment name',
    (data) => {
      data.projectToken.environment.name = 'production';
    },
    'DEMO_SOURCE_TARGET_MISMATCH',
  ],
  [
    'service',
    (data) => {
      data.serviceInstance.serviceId = 'foreign';
    },
    'DEMO_SOURCE_TARGET_MISMATCH',
  ],
  [
    'source repository',
    (data) => {
      data.serviceInstance.source.repo = 'foreign/repository';
    },
    'DEMO_SOURCE_TARGET_MISMATCH',
  ],
  [
    'domain',
    (data) => {
      data.serviceInstance.domains.serviceDomains = [];
    },
    'DEMO_SOURCE_DOMAIN_MISMATCH',
  ],
  [
    'foreign trigger environment',
    (data) => {
      data.deploymentTriggers.edges[0].node.environmentId = 'foreign';
    },
    'DEMO_SOURCE_TRIGGER_TARGET_MISMATCH',
  ],
  [
    'foreign trigger repository',
    (data) => {
      data.deploymentTriggers.edges[0].node.repository = 'foreign/repository';
    },
    'DEMO_SOURCE_FOREIGN_REPOSITORY',
  ],
  [
    'foreign provider',
    (data) => {
      data.deploymentTriggers.edges[0].node.provider = 'gitlab';
    },
    'DEMO_SOURCE_FOREIGN_PROVIDER',
  ],
  [
    'missing check metadata',
    (data) => {
      delete data.deploymentTriggers.edges[0].node.checkSuites;
    },
    'DEMO_SOURCE_INVALID_METADATA',
  ],
  [
    'malformed ID',
    (data) => {
      data.deploymentTriggers.edges[0].node.id += '\n';
    },
    'DEMO_SOURCE_INVALID_METADATA',
  ],
  [
    'secret-shaped branch',
    (data) => {
      data.deploymentTriggers.edges[0].node.branch = ['github', 'pat', 'private'].join('_');
    },
    'DEMO_SOURCE_INVALID_METADATA',
  ],
]) {
  test(`${name} blocks without returning provider metadata`, async () => {
    const data = fixture();
    mutate(data);
    const api = scripted([data]);
    await assert.rejects(configure({ client: api.client }), rejectCode(code));
    assert.equal(api.calls.length, 1);
  });
}

test('trigger and domain ordering do not create a false inventory drift', () => {
  const a = fixture();
  const duplicate = clone(a.deploymentTriggers.edges[0]);
  duplicate.node.id = '22222222-2222-4222-8222-222222222222';
  a.deploymentTriggers.edges.push(duplicate);
  a.serviceInstance.domains.customDomains = [
    { domain: 'b.example.test' },
    { domain: 'a.example.test' },
  ];
  const b = clone(a);
  b.deploymentTriggers.edges.reverse();
  b.serviceInstance.domains.customDomains.reverse();
  assert.equal(digest(a), digest(b));
});

test('post-update metadata drift cannot report success or retry/rollback automatically', async () => {
  const before = fixture();
  const after = fixture('main');
  after.deploymentTriggers.edges[0].node.checkSuites = false;
  const api = scripted([
    before,
    before,
    { deploymentTriggerUpdate: { id: triggerId, branch: 'main' } },
    after,
  ]);
  await assert.rejects(
    configure({ client: api.client, operation: 'set-main', expectedDigest: digest(before) }),
    rejectCode('DEMO_SOURCE_POST_UPDATE_DRIFT'),
  );
  assert.equal(api.calls.filter(({ query }) => query === UPDATE_BRANCH).length, 1);
  assert.equal(api.calls.length, 4);
});

test('unconfirmed update response blocks success, without automatic mutation retry', async () => {
  const before = fixture();
  const api = scripted([
    before,
    before,
    { deploymentTriggerUpdate: { id: triggerId, branch: 'other' } },
  ]);
  await assert.rejects(
    configure({ client: api.client, operation: 'set-main', expectedDigest: digest(before) }),
    rejectCode('DEMO_SOURCE_UPDATE_UNCONFIRMED'),
  );
  assert.equal(api.calls.length, 3);
});

test('client uses only fixed HTTPS endpoint, dedicated header, redirect refusal and finite timeout', async () => {
  const client = createClient({
    token: 'synthetic-test-token',
    fetchImpl: async (url, options) => {
      assert.equal(url, ENDPOINT);
      assert.deepEqual(options.headers, {
        'Content-Type': 'application/json',
        'Project-Access-Token': 'synthetic-test-token',
      });
      assert.equal(options.redirect, 'error');
      assert.equal(options.method, 'POST');
      assert.ok(options.signal instanceof AbortSignal);
      assert.deepEqual(JSON.parse(options.body), {
        query: INVENTORY_QUERY,
        variables: { only: 'metadata' },
      });
      return Response.json({ data: fixture() });
    },
  });
  assert.deepEqual(await client(INVENTORY_QUERY, { only: 'metadata' }), fixture());
});

test('actual loopback HTTP transport exercises inspect, digest, branch-only update and verified after-read', async (t) => {
  const state = fixture();
  const requests = [];
  let serverError;
  const server = createServer(async (request, response) => {
    try {
      assert.equal(request.method, 'POST');
      assert.equal(request.headers['project-access-token'], 'synthetic-loopback-token');
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString());
      requests.push(body);
      let data;
      if (body.query === INVENTORY_QUERY) data = clone(state);
      else {
        assert.equal(body.query, UPDATE_BRANCH);
        assert.deepEqual(body.variables, { id: triggerId, input: { branch: 'main' } });
        state.deploymentTriggers.edges[0].node.branch = 'main';
        data = { deploymentTriggerUpdate: { id: triggerId, branch: 'main' } };
      }
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ data }));
    } catch (error) {
      serverError = error;
      response.statusCode = 500;
      response.end('synthetic loopback failure');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
  const localUrl = `http://127.0.0.1:${server.address().port}`;
  const client = createClient({
    token: 'synthetic-loopback-token',
    fetchImpl: async (url, options) => {
      assert.equal(url, ENDPOINT);
      const actual = await fetch(localUrl, options);
      // Production rejects any alternate response URL. This test adapter forwards
      // only synthetic traffic to its owned loopback server and returns its bytes.
      return new Response(actual.body, { status: actual.status, headers: actual.headers });
    },
  });
  const inspection = await configure({ client });
  const changed = await configure({
    client,
    operation: 'set-main',
    expectedDigest: inspection.inventorySha256,
  });
  assert.equal(serverError, undefined);
  assert.equal(changed.outcome, 'branch-updated');
  assert.equal(requests.length, 5);
  assert.equal(requests.filter(({ query }) => query === UPDATE_BRANCH).length, 1);
  assert.equal(state.deploymentTriggers.edges[0].node.checkSuites, true);
  assert.equal(state.serviceInstance.rootDirectory, '/');
  assert.equal(changed.inventory.triggers[0].branch, 'main');
});

for (const [name, fetchImpl, code] of [
  [
    'HTTP error',
    async () => new Response('PRIVATE_PROVIDER_BODY', { status: 403 }),
    'DEMO_SOURCE_REQUEST_FAILED',
  ],
  [
    'GraphQL error',
    async () => Response.json({ data: fixture(), errors: [{ message: 'PRIVATE_PROVIDER_BODY' }] }),
    'DEMO_SOURCE_API_REJECTED',
  ],
  [
    'invalid JSON',
    async () => new Response('PRIVATE_PROVIDER_BODY'),
    'DEMO_SOURCE_INVALID_RESPONSE',
  ],
  [
    'absent data',
    async () => Response.json({ extensions: 'PRIVATE_PROVIDER_BODY' }),
    'DEMO_SOURCE_API_REJECTED',
  ],
  [
    'network error',
    async () => {
      throw new Error('PRIVATE_PROVIDER_BODY');
    },
    'DEMO_SOURCE_REQUEST_FAILED',
  ],
  [
    'oversized body',
    async () => new Response('x'.repeat(262_145)),
    'DEMO_SOURCE_RESPONSE_TOO_LARGE',
  ],
  ['redirect', async () => ({ ok: true, redirected: true }), 'DEMO_SOURCE_REQUEST_FAILED'],
]) {
  test(`client ${name} uses a constant diagnostic and discloses no provider body`, async () => {
    const client = createClient({ token: 'synthetic-test-token', fetchImpl });
    await assert.rejects(client(INVENTORY_QUERY, {}), rejectCode(code));
  });
}

test('missing token blocks without performing a request', () => {
  assert.throws(() => createClient({ token: '' }), rejectCode('DEMO_SOURCE_TOKEN_MISSING'));
});

const validContext = {
  GITHUB_EVENT_NAME: 'workflow_dispatch',
  GITHUB_REPOSITORY: TARGET.repository,
  GITHUB_REF: 'refs/heads/main',
  GITHUB_SHA: 'a'.repeat(40),
  CONFIGURE_DEMO_REVIEWED_SHA: 'a'.repeat(40),
  GITHUB_RUN_ID: '123',
  GITHUB_RUN_ATTEMPT: '1',
};
test('trusted exact main manual context is accepted without copying unrelated env', () => {
  const result = validateContext({ ...validContext, PRIVATE: 'NEVER_PUBLISH_THIS' });
  assert.deepEqual(result, {
    repository: TARGET.repository,
    reviewedSha: 'a'.repeat(40),
    runId: '123',
    runAttempt: '1',
  });
});
for (const [key, value] of [
  ['GITHUB_EVENT_NAME', 'push'],
  ['GITHUB_REPOSITORY', 'foreign/repo'],
  ['GITHUB_REF', 'refs/heads/feature'],
  ['CONFIGURE_DEMO_REVIEWED_SHA', 'b'.repeat(40)],
  ['GITHUB_SHA', 'a'.repeat(40) + '\n'],
  ['GITHUB_RUN_ID', '0'],
  ['GITHUB_RUN_ATTEMPT', '-1'],
]) {
  test(`untrusted context ${key} is rejected`, () => {
    assert.throws(
      () => validateContext({ ...validContext, [key]: value }),
      rejectCode('DEMO_SOURCE_TRUSTED_MAIN_REQUIRED'),
    );
  });
}

test('actual CLI refuses untrusted context with a fixed diagnostic before contacting provider', () => {
  const result = spawnSync(
    process.execPath,
    [new URL('./configure-demo-source.mjs', import.meta.url).pathname],
    {
      env: { PATH: process.env.PATH, GITHUB_EVENT_NAME: 'push' },
      encoding: 'utf8',
      timeout: 5000,
    },
  );
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr.trim(), 'DEMO_SOURCE_TRUSTED_MAIN_REQUIRED');
});

test('actual CLI with trusted context and absent binding fails without dumping its environment', () => {
  const result = spawnSync(
    process.execPath,
    [new URL('./configure-demo-source.mjs', import.meta.url).pathname],
    {
      env: { PATH: process.env.PATH, ...validContext, PRIVATE: 'NEVER_PUBLISH_THIS' },
      encoding: 'utf8',
      timeout: 5000,
    },
  );
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr.trim(), 'DEMO_SOURCE_TOKEN_MISSING');
});

test('manual workflow retains protected exact-main binding, no secret test step or shell-input interpolation', async () => {
  const yaml = await readFile(
    new URL('../../.github/workflows/configure-demo-source.yml', import.meta.url),
    'utf8',
  );
  assert.match(yaml, /workflow_dispatch:/);
  assert.doesNotMatch(yaml, /^  (?:push|pull_request|schedule|workflow_run):/m);
  assert.match(yaml, /default: inspect/);
  assert.match(yaml, /inputs\.reviewed_sha == github\.sha/);
  assert.match(yaml, /github\.ref == 'refs\/heads\/main'/);
  assert.match(yaml, /environment: 'glistening-friendship \/ demo'/);
  assert.equal((yaml.match(/secrets\./g) ?? []).length, 1);
  assert.match(yaml, /RAILWAY_TOKEN: \$\{\{ secrets\.RAILWAY_DEMO_TOKEN \}\}/);
  assert.doesNotMatch(yaml, /run:.*\$\{\{/);
  assert.doesNotMatch(
    yaml,
    /npm |railway up|serviceConnect|deploymentTriggerCreate|deploymentTriggerDelete/,
  );
  assert.match(yaml, /persist-credentials: false/);
  assert.match(yaml, /group: railway-backend/);
});
