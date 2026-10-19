import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';
import { createServer } from 'node:http';
import {
  DEMO_TARGET,
  DEMO_SOURCE_POLICIES,
  validateTarget,
  validateActiveDeployment,
  verifyLiveReady,
  prepareDemo,
  deployDemo,
  validateReceipt,
  extractReceipt,
  createProofReader,
  verifyDemoPreflight,
  verifyDemoRelease,
  createRailwayClient,
  DemoTransientReadError,
  DEMO_DEPLOY_BUDGET_MS,
  serializeDemoMetadata,
} from '../../src/bug-pipeline/demo-deployment.mjs';

const repo = 'l2v-hub/ClinicOS';
const sha = 'a'.repeat(40),
  reviewedSha = 'b'.repeat(40);
const deploymentId = '12345678-1234-4234-8234-123456789abc';
const run = {
  id: 123,
  run_attempt: 2,
  status: 'completed',
  conclusion: 'success',
  head_branch: 'main',
  head_sha: sha,
  repository: { full_name: repo },
  head_repository: { full_name: repo },
  path: '.github/workflows/deploy-backend.yml',
  event: 'push',
};
const env = {
  GITHUB_REPOSITORY: repo,
  GITHUB_REF: 'refs/heads/main',
  GITHUB_SHA: sha,
  GITHUB_RUN_ID: '123',
  GITHUB_RUN_ATTEMPT: '2',
  GITHUB_ACTIONS: 'true',
  GITHUB_EVENT_NAME: 'push',
  GITHUB_WORKFLOW_REF: `${repo}/.github/workflows/deploy-backend.yml@refs/heads/main`,
};
const exactEnv = {
  ...env,
  GITHUB_EVENT_NAME: 'workflow_dispatch',
  GITHUB_WORKFLOW_REF: `${repo}/.github/workflows/deploy-demo-exact-commit.yml@refs/heads/main`,
  CLINICOS_REVIEWED_SHA: sha,
  GITHUB_TOKEN: 'synthetic-readonly-github-binding',
};
const exactRun = {
  ...run,
  path: '.github/workflows/deploy-demo-exact-commit.yml',
  event: 'workflow_dispatch',
};
const exactPolicy = DEMO_SOURCE_POLICIES.exact;
const mainEndpoint = 'https://api.github.com/repos/l2v-hub/ClinicOS/git/ref/heads/main';
const mainBody = (current = sha) => ({
  ref: 'refs/heads/main',
  object: { type: 'commit', sha: current },
});
function mainFetch(
  readyFetch = async (url) => {
    assert.equal(url, `https://${DEMO_TARGET.domain}/ready`);
    return response();
  },
) {
  return async (url, options) => {
    if (url !== mainEndpoint) return readyFetch(url, options);
    assert.equal(options.headers.Authorization, 'Bearer synthetic-readonly-github-binding');
    assert.equal(options.headers['Project-Access-Token'], undefined);
    assert.equal(options.redirect, 'error');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.headers['Cache-Control'], 'no-cache');
    return response(mainBody());
  };
}
const exactReceipt = (kind) => ({ ...receipt(kind), sourcePolicy: exactPolicy, reviewedSha: sha });
function exactTargetData() {
  const data = targetData();
  data.deploymentTriggers = { edges: [], pageInfo: { hasNextPage: false } };
  data.deployments = { edges: [], pageInfo: { hasNextPage: false } };
  data.serviceInstance.latestDeployment = { id: deploymentId, status: 'SUCCESS' };
  return data;
}
function targetData() {
  return {
    projectToken: {
      project: { id: DEMO_TARGET.projectId },
      environment: { id: DEMO_TARGET.environmentId, name: 'demo' },
    },
    deploymentTriggers: { edges: [{ node: { ...DEMO_TARGET, repository: repo, branch: 'main' } }] },
    serviceInstance: {
      serviceId: DEMO_TARGET.serviceId,
      environmentId: DEMO_TARGET.environmentId,
      source: { repo },
      domains: { serviceDomains: [{ domain: DEMO_TARGET.domain }], customDomains: [] },
      activeDeployments: [{ id: deploymentId, status: 'SUCCESS' }],
    },
    deployment: { ...DEMO_TARGET, id: deploymentId, status: 'SUCCESS', meta: { commitHash: sha } },
  };
}
const readyBody = () => ({
  status: 'ready',
  tier: 'demo',
  deploymentId,
  checks: { database: 'ok', policy: 'ok' },
});
const response = (body = readyBody(), status = 200, headers = { 'Cache-Control': 'no-store' }) =>
  new Response(JSON.stringify(body), { status, headers });
function receipt(kind = 'clinicos-demo-backend') {
  return {
    schemaVersion: 1,
    kind,
    repository: repo,
    sourceRef: 'refs/heads/main',
    mergeSha: sha,
    runId: run.id,
    runAttempt: run.run_attempt,
    target: { ...DEMO_TARGET },
    verifiedAt: new Date().toISOString(),
    ...(kind === 'clinicos-demo-backend'
      ? {
          deployment: { id: deploymentId, status: 'SUCCESS', commitHash: sha },
          ready: { status: 'ready', tier: 'demo', deploymentId },
        }
      : {}),
  };
}

// Small stored ZIP fixture. Production extraction validates the actual downloaded archive digest.
function zipReceipt(body, filename = 'demo-deployment-receipt.json', method = 0) {
  const payload = Buffer.from(JSON.stringify(body)),
    name = Buffer.from(filename);
  const packed = method === 8 ? deflateRawSync(payload) : payload;
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(method, 8);
  local.writeUInt32LE(packed.length, 18);
  local.writeUInt32LE(payload.length, 22);
  local.writeUInt16LE(name.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(method, 10);
  central.writeUInt32LE(packed.length, 20);
  central.writeUInt32LE(payload.length, 24);
  central.writeUInt16LE(name.length, 28);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length + name.length, 12);
  end.writeUInt32LE(local.length + name.length + packed.length, 16);
  return Buffer.concat([local, name, packed, central, name, end]);
}
const hash = (value) => createHash('sha256').update(value).digest('hex');

test('target validation distinguishes environments sharing the same project/service and fails closed', async (t) => {
  assert.deepEqual(validateTarget(targetData()), DEMO_TARGET);
  for (const [label, mutate] of [
    [
      'production token',
      (d) => {
        d.projectToken.environment.id = 'production';
      },
    ],
    [
      'wrong project',
      (d) => {
        d.projectToken.project.id = 'other';
      },
    ],
    [
      'wrong service',
      (d) => {
        d.serviceInstance.serviceId = 'other';
      },
    ],
    [
      'wrong environment name',
      (d) => {
        d.projectToken.environment.name = 'production';
      },
    ],
    [
      'wrong domain',
      (d) => {
        d.serviceInstance.domains.serviceDomains[0].domain = 'clinicos-backend.up.railway.app';
      },
    ],
    [
      'wrong source repo',
      (d) => {
        d.serviceInstance.source.repo = 'attacker/repo';
      },
    ],
    [
      'missing source',
      (d) => {
        delete d.serviceInstance.source;
      },
    ],
    [
      'nonmain branch',
      (d) => {
        d.deploymentTriggers.edges[0].node.branch = 'preview';
      },
    ],
    [
      'ambiguous triggers',
      (d) => {
        d.deploymentTriggers.edges.push(d.deploymentTriggers.edges[0]);
      },
    ],
    [
      'missing trigger',
      (d) => {
        d.deploymentTriggers.edges = [];
      },
    ],
  ])
    await t.test(label, () => {
      const d = targetData();
      mutate(d);
      assert.throws(() => validateTarget(d));
    });
});

test('active deployment requires successful exact native commit metadata, target and routing identity', async (t) => {
  assert.equal(validateActiveDeployment(targetData(), sha, deploymentId).commitHash, sha);
  for (const [label, mutate] of [
    [
      'missing commit metadata',
      (d) => {
        delete d.deployment.meta.commitHash;
      },
    ],
    [
      'message is not provenance',
      (d) => {
        d.deployment.meta = { message: sha };
      },
    ],
    [
      'wrong SHA',
      (d) => {
        d.deployment.meta.commitHash = reviewedSha;
      },
    ],
    [
      'failed deployment',
      (d) => {
        d.deployment.status = 'FAILED';
      },
    ],
    [
      'inactive deployment',
      (d) => {
        d.serviceInstance.activeDeployments = [];
      },
    ],
    [
      'wrong environment',
      (d) => {
        d.deployment.environmentId = 'production';
      },
    ],
    [
      'wrong service',
      (d) => {
        d.deployment.serviceId = 'other';
      },
    ],
  ])
    await t.test(label, () => {
      const d = targetData();
      mutate(d);
      assert.throws(() => validateActiveDeployment(d, sha, deploymentId));
    });
});

test('read-only preflight never requests mutation; rejects untrusted Actions contexts before calling API', async () => {
  const calls = [];
  const result = await prepareDemo({
    env,
    client: async (query) => {
      calls.push(query);
      return targetData();
    },
  });
  assert.equal(result.kind, 'clinicos-demo-preflight');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].startsWith('query'), true);
  for (const context of [
    { ...env, GITHUB_REF: 'refs/heads/preview' },
    { ...env, GITHUB_REPOSITORY: 'other/repo' },
    { ...env, GITHUB_SHA: `${sha}\n` },
    { ...env, GITHUB_RUN_ATTEMPT: '0' },
  ]) {
    await assert.rejects(
      prepareDemo({
        env: context,
        client: async () => {
          throw new Error('must not call');
        },
      }),
      /trusted main/,
    );
  }
});

test('deployment requests exact supported commitSha and waits for matching healthy public instance', async () => {
  const calls = [];
  const result = await deployDemo({
    env,
    client: async (query, variables) => {
      calls.push({ query, variables });
      return query.startsWith('mutation')
        ? { serviceInstanceDeployV2: deploymentId }
        : targetData();
    },
    fetchImpl: async (url, options) => {
      assert.equal(url, `https://${DEMO_TARGET.domain}/ready`);
      assert.equal(options.redirect, 'error');
      return response();
    },
    attempts: 1,
  });
  const mutation = calls.find((c) => c.query.startsWith('mutation'));
  assert.equal(mutation.variables.commitSha, sha);
  assert.equal(mutation.variables.environmentId, DEMO_TARGET.environmentId);
  assert.equal(result.deployment.id, deploymentId);
  assert.equal(result.ready.deploymentId, deploymentId);
  assert.equal(
    calls.some((c) => /variables|sourceUpdate/.test(c.query)),
    false,
  );
});

