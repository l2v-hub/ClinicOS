import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  classifyReviewResult,
  reviewRunnerThrewDiagnostic,
} from '../../src/bug-pipeline/review-validation-diagnostic.mjs';
import { validateReview, reviewSchema } from '../../../scripts/quality-gate/claude-bug-review.mjs';
import { validateAgainstSchema } from '../../src/core/json-schema.mjs';

// TEST fixtures only. No provider calls, external report or approval evidence.
const sha = 'a'.repeat(40);
const marker = 'TEST_MODEL_TEXT_MUST_NEVER_ENTER_DIAGNOSTICS';
const file = 'src/TEST-private-location.mjs';
const tracked = new Set([file]);
const finding = () => ({
  severity: 'low',
  file,
  line: 1,
  problem: marker,
  requested_change: 'TEST correct behavior',
  test_expectation: 'TEST check behavior',
});
const report = () => ({
  subject_sha: sha,
  verdict: 'changes-requested',
  summary: marker,
  findings: [finding()],
});
const envelope = (value) => ({
  ok: true,
  code: 0,
  stdout: JSON.stringify({ structured_output: value }),
  stderr: '',
});

for (const [name, category, make] of [
  [
    'approved with three genuine low findings',
    'contradiction',
    () => ({ ...report(), verdict: 'approved', findings: [finding(), finding(), finding()] }),
  ],
  ['changes requested without findings', 'contradiction', () => ({ ...report(), findings: [] })],
  ['stale exact SHA', 'stale-or-shape', () => ({ ...report(), subject_sha: 'b'.repeat(40) })],
  [
    'over 100 findings',
    'stale-or-shape',
    () => ({ ...report(), findings: Array.from({ length: 101 }, finding) }),
  ],
  [
    'untracked file',
    'location',
    () => ({ ...report(), findings: [{ ...finding(), file: 'src/TEST-untracked.mjs' }] }),
  ],
  ['nonpositive line', 'location', () => ({ ...report(), findings: [{ ...finding(), line: 0 }] })],
  [
    'whitespace-only field',
    'schema',
    () => ({ ...report(), findings: [{ ...finding(), problem: '   ' }] }),
  ],
  ['blank summary', 'schema', () => ({ ...report(), summary: '' })],
  ['unknown report property', 'schema', () => ({ ...report(), extra: marker })],
  [
    'credential-shaped content',
    'unsafe',
    () => ({ ...report(), summary: 'Authorization: TEST_ONLY_NON_CREDENTIAL' }),
  ],
  [
    'post-communication growth',
    'post-communication',
    () => ({ ...report(), summary: '@a'.repeat(40000) }),
  ],
]) {
  test(`finite classification: ${name}`, () => {
    const typed = make();
    const captured = envelope(typed);
    const before = JSON.stringify(captured);
    const info = classifyReviewResult(captured, sha, tracked);
    assert.equal(info.category, category);
    assert.equal(info.runnerThrew, false);
    assert.equal(info.diagnosticFailed, false);
    assert.equal(info.findingCount, typed.findings.length);
    assert.equal(info.verdict, typed.verdict);
    assert.equal(info.nativeClaudeFailure, null);
    assert.equal(JSON.stringify(captured), before);
    assert.doesNotMatch(
      JSON.stringify(info),
      /TEST_MODEL_TEXT|TEST-private-location|TEST-untracked|TEST_ONLY_NON_CREDENTIAL|@a/,
    );
    if (category === 'post-communication') {
      assert.equal(validateReview(typed, sha, tracked), typed);
      assert.equal(info.nativeAccepted, true);
      assert.equal(info.communicationAccepted, false);
    } else assert.throws(() => validateReview(typed, sha, tracked));
  });
}

