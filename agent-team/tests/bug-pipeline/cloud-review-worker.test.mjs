import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createRunner } from '../../src/bug-pipeline/process.mjs';
import {
  processCloudReview,
  probeCloudClaude,
  createReviewSourceReader,
  cloudClaudeArgs,
} from '../../src/bug-pipeline/cloud-review-worker.mjs';

const repo = 'l2v-hub/ClinicOS',
  sha = 'a'.repeat(40),
  base = 'b'.repeat(40);
const clone = (value) => structuredClone(value);
const approved = {
  subject_sha: sha,
  verdict: 'approved',
  summary: 'Supplied evidence supports the criteria.',
  findings: [],
};
const envelope = (structured_output) => ({
  ok: true,
  stdout: JSON.stringify({ structured_output }),
});
const plan = {
  title: 'Synthetic review',
  feature: 'Synthetic fixture',
  rationale: 'Bounded source change.',
  analysis: 'Synthetic acceptance.',
  issues: [17],
  scope: ['src/file.mjs'],
  acceptance: [{ issue: 17, criteria: ['Behavior persists.'] }],
  tasks: [{ title: 'Preserve behavior', files: ['src/file.mjs'], steps: ['Apply bounded fix.'] }],
  verification: [
    { command: 'node', args: ['--test', 'file.test.mjs'] },
    { command: 'npm', args: ['--prefix', 'frontend', 'run', 'build'] },
  ],
  evidence: [
    {
      issue: 17,
      screenshot: 'artifacts/task-validation/bug-batch-17/evidence/17.png',
      trace: 'artifacts/task-validation/bug-batch-17/evidence/17.zip',
      video: '',
    },
  ],
};
function fixture() {
  const subject = {
    id: 'bug-batch-17',
    branch: 'codex/bug-batch-17',
    issues: [17],
    sha,
    baseSha: base,
    phase: 'waiting-review',
    implementation: [{ round: 1, status: 'passed' }],
    reviews: [],
    plan: clone(plan),
    pr: { number: 81 },
    externalReview: {
      channel: 'github-comments',
      status: 'comment-requested',
      subjectSha: sha,
      requestId: 'request-1',
    },
  };
  const state = { schemaVersion: 1, repository: repo, batches: [subject] };
  const calls = [];
  const options = {
    env: { CLAUDE_REVIEW_AUTH_MODE: 'subscription', CLAUDE_CODE_OAUTH_TOKEN: 'synthetic-oauth' },
    cwd: '/private-empty',
    github: { createStateStore: () => ({ load: async () => clone(state) }) },
    retrieve: async () => {
      calls.push('retrieve');
      return { packet: { subject_sha: sha }, tracked: new Set(['src/file.mjs']) };
    },
    probe: async () => {
      calls.push('probe');
    },
    handoff: {
      claim: async () => {
        calls.push('claim');
        subject.phase = 'reviewing';
        subject.externalReview.status = 'comment-running';
        subject.reviews.push({ round: 1, subjectSha: sha, status: 'running' });
        return clone(subject);
      },
      submit: async (_pr, review) => {
        calls.push('submit');
        assert.deepEqual(review, approved);
      },
      reconcilePR: async () => {
        calls.push('reconcile');
        subject.externalReview.status = 'published';
        subject.reviews[0].status = 'approved';
        return clone(subject);
      },
      failOwnedClaim: async (_pr, claimed, code) => {
        calls.push(`fail:${code}`);
        assert.equal(claimed.externalReview.status, 'comment-running');
        subject.externalReview.status = 'failed';
        subject.reviews[0].status = 'failed';
        return clone(subject);
      },
    },
    standalone: {},
    communication: {
      publishState: async () => {
        calls.push('project');
      },
    },
    wake: async () => {
      calls.push('wake');
    },
    run: async (call) => {
      calls.push('model');
      assert.equal(call.envMode, 'review');
      assert.equal(call.cwd, '/private-empty');
      assert.equal(call.args[call.args.indexOf('--tools') + 1], '');
      return envelope(approved);
    },
  };
  return { state, subject, calls, options };
}