test('wrong target preflight prevents the deploy mutation entirely', async () => {
  let mutations = 0;
  await assert.rejects(
    deployDemo({
      env,
      client: async (query) => {
        if (query.startsWith('mutation')) mutations++;
        const d = targetData();
        d.projectToken.environment.id = 'production';
        return d;
      },
      attempts: 1,
    }),
  );
  assert.equal(mutations, 0);
});

test('missing native commit metadata never becomes a receipt', async () => {
  await assert.rejects(
    deployDemo({
      env,
      client: async (query) => {
        if (query.startsWith('mutation')) return { serviceInstanceDeployV2: deploymentId };
        const d = targetData();
        delete d.deployment.meta;
        return d;
      },
      attempts: 1,
    }),
    /exact-commit/,
  );
});

test('public readiness needs no-store, correct deployment identity and real dependency success', async (t) => {
  await verifyLiveReady(deploymentId, { fetchImpl: async () => response() });
  for (const [label, body, status, headers] of [
    [
      'old instance',
      { ...readyBody(), deploymentId: '22345678-1234-4234-8234-123456789abc' },
      200,
      { 'Cache-Control': 'no-store' },
    ],
    [
      'unavailable database',
      { ...readyBody(), checks: { database: 'fail', policy: 'ok' } },
      200,
      { 'Cache-Control': 'no-store' },
    ],
    [
      'production tier',
      { ...readyBody(), tier: 'production' },
      200,
      { 'Cache-Control': 'no-store' },
    ],
    ['cacheable response', readyBody(), 200, { 'Cache-Control': 'max-age=3600' }],
    ['HTTP503', readyBody(), 503, { 'Cache-Control': 'no-store' }],
  ])
    await t.test(label, () =>
      assert.rejects(
        verifyLiveReady(deploymentId, { fetchImpl: async () => response(body, status, headers) }),
      ),
    );
});

test('real local HTTP readiness rejects redirects and oversized bodies using the production fetch options', async () => {
  let mode = 'success';
  const server = createServer((_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (mode === 'redirect') {
      res.writeHead(302, { Location: '/redirected' });
      res.end();
    } else if (mode === 'oversize') res.end('x'.repeat(20_000));
    else res.end(JSON.stringify(readyBody()));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const adapter = (url, options) => {
      assert.equal(url, `https://${DEMO_TARGET.domain}/ready`);
      return fetch(`http://127.0.0.1:${server.address().port}/ready`, options);
    };
    await verifyLiveReady(deploymentId, { fetchImpl: adapter });
    mode = 'redirect';
    await assert.rejects(verifyLiveReady(deploymentId, { fetchImpl: adapter }));
    mode = 'oversize';
    await assert.rejects(verifyLiveReady(deploymentId, { fetchImpl: adapter }));
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('receipt validation binds repo/main/attempt/target/SHA and expires read-only preflights', async (t) => {
  validateReceipt(receipt(), run);
  for (const [label, mutate] of [
    [
      'different run',
      (r) => {
        r.runId++;
      },
    ],
    [
      'different attempt',
      (r) => {
        r.runAttempt++;
      },
    ],
    [
      'different repository',
      (r) => {
        r.repository = 'attacker/repo';
      },
    ],
    [
      'preview ref',
      (r) => {
        r.sourceRef = 'refs/heads/preview';
      },
    ],
    [
      'different SHA',
      (r) => {
        r.mergeSha = reviewedSha;
      },
    ],
    [
      'different environment',
      (r) => {
        r.target.environmentId = 'production';
      },
    ],
    [
      'different live instance',
      (r) => {
        r.ready.deploymentId = '22345678-1234-4234-8234-123456789abc';
      },
    ],
    [
      'future timestamp',
      (r) => {
        r.verifiedAt = new Date(Date.now() + 3600000).toISOString();
      },
    ],
  ])
    await t.test(label, () => {
      const r = receipt();
      mutate(r);
      assert.throws(() => validateReceipt(r, run));
    });
  const stale = receipt('clinicos-demo-preflight');
  stale.verifiedAt = new Date(Date.now() - 25 * 3600000).toISOString();
  assert.throws(() => validateReceipt(stale, run, stale.kind), /expired/);
});

test('receipt archive parser accepts one exact small JSON entry and rejects paths or oversized entries', () => {
  const saved = extractReceipt(zipReceipt(receipt()), 'demo-deployment-receipt.json');
  assert.equal(saved.receipt.mergeSha, sha);
  assert.equal(
    extractReceipt(
      zipReceipt(receipt(), 'demo-deployment-receipt.json', 8),
      'demo-deployment-receipt.json',
    ).receipt.mergeSha,
    sha,
  );
  assert.match(saved.receiptSha256, /^[a-f0-9]{64}$/);
  assert.throws(() =>
    extractReceipt(
      zipReceipt(receipt(), '../demo-deployment-receipt.json'),
      'demo-deployment-receipt.json',
    ),
  );
  assert.throws(() =>
    extractReceipt(Buffer.alloc(1024 * 1024 + 1), 'demo-deployment-receipt.json'),
  );
  assert.throws(() => extractReceipt(Buffer.from('invalid'), 'demo-deployment-receipt.json'));
});

function proofHttp({
  modifyRun = (r) => r,
  modifyArtifact = (a) => a,
  corrupt = false,
  redirect = 'https://production.blob.core.windows.net/signed',
  receiptBody = receipt(),
} = {}) {
  const fixtureRun = receiptBody.sourcePolicy === exactPolicy ? exactRun : run;
  const preflight = receiptBody.kind === 'clinicos-demo-preflight';
  const zip = zipReceipt(
    receiptBody,
    preflight ? 'demo-preflight-receipt.json' : 'demo-deployment-receipt.json',
  );
  const artifact = modifyArtifact({
    id: 456,
    name: `${preflight ? 'demo-preflight' : 'demo-deployment'}-${run.id}-${run.run_attempt}`,
    expired: false,
    digest: `sha256:${hash(zip)}`,
    size_in_bytes: zip.length,
    workflow_run: { id: run.id, head_sha: run.head_sha },
  });
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url: String(url), options });
    if (String(url) === 'https://production.blob.core.windows.net/signed')
      return new Response(corrupt ? Buffer.from('tampered') : zip);
    if (String(url).endsWith('/zip'))
      return new Response(null, { status: 302, headers: { location: redirect } });
    if (String(url).includes('/artifacts?')) return response({ artifacts: [artifact] });
    if (String(url).endsWith('/commits/main')) return response({ sha });
    if (String(url).includes('/actions/workflows/'))
      return response({
        workflow_runs: String(url).includes(`/${fixtureRun.path.split('/').at(-1)}/runs?`)
          ? [modifyRun(structuredClone(fixtureRun))]
          : [],
      });
    if (String(url).includes('/actions/runs/123'))
      return response(modifyRun(structuredClone(fixtureRun)));
    if (String(url).endsWith('/ready')) return response();
    throw new Error('Unexpected URL');
  };
  return {
    reader: createProofReader({ token: 'synthetic-github-binding', fetchImpl }),
    fetchImpl,
    requests,
  };
}

test('release verifies real API workflow identity, archive digest, native deployment and public readiness', async () => {
  const f = proofHttp();
  const proof = await verifyDemoRelease({
    reader: f.reader,
    fetchImpl: f.fetchImpl,
    runUrl: `https://github.com/${repo}/actions/runs/123`,
    mergeSha: sha,
    reviewedSha,
    client: async () => targetData(),
  });
  assert.equal(proof.artifactId, 456);
  assert.equal(proof.reviewedSha, reviewedSha);
  const storage = f.requests.find((r) => r.url.includes('blob.core'));
  assert.equal(
    storage.options.headers,
    undefined,
    'GitHub binding never forwarded to signed storage',
  );
});

test('trusted workflow and immutable artifact mismatch matrix fails closed', async (t) => {
  for (const [label, options] of [
    ['failed run', { modifyRun: (r) => ({ ...r, conclusion: 'failure' }) }],
    ['pending run', { modifyRun: (r) => ({ ...r, status: 'in_progress' }) }],
    ['wrong workflow', { modifyRun: (r) => ({ ...r, path: '.github/workflows/attacker.yml' }) }],
    ['wrong branch', { modifyRun: (r) => ({ ...r, head_branch: 'preview' }) }],
    ['wrong repository', { modifyRun: (r) => ({ ...r, repository: { full_name: 'other/repo' } }) }],
    ['fork', { modifyRun: (r) => ({ ...r, head_repository: { full_name: 'other/repo' } }) }],
    ['wrong SHA', { modifyRun: (r) => ({ ...r, head_sha: reviewedSha }) }],
    ['expired artifact', { modifyArtifact: (a) => ({ ...a, expired: true }) }],
    [
      'wrong attempt artifact',
      { modifyArtifact: (a) => ({ ...a, name: 'demo-deployment-123-1' }) },
    ],
    ['missing archive digest', { modifyArtifact: (a) => ({ ...a, digest: undefined }) }],
    [
      'wrong artifact workflow SHA',
      { modifyArtifact: (a) => ({ ...a, workflow_run: { id: 123, head_sha: reviewedSha } }) },
    ],
    ['tampered archive', { corrupt: true }],
    ['untrusted redirect', { redirect: 'https://attacker.example/zip' }],
  ])
    await t.test(label, async () => {
      const f = proofHttp(options);
      await assert.rejects(
        verifyDemoRelease({
          reader: f.reader,
          fetchImpl: f.fetchImpl,
          runUrl: `https://github.com/${repo}/actions/runs/123`,
          mergeSha: sha,
          reviewedSha,
          client: async () => targetData(),
        }),
      );
    });
});

test('premerge uses actual successful preflight artifact of current trusted main, never historical production URL', async () => {
  let current = sha;
  const proof = { receipt: receipt('clinicos-demo-preflight') };
  const reader = {
    getJson: async (route) =>
      route === 'commits/main' ? { sha: current } : { workflow_runs: [run] },
    artifact: async () => proof,
  };
  assert.equal((await verifyDemoPreflight({ reader })).receipt.mergeSha, sha);
  current = reviewedSha;
  await assert.rejects(verifyDemoPreflight({ reader }), /no successful demo target preflight/);
});

test('Railway API client sends credentials only to fixed official origin and never logs error bodies', async () => {
  const calls = [];
  const client = createRailwayClient({
    token: 'synthetic-demo-binding',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return response({ errors: [{ message: 'private service detail' }] });
    },
  });
  await assert.rejects(
    client('query{projectToken{id}}', {}),
    (error) => !error.message.includes('private service detail'),
  );
  assert.equal(calls[0].url, 'https://backboard.railway.app/graphql/v2');
  assert.equal(calls[0].options.redirect, 'error');
  assert.equal(calls[0].options.headers['Project-Access-Token'], 'synthetic-demo-binding');
});

