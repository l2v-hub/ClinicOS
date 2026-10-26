// Independent Source4 QA. Synthetic inputs are not provider findings or approval evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fixture, revision, sha } from './native-transport-fixture.mjs';
import { processCloudReview, prepareCloudInference } from '/tmp/clinicos-permanent-semantic-author4/agent-team/src/bug-pipeline/cloud-review-worker.mjs';
import { classifyReviewResult, reviewRunnerThrewDiagnostic } from '/tmp/clinicos-permanent-semantic-author4/agent-team/src/bug-pipeline/review-validation-diagnostic.mjs';
import { validateReview, reviewGenerationContract, reviewSchema } from '/tmp/clinicos-permanent-semantic-author4/scripts/quality-gate/claude-bug-review.mjs';
import { validateAgainstSchema } from '/tmp/clinicos-permanent-semantic-author4/agent-team/src/core/json-schema.mjs';
import { attemptLimit } from '/tmp/clinicos-permanent-semantic-author4/agent-team/src/bug-pipeline/attempt-budget.mjs';

const marker = 'QA4_SYNTHETIC_PRIVATE_CONTENT';
const trackedPath = 'agent-team/tests/example.mjs';
const tracked = new Set([trackedPath]);
const profile = { model: 'claude-opus-4-7', contextWindow: 1000000, maxOutputTokens: 64000 };
const finding = (severity = 'low') => ({ severity, file: trackedPath, line: 1, problem: marker,
  requested_change: 'QA4 preserve the required behavior', test_expectation: 'QA4 verify regression' });
const report = (verdict = 'approved', findings = []) => ({ subject_sha: sha, verdict, summary: marker, findings });
const envelope = value => ({ ok: true, code: 0, stdout: JSON.stringify({ structured_output: value }), stderr: '' });
const hash = value => createHash('sha256').update(value).digest('hex');
const keys = Object.keys(reviewRunnerThrewDiagnostic()).sort();
function finite(info) {
  assert.deepEqual(Object.keys(info).sort(), keys);
  assert.ok(Buffer.byteLength(JSON.stringify(info)) < 1500);
  assert.doesNotMatch(JSON.stringify(info), /QA4_SYNTHETIC_PRIVATE_CONTENT|agent-team\/tests\/example|authorization|stack|message|provider-secret/i);
  for (const key of ['capturedSanitizedStdoutSha256', 'capturedSanitizedStderrSha256', 'reportSha256'])
    assert.ok(info[key] === null || /^[a-f0-9]{64}$/.test(info[key]));
  assert.ok(info.exitCode === null || (Number.isInteger(info.exitCode) && info.exitCode >= 0 && info.exitCode <= 255));
}
async function native(run, diagnostic = () => {}, options = {}) {
  const f = fixture();
  await f.controller.adopt(f.manifest);
  await f.controller.request(81);
  const before = structuredClone(f.remote().standaloneReviews[0]);
  const observed = [];
  let calls = 0;
  const value = await processCloudReview({ github: f.github, handoff: {}, standalone: f.controller,
    communication: {}, cwd: '/qa4-no-worktree', env: {},
    retrieve: async () => ({ packet: { subject_sha: sha, feedback: await f.github.reviewFeedback(81) }, tracked }),
    probe: async () => ({ profile }), wake: async () => {},
    onValidationDiagnostic: async info => { observed.push(structuredClone(info)); return diagnostic(info); },
    run: async request => { calls++; assert.equal(request.command, 'claude'); assert.equal(request.envMode, 'review'); return run(request, f); },
    ...options,
  });
  assert.equal(calls, 1);
  assert.equal(observed.length, 1);
  finite(observed[0]);
  assert.deepEqual(value.validationDiagnostic, observed[0]);
  const after = f.remote().standaloneReviews[0];
  assert.deepEqual(after.implementation, before.implementation);
  assert.deepEqual(after.packet, before.packet);
  assert.deepEqual(after.sourceManifest, before.sourceManifest);
  assert.equal(after.reviews.length, 1);
  assert.equal(after.reviewLedger.rounds.length, 1);
  return { f, value, before, after, observed };
}

for (const severity of ['low', 'medium', 'high', 'critical']) {
  test(`native contradiction spends one round for approved plus ${severity}; callback failure cannot rescue it`, async () => {
    const captured = envelope(report('approved', [finding(severity)]));
    const frozen = JSON.stringify(captured);
    const { f, value, after } = await native(() => captured, () => { throw new Error(marker); });
    assert.equal(JSON.stringify(captured), frozen);
    assert.equal(value.status, 'provider-failed');
    assert.equal(value.failureCode, 'review-validation-failed');
    assert.equal(value.report, undefined);
    assert.equal(value.validationDiagnostic.category, 'contradiction');
    assert.equal(value.validationDiagnostic.schemaAccepted, true);
    assert.equal(value.validationDiagnostic.nativeAccepted, false);
    assert.equal(value.validationDiagnostic.findingCount, 1);
    assert.equal(after.reviews[0].status, 'failed');
    assert.equal(after.reviewLedger.rounds[0].verdict, 'failed');
    assert.equal(after.externalReview.status, 'failed');
    assert.equal(f.published.length, 0);
    assert.doesNotMatch(JSON.stringify(value), /QA4_SYNTHETIC_PRIVATE_CONTENT/);
  });
}