test('empty queue and label-only or manual subjects have no provider call or claim', async () => {
  for (const kind of ['empty', 'label-only', 'manual']) {
    const f = fixture();
    if (kind === 'empty') f.state.batches = [];
    if (kind === 'label-only') f.subject.externalReview.status = 'requested';
    if (kind === 'manual') {
      f.state.manualBatches = f.state.batches;
      f.state.batches = [];
    }
    assert.deepEqual(await processCloudReview(f.options), {
      status: 'empty',
      providerExecuted: false,
    });
    assert.deepEqual(f.calls, []);
  }
});
test('source then actual auth probe precede the one native claim, validated report, reconciliation, projection and wake', async () => {
  const f = fixture();
  const result = await processCloudReview(f.options);
  assert.equal(result.status, 'published');
  assert.deepEqual(f.calls, [
    'retrieve',
    'probe',
    'claim',
    'model',
    'submit',
    'reconcile',
    'project',
    'wake',
  ]);
  const count = f.calls.length;
  assert.equal((await processCloudReview(f.options)).status, 'empty');
  assert.equal(f.calls.length, count, 'No second inference or claim for a published SHA');
});
test('missing/invalid subscription credentials and stale source stop before native claim', async () => {
  const f = fixture();
  f.options.probe = probeCloudClaude;
  f.options.env.CLAUDE_CODE_OAUTH_TOKEN = '';
  await assert.rejects(processCloudReview(f.options), /credential missing/);
  assert.deepEqual(f.calls, ['retrieve']);
  const g = fixture();
  g.options.probe = async () => {
    throw new Error('Synthetic auth rejection');
  };
  await assert.rejects(processCloudReview(g.options), /auth rejection/);
  assert.deepEqual(g.calls, ['retrieve']);
  const h = fixture();
  h.options.retrieve = async () => {
    throw new Error('Synthetic stale SHA');
  };
  assert.equal((await processCloudReview(h.options)).status, 'queue-blocked');
  assert.deepEqual(h.calls, []);
});
test('native CAS loser never invokes review inference', async () => {
  const f = fixture();
  f.options.handoff.claim = async () => {
    f.calls.push('claim-conflict');
    throw new Error('CAS conflict');
  };
  await assert.rejects(processCloudReview(f.options), /CAS conflict/);
  assert.deepEqual(f.calls, ['retrieve', 'probe', 'claim-conflict']);
});
test('invalid report spends only its own claim as failure, without submit, retry or wake', async () => {
  const f = fixture();
  f.options.run = async () => envelope({ ...approved, subject_sha: base });
  const result = await processCloudReview(f.options);
  assert.equal(result.status, 'provider-failed');
  assert.deepEqual(f.calls, [
    'retrieve',
    'probe',
    'claim',
    'fail:review-validation-failed',
    'project',
  ]);
  assert.equal(f.subject.reviews[0].status, 'failed');
  assert.equal((await processCloudReview(f.options)).status, 'empty');
});
test('uncertain publication preserves genuine findings and the existing running claim', async () => {
  const f = fixture();
  f.options.handoff.submit = async () => {
    f.calls.push('submit-uncertain');
    throw new Error('POST outcome unknown');
  };
  await assert.rejects(processCloudReview(f.options), /outcome unknown/);
  assert.equal(f.subject.reviews[0].status, 'running');
  assert.ok(!f.calls.some((call) => call.startsWith('fail:')));
  assert.equal((await processCloudReview(f.options)).status, 'empty');
});
test('unavailable Codex dispatch retains exact published review receipt without another model call', async () => {
  const f = fixture();
  f.options.wake = async () => {
    throw new Error('Synthetic disabled controller');
  };
  const result = await processCloudReview(f.options);
  assert.equal(result.status, 'published-wake-blocked');
  assert.equal(result.sha, sha);
  assert.equal(f.subject.externalReview.status, 'published');
  assert.equal((await processCloudReview(f.options)).status, 'empty');
  assert.equal(f.calls.filter((call) => call === 'model').length, 1);
});
test('real auth probe requires a real successful structured inference and qualified version', async () => {
  const calls = [];
  const env = {
    CLAUDE_REVIEW_AUTH_MODE: 'subscription',
    CLAUDE_CODE_OAUTH_TOKEN: 'synthetic-oauth',
  };
  const run = async (call) => {
    calls.push(call);
    return call.args.includes('--version')
      ? { ok: true, stdout: '2.1.301 (Claude Code)' }
      : envelope({ status: 'ok' });
  };
  assert.equal((await probeCloudClaude({ env, run, cwd: '/empty' })).claimed, false);
  assert.equal(calls.length, 2);
  assert.ok(calls[1].args.includes('--print'));
  await assert.rejects(
    probeCloudClaude({
      env,
      cwd: '/empty',
      run: async (call) =>
        call.args.includes('--version')
          ? { ok: true, stdout: '2.1.301 (Claude Code)' }
          : { ok: false, stdout: 'synthetic provider output' },
    }),
    /probe failed/,
  );
  assert.equal(cloudClaudeArgs({}).includes('--bare'), false);
});