test('deployment workflow isolates demo credentials, defaults dispatch to read-only and records only in demo environment', async () => {
  const backend = await readFile(
    new URL('../../../.github/workflows/deploy-backend.yml', import.meta.url),
    'utf8',
  );
  const release = await readFile(
    new URL('../../../.github/workflows/codex-bug-release.yml', import.meta.url),
    'utf8',
  );
  const [production, demo] = backend.split('  demo:');
  assert.match(production, /default: preflight/);
  assert.doesNotMatch(production, /secrets\.RAILWAY_DEMO_TOKEN/);
  assert.match(demo, /environment: 'glistening-friendship \/ demo'/);
  assert.match(demo, /RAILWAY_TOKEN: \$\{\{ secrets\.RAILWAY_DEMO_TOKEN \}\}/);
  assert.match(demo, /ref: \$\{\{ github\.sha \}\}/);
  assert.ok(
    demo.indexOf('demo-deployment.mjs preflight') < demo.indexOf('demo-deployment.mjs deploy'),
  );
  assert.doesNotMatch(backend, /preflight-exact|deploy-exact/);
  assert.match(backend, /permissions:\n  contents: read/);
  assert.match(backend, /concurrency:\n  group: railway-backend\n  cancel-in-progress: false/);
  assert.match(demo, /if: github.event_name == 'push' \|\| inputs.operation == 'deploy'/);
  const [releaseJob, confirm] = release.split('  confirm-demo:');
  assert.doesNotMatch(releaseJob, /BUG_PIPELINE_RELEASE_ACTION: record/);
  assert.doesNotMatch(releaseJob, /secrets\.RAILWAY_DEMO_TOKEN/);
  assert.match(confirm, /needs: release/);
  assert.match(confirm, /environment: 'glistening-friendship \/ demo'/);
  assert.match(confirm, /BUG_PIPELINE_RELEASE_ACTION: record/);
  assert.match(confirm, /RAILWAY_DEMO_TOKEN: \$\{\{ secrets\.RAILWAY_DEMO_TOKEN \}\}/);
});

test('readiness requires an exact unquoted no-store directive, including comma and whitespace grammar', async (t) => {
  const invalid = [
    'public, max-age=3600, x-no-store-extension=1',
    'public, max-age=3600, no-store-extension',
    'public, max-age=3600, extension="no-store"',
    'extension="x,no-store,y", max-age=3600',
    'extension="x, no-store ,y", public',
    'prefix-no-store',
    'no-store-suffix',
    'no-store=1',
    'extension="unfinished, no-store',
    'no-store, extension="unterminated',
    'no-store, extension=bad value',
    'no-store, extension="valid" trailing',
    'no-store,,private',
  ];
  for (const cacheControl of invalid)
    await t.test(`reject ${cacheControl}`, () =>
      assert.rejects(
        verifyLiveReady(deploymentId, {
          fetchImpl: async () => response(readyBody(), 200, { 'Cache-Control': cacheControl }),
        }),
        /uncached demo readiness unavailable/,
      ),
    );
  for (const cacheControl of [
    'no-store',
    'NO-STORE',
    'private, no-store',
    'private, \tNo-StOrE \t, max-age=0',
    'extension="x,y", no-store',
    'no-store, extension="literal no-store"',
  ])
    await t.test(`accept ${cacheControl}`, async () => {
      assert.equal(
        (
          await verifyLiveReady(deploymentId, {
            fetchImpl: async () => response(readyBody(), 200, { 'Cache-Control': cacheControl }),
          })
        ).deploymentId,
        deploymentId,
      );
    });
});

test('active proof rejects old and new coexistence, duplicate IDs and transitional statuses', async (t) => {
  for (const [label, active] of [
    [
      'old and new',
      [
        { id: '22345678-1234-4234-8234-123456789abc', status: 'SUCCESS' },
        { id: deploymentId, status: 'SUCCESS' },
      ],
    ],
    [
      'duplicate new ID',
      [
        { id: deploymentId, status: 'SUCCESS' },
        { id: deploymentId, status: 'SUCCESS' },
      ],
    ],
    ['new transitional status', [{ id: deploymentId, status: 'DEPLOYING' }]],
    [
      'mixed duplicate status',
      [
        { id: deploymentId, status: 'SUCCESS' },
        { id: deploymentId, status: 'DEPLOYING' },
      ],
    ],
  ])
    await t.test(label, () => {
      const data = targetData();
      data.serviceInstance.activeDeployments = active;
      assert.throws(
        () => validateActiveDeployment(data, sha, deploymentId),
        /active demo deployment/,
      );
    });
});

test('deploy polling waits until the old deployment disappears before checking readiness and issuing receipt', async () => {
  let polls = 0,
    delays = 0,
    readinessCalls = 0;
  const proof = await deployDemo({
    env,
    attempts: 2,
    client: async (query) => {
      if (query.startsWith('mutation')) return { serviceInstanceDeployV2: deploymentId };
      const data = targetData();
      if (query.includes('deployment(id:')) {
        if (++polls === 1)
          data.serviceInstance.activeDeployments.unshift({
            id: '22345678-1234-4234-8234-123456789abc',
            status: 'SUCCESS',
          });
      }
      return data;
    },
    delay: async () => {
      delays++;
    },
    fetchImpl: async () => {
      readinessCalls++;
      assert.equal(polls, 2);
      return response();
    },
  });
  assert.equal(delays, 1);
  assert.equal(readinessCalls, 1);
  assert.equal(proof.deployment.id, deploymentId);
});

test('persistent old/new overlap cannot issue a receipt despite healthy public readiness', async () => {
  let readinessCalls = 0;
  await assert.rejects(
    deployDemo({
      env,
      attempts: 1,
      client: async (query) => {
        if (query.startsWith('mutation')) return { serviceInstanceDeployV2: deploymentId };
        const data = targetData();
        data.serviceInstance.activeDeployments.unshift({
          id: '22345678-1234-4234-8234-123456789abc',
          status: 'SUCCESS',
        });
        return data;
      },
      fetchImpl: async () => {
        readinessCalls++;
        return response();
      },
    }),
    /readiness timed out/,
  );
  assert.equal(readinessCalls, 0);
});

test('zero-trigger exact policy is explicit; complete fixed inventories retain strict defaults', async () => {
  const data = exactTargetData();
  assert.throws(() => validateTarget(data), /main repository trigger required/);
  assert.deepEqual(validateTarget(data, exactPolicy), DEMO_TARGET);
  const one = targetData();
  one.deploymentTriggers.pageInfo = { hasNextPage: false };
  assert.throws(() => validateTarget(one, exactPolicy), /main repository trigger required/);
  assert.deepEqual(validateTarget(one), DEMO_TARGET);
  const proof = await prepareDemo({
    env: exactEnv,
    sourcePolicy: exactPolicy,
    fetchImpl: mainFetch(),
    client: async (query) => {
      assert.match(query, /pageInfo\{hasNextPage\}/);
      return data;
    },
  });
  assert.equal(proof.sourcePolicy, exactPolicy);
  validateReceipt(proof, exactRun, 'clinicos-demo-preflight', Date.now(), exactPolicy);
  // Historical receipts without the field remain strict and independently verifiable.
  validateReceipt(receipt(), run);
});

test('exact policy rejects incomplete or hostile source inventories', async (t) => {
  for (const [label, mutate, policy = exactPolicy] of [
    ['unknown policy', () => {}, 'native-exact-commit-v2'],
    ['null policy', () => {}, null],
    [
      'missing trigger collection',
      (d) => {
        delete d.deploymentTriggers;
      },
    ],
    [
      'missing edges',
      (d) => {
        delete d.deploymentTriggers.edges;
      },
    ],
    [
      'null edges',
      (d) => {
        d.deploymentTriggers.edges = null;
      },
    ],
    [
      'hidden next page',
      (d) => {
        d.deploymentTriggers.pageInfo.hasNextPage = true;
      },
    ],
    [
      'missing pageInfo',
      (d) => {
        delete d.deploymentTriggers.pageInfo;
      },
    ],
    [
      'missing pagination boolean',
      (d) => {
        delete d.deploymentTriggers.pageInfo.hasNextPage;
      },
    ],
    [
      'false-like pagination',
      (d) => {
        d.deploymentTriggers.pageInfo.hasNextPage = 'false';
      },
    ],
    [
      'missing service domains',
      (d) => {
        delete d.serviceInstance.domains.serviceDomains;
      },
    ],
    [
      'missing custom domains',
      (d) => {
        delete d.serviceInstance.domains.customDomains;
      },
    ],
    [
      'missing domains',
      (d) => {
        delete d.serviceInstance.domains;
      },
    ],
    [
      'wrong domain',
      (d) => {
        d.serviceInstance.domains.serviceDomains[0].domain = 'foreign.example';
      },
    ],
    [
      'wrong repository',
      (d) => {
        d.serviceInstance.source.repo = 'foreign/repo';
      },
    ],
    [
      'missing source',
      (d) => {
        delete d.serviceInstance.source;
      },
    ],
    [
      'wrong token project',
      (d) => {
        d.projectToken.project.id = 'other';
      },
    ],
    [
      'wrong token environment',
      (d) => {
        d.projectToken.environment.id = 'other';
      },
    ],
    [
      'wrong environment name',
      (d) => {
        d.projectToken.environment.name = 'production';
      },
    ],
    [
      'wrong service',
      (d) => {
        d.serviceInstance.serviceId = 'other';
      },
    ],
    [
      'wrong instance environment',
      (d) => {
        d.serviceInstance.environmentId = 'other';
      },
    ],
    [
      'foreign branch',
      (d) => {
        d.deploymentTriggers.edges = [
          { node: { ...DEMO_TARGET, repository: repo, branch: 'preview' } },
        ];
      },
    ],
    [
      'foreign trigger repository',
      (d) => {
        d.deploymentTriggers.edges = [
          { node: { ...DEMO_TARGET, repository: 'other/repo', branch: 'main' } },
        ];
      },
    ],
    [
      'foreign trigger target',
      (d) => {
        d.deploymentTriggers.edges = [
          { node: { ...DEMO_TARGET, environmentId: 'other', repository: repo, branch: 'main' } },
        ];
      },
    ],
    [
      'null trigger',
      (d) => {
        d.deploymentTriggers.edges = [null];
      },
    ],
    [
      'duplicate triggers',
      (d) => {
        const edge = targetData().deploymentTriggers.edges[0];
        d.deploymentTriggers.edges = [edge, edge];
      },
    ],
  ])
    await t.test(label, async () => {
      const data = exactTargetData();
      mutate(data);
      assert.throws(() => validateTarget(data, policy));
      let mutations = 0;
      await assert.rejects(
        deployDemo({
          env: exactEnv,
          sourcePolicy: policy,
          fetchImpl: mainFetch(),
          client: async (query) => {
            if (query.startsWith('mutation')) mutations++;
            return data;
          },
          attempts: 1,
        }),
      );
      assert.equal(mutations, 0);
    });
});