test('valid approved, actionable changes and blocked-empty are accepted without mutation', () => {
  for (const typed of [
    report(),
    { ...report(), verdict: 'approved', findings: [] },
    { ...report(), verdict: 'blocked', findings: [] },
  ]) {
    const captured = envelope(typed);
    const before = JSON.stringify(captured);
    const info = classifyReviewResult(captured, sha, tracked);
    assert.equal(info.category, 'valid');
    assert.equal(info.schemaAccepted, true);
    assert.equal(info.nativeAccepted, true);
    assert.equal(info.communicationAccepted, true);
    assert.equal(
      info.reportSha256,
      createHash('sha256').update(JSON.stringify(typed)).digest('hex'),
    );
    assert.equal(validateReview(typed, sha, tracked), typed);
    assert.equal(JSON.stringify(captured), before);
  }
});

test('supported schema patterns reject blank text; manual semantic limits remain authoritative', () => {
  assert.throws(
    () => validateAgainstSchema({ ...report(), summary: ' \t ' }, reviewSchema),
    /pattern mismatch/,
  );
  const tooMany = { ...report(), findings: Array.from({ length: 101 }, finding) };
  validateAgainstSchema(tooMany, reviewSchema);
  assert.throws(() => validateReview(tooMany, sha, tracked), /invalid or stale/);
  const zeroLine = { ...report(), findings: [{ ...finding(), line: 0 }] };
  validateAgainstSchema(zeroLine, reviewSchema);
  assert.throws(() => validateReview(zeroLine, sha, tracked), /finding location/);
  const contradictory = { ...report(), verdict: 'approved' };
  validateAgainstSchema(contradictory, reviewSchema);
  assert.throws(() => validateReview(contradictory, sha, tracked), /contradicts/);
});

test('envelope failures and runner errors retain only finite metadata and sanitized-string hashes', () => {
  const cases = [
    [{ ok: true, code: 0, stdout: '{TEST_MODEL_TEXT', stderr: marker }, 'claude-invalid-json'],
    [
      { ok: true, code: 0, stdout: JSON.stringify({ result: marker }), stderr: marker },
      'claude-missing-structured-report',
    ],
    [{ ok: false, code: 999, error: marker, stdout: '', stderr: marker }, 'claude-nonzero-exit'],
    [{ ok: false, code: null, error: 'timeout', stdout: '', stderr: '' }, 'claude-timeout'],
    [
      { ok: false, code: null, error: 'output-limit', stdout: '', stderr: '' },
      'claude-output-limit',
    ],
  ];
  for (const [captured, failure] of cases) {
    const info = classifyReviewResult(captured, sha, tracked);
    assert.equal(info.category, 'envelope-json');
    assert.equal(info.nativeClaudeFailure, failure);
    assert.equal(info.capturedSanitizedStdoutStringBytes, Buffer.byteLength(captured.stdout));
    assert.equal(
      info.capturedSanitizedStdoutSha256,
      createHash('sha256').update(captured.stdout).digest('hex'),
    );
    assert.equal(info.capturedSanitizedStderrStringBytes, Buffer.byteLength(captured.stderr));
    assert.equal(
      info.capturedSanitizedStderrSha256,
      createHash('sha256').update(captured.stderr).digest('hex'),
    );
    assert.equal(info.exitCode, captured.code === 0 ? 0 : null);
    assert.ok([null, 'timeout', 'output-limit', 'other'].includes(info.runnerError));
    assert.ok(!JSON.stringify(info).includes(marker));
    assert.ok(Buffer.byteLength(JSON.stringify(info)) < 1500);
  }
  for (const shape of [null, [], true, marker])
    assert.equal(classifyReviewResult(envelope(shape), sha, tracked).category, 'schema');
});

test('diagnostic exceptions and runner throws expose only finite flags', () => {
  const info = classifyReviewResult(
    {
      get stdout() {
        throw new Error(marker);
      },
    },
    sha,
    tracked,
  );
  assert.equal(info.diagnosticFailed, true);
  assert.equal(info.category, 'other');
  const thrown = reviewRunnerThrewDiagnostic();
  assert.equal(thrown.runnerThrew, true);
  assert.equal(thrown.category, 'other');
  assert.equal(thrown.capturedSanitizedStdoutStringBytes, null);
  assert.doesNotMatch(JSON.stringify([info, thrown]), /TEST_MODEL_TEXT|"message"|"stack"/);
});
