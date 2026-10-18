import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
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
};
const exactEnv = {
  ...env,
  GITHUB_ACTIONS: 'true',
  GITHUB_EVENT_NAME: 'push',
  GITHUB_WORKFLOW_REF: `${repo}/.github/workflows/deploy-backend.yml@refs/heads/main`,
};
const exactPolicy = DEMO_SOURCE_POLICIES.exact;
function exactTargetData() {
  const data = targetData();
  data.deploymentTriggers = { edges: [], pageInfo: { hasNextPage: false } };
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
  const zip = zipReceipt(receiptBody);
  const artifact = modifyArtifact({
    id: 456,
    name: `demo-deployment-${run.id}-${run.run_attempt}`,
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
    if (String(url).includes('/actions/runs/123')) return response(modifyRun(structuredClone(run)));
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
    demo.indexOf('demo-deployment.mjs preflight-exact') <
      demo.indexOf('demo-deployment.mjs deploy-exact'),
  );
  const guardTests = demo.indexOf(
    'run: node --test agent-team/tests/bug-pipeline/demo-deployment.test.mjs',
  );
  assert.ok(guardTests >= 0 && guardTests < demo.indexOf('secrets.RAILWAY_DEMO_TOKEN'));
  assert.equal((demo.match(/demo-deployment\.mjs preflight-exact/g) ?? []).length, 1);
  assert.equal((demo.match(/demo-deployment\.mjs deploy-exact/g) ?? []).length, 1);
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
  assert.deepEqual(validateTarget(one, exactPolicy), DEMO_TARGET);
  const proof = await prepareDemo({
    env: exactEnv,
    sourcePolicy: exactPolicy,
    client: async (query) => {
      assert.match(query, /pageInfo\{hasNextPage\}/);
      return data;
    },
  });
  assert.equal(proof.sourcePolicy, exactPolicy);
  validateReceipt(proof, run, 'clinicos-demo-preflight', Date.now(), exactPolicy);
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
    fetchImpl: async (url, options) => {
      assert.equal(url, `https://${DEMO_TARGET.domain}/ready`);
      assert.equal(options.redirect, 'error');
      assert.equal(options.headers['Cache-Control'], 'no-cache');
      ready = true;
      return response();
    },
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
  validateReceipt(proof, run, undefined, Date.now(), exactPolicy);
});

test('source policy is bound through artifact receipt and independent native verification', async (t) => {
  const exactReceipt = { ...receipt(), sourcePolicy: exactPolicy };
  const f = proofHttp({ receiptBody: exactReceipt });
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
  const preflight = { ...receipt('clinicos-demo-preflight'), sourcePolicy: exactPolicy };
  const reader = {
    getJson: async (route) => (route === 'commits/main' ? { sha } : { workflow_runs: [run] }),
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
          fetchImpl: async () => response(),
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
      fetchImpl: async () => {
        ready = true;
        return response();
      },
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
        deployDemo({ env: exactEnv, sourcePolicy: exactPolicy, client, attempts: 2 }),
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
            env: { ...exactEnv, RAILWAY_TOKEN: 'synthetic-demo-binding' },
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
          validateReceipt(saved, run, saved.kind, Date.now(), exactPolicy);
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