test('only the fixed main Actions deployment workflow may select exact policy', async (t) => {
  for (const [key, value] of [
    ['GITHUB_ACTIONS', undefined],
    ['GITHUB_WORKFLOW_REF', undefined],
    ['GITHUB_WORKFLOW_REF', `${repo}/.github/workflows/foreign.yml@refs/heads/main`],
    ['GITHUB_WORKFLOW_REF', `${repo}/.github/workflows/deploy-backend.yml@refs/heads/preview`],
    ['GITHUB_EVENT_NAME', 'pull_request_target'],
    ['GITHUB_EVENT_NAME', 'pull_request'],
    ['GITHUB_EVENT_NAME', 'push'],
    ['GITHUB_WORKFLOW_REF', env.GITHUB_WORKFLOW_REF],
    ['CLINICOS_REVIEWED_SHA', undefined],
    ['CLINICOS_REVIEWED_SHA', reviewedSha],
    ['GITHUB_REPOSITORY', 'foreign/repo'],
    ['GITHUB_REF', 'refs/heads/preview'],
    ['GITHUB_SHA', 'not-a-sha'],
    ['GITHUB_RUN_ID', '0'],
    ['GITHUB_RUN_ATTEMPT', '0'],
  ])
    await t.test(`${key}=${value}`, async () => {
      let calls = 0;
      const options = {
        env: { ...exactEnv, [key]: value },
        sourcePolicy: exactPolicy,
        fetchImpl: mainFetch(),
        client: async () => {
          calls++;
          return exactTargetData();
        },
      };
      await assert.rejects(prepareDemo(options));
      await assert.rejects(deployDemo(options));
      assert.equal(calls, 0);
    });
  assert.equal(
    (
      await prepareDemo({
        env: { ...exactEnv, GITHUB_EVENT_NAME: 'workflow_dispatch' },
        sourcePolicy: exactPolicy,
        fetchImpl: mainFetch(),
        client: async () => exactTargetData(),
      })
    ).sourcePolicy,
    exactPolicy,
  );
});

test('native exact policy binds one exact mutation, native metadata, readiness and final target inspection', async () => {
  const calls = [];
  let ready = false;
  const proof = await deployDemo({
    env: exactEnv,
    sourcePolicy: exactPolicy,
    attempts: 1,
    client: async (query, variables) => {
      calls.push({ query, variables, ready });
      if (query.startsWith('mutation')) {
        assert.match(
          query,
          /serviceInstanceDeployV2\(environmentId:\$environmentId,serviceId:\$serviceId,commitSha:\$commitSha\)/,
        );
        assert.deepEqual(variables, { ...DEMO_TARGET, commitSha: sha });
        assert.doesNotMatch(query, /latestCommit|serviceConnect|deploymentTrigger/);
        return { serviceInstanceDeployV2: deploymentId };
      }
      return exactTargetData();
    },
    fetchImpl: mainFetch(async (url, options) => {
      assert.equal(url, `https://${DEMO_TARGET.domain}/ready`);
      assert.equal(options.redirect, 'error');
      assert.equal(options.headers['Cache-Control'], 'no-cache');
      ready = true;
      return response();
    }),
  });
  assert.equal(calls.filter((c) => c.query.startsWith('mutation')).length, 1);
  assert.equal(
    calls.length,
    4,
    'fresh preflight, single mutation, native poll, post-ready inspection',
  );
  assert.equal(calls.at(-1).ready, true);
  assert.equal(proof.sourcePolicy, exactPolicy);
  assert.equal(proof.deployment.commitHash, sha);
  assert.equal(proof.ready.deploymentId, deploymentId);
  validateReceipt(proof, exactRun, undefined, Date.now(), exactPolicy);
});

test('source policy is bound through artifact receipt and independent native verification', async (t) => {
  const f = proofHttp({ receiptBody: exactReceipt() });
  let inspections = 0;
  const proof = await verifyDemoRelease({
    reader: f.reader,
    fetchImpl: f.fetchImpl,
    runUrl: `https://github.com/${repo}/actions/runs/123`,
    mergeSha: sha,
    reviewedSha,
    client: async () => {
      inspections++;
      return exactTargetData();
    },
    sourcePolicy: exactPolicy,
  });
  assert.equal(proof.receipt.sourcePolicy, exactPolicy);
  assert.equal(inspections, 2);
  for (const [label, receiptPolicy, expected, data] of [
    ['unknown receipt', 'unknown', undefined, exactTargetData()],
    ['explicit null receipt', null, undefined, exactTargetData()],
    ['mismatch strict expectation', exactPolicy, DEMO_SOURCE_POLICIES.trigger, exactTargetData()],
    ['mismatch exact expectation', DEMO_SOURCE_POLICIES.trigger, exactPolicy, targetData()],
    ['legacy receipt cannot authorize zero triggers', undefined, undefined, exactTargetData()],
    ['unknown expected policy', exactPolicy, 'unknown', exactTargetData()],
  ])
    await t.test(label, async () => {
      const saved = {
        ...receipt(),
        ...(receiptPolicy === undefined ? {} : { sourcePolicy: receiptPolicy }),
        ...(receiptPolicy === exactPolicy ? { reviewedSha: sha } : {}),
      };
      const http = proofHttp({ receiptBody: saved });
      await assert.rejects(
        verifyDemoRelease({
          reader: http.reader,
          fetchImpl: http.fetchImpl,
          runUrl: `https://github.com/${repo}/actions/runs/123`,
          mergeSha: sha,
          reviewedSha,
          client: async () => data,
          sourcePolicy: expected,
        }),
      );
    });
  const preflight = exactReceipt('clinicos-demo-preflight');
  const reader = {
    getJson: async (route) => (route === 'commits/main' ? { sha } : { workflow_runs: [exactRun] }),
    artifact: async () => ({ receipt: preflight }),
  };
  assert.equal(
    (await verifyDemoPreflight({ reader, sourcePolicy: exactPolicy })).receipt.sourcePolicy,
    exactPolicy,
  );
  await assert.rejects(verifyDemoPreflight({ reader, sourcePolicy: DEMO_SOURCE_POLICIES.trigger }));
});

test('exact policy rejects native provenance and source drift after mutation without mutation retry', async (t) => {
  for (const [label, mutate] of [
    [
      'foreign source',
      (d) => {
        d.serviceInstance.source.repo = 'foreign/repo';
      },
    ],
    [
      'new foreign trigger',
      (d) => {
        d.deploymentTriggers.edges = [
          { node: { ...DEMO_TARGET, repository: repo, branch: 'preview' } },
        ];
      },
    ],
    [
      'incomplete next page',
      (d) => {
        d.deploymentTriggers.pageInfo.hasNextPage = true;
      },
    ],
    [
      'wrong target',
      (d) => {
        d.deployment.environmentId = 'other';
      },
    ],
    [
      'wrong native commit',
      (d) => {
        d.deployment.meta.commitHash = reviewedSha;
      },
    ],
    [
      'missing native commit',
      (d) => {
        d.deployment.meta = { message: sha };
      },
    ],
    [
      'ambiguous active deployment',
      (d) => {
        d.serviceInstance.activeDeployments.push({ id: deploymentId, status: 'SUCCESS' });
      },
    ],
  ])
    await t.test(label, async () => {
      let mutations = 0;
      let queries = 0;
      await assert.rejects(
        deployDemo({
          env: exactEnv,
          sourcePolicy: exactPolicy,
          attempts: 1,
          client: async (query) => {
            if (query.startsWith('mutation')) {
              mutations++;
              return { serviceInstanceDeployV2: deploymentId };
            }
            const data = exactTargetData();
            if (++queries > 1) mutate(data);
            return data;
          },
          fetchImpl: mainFetch(),
        }),
      );
      assert.equal(mutations, 1);
    });
  let mutations = 0;
  let ready = false;
  await assert.rejects(
    deployDemo({
      env: exactEnv,
      sourcePolicy: exactPolicy,
      attempts: 1,
      client: async (query) => {
        if (query.startsWith('mutation')) {
          mutations++;
          return { serviceInstanceDeployV2: deploymentId };
        }
        const data = exactTargetData();
        if (ready) data.serviceInstance.source.repo = 'drift/after-ready';
        return data;
      },
      fetchImpl: mainFetch(async () => {
        ready = true;
        return response();
      }),
    }),
    /source, or target mismatch/,
  );
  assert.equal(mutations, 1);
});

test('uncertain or denied exact mutation and polling errors stop after one submission', async (t) => {
  for (const failure of ['transport', 'denied', 'invalid-id', 'polling'])
    await t.test(failure, async () => {
      let mutations = 0;
      let requests = 0;
      const client = createRailwayClient({
        token: 'synthetic-demo-binding',
        fetchImpl: async (_url, options) => {
          requests++;
          const { query } = JSON.parse(options.body);
          if (query.startsWith('mutation')) {
            mutations++;
            if (failure === 'transport') throw new Error('synthetic uncertain network');
            if (failure === 'denied')
              return response({ errors: [{ message: 'synthetic denial' }] });
            return response({
              data: {
                serviceInstanceDeployV2: failure === 'invalid-id' ? 'invalid' : deploymentId,
              },
            });
          }
          if (mutations) throw new Error('synthetic polling unavailable');
          return response({ data: exactTargetData() });
        },
      });
      await assert.rejects(
        deployDemo({
          env: exactEnv,
          sourcePolicy: exactPolicy,
          client,
          attempts: 2,
          fetchImpl: mainFetch(),
        }),
      );
      assert.equal(mutations, 1);
      assert.equal(requests, failure === 'polling' ? 3 : 2);
    });
});