test('native proven three-finding shape remains invalid without pretending to reconstruct real discarded findings', async () => {
  const { value, after } = await native(() => envelope(report('approved', [finding(), finding(), finding()])));
  assert.equal(value.status, 'provider-failed');
  assert.equal(value.validationDiagnostic.category, 'contradiction');
  assert.equal(value.validationDiagnostic.findingCount, 3);
  assert.equal(after.reviews.length, 1);
  assert.equal(value.reportSha256, undefined);
});

for (const [label, typed] of [
  ['blocked empty with evidence unavailable', report('blocked')],
  ['blocked with actionable low', report('blocked', [finding()])],
  ['changes requested with actionable low', report('changes-requested', [finding()])],
  ['approved empty', report('approved')],
]) test(`native valid ${label} preserves exact report and callback mutation is isolated`, async () => {
  const captured = envelope(typed);
  const { f, value, after } = await native(() => captured, info => {
    info.verdict = 'approved'; info.category = marker; info.extra = marker;
    throw new Error(marker);
  });
  assert.equal(value.status, 'published');
  assert.deepEqual(value.report, typed);
  assert.equal(value.verdict, typed.verdict);
  assert.equal(after.reviews[0].status, typed.verdict);
  assert.equal(after.reviewLedger.rounds[0].verdict, typed.verdict);
  assert.equal(value.validationDiagnostic.category, 'valid');
  assert.equal(f.published.length, 1);
  assert.equal(value.reportSha256, hash(JSON.stringify(typed)));
});

for (const [label, typed, category] of [
  ['changes requested empty', report('changes-requested'), 'contradiction'],
  ['whitespace-only summary', { ...report(), summary: '\t\n ' }, 'schema'],
  ['stale source SHA', { ...report(), subject_sha: 'b'.repeat(40) }, 'stale-or-shape'],
  ['unknown output field', { ...report(), private: marker }, 'schema'],
  ['traversal path', report('changes-requested', [{ ...finding(), file: '../example.mjs' }]), 'location'],
  ['zero line', report('changes-requested', [{ ...finding(), line: 0 }]), 'location'],
  ['101 findings', report('changes-requested', Array.from({ length: 101 }, () => finding())), 'stale-or-shape'],
  ['credential shape', { ...report(), summary: 'Authorization: provider-secret' }, 'unsafe'],
  ['post communication growth', { ...report(), summary: '@a'.repeat(40000) }, 'post-communication'],
]) test(`native validation rejects ${label} with finite category ${category}`, async () => {
  const { f, value, after } = await native(() => envelope(typed));
  assert.equal(value.status, 'provider-failed');
  assert.equal(value.validationDiagnostic.category, category);
  assert.equal(value.report, undefined);
  assert.equal(after.reviews[0].status, 'failed');
  assert.equal(f.published.length, 0);
});

test('execution failure stays authoritative even with semantically valid structured output', async () => {
  const { value, after } = await native(() => ({ ...envelope(report()), ok: false, code: 7, stderr: marker, error: marker }));
  assert.equal(value.status, 'provider-failed');
  assert.equal(value.failureCode, 'claude-nonzero-exit');
  assert.equal(value.validationDiagnostic.category, 'valid');
  assert.equal(value.validationDiagnostic.nativeClaudeFailure, 'claude-nonzero-exit');
  assert.equal(value.validationDiagnostic.runnerError, 'other');
  assert.equal(value.report, undefined);
  assert.equal(after.reviews[0].status, 'failed');
});

test('runner throw remains spent and callback throw cannot replace the finite receipt', async () => {
  const { value, after } = await native(() => { throw new Error(marker); }, async () => { throw new Error('callback-secret'); });
  assert.equal(value.status, 'provider-failed');
  assert.equal(value.validationDiagnostic.runnerThrew, true);
  assert.equal(value.validationDiagnostic.capturedSanitizedStdoutSha256, null);
  assert.equal(after.reviews[0].status, 'failed');
  assert.doesNotMatch(JSON.stringify(value), /QA4_SYNTHETIC|callback-secret/);
});

test('native controller exception identity survives diagnostic callback exception', async () => {
  const original = new Error('QA4 native controller sentinel');
  let delivered = 0;
  await assert.rejects(native((_request, f) => {
    f.controller.failOwnedClaim = async () => { throw original; };
    return envelope(report('approved', [finding()]));
  }, async () => { delivered++; throw new Error(marker); }), e => e === original);
  assert.equal(delivered, 1);
});

