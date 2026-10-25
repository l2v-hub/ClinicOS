import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createRunner } from '../../src/bug-pipeline/process.mjs';
import {
  processCloudReview,
  probeCloudClaude,
  createReviewSourceReader,
  cloudClaudeArgs,
  prepareCloudInference,
  qualifiedModelProfile,
} from '../../src/bug-pipeline/cloud-review-worker.mjs';

const repo = 'l2v-hub/ClinicOS',
  sha = 'a'.repeat(40),
  base = 'b'.repeat(40);
const clone = (value) => structuredClone(value);
const feedback = {
  number: 81,
  head: sha,
  comments: [],
  unresolved: false,
  changesRequested: false,
};
const profile = { model: 'claude-opus-4-7', contextWindow: 1000000, maxOutputTokens: 64000 };
const approved = {
  subject_sha: sha,
  verdict: 'approved',
  summary: 'Supplied evidence supports the criteria.',
  findings: [],
};
const envelope = (structured_output) => ({
  ok: true,
  stdout: JSON.stringify({ structured_output, modelUsage: { [profile.model]: profile } }),
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
      return {
        packet: { subject_sha: sha, feedback: clone(feedback) },
        tracked: new Set(['src/file.mjs']),
      };
    },
    probe: async () => {
      calls.push('probe');
      return { profile };
    },
    handoff: {
      actor: async () => 'review-bot',
      claim: async (_pr, { expectedSubject, expectedFeedbackFingerprint, expectedActor }) => {
        calls.push('claim');
        assert.deepEqual(expectedSubject, subject);
        assert.equal(expectedActor, 'review-bot');
        subject.phase = 'reviewing';
        subject.externalReview.status = 'comment-running';
        subject.externalReview.owner = expectedActor;
        subject.externalReview.claimId = 'claim-1';
        subject.externalReview.feedbackFingerprint = expectedFeedbackFingerprint;
        subject.reviews.push({ round: 1, subjectSha: sha, status: 'running' });
        subject.reviewLedger = {
          schema_version: 1,
          max_rounds: 4,
          rounds: [{ round: 1, subject_sha: sha, verdict: 'running' }],
        };
        return clone(subject);
      },
      submit: async (_pr, review, { expectedClaim }) => {
        calls.push('submit');
        assert.deepEqual(review, approved);
        assert.deepEqual(expectedClaim, subject);
        assert.equal(expectedClaim.externalReview.status, 'comment-running');
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
  assert.equal((await processCloudReview(f.options)).status, 'capability-blocked');
  assert.deepEqual(f.calls, ['retrieve']);
  const g = fixture();
  g.options.probe = async () => {
    throw new Error('Synthetic auth rejection');
  };
  assert.equal((await processCloudReview(g.options)).status, 'capability-blocked');
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

test('original source and packet snapshots cannot be rewritten through reader aliases during qualification', async () => {
  const f = fixture();
  let alias;
  const original = f.subject.plan.analysis;
  f.options.retrieve = async (subject) => {
    alias = { plan: subject.plan, feedback: clone(feedback) };
    return { packet: alias, tracked: new Set(['src/file.mjs']) };
  };
  f.options.probe = async () => {
    alias.plan.analysis = 'Mutated asynchronous reader alias.';
    alias.feedback.comments.push({
      id: 9,
      author: 'human',
      body: 'Local alias is not live GitHub feedback.',
    });
    return { profile };
  };
  const run = f.options.run;
  f.options.run = async (call) => {
    assert.ok(call.input.includes(original));
    assert.ok(!call.input.includes('Mutated asynchronous reader alias'));
    assert.ok(!call.input.includes('Local alias is not live GitHub feedback'));
    return run(call);
  };
  assert.equal((await processCloudReview(f.options)).status, 'published');
});

test('an unexpected returned claim transition cannot authorize inference using an older specification', async () => {
  const f = fixture(),
    claim = f.options.handoff.claim;
  f.options.handoff.claim = async (...args) => {
    const returned = await claim(...args);
    returned.plan.analysis = 'Unexpected native claim source revision.';
    return returned;
  };
  const result = await processCloudReview(f.options);
  assert.equal(result.status, 'preclaim-source-changed');
  assert.equal(
    result.claimed,
    true,
    'Unexpected native reservation is preserved for authorized recovery',
  );
  assert.ok(!f.calls.includes('model') && !f.calls.includes('submit'));
  assert.ok(!f.calls.some((call) => call.startsWith('fail:')));
});
test('invalid report spends its own claim, notifies recovery and never retries automatically', async () => {
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
    'wake',
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
  const result = await processCloudReview(f.options);
  assert.equal(result.status, 'publication-uncertain');
  assert.deepEqual(result.report, approved);
  assert.equal(
    result.reportSha256,
    createHash('sha256').update(JSON.stringify(approved)).digest('hex'),
  );
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

test('probe qualifies only one explicit Opus profile, ignoring internal models and clamping the known context maximum', () => {
  assert.deepEqual(
    qualifiedModelProfile({
      'claude-haiku-4-5': { contextWindow: 999999999, maxOutputTokens: 64000 },
      [profile.model]: { contextWindow: 1048576, maxOutputTokens: 64000 },
    }),
    profile,
  );
  for (const usage of [
    undefined,
    {},
    { [profile.model]: {} },
    { [profile.model]: { ...profile, contextWindow: 200000 } },
    { [profile.model]: { ...profile, maxOutputTokens: undefined } },
    { [profile.model]: profile, 'claude-opus-4-6': profile },
    { 'claude-opus-4-7;echo': profile },
  ])
    assert.throws(() => qualifiedModelProfile(usage));
});

test('numeric Opus version/date IDs normalize an exact optional 1M tag before inference', () => {
  for (const model of [
    'claude-opus-4-7',
    'claude-opus-4-20250514',
    'claude-opus-4-1-20250805',
    'claude-opus-5-5',
  ]) {
    for (const suffix of ['', '[1m]']) {
      const resolved = qualifiedModelProfile({ [`${model}${suffix}`]: profile });
      assert.deepEqual(resolved, { ...profile, model });
      const prepared = prepareCloudInference({
        packet: { subject_sha: sha },
        sha,
        profile: { ...profile, model: `${model}${suffix}` },
      });
      assert.equal(prepared.capacity.model, model);
      assert.equal(prepared.args[prepared.args.indexOf('--model') + 1], `${model}[1m]`);
    }
  }
});

test('base and tagged Opus aliases remain ambiguous and malformed IDs never qualify', () => {
  for (const modelUsage of [
    { [profile.model]: profile, [`${profile.model}[1m]`]: profile },
    { 'claude-opus-5-5[1m]': profile, 'claude-opus-4-7[1m]': profile },
  ])
    assert.throws(() => qualifiedModelProfile(modelUsage), /unique resolved Opus/);
  for (const model of [
    'claude-opus-5-5[200k]',
    'claude-opus-5-5[1m][1m]',
    'claude-opus-5-5[1M]',
    'claude-opus-5-5[1m]-extra',
    'claude-opus-5-5\n',
    'claude-opus-5-5[1m]\n',
    'claude-opus-5-5/extra',
    'claude-opus-sk-ant-oat-token',
    'claude-opus-sk-ant-oat01-synthetic',
  ])
    assert.throws(() => qualifiedModelProfile({ [model]: profile }), /unique resolved Opus/);
});

test('tagged profiles retain explicit context/output bounds and the 1M inference clamp', () => {
  const model = 'claude-opus-5-5[1m]',
    observed = { contextWindow: 1000000, maxOutputTokens: 128000 };
  for (const contextWindow of [1000000, 1048576, 2000000])
    assert.deepEqual(qualifiedModelProfile({ [model]: { ...observed, contextWindow } }), {
      model: 'claude-opus-5-5',
      ...observed,
    });
  for (const contextWindow of [200000, 999999, 2000001, 1000000.5, undefined])
    assert.throws(() => qualifiedModelProfile({ [model]: { ...observed, contextWindow } }));
  for (const maxOutputTokens of [0, -1, 1000000, 1000001, 128000.5, undefined])
    assert.throws(() => qualifiedModelProfile({ [model]: { ...observed, maxOutputTokens } }));
  const clamped = qualifiedModelProfile({
    [model]: { contextWindow: 2000000, maxOutputTokens: 1000000 },
  });
  assert.throws(
    () => prepareCloudInference({ packet: {}, sha, profile: clamped }),
    /Qualified output capacity/,
  );
  assert.throws(
    () =>
      prepareCloudInference({
        packet: { source: 'x'.repeat(40000) },
        sha,
        profile: { model, contextWindow: 1000000, maxOutputTokens: 900000 },
      }),
    /qualified context capacity/,
  );
});

test('actual tagged modelUsage response shape passes the genuine probe before one native claim', async () => {
  const f = fixture(),
    observed = { contextWindow: 1000000, maxOutputTokens: 128000 };
  assert.deepEqual(qualifiedModelProfile({ 'claude-opus-5-5[1m]': observed }), {
    model: 'claude-opus-5-5',
    ...observed,
  });
  f.options.probe = probeCloudClaude;
  f.options.run = async (call) => {
    assert.equal(call.command, 'claude');
    assert.equal(call.envMode, 'review');
    if (call.args.includes('--version')) {
      f.calls.push('version');
      return { ok: true, stdout: '2.1.301 (Claude Code)' };
    }
    const isProbe = call.input.startsWith('Authentication probe only.');
    f.calls.push(isProbe ? 'probe' : 'model');
    assert.equal(
      call.args[call.args.indexOf('--model') + 1],
      isProbe ? 'opus[1m]' : 'claude-opus-5-5[1m]',
    );
    return {
      ok: true,
      stdout: JSON.stringify({
        type: 'result',
        subtype: 'success',
        is_error: false,
        structured_output: isProbe ? { status: 'ok' } : approved,
        modelUsage: { 'claude-opus-5-5[1m]': observed },
      }),
    };
  };
  const result = await processCloudReview(f.options);
  assert.equal(result.status, 'published');
  assert.deepEqual(f.calls, [
    'retrieve',
    'version',
    'probe',
    'claim',
    'model',
    'submit',
    'reconcile',
    'project',
    'wake',
  ]);
  assert.equal(result.capacity.model, 'claude-opus-5-5');
  assert.equal(result.capacity.contextWindow, observed.contextWindow);
  assert.equal(result.capacity.maxOutputTokens, observed.maxOutputTokens);
});

test('a real successful probe envelope without context metadata still refuses qualification', async () => {
  const env = {
    CLAUDE_REVIEW_AUTH_MODE: 'subscription',
    CLAUDE_CODE_OAUTH_TOKEN: 'synthetic-oauth',
  };
  const run = async (call) =>
    call.args.includes('--version')
      ? { ok: true, stdout: '2.1.301 (Claude Code)' }
      : { ok: true, stdout: JSON.stringify({ structured_output: { status: 'ok' } }) };
  await assert.rejects(probeCloudClaude({ env, run, cwd: '/empty' }));
});

test('missing/small/ambiguous probe context and oversized complete inputs never claim or invoke review', async () => {
  for (const missing of [
    undefined,
    {},
    { ...profile, contextWindow: 200000 },
    { ...profile, maxOutputTokens: undefined },
  ]) {
    const f = fixture();
    f.options.probe = async () => ({ profile: missing });
    const result = await processCloudReview(f.options);
    assert.equal(result.status, 'capability-blocked');
    assert.equal(f.subject.reviews.length, 0);
    assert.ok(!f.calls.includes('claim') && !f.calls.includes('model'));
  }
  const f = fixture();
  f.options.retrieve = async () => ({
    packet: { source: 'x'.repeat(701 * 1024), feedback: clone(feedback) },
    tracked: new Set(),
  });
  const result = await processCloudReview(f.options);
  assert.equal(result.status, 'queue-blocked');
  assert.equal(result.blockedSubjects[0].status, 'capacity-unavailable');
  assert.equal(f.subject.reviews.length, 0);
  assert.ok(!f.calls.includes('claim') && !f.calls.includes('model'));
});

test('the exact serialized Unicode/escaped prompt and schema fit the qualified profile before its pinned model call', async () => {
  const f = fixture(),
    packet = { source: '漢字😀\\\n"\t'.repeat(1000), feedback: clone(feedback) };
  const prepared = prepareCloudInference({ packet, sha, profile });
  assert.equal(prepared.capacity.inputBytes, Buffer.byteLength(prepared.input));
  assert.equal(
    prepared.capacity.schemaBytes,
    Buffer.byteLength(prepared.args[prepared.args.indexOf('--json-schema') + 1]),
  );
  assert.equal(
    prepared.capacity.requiredTokensUpperBound,
    prepared.capacity.inputBytes + prepared.capacity.schemaBytes + 65536 + profile.maxOutputTokens,
  );
  assert.equal(prepared.args[prepared.args.indexOf('--model') + 1], `${profile.model}[1m]`);
  assert.ok(cloudClaudeArgs({}).includes('opus[1m]'));
  f.options.retrieve = async () => ({ packet, tracked: new Set(['src/file.mjs']) });
  const baseRun = f.options.run;
  f.options.run = async (call) => {
    assert.equal(call.input, prepared.input);
    assert.deepEqual(call.args, prepared.args);
    return baseRun(call);
  };
  assert.equal((await processCloudReview(f.options)).status, 'published');
  const crowded = fixture();
  crowded.options.probe = async () => ({ profile: { ...profile, maxOutputTokens: 900000 } });
  crowded.options.retrieve = async () => ({
    packet: { source: 'x'.repeat(40000), feedback: clone(feedback) },
    tracked: new Set(),
  });
  assert.equal((await processCloudReview(crowded.options)).status, 'queue-blocked');
  assert.equal(crowded.subject.reviews.length, 0);
});

test('every publication stage retains the full sanitized valid report and digest without retrying or failing a claim', async () => {
  for (const stage of ['submit', 'reconcile', 'projection']) {
    const f = fixture();
    if (stage === 'submit')
      f.options.handoff.submit = async () => {
        throw new Error('Unknown POST');
      };
    if (stage === 'reconcile')
      f.options.handoff.reconcilePR = async () => {
        throw new Error('Partial publication');
      };
    if (stage === 'projection')
      f.options.communication.publishState = async () => {
        throw new Error('Projection unavailable');
      };
    const result = await processCloudReview(f.options);
    assert.equal(result.status, 'publication-uncertain');
    assert.equal(result.publicationStage, stage);
    assert.deepEqual(result.report, approved);
    assert.equal(
      result.reportSha256,
      createHash('sha256').update(JSON.stringify(result.report)).digest('hex'),
    );
    assert.ok(!f.calls.some((call) => call.startsWith('fail:')));
    assert.equal((await processCloudReview(f.options)).status, 'empty');
  }
});

test('retained ownership-change report is sanitized and hashed without exposing clinical/contact fields', async () => {
  const f = fixture();
  f.options.run = async () =>
    envelope({
      ...approved,
      summary: 'Review fixture patientName=Alice Example; contact operator@example.invalid',
    });
  f.options.handoff.submit = async () => {
    throw Object.assign(new Error('Changed claim'), { code: 'review-ownership-changed' });
  };
  const result = await processCloudReview(f.options);
  assert.equal(result.status, 'ownership-changed');
  assert.ok(result.report.summary.includes('[REDACTED_'));
  assert.ok(!JSON.stringify(result).includes('Alice Example'));
  assert.ok(!JSON.stringify(result).includes('operator@example.invalid'));
  assert.equal(
    result.reportSha256,
    createHash('sha256').update(JSON.stringify(result.report)).digest('hex'),
  );
  assert.ok(!f.calls.some((call) => call.startsWith('fail:')));
});

test('a post-claim timeout spends one round, notifies recovery and never mints a retry', async () => {
  const f = fixture();
  f.options.run = async () => ({
    ok: false,
    error: 'timeout',
    stdout: 'UNTRUSTED_PROVIDER_OUTPUT',
  });
  const result = await processCloudReview(f.options);
  assert.equal(result.status, 'provider-failed');
  assert.equal(result.failureCode, 'claude-timeout');
  assert.equal(result.recoveryNotified, true);
  assert.equal(f.subject.reviews.length, 1);
  assert.equal(f.subject.reviews[0].status, 'failed');
  assert.equal(result.report, undefined);
  assert.ok(!JSON.stringify(result).includes('UNTRUSTED_PROVIDER_OUTPUT'));
  const count = f.calls.length;
  assert.equal((await processCloudReview(f.options)).status, 'empty');
  assert.equal(f.calls.length, count);
});

test('workflow token is read-only and the precredential CLI installation uses the complete committed integrity lock', async () => {
  const workflow = await readFile(
    new URL('../../../.github/workflows/claude-cloud-review.yml', import.meta.url),
    'utf8',
  );
  assert.equal(workflow.split('permissions:\n')[1].split('\njobs:')[0].trim(), 'contents: read');
  assert.ok(workflow.includes('npm ci --prefix "$RUNNER_TEMP/claude-cloud-tools"'));
  assert.ok(workflow.includes('scripts/automation/claude-cloud-tools/package-lock.json'));
  assert.ok(!workflow.includes('npm install'));
  assert.ok(workflow.indexOf('npm ci') < workflow.indexOf('CLAUDE_CODE_OAUTH_TOKEN:'));
  const packageJSON = JSON.parse(
    await readFile(
      new URL('../../../scripts/automation/claude-cloud-tools/package.json', import.meta.url),
      'utf8',
    ),
  );
  const lock = JSON.parse(
    await readFile(
      new URL('../../../scripts/automation/claude-cloud-tools/package-lock.json', import.meta.url),
      'utf8',
    ),
  );
  assert.deepEqual(lock.packages[''].dependencies, packageJSON.dependencies);
  assert.equal(lock.packages['node_modules/@anthropic-ai/claude-code'].version, '2.1.301');
  assert.equal(
    lock.packages['node_modules/@anthropic-ai/claude-code-linux-x64'].version,
    '2.1.301',
  );
  for (const [name, dependency] of Object.entries(lock.packages)) {
    if (!name) continue;
    assert.equal(dependency.version, '2.1.301');
    assert.match(dependency.integrity, /^sha512-[A-Za-z0-9+/]+=*$/);
    assert.ok(
      dependency.resolved.startsWith('https://registry.npmjs.org/@anthropic-ai/claude-code'),
    );
  }
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
    return {
      packet: { subject_sha: sha, feedback: clone(feedback) },
      tracked: new Set(['src/file.mjs']),
    };
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