test('actual exact CLI operations use bounded Web Responses, fixed headers, and no external credentials', async (t) => {
  const modulePath = fileURLToPath(
    new URL('../../src/bug-pipeline/demo-deployment.mjs', import.meta.url),
  );
  for (const operation of ['preflight-exact', 'deploy-exact', 'preflight', 'deploy'])
    await t.test(operation, async () => {
      const directory = await mkdtemp(join(tmpdir(), 'demo-exact-cli-'));
      try {
        const fixturePath = join(directory, 'fetch-fixture.mjs');
        const logPath = join(directory, 'requests.jsonl');
        const fixture = `import assert from 'node:assert/strict';
import { appendFileSync } from 'node:fs';
const data = ${JSON.stringify(exactTargetData())};
const ready = ${JSON.stringify(readyBody())};
globalThis.fetch = async (url, options) => {
  assert.equal(options.redirect, 'error');
  if (url === '${mainEndpoint}') {
    assert.equal(options.headers.Authorization, 'Bearer synthetic-readonly-github-binding');
    assert.equal(options.headers['Project-Access-Token'], undefined);
    assert.equal(options.cache, 'no-store');
    appendFileSync(${JSON.stringify(logPath)}, JSON.stringify({ main: true }) + '\\n');
    return new Response(JSON.stringify(${JSON.stringify(mainBody())}));
  }
  if (url === 'https://${DEMO_TARGET.domain}/ready') {
    assert.equal(options.headers['Cache-Control'], 'no-cache');
    appendFileSync(${JSON.stringify(logPath)}, JSON.stringify({ ready: true }) + '\\n');
    return new Response(JSON.stringify(ready), { headers: { 'Cache-Control': 'no-store' } });
  }
  assert.equal(url, 'https://backboard.railway.app/graphql/v2');
  assert.equal(options.headers['Project-Access-Token'], 'synthetic-demo-binding');
  assert.equal(options.headers.Authorization, undefined);
  const { query, variables } = JSON.parse(options.body);
  const mutation = query.startsWith('mutation');
  if (mutation) {
    assert.match(query, /serviceInstanceDeployV2/);
    assert.equal(variables.commitSha, '${sha}');
    assert.equal(variables.serviceId, '${DEMO_TARGET.serviceId}');
    assert.equal(variables.environmentId, '${DEMO_TARGET.environmentId}');
  } else assert.match(query, /pageInfo\\{hasNextPage\\}/);
  appendFileSync(${JSON.stringify(logPath)}, JSON.stringify({ mutation }) + '\\n');
  return new Response(JSON.stringify({ data: mutation ? { serviceInstanceDeployV2: '${deploymentId}' } : data }));
};\n`;
        await writeFile(fixturePath, fixture);
        const result = spawnSync(
          process.execPath,
          ['--import', fixturePath, modulePath, operation],
          {
            cwd: directory,
            env: {
              ...(operation.endsWith('-exact') ? exactEnv : env),
              RAILWAY_TOKEN: 'synthetic-demo-binding',
            },
            encoding: 'utf8',
            timeout: 30_000,
          },
        );
        assert.equal(result.error, undefined);
        const requests = (await readFile(logPath, 'utf8')).trim().split('\n').map(JSON.parse);
        if (operation.endsWith('-exact')) {
          assert.equal(result.status, 0, result.stderr);
          const filename = operation.startsWith('preflight')
            ? 'demo-preflight-receipt.json'
            : 'demo-deployment-receipt.json';
          const saved = JSON.parse(await readFile(join(directory, filename), 'utf8'));
          assert.equal(saved.sourcePolicy, exactPolicy);
          assert.equal(saved.mergeSha, sha);
          validateReceipt(saved, exactRun, saved.kind, Date.now(), exactPolicy);
          assert.equal(requests.filter((r) => r.main).length, operation === 'deploy-exact' ? 3 : 1);
          assert.equal(
            requests.filter((r) => r.mutation).length,
            operation === 'deploy-exact' ? 1 : 0,
          );
          assert.equal(
            requests.filter((r) => r.ready).length,
            operation === 'deploy-exact' ? 1 : 0,
          );
        } else {
          assert.equal(result.status, 1);
          assert.match(result.stderr, /main repository trigger required/);
          assert.equal(requests.filter((r) => r.mutation).length, 0);
        }
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    });
});

test('dedicated manual workflow preserves legacy bytes and isolates the demo writer queue', async () => {
  const legacy = await readFile(
    new URL('../../../.github/workflows/deploy-backend.yml', import.meta.url),
  );
  assert.equal(hash(legacy), '6743d823679a9c1076c85dfcb5e5b9a8f96705849123b3091cac5d00cadaa3f9');
  const exact = await readFile(
    new URL('../../../.github/workflows/deploy-demo-exact-commit.yml', import.meta.url),
    'utf8',
  );
  assert.match(exact, /on:\n  workflow_dispatch:/);
  assert.doesNotMatch(exact, /^  (?:push|pull_request|schedule|workflow_run):/m);
  assert.match(exact, /reviewed_sha:[\s\S]*?type: string\n        required: true/);
  assert.match(exact, /permissions:\n  contents: read/);
  assert.match(exact, /concurrency:\n  group: railway-demo\n  cancel-in-progress: false/);
  assert.doesNotMatch(exact, /group: railway-backend/);
  const configure = await readFile(
    new URL('../../../.github/workflows/configure-demo-source.yml', import.meta.url),
    'utf8',
  );
  assert.match(configure, /group: railway-demo\n  cancel-in-progress: false/);
  assert.doesNotMatch(configure, /secrets\.RAILWAY_TOKEN\b|group: railway-backend/);
  // The legacy dual-token workflow is immutable historical coupling, not a new demo writer.
  assert.match(exact, /forward-only npm run db:migrate/);
  assert.match(exact, /if: always\(\) && inputs.operation == 'deploy'/);
  assert.match(exact, /path: demo-deployment-progress.json/);
  assert.match(
    legacy.toString(),
    /concurrency:\n  group: railway-backend\n  cancel-in-progress: false/,
  );
  assert.match(
    exact,
    /if: github.repository == 'l2v-hub\/ClinicOS' && github.ref == 'refs\/heads\/main' && github.event_name == 'workflow_dispatch'/,
  );
  assert.equal(
    (exact.match(/^  [a-z][a-z-]*:\n    if:/gm) ?? []).length,
    1,
    'one demo job has no sibling dependency',
  );
  assert.doesNotMatch(
    exact,
    /railway up|secrets\.RAILWAY_TOKEN\b|serviceConnect|deploymentTrigger/,
  );
  assert.match(exact, /ref: \$\{\{ github.sha \}\}\n          persist-credentials: false/);
  assert.match(exact, /GITHUB_TOKEN: \$\{\{ github.token \}\}/);
  assert.equal((exact.match(/secrets\.RAILWAY_DEMO_TOKEN/g) ?? []).length, 1);
  const tests = exact.indexOf(
    'run: node --test agent-team/tests/bug-pipeline/demo-deployment.test.mjs',
  );
  const reviewedGate = exact.indexOf(
    'assert.equal(process.env.CLINICOS_REVIEWED_SHA, process.env.GITHUB_SHA)',
  );
  const secret = exact.indexOf('secrets.RAILWAY_DEMO_TOKEN');
  assert.ok(tests >= 0 && tests < reviewedGate && reviewedGate < secret);
  assert.ok(
    exact.indexOf('demo-deployment.mjs preflight-exact') <
      exact.indexOf('demo-deployment.mjs deploy-exact'),
  );
  assert.match(exact, /if: inputs.operation == 'deploy'/);
  for (const match of exact.matchAll(/uses: ([^\n]+)/g)) assert.match(match[1], /@[a-f0-9]{40}$/);
  // The infrastructure diff against 45033 excludes every legacy push path.
  const infrastructure = [
    'agent-team/src/bug-pipeline/demo-deployment.mjs',
    'agent-team/tests/bug-pipeline/demo-deployment.test.mjs',
    '.github/workflows/deploy-demo-exact-commit.yml',
    'artifacts/task-validation/demo-exact-commit-release/author-2/author-report.md',
  ];
  const filters = [...legacy.toString().matchAll(/^      - '([^']+)'$/gm)].map((m) => m[1]);
  assert.ok(filters.length > 0);
  for (const path of infrastructure)
    for (const filter of filters) {
      assert.equal(
        filter.endsWith('/**') ? path.startsWith(filter.slice(0, -2)) : path === filter,
        false,
        `${path} matches ${filter}`,
      );
    }
});

test('receipt source policy is exclusive to its fixed workflow and manual exact event', async (t) => {
  for (const [label, saved, nativeRun] of [
    ['exact in old workflow', exactReceipt(), run],
    ['legacy in new workflow', receipt(), exactRun],
    [
      'explicit strict in new workflow',
      { ...receipt(), sourcePolicy: DEMO_SOURCE_POLICIES.trigger },
      exactRun,
    ],
    ['exact push event', exactReceipt(), { ...exactRun, event: 'push' }],
    [
      'exact foreign workflow',
      exactReceipt(),
      { ...exactRun, path: '.github/workflows/foreign.yml' },
    ],
    ['missing reviewed workflow SHA', { ...exactReceipt(), reviewedSha: undefined }, exactRun],
    ['different reviewed workflow SHA', { ...exactReceipt(), reviewedSha }, exactRun],
  ])
    await t.test(label, async () => {
      assert.throws(() => validateReceipt(saved, nativeRun));
      const f = proofHttp({ receiptBody: saved, modifyRun: () => nativeRun });
      let nativeReads = 0;
      await assert.rejects(
        verifyDemoRelease({
          reader: f.reader,
          fetchImpl: f.fetchImpl,
          runUrl: `https://github.com/${repo}/actions/runs/123`,
          mergeSha: sha,
          reviewedSha,
          client: async () => {
            nativeReads++;
            return exactTargetData();
          },
        }),
      );
      assert.equal(nativeReads, 0);
    });
  let providerReads = 0;
  await assert.rejects(
    prepareDemo({
      env: exactEnv,
      client: async () => {
        providerReads++;
        return targetData();
      },
      fetchImpl: async () => {
        throw new Error('must not fetch');
      },
    }),
    /fixed main deployment workflow/,
  );
  assert.equal(providerReads, 0, 'strict producer cannot run in the exact workflow');
});

test('real immutable preflight discovery selects only each policy fixed workflow', async () => {
  for (const [saved, path] of [
    [exactReceipt('clinicos-demo-preflight'), 'deploy-demo-exact-commit.yml'],
    [receipt('clinicos-demo-preflight'), 'deploy-backend.yml'],
  ]) {
    const f = proofHttp({ receiptBody: saved });
    if (saved.sourcePolicy === exactPolicy) {
      await assert.rejects(
        verifyDemoPreflight({ reader: f.reader }),
        /no successful demo target preflight/,
      );
      assert.ok(
        f.requests
          .filter((r) => r.url.includes('/actions/workflows/'))
          .every((r) => r.url.includes('/deploy-backend.yml/')),
      );
    }
    const proof = await verifyDemoPreflight({
      reader: f.reader,
      ...(saved.sourcePolicy === exactPolicy ? { sourcePolicy: exactPolicy } : {}),
    });
    assert.equal(proof.receipt.mergeSha, sha);
    const selected = f.requests.filter((r) => r.url.includes('/actions/workflows/')).at(-1);
    assert.ok(selected.url.includes(`/${path}/runs?`));
    assert.ok(f.requests.some((r) => r.url.endsWith('/zip')));
  }
  const wrong = proofHttp({
    receiptBody: exactReceipt('clinicos-demo-preflight'),
    modifyRun: () => run,
  });
  await assert.rejects(verifyDemoPreflight({ reader: wrong.reader, sourcePolicy: exactPolicy }));
  const f = proofHttp({ receiptBody: exactReceipt() });
  const reader = {
    ...f.reader,
    getJson: async (route) => {
      assert.notEqual(route, 'actions/runs/999', 'separate failed legacy run is irrelevant');
      return f.reader.getJson(route);
    },
  };
  const proof = await verifyDemoRelease({
    reader,
    fetchImpl: f.fetchImpl,
    mergeSha: sha,
    reviewedSha,
    runUrl: `https://github.com/${repo}/actions/runs/123`,
    client: async () => exactTargetData(),
  });
  assert.equal(proof.receipt.sourcePolicy, exactPolicy);
});

test('fresh main is checked before provider reads, directly before mutation and after readiness', async (t) => {
  for (const [label, failAt, expectedMutations] of [
    ['stale before provider', 1, 0],
    ['main advanced during preflight', 2, 0],
    ['main advanced during readiness', 3, 1],
    ['unchanged reviewed current main', 0, 1],
  ])
    await t.test(label, async () => {
      const events = [];
      let checks = 0;
      const options = {
        env: exactEnv,
        sourcePolicy: exactPolicy,
        attempts: 1,
        client: async (query) => {
          const mutation = query.startsWith('mutation');
          events.push(
            mutation ? 'mutation' : query.includes('deployment(id:') ? 'native' : 'target',
          );
          return mutation ? { serviceInstanceDeployV2: deploymentId } : exactTargetData();
        },
        fetchImpl: async (url, request) => {
          if (url === mainEndpoint) {
            assert.equal(request.headers.Authorization, 'Bearer synthetic-readonly-github-binding');
            assert.equal(request.headers['Project-Access-Token'], undefined);
            assert.equal(request.redirect, 'error');
            assert.equal(request.cache, 'no-store');
            events.push('main');
            return response(mainBody(++checks === failAt ? reviewedSha : sha));
          }
          assert.equal(url, `https://${DEMO_TARGET.domain}/ready`);
          events.push('ready');
          return response();
        },
      };
      if (failAt) await assert.rejects(deployDemo(options), /current main unavailable or changed/);
      else assert.equal((await deployDemo(options)).reviewedSha, sha);
      assert.equal(events.filter((event) => event === 'mutation').length, expectedMutations);
      assert.equal(events[0], 'main');
      if (failAt === 1) assert.deepEqual(events, ['main']);
      if (failAt === 2) assert.deepEqual(events, ['main', 'target', 'main']);
      if (expectedMutations) {
        const mutation = events.indexOf('mutation');
        assert.equal(events[mutation - 1], 'main');
        assert.deepEqual(events.slice(-3), ['ready', 'native', 'main']);
      }
    });
});

test('reviewed SHA and unavailable or malformed current main fail before provider inspection', async (t) => {
  const missingToken = { ...exactEnv, GITHUB_TOKEN: undefined };
  for (const [label, overrides, result] of [
    ['missing reviewed SHA', { CLINICOS_REVIEWED_SHA: undefined }, mainBody()],
    ['wrong reviewed SHA', { CLINICOS_REVIEWED_SHA: reviewedSha }, mainBody()],
    ['malformed reviewed SHA', { CLINICOS_REVIEWED_SHA: sha + '\n' }, mainBody()],
    ['missing GitHub binding', missingToken, mainBody()],
    ['wrong main ref', {}, { ...mainBody(), ref: 'refs/heads/preview' }],
    ['main is a tag', {}, { ...mainBody(), object: { type: 'tag', sha } }],
    ['malformed current SHA', {}, mainBody(sha + '\n')],
    ['main unavailable', {}, null],
    ['oversized current main', {}, 'x'.repeat(262_145)],
  ])
    await t.test(label, async () => {
      let providers = 0;
      const options = {
        env: { ...exactEnv, ...overrides },
        sourcePolicy: exactPolicy,
        client: async () => {
          providers++;
          return exactTargetData();
        },
        fetchImpl: async (url) => {
          assert.equal(url, mainEndpoint);
          return typeof result === 'string'
            ? new Response(result)
            : response(result, result ? 200 : 403);
        },
      };
      await assert.rejects(prepareDemo(options));
      await assert.rejects(deployDemo(options));
      assert.equal(providers, 0);
    });
});

test('actual CLI rejects stale queued main and cross-workflow producers without issuing a receipt', async (t) => {
  const modulePath = fileURLToPath(
    new URL('../../src/bug-pipeline/demo-deployment.mjs', import.meta.url),
  );
  for (const [label, operation, overrides, failAt, mutations, providerReads] of [
    ['stale queued SHA', 'deploy-exact', {}, 1, 0, 0],
    ['main moved during preflight', 'deploy-exact', {}, 2, 0, 1],
    ['main moved after readiness', 'deploy-exact', {}, 3, 1, 4],
    ['wrong reviewed SHA', 'deploy-exact', { CLINICOS_REVIEWED_SHA: reviewedSha }, 0, 0, 0],
    [
      'old workflow exact policy',
      'deploy-exact',
      { GITHUB_WORKFLOW_REF: env.GITHUB_WORKFLOW_REF },
      0,
      0,
      0,
    ],
    ['new workflow strict policy', 'deploy', {}, 0, 0, 0],
    ['push exact policy', 'deploy-exact', { GITHUB_EVENT_NAME: 'push' }, 0, 0, 0],
  ])
    await t.test(label, async () => {
      const directory = await mkdtemp(join(tmpdir(), 'demo-exact-cli-reject-'));
      try {
        const fixturePath = join(directory, 'fetch-fixture.mjs');
        const logPath = join(directory, 'requests.jsonl');
        await writeFile(
          fixturePath,
          `import assert from 'node:assert/strict';
import { appendFileSync } from 'node:fs';
let mainReads = 0;
globalThis.fetch = async (url, options) => {
  assert.equal(options.redirect, 'error');
  if (url === '${mainEndpoint}') {
    assert.equal(options.headers.Authorization, 'Bearer synthetic-readonly-github-binding');
    assert.equal(options.headers['Project-Access-Token'], undefined);
    appendFileSync(${JSON.stringify(logPath)}, JSON.stringify({ main: true }) + '\\n');
    const sha = ++mainReads === ${failAt} ? '${reviewedSha}' : '${sha}';
    return new Response(JSON.stringify({ ref: 'refs/heads/main', object: { type: 'commit', sha } }));
  }
  if (url === 'https://${DEMO_TARGET.domain}/ready') {
    appendFileSync(${JSON.stringify(logPath)}, JSON.stringify({ ready: true }) + '\\n');
    return new Response(JSON.stringify(${JSON.stringify(readyBody())}), { headers: { 'Cache-Control': 'no-store' } });
  }
  assert.equal(url, 'https://backboard.railway.app/graphql/v2');
  assert.equal(options.headers['Project-Access-Token'], 'synthetic-demo-binding');
  assert.equal(options.headers.Authorization, undefined);
  const { query, variables } = JSON.parse(options.body);
  const mutation = query.startsWith('mutation');
  if (mutation) {
    assert.match(query, /serviceInstanceDeployV2/);
    assert.equal(variables.commitSha, '${sha}');
    assert.equal(variables.serviceId, '${DEMO_TARGET.serviceId}');
    assert.equal(variables.environmentId, '${DEMO_TARGET.environmentId}');
  }
  appendFileSync(${JSON.stringify(logPath)}, JSON.stringify({ provider: true, mutation }) + '\\n');
  return new Response(JSON.stringify({ data: mutation ? { serviceInstanceDeployV2: '${deploymentId}' } : ${JSON.stringify(exactTargetData())} }));
};\n`,
        );
        const result = spawnSync(
          process.execPath,
          ['--import', fixturePath, modulePath, operation],
          {
            cwd: directory,
            env: { ...exactEnv, ...overrides, RAILWAY_TOKEN: 'synthetic-demo-binding' },
            encoding: 'utf8',
            timeout: 30_000,
          },
        );
        assert.equal(result.error, undefined);
        assert.equal(result.status, 1, result.stderr);
        const log = await readFile(logPath, 'utf8').catch((error) => {
          assert.equal(error.code, 'ENOENT');
          return '';
        });
        const requests = log.trim() ? log.trim().split('\n').map(JSON.parse) : [];
        assert.equal(requests.filter((r) => r.mutation).length, mutations);
        assert.equal(requests.filter((r) => r.provider).length, providerReads);
        if (failAt === 0) assert.equal(requests.length, 0);
        await assert.rejects(readFile(join(directory, 'demo-deployment-receipt.json')), {
          code: 'ENOENT',
        });
        assert.doesNotMatch(
          result.stdout + result.stderr,
          /synthetic-demo-binding|synthetic-readonly-github-binding/,
        );
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    });
});

test('exact deploy rejects every incomplete or overlapping native rollout inventory before mutation', async (t) => {
  for (const [label, change] of [
    [
      'missing deployments',
      (d) => {
        delete d.deployments;
      },
    ],
    [
      'missing edges',
      (d) => {
        delete d.deployments.edges;
      },
    ],
    [
      'missing pageInfo',
      (d) => {
        delete d.deployments.pageInfo;
      },
    ],
    [
      'unknown pagination',
      (d) => {
        d.deployments.pageInfo.hasNextPage = null;
      },
    ],
    [
      'more pages',
      (d) => {
        d.deployments.pageInfo.hasNextPage = true;
      },
    ],
    [
      'missing active',
      (d) => {
        delete d.serviceInstance.activeDeployments;
      },
    ],
    [
      'unknown active',
      (d) => {
        d.serviceInstance.activeDeployments[0].status = 'UNKNOWN';
      },
    ],
    [
      'ambiguous active',
      (d) => {
        d.serviceInstance.activeDeployments.push(d.serviceInstance.activeDeployments[0]);
      },
    ],
    [
      'missing latest',
      (d) => {
        delete d.serviceInstance.latestDeployment;
      },
    ],
    [
      'contradictory null latest',
      (d) => {
        d.serviceInstance.latestDeployment = null;
      },
    ],
    ...[
      'INITIALIZING',
      'BUILDING',
      'DEPLOYING',
      'QUEUED',
      'WAITING',
      'NEEDS_APPROVAL',
      'REMOVING',
      'SLEEPING',
      'UNKNOWN',
    ].flatMap((status) => [
      [
        `native filtered ${status}`,
        (d) => {
          d.deployments.edges = [{ node: { id: deploymentId, status } }];
        },
      ],
      [
        `latest ${status}`,
        (d) => {
          d.serviceInstance.latestDeployment.status = status;
        },
      ],
      [
        `active ${status}`,
        (d) => {
          d.serviceInstance.activeDeployments[0].status = status;
        },
      ],
    ]),
  ])
    await t.test(label, async () => {
      let mutations = 0;
      await assert.rejects(
        deployDemo({
          env: exactEnv,
          sourcePolicy: exactPolicy,
          fetchImpl: mainFetch(),
          client: async (query) => {
            if (query.startsWith('mutation')) {
              mutations++;
              return { serviceInstanceDeployV2: deploymentId };
            }
            assert.match(
              query,
              /deployments\(input:\{projectId:\$projectId,environmentId:\$environmentId,serviceId:\$serviceId,status:\{notIn:\[SUCCESS,FAILED,CRASHED,REMOVED,SKIPPED\]\}\},first:1\)/,
            );
            const data = exactTargetData();
            change(data);
            return data;
          },
        }),
        /idle demo deployment inventory/,
      );
      assert.equal(mutations, 0);
    });
});

test('a rerun reuses the unique active native SUCCESS exact SHA, proves it live and performs no migration mutation', async () => {
  const progress = [];
  let mutations = 0,
    reads = 0,
    ready = 0;
  const proof = await deployDemo({
    env: exactEnv,
    sourcePolicy: exactPolicy,
    client: async (query) => {
      if (query.startsWith('mutation')) {
        mutations++;
        throw new Error('Duplicate mutation prohibited');
      }
      reads++;
      const data = exactTargetData();
      data.serviceInstance.activeDeployments[0].meta = { commitHash: sha };
      return data;
    },
    fetchImpl: mainFetch(async () => {
      ready++;
      return response();
    }),
    onProgress: async (item) => progress.push(item),
  });
  assert.equal(mutations, 0);
  assert.equal(reads, 3);
  assert.equal(ready, 1);
  assert.equal(proof.deploymentReused, true);
  assert.deepEqual(proof.previousActiveDeployment, { id: deploymentId, commitHash: sha });
  assert.deepEqual(proof.migrations, {
    command: 'npm run db:migrate',
    direction: 'forward-only',
    delta: 'unproven',
    deploymentSubmittedByThisRun: false,
  });
  assert.equal(progress.at(-1).status, 'verified');
  validateReceipt(proof, exactRun, 'clinicos-demo-backend', Date.now(), exactPolicy);
});

test('normal exact deployment records previous active native SHA or explicit unknown without inventing migration delta', async (t) => {
  for (const previousSha of [reviewedSha, undefined, 'invalid'])
    await t.test(String(previousSha), async () => {
      let mutations = 0;
      const proof = await deployDemo({
        env: exactEnv,
        sourcePolicy: exactPolicy,
        fetchImpl: mainFetch(),
        client: async (query) => {
          if (query.startsWith('mutation')) {
            mutations++;
            return { serviceInstanceDeployV2: deploymentId };
          }
          const data = exactTargetData();
          data.serviceInstance.activeDeployments[0].meta = { commitHash: previousSha };
          return data;
        },
      });
      assert.equal(mutations, 1);
      assert.deepEqual(proof.previousActiveDeployment, {
        id: deploymentId,
        commitHash: previousSha === reviewedSha ? reviewedSha : null,
      });
      assert.equal(proof.migrations.delta, 'unproven');
      assert.equal(proof.migrations.deploymentSubmittedByThisRun, true);
    });
});

test('bounded read-only transient poll retries recover but denial, malformed bodies and uncertain mutations never retry', async (t) => {
  for (const failure of [
    'network',
    'timeout',
    408,
    429,
    500,
    502,
    503,
    504,
    'denied',
    'malformed',
    'permanent',
    'exhausted',
    'mutation',
  ])
    await t.test(String(failure), async () => {
      let mutations = 0,
        polls = 0,
        delays = 0;
      const client = createRailwayClient({
        token: 'synthetic-demo-binding',
        fetchImpl: async (_url, options) => {
          const { query } = JSON.parse(options.body);
          if (query.startsWith('mutation')) {
            mutations++;
            if (failure === 'mutation')
              throw new TypeError('PRIVATE_TOKEN_SENTINEL uncertain submission');
            return response({ data: { serviceInstanceDeployV2: deploymentId } });
          }
          if (mutations && ++polls <= (failure === 'exhausted' ? 4 : 1)) {
            if (failure === 'network' || failure === 'exhausted')
              throw new TypeError('PRIVATE_TOKEN_SENTINEL');
            if (failure === 'timeout')
              throw new DOMException('PRIVATE_TOKEN_SENTINEL', 'TimeoutError');
            if (typeof failure === 'number') return response({}, failure);
            if (failure === 'denied')
              return response({ errors: [{ message: 'PRIVATE_TOKEN_SENTINEL' }] });
            if (failure === 'malformed') return new Response('PRIVATE_TOKEN_SENTINEL');
            if (failure === 'permanent') return response({}, 403);
          }
          return response({ data: exactTargetData() });
        },
      });
      const request = deployDemo({
        env: exactEnv,
        sourcePolicy: exactPolicy,
        client,
        fetchImpl: mainFetch(),
        attempts: 5,
        delay: async () => {
          delays++;
        },
      });
      if (['denied', 'malformed', 'permanent', 'exhausted', 'mutation'].includes(failure)) {
        await assert.rejects(request, (error) => !error.message.includes('PRIVATE_TOKEN_SENTINEL'));
        assert.equal(polls, failure === 'mutation' ? 0 : failure === 'exhausted' ? 4 : 1);
      } else {
        assert.equal((await request).deployment.id, deploymentId);
        assert.equal(polls, 3, 'one failed poll, successful poll, final native recheck');
        assert.equal(delays, 1);
      }
      assert.equal(mutations, 1);
    });
});

test('aggregate injected-clock budget covers worst-case requests, ready, delays and final checks below workflow timeout', async () => {
  assert.equal(DEMO_DEPLOY_BUDGET_MS, 25 * 60 * 1000);
  assert.ok(DEMO_DEPLOY_BUDGET_MS < 40 * 60 * 1000);
  let elapsed = 0,
    mutations = 0,
    polls = 0;
  const progress = [];
  await assert.rejects(
    deployDemo({
      env: exactEnv,
      sourcePolicy: exactPolicy,
      now: () => elapsed,
      onProgress: async (p) => progress.push(p),
      delay: async (ms) => {
        elapsed += ms;
      },
      fetchImpl: async (url) => {
        if (url === mainEndpoint) {
          elapsed += 30_000;
          return response(mainBody());
        }
        elapsed += 20_000;
        return response({}, 503);
      },
      client: async (query) => {
        elapsed += 30_000;
        if (query.startsWith('mutation')) {
          mutations++;
          return { serviceInstanceDeployV2: deploymentId };
        }
        polls++;
        return exactTargetData();
      },
    }),
    /aggregate deployment deadline/,
  );
  assert.equal(mutations, 1);
  assert.ok(polls > 1);
  assert.ok(elapsed <= DEMO_DEPLOY_BUDGET_MS);
  assert.equal(progress.at(-1).deploymentId, deploymentId);
  assert.equal(progress.at(-1).errorCode, 'DEPLOYMENT_PROOF_FAILED');
});

test('safe failure progress preserves only validated identity and finite outcome, never provider payloads', async () => {
  const progress = [];
  let submitted = false;
  await assert.rejects(
    deployDemo({
      env: exactEnv,
      sourcePolicy: exactPolicy,
      fetchImpl: mainFetch(),
      onProgress: async (item) => progress.push(item),
      client: async (query) => {
        if (query.startsWith('mutation')) {
          submitted = true;
          return { serviceInstanceDeployV2: deploymentId, private: 'PRIVATE_SENTINEL' };
        }
        if (submitted) throw new Error('PRIVATE_SENTINEL provider payload');
        return exactTargetData();
      },
    }),
  );
  assert.deepEqual(progress.at(-1), {
    schemaVersion: 1,
    kind: 'clinicos-demo-deployment-progress',
    target: { ...DEMO_TARGET },
    mergeSha: sha,
    deploymentId,
    status: 'failed',
    errorCode: 'DEPLOYMENT_PROOF_FAILED',
  });
  assert.doesNotMatch(JSON.stringify(progress), /PRIVATE_SENTINEL|token|headers|response/i);
});

test('actual exact CLI saves private sanitized failure progress with validated deployment ID after submission', async (t) => {
  for (const failure of ['poll-denied', 'invalid-id', 'preflight-denied'])
    await t.test(failure, async () => {
      const directory = await mkdtemp(join(tmpdir(), 'demo-failure-cli-'));
      try {
        const fixturePath = join(directory, 'fixture.mjs');
        await writeFile(
          fixturePath,
          `
let submitted = false;
globalThis.fetch = async (url, options) => {
  if (url === '${mainEndpoint}') return new Response(JSON.stringify(${JSON.stringify(mainBody())}));
  if (url !== 'https://backboard.railway.app/graphql/v2') throw new Error('Unexpected external fetch');
  const {query} = JSON.parse(options.body);
  if (query.startsWith('mutation')) {
    submitted = true;
    return new Response(JSON.stringify({data:{serviceInstanceDeployV2:'${failure === 'invalid-id' ? 'PRIVATE_SENTINEL' : deploymentId}'}}));
  }
  if (submitted || '${failure}' === 'preflight-denied') return new Response(JSON.stringify({errors:[{message:'PRIVATE_SENTINEL'}]}));
  return new Response(JSON.stringify({data:${JSON.stringify(exactTargetData())}}));
};
`,
        );
        const result = spawnSync(
          process.execPath,
          [
            '--import',
            fixturePath,
            fileURLToPath(new URL('../../src/bug-pipeline/demo-deployment.mjs', import.meta.url)),
            failure === 'preflight-denied' ? 'preflight-exact' : 'deploy-exact',
          ],
          {
            cwd: directory,
            env: { ...exactEnv, RAILWAY_TOKEN: 'synthetic-demo-binding' },
            encoding: 'utf8',
            timeout: 5000,
          },
        );
        assert.equal(result.error, undefined);
        assert.equal(result.status, 1);
        assert.doesNotMatch(
          result.stdout + result.stderr,
          /PRIVATE_SENTINEL|synthetic-demo-binding/,
        );
        const progress = JSON.parse(
          await readFile(join(directory, 'demo-deployment-progress.json'), 'utf8'),
        );
        assert.equal(progress.deploymentId, failure === 'poll-denied' ? deploymentId : null);
        assert.equal(progress.mergeSha, sha);
        assert.deepEqual(progress.target, DEMO_TARGET);
        assert.equal(progress.errorCode, 'DEPLOYMENT_PROOF_FAILED');
        assert.equal(progress.status, 'failed');
        assert.doesNotMatch(JSON.stringify(progress), /PRIVATE_SENTINEL|token|headers|response/i);
        const { stat } = await import('node:fs/promises');
        if (process.platform !== 'win32')
          assert.equal(
            (await stat(join(directory, 'demo-deployment-progress.json'))).mode & 0o777,
            0o600,
          );
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    });
});

test('metadata serializer rejects either nonempty bound credential in values or keys, including JSON escaping', () => {
  for (const secret of [
    '99999999-2222-4222-8222-777777777777',
    'f'.repeat(40),
    'synthetic\n"credential\\value',
    '\u0000\tcredential',
    '\ud800credential',
  ]) {
    for (const value of [
      { nested: { id: secret } },
      { [secret]: 'value' },
      { nested: `before:${secret}:after` },
    ]) {
      for (const forbiddenValues of [
        [secret, 'unrelated-binding'],
        ['unrelated-binding', secret],
      ]) {
        assert.throws(
          () => serializeDemoMetadata(value, { forbiddenValues }),
          /credential-free metadata required/,
        );
      }
    }
  }
  const safe = {
    deploymentId,
    previousActiveDeployment: { id: deploymentId, commitHash: reviewedSha },
  };
  assert.deepEqual(
    JSON.parse(
      serializeDemoMetadata(safe, {
        forbiddenValues: [undefined, null, '', 'synthetic-safe-binding'],
      }),
    ),
    safe,
  );
});

test('callback guard rejects reflected identity before assignment and never restores it on failure', async () => {
  const syntheticToken = '99999999-2222-4222-8222-777777777777';
  let mutations = 0;
  const progress = [];
  await assert.rejects(
    deployDemo({
      env: { ...exactEnv, RAILWAY_TOKEN: syntheticToken },
      sourcePolicy: exactPolicy,
      fetchImpl: mainFetch(),
      onProgress: async (item) => {
        progress.push(item);
        assert.equal(JSON.stringify(item).includes(syntheticToken), false);
      },
      client: async (query) => {
        if (query.startsWith('mutation')) {
          mutations++;
          return { serviceInstanceDeployV2: syntheticToken };
        }
        return exactTargetData();
      },
    }),
    /credential-free metadata required/,
  );
  assert.equal(mutations, 1);
  assert.equal(progress.at(-1).deploymentId, null);
  assert.equal(progress.at(-1).status, 'failed');
});

test('actual CLI excludes bound credential reflection across initial, mutation, receipt, progress and fallback boundaries', async (t) => {
  const uuidCredential = '99999999-2222-4222-8222-777777777777';
  const cases = [
    ...['RAILWAY_TOKEN', 'GITHUB_TOKEN'].flatMap((binding) => [
      {
        label: `${binding}:mutation-uuid`,
        binding,
        secret: uuidCredential,
        reflect: 'mutation',
        mutations: 1,
      },
      {
        label: `${binding}:reuse-uuid`,
        binding,
        secret: uuidCredential,
        reflect: 'reuse',
        mutations: 0,
      },
      {
        label: `${binding}:previous-active-uuid`,
        binding,
        secret: uuidCredential,
        reflect: 'previous-id',
        mutations: 0,
      },
      {
        label: `${binding}:previous-native-sha`,
        binding,
        secret: reviewedSha,
        reflect: 'previous-sha',
        mutations: 0,
      },
      {
        label: `${binding}:current-sha`,
        binding,
        secret: sha,
        reflect: 'context',
        mutations: 0,
        omitProgress: true,
      },
      {
        label: `${binding}:preflight-current-sha`,
        binding,
        secret: sha,
        reflect: 'context',
        mutations: 0,
        omitProgress: true,
        operation: 'preflight-exact',
      },
      {
        label: `${binding}:fixed-target`,
        binding,
        secret: DEMO_TARGET.projectId,
        reflect: 'context',
        mutations: 0,
        omitProgress: true,
      },
      {
        label: `${binding}:escaped-final-receipt`,
        binding,
        secret: 'synthetic\n"receipt\\credential',
        reflect: 'receipt',
        mutations: 1,
      },
      {
        label: `${binding}:escaped-preflight-receipt`,
        binding,
        secret: 'synthetic\n"preflight\\credential',
        reflect: 'receipt',
        mutations: 0,
        operation: 'preflight-exact',
      },
    ]),
    {
      label: 'fixed-diagnostic-matches-bound-credential',
      binding: 'RAILWAY_TOKEN',
      secret: 'proof',
      reflect: 'safe-failure',
      mutations: 1,
    },
    { label: 'safe-normal-success', reflect: 'safe-success', mutations: 1, success: true },
    { label: 'safe-normal-failure', reflect: 'safe-failure', mutations: 1 },
    { label: 'safe-native-reuse', reflect: 'safe-reuse', mutations: 0, success: true },
  ];
  for (const scenario of cases)
    await t.test(scenario.label, async () => {
      const directory = await mkdtemp(join(tmpdir(), 'demo-secret-boundary-'));
      try {
        const childEnv = {
          ...exactEnv,
          RAILWAY_TOKEN: 'synthetic-demo-binding',
          ...(scenario.binding ? { [scenario.binding]: scenario.secret } : {}),
        };
        const initial = exactTargetData();
        if (['reuse', 'previous-id'].includes(scenario.reflect)) {
          initial.serviceInstance.activeDeployments[0].id = scenario.secret;
          initial.serviceInstance.latestDeployment.id = scenario.secret;
        }
        initial.serviceInstance.activeDeployments[0].meta = {
          commitHash: ['reuse', 'safe-reuse'].includes(scenario.reflect)
            ? sha
            : scenario.reflect === 'previous-sha'
              ? scenario.secret
              : reviewedSha,
        };
        const fixturePath = join(directory, 'fixture.mjs');
        const counterPath = join(directory, 'counts.json');
        await writeFile(
          fixturePath,
          `
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const scenario = ${JSON.stringify(scenario)};
const initial = ${JSON.stringify(initial)};
const native = ${JSON.stringify(exactTargetData())};
const counts = {mutations:0, main:0, reads:0};
const save = () => writeFileSync(${JSON.stringify(counterPath)}, JSON.stringify(counts));
save();
if (scenario.reflect === 'receipt') Date.prototype.toISOString = () => scenario.secret;
globalThis.fetch = async (url, options) => {
  assert.equal(options.redirect, 'error');
  if (url === '${mainEndpoint}') {
    counts.main++; save();
    assert.equal(options.headers.Authorization, 'Bearer ' + process.env.GITHUB_TOKEN);
    return new Response(JSON.stringify(${JSON.stringify(mainBody())}));
  }
  if (url === 'https://${DEMO_TARGET.domain}/ready')
    return new Response(JSON.stringify(${JSON.stringify(readyBody())}), {headers:{'Cache-Control':'no-store'}});
  assert.equal(url, 'https://backboard.railway.app/graphql/v2');
  assert.equal(options.headers['Project-Access-Token'], process.env.RAILWAY_TOKEN);
  const {query, variables} = JSON.parse(options.body);
  if (query.startsWith('mutation')) {
    counts.mutations++; save();
    assert.equal(variables.commitSha, '${sha}');
    return new Response(JSON.stringify({data:{serviceInstanceDeployV2:scenario.reflect === 'mutation' ? scenario.secret : '${deploymentId}'}}));
  }
  counts.reads++; save();
  if (scenario.reflect === 'safe-failure' && counts.mutations)
    return new Response(JSON.stringify({errors:[{message:'synthetic private provider failure'}]}));
  return new Response(JSON.stringify({data:counts.mutations || (scenario.reflect === 'safe-reuse' && counts.reads > 1) ? native : initial}));
};
`,
        );
        const result = spawnSync(
          process.execPath,
          [
            '--import',
            fixturePath,
            fileURLToPath(new URL('../../src/bug-pipeline/demo-deployment.mjs', import.meta.url)),
            scenario.operation ?? 'deploy-exact',
          ],
          {
            cwd: directory,
            env: childEnv,
            encoding: 'utf8',
            timeout: 5000,
          },
        );
        assert.equal(result.error, undefined);
        assert.equal(result.status, scenario.success ? 0 : 1, result.stderr);
        const counts = JSON.parse(await readFile(counterPath, 'utf8'));
        assert.equal(counts.mutations, scenario.mutations);
        if (scenario.reflect === 'context') assert.equal(counts.main + counts.reads, 0);
        const filenames = await readdir(directory);
        const artifacts = filenames.filter(
          (name) => name.startsWith('demo-') && name.endsWith('.json'),
        );
        const output = [
          result.stdout,
          result.stderr,
          ...(await Promise.all(artifacts.map((name) => readFile(join(directory, name), 'utf8')))),
        ];
        for (const secret of [childEnv.RAILWAY_TOKEN, childEnv.GITHUB_TOKEN])
          for (const text of output) {
            assert.equal(text.includes(secret), false, 'raw bound credential must not be emitted');
            assert.equal(
              text.includes(JSON.stringify(secret).slice(1, -1)),
              false,
              'JSON-escaped bound credential must not be emitted',
            );
          }
        const receiptName = 'demo-deployment-receipt.json';
        assert.equal(artifacts.includes(receiptName), Boolean(scenario.success));
        if (scenario.omitProgress)
          assert.equal(
            artifacts.length,
            0,
            'credential-bearing context cannot be saved by fallback',
          );
        else {
          const progress = JSON.parse(
            await readFile(join(directory, 'demo-deployment-progress.json'), 'utf8'),
          );
          assert.equal(progress.status, scenario.success ? 'verified' : 'failed');
          if (
            !scenario.success &&
            ['mutation', 'reuse', 'previous-id', 'previous-sha', 'receipt'].includes(
              scenario.reflect,
            )
          )
            assert.equal(
              progress.deploymentId,
              scenario.reflect === 'receipt' && !scenario.operation ? deploymentId : null,
            );
        }
        if (scenario.success) {
          const receipt = JSON.parse(await readFile(join(directory, receiptName), 'utf8'));
          validateReceipt(receipt, exactRun, 'clinicos-demo-backend', Date.now(), exactPolicy);
          assert.equal(receipt.deploymentReused, scenario.reflect === 'safe-reuse');
          assert.equal(receipt.migrations.delta, 'unproven');
        }
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    });
});