test('validated report survives uncertain submit while callback cannot mask publication outcome', async () => {
  const typed = report('changes-requested', [finding()]);
  const { value, after } = await native((_request, f) => {
    f.controller.submit = async () => { throw new Error(marker); };
    return envelope(typed);
  }, () => { throw new Error(marker); });
  assert.equal(value.status, 'publication-uncertain');
  assert.equal(value.publicationStage, 'submit');
  assert.deepEqual(value.report, typed);
  assert.equal(after.reviews[0].status, 'running');
  assert.equal(after.reviewLedger.rounds[0].verdict, 'running');
});

test('privacy allowlist withstands malformed envelopes, hostile getters, unsafe codes and multibyte text', () => {
  for (const result of [null, {}, { stdout: '{' + marker, stderr: marker, code: -1 },
    { stdout: JSON.stringify({ structured_output: null }), stderr: marker, code: 256, error: marker },
    { stdout: JSON.stringify({ structured_output: { ...report(), summary: 'é🧪' } }), stderr: 'é🧪', code: 0, ok: true },
    { get stdout() { throw new Error(marker); } },
    { stdout: '', get error() { throw new Error(marker); } },
  ]) {
    const info = classifyReviewResult(result, sha, tracked);
    finite(info);
    if (!info.diagnosticFailed) {
      if (typeof result?.stdout === 'string') {
        assert.equal(info.capturedSanitizedStdoutStringBytes, Buffer.byteLength(result.stdout));
        assert.equal(info.capturedSanitizedStdoutSha256, hash(result.stdout));
      }
    }
  }
});

test('supported schema hygiene is not mistaken for semantic or context enforcement', () => {
  for (const typed of [report('approved', [finding()]), report('changes-requested'), report('changes-requested', [{ ...finding(), line: 0 }])]) {
    validateAgainstSchema(typed, reviewSchema);
    assert.throws(() => validateReview(typed, sha, tracked));
  }
  const blocked = report('blocked');
  assert.equal(validateReview(blocked, sha, tracked), blocked);
  for (const pattern of [/ANY actionable finding, including severity low/, /Empty findings must never force approval/, /Never suppress, drop or relabel/, /blocked, which may have zero or more findings/])
    assert.match(reviewGenerationContract, pattern);
  const input = prepareCloudInference({ packet: { subject_sha: sha, prior: marker }, sha, profile }).input;
  assert.ok(input.startsWith(reviewGenerationContract + '\n'));
  assert.ok(input.indexOf('UNTRUSTED DATA') < input.indexOf(marker));
  assert.match(input, /No tools, execution, writes, external access/);
});

test('native adoption preserves whole multiple failed-handoff histories and distinct consumed grants without refund or authority', async () => {
  const f = fixture();
  await f.controller.adopt(f.manifest);
  await f.controller.request(81);
  for (let i = 0; i < 2; i++) {
    const claim = await f.controller.claim(81);
    await f.controller.failOwnedClaim(81, claim, 'review-validation-failed');
    await f.controller.request(81, { recoverFailed: true, authorizationRef: 'test:session' });
  }
  await f.controller.extendBudget(81, { kind: 'reviews', limit: 5, reason: 'QA4 synthetic preserved consumed grant', authorizationRef: 'test:session' });
  const previous = structuredClone(f.remote().standaloneReviews[0]);
  const recoveries = previous.reviewHandoffHistory.filter(entry => entry.recovery);
  assert.equal(recoveries.length, 2);
  assert.equal(new Set(recoveries.map(entry => entry.authorization.consumptionNonce)).size, 2);
  const serializedHistory = JSON.stringify(previous.reviewHandoffHistory);
  for (const key of ['reviews', 'reviewLedger', 'reviewReports']) f.manifest[key] = structuredClone(previous[key]);
  const next = revision(f);
  const writes = f.writes.length, comments = f.comments.length;
  const adopted = await f.controller.adopt(next);
  assert.equal(f.writes.length, writes + 1);
  assert.equal(f.comments.length, comments);
  assert.equal(f.published.length, 0);
  for (const key of ['reviewHandoffHistory', 'recoveryHistory', 'budgetExtensions', 'reviews', 'reviewLedger', 'reviewReports', 'implementation'])
    assert.equal(JSON.stringify(adopted[key]), JSON.stringify(previous[key]), key);
  assert.equal(JSON.stringify(f.remote().standaloneReviews[0].reviewHandoffHistory), serializedHistory);
  assert.equal(attemptLimit(adopted, 'reviews'), 5);
  assert.equal(adopted.reviews.length, 2);
  assert.ok(adopted.reviews.every(r => r.status === 'failed'));
  assert.equal(adopted.externalReview, undefined);
  assert.equal(adopted.approvedSha, undefined);
  await f.controller.verify(adopted);
  adopted.reviewHandoffHistory.find(entry => entry.recovery).previous.status = 'QA4-mutated-return-value';
  assert.equal(JSON.stringify(f.remote().standaloneReviews[0].reviewHandoffHistory), serializedHistory);
});