function sourceFixture() {
  const subject = fixture().subject,
    blobs = new Map(),
    head = new Map(),
    before = new Map();
  function add(map, file, text) {
    const data = Buffer.from(text),
      id = createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
    blobs.set(id, {
      sha: id,
      size: data.length,
      encoding: 'base64',
      content: data.toString('base64'),
    });
    map.set(file, { path: file, type: 'blob', mode: '100644', size: data.length, sha: id });
  }
  add(before, 'src/file.mjs', 'export const value = 1;\n');
  add(head, 'src/file.mjs', 'export const value = 2;\n');
  for (const name of ['task-contract.md', 'implementation-plan.md', 'validation-report.md']) {
    add(head, `artifacts/task-validation/bug-batch-17/${name}`, 'Synthetic frozen evidence\n');
    before.set(
      `artifacts/task-validation/bug-batch-17/${name}`,
      head.get(`artifacts/task-validation/bug-batch-17/${name}`),
    );
  }
  const pr = {
    number: 81,
    state: 'open',
    merged: false,
    draft: false,
    head: { sha, ref: subject.branch, repo: { full_name: repo, fork: false } },
    base: { sha: base, ref: 'main', repo: { full_name: repo } },
  };
  const comparison = {
    base_commit: { sha: base },
    merge_base_commit: { sha: base },
    status: 'ahead',
    files: [{ filename: 'src/file.mjs' }],
  };
  const calls = [],
    settings = { truncated: false };
  const run = async (call) => {
    calls.push(call);
    assert.equal(call.command, 'gh');
    assert.equal(call.args.length, 2);
    assert.equal(call.envMode, 'controller');
    const endpoint = call.args[1],
      prefix = `repos/${repo}/`;
    assert.ok(endpoint.startsWith(prefix));
    let value;
    if (endpoint === prefix + 'pulls/81') value = pr;
    else if (endpoint.startsWith(prefix + 'compare/')) value = comparison;
    else if (endpoint === prefix + `git/trees/${sha}?recursive=1`)
      value = { truncated: settings.truncated, tree: [...head.values()] };
    else if (endpoint === prefix + `git/trees/${base}?recursive=1`)
      value = { truncated: false, tree: [...before.values()] };
    else if (endpoint.startsWith(prefix + 'git/blobs/'))
      value = blobs.get(endpoint.split('/').at(-1));
    else assert.fail(`Unexpected source API ${endpoint}`);
    return { ok: true, stdout: JSON.stringify(value) };
  };
  return {
    subject,
    pr,
    comparison,
    head,
    before,
    blobs,
    calls,
    settings,
    retrieve: createReviewSourceReader({ run, cwd: '/private-empty' }),
  };
}
test('API source packet binds complete base/head source, contract and evidence without executing reviewed content', async () => {
  const f = sourceFixture();
  const result = await f.retrieve(f.subject);
  assert.equal(result.packet.subject_sha, sha);
  assert.equal(result.packet.base_sha, base);
  assert.equal(result.packet.changes[0].after.text, 'export const value = 2;\n');
  assert.equal(Object.keys(result.packet.evidence).length, 3);
  assert.ok(result.tracked.has('src/file.mjs'));
  assert.ok(f.calls.every((call) => call.command === 'gh'));
});
test('77+ binary proof changes remain hash metadata and do not block an ordinary small source review', async () => {
  const f = sourceFixture();
  for (let i = 0; i < 90; i++) {
    const file = `artifacts/task-validation/bug-batch-17/evidence/proof-${i}.webm`;
    f.head.set(file, {
      path: file,
      type: 'blob',
      mode: '100644',
      sha: 'c'.repeat(40),
      size: 30 * 1024 * 1024,
    });
    f.comparison.files.push({ filename: file });
  }
  const result = await f.retrieve(f.subject);
  assert.equal(result.packet.changes.length, 1);
  assert.equal(
    result.packet.evidenceInventory.filter((entry) => entry.file.endsWith('.webm')).length,
    90,
  );
  assert.ok(
    !f.calls.some((call) => call.args[1].endsWith('c'.repeat(40))),
    'Binary media is never decoded as source',
  );
});
test('complete tree inventories prove all source changes when comparison files hit GitHub cap300', async () => {
  const f = sourceFixture();
  f.comparison.files = [];
  for (let i = 0; i < 310; i++) {
    const file = `artifacts/task-validation/bug-batch-17/evidence/${i}.png`;
    f.head.set(file, {
      path: file,
      type: 'blob',
      mode: '100644',
      sha: 'c'.repeat(40),
      size: 200000,
    });
    if (i < 300) f.comparison.files.push({ filename: file });
  }
  const result = await f.retrieve(f.subject);
  assert.equal(result.packet.changes[0].file, 'src/file.mjs');
  assert.equal(
    result.packet.evidenceInventory.filter((entry) => entry.file.endsWith('.png')).length,
    310,
  );
});
test('unsupported first candidate never starves a later eligible native review', async () => {
  const f = fixture(),
    blocked = clone(f.subject);
  blocked.id = 'bug-batch-18';
  blocked.branch = 'codex/bug-batch-18';
  blocked.issues = [18];
  blocked.pr.number = 82;
  blocked.plan.issues = [18];
  blocked.plan.acceptance[0].issue = 18;
  blocked.plan.evidence[0].issue = 18;
  blocked.plan.evidence[0].screenshot = 'artifacts/task-validation/bug-batch-18/evidence/18.png';
  blocked.plan.evidence[0].trace = 'artifacts/task-validation/bug-batch-18/evidence/18.zip';
  f.state.batches.unshift(blocked);
  f.options.retrieve = async (subject) => {
    if (subject.pr.number === 82) throw new Error('Synthetic oversized historical baseline');
    return { packet: { subject_sha: sha }, tracked: new Set(['src/file.mjs']) };
  };
  const result = await processCloudReview(f.options);
  assert.equal(result.status, 'published');
  assert.equal(result.pr, 81);
  assert.deepEqual(result.blockedSubjects, [{ pr: 82, sha, status: 'source-unavailable' }]);
  assert.equal(blocked.reviews.length, 0);
});
test('API source reader rejects identity/traversal/truncation/omitted diff/blob corruption/oversize', async () => {
  for (const kind of [
    'pr-input',
    'sha-input',
    'external-repo',
    'stale-sha',
    'traversal',
    'truncated',
    'omitted',
    'corrupt',
    'oversize',
    'symlink',
  ]) {
    const f = sourceFixture();
    if (kind === 'pr-input') f.subject.pr.number = '../outside';
    if (kind === 'sha-input') f.subject.sha = '../../outside';
    if (kind === 'external-repo') f.pr.head.repo.full_name = 'outside/repo';
    if (kind === 'stale-sha') f.pr.head.sha = base;
    if (kind === 'traversal')
      f.head.set('../file', { ...f.head.get('src/file.mjs'), path: '../file' });
    if (kind === 'truncated') f.settings.truncated = true;
    if (kind === 'omitted') f.comparison.files = [];
    if (kind === 'corrupt')
      f.blobs.get(f.head.get('src/file.mjs').sha).content = Buffer.from('wrong').toString('base64');
    if (kind === 'oversize') f.head.get('src/file.mjs').size = 200000;
    if (kind === 'symlink') f.head.get('src/file.mjs').mode = '120000';
    await assert.rejects(f.retrieve(f.subject), undefined, kind);
    if (kind.endsWith('-input')) assert.equal(f.calls.length, 0, 'Invalid input never reaches API');
  }
});
test('actual review subprocess receives only subscription provider credentials and private empty HOME/cwd', async () => {
  const runtime = await mkdtemp(path.join(os.tmpdir(), 'cloud-review-env-test-'));
  try {
    const cwd = path.join(runtime, 'empty'),
      cli = path.join(runtime, 'fake-cli.mjs');
    await mkdir(cwd);
    await writeFile(
      cli,
      `console.log(JSON.stringify({keys:Object.keys(process.env),home:process.env.HOME,cwd:process.cwd()}));`,
    );
    const run = createRunner({
      runtimeRoot: runtime,
      env: {
        PATH: process.env.PATH,
        HOME: '/controller-home',
        CLAUDE_CLI_PATH: cli,
        CLAUDE_CODE_OAUTH_TOKEN: 'synthetic-oauth',
        CLAUDE_REVIEW_AUTH_MODE: 'subscription',
        GH_TOKEN: 'synthetic-gh',
        GITHUB_TOKEN: 'synthetic-github',
        OPENAI_API_KEY: 'synthetic-openai',
        CODEX_API_KEY: 'synthetic-codex',
        ANTHROPIC_API_KEY: 'synthetic-api',
        ANTHROPIC_AUTH_TOKEN: 'synthetic-api-auth',
        RAILWAY_TOKEN: 'synthetic-deploy',
      },
    });
    const result = await run({ command: 'claude', args: [], cwd, envMode: 'review' });
    assert.equal(result.ok, true);
    const actual = JSON.parse(result.stdout);
    assert.ok(actual.keys.includes('CLAUDE_CODE_OAUTH_TOKEN'));
    for (const secret of [
      'GH_TOKEN',
      'GITHUB_TOKEN',
      'OPENAI_API_KEY',
      'CODEX_API_KEY',
      'ANTHROPIC_API_KEY',
      'ANTHROPIC_AUTH_TOKEN',
      'RAILWAY_TOKEN',
    ])
      assert.ok(!actual.keys.includes(secret));
    assert.equal(actual.home, path.join(runtime, 'model-home'));
    assert.equal(actual.cwd, cwd);
  } finally {
    await rm(runtime, { recursive: true, force: true });
  }
});
