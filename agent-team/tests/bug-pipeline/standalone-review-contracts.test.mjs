import test from 'node:test';
import assert from 'node:assert/strict';
import { sha256, safeText } from '../../src/bug-pipeline/contracts.mjs';
import {
  STANDALONE_REPO,
  validateStandaloneState,
  validateStandaloneSubject,
} from '../../src/bug-pipeline/standalone-review.mjs';
import {
  RESULT_RESERVATION_BYTES,
  assertSubjectResultCapacity,
  pendingResultBytes,
} from '../../src/bug-pipeline/github.mjs';

const hex = (n) => n.toString(16).padStart(40, '0');
const digest = (value) => sha256(value);

function subject(overrides = {}) {
  const packetPath = 'artifacts/task-validation/standalone-pr-73';
  const packetFiles = {
    'task-contract.md': digest('contract'),
    'analysis.md': digest('analysis'),
    'implementation-plan.md': digest('plan'),
    'validation-report.md': digest('validation'),
    'imported-history.json': digest('history'),
    'evidence/run-1.txt': digest('run 1'),
    'evidence/run-2.txt': digest('run 2'),
    'evidence/run-3.txt': digest('run 3'),
  };
  const reviews = [{ round: 1, status: 'approved', subjectSha: hex(1) }];
  const report = JSON.stringify({
    subject_sha: hex(1),
    verdict: 'approved',
    summary: 'Inspected frozen evidence.',
    findings: [],
  });
  const value = {
    kind: 'standalone-pr-review',
    schemaVersion: 1,
    repository: STANDALONE_REPO,
    id: 'standalone-pr-73',
    pr: { number: 73, url: `https://github.com/${STANDALONE_REPO}/pull/73` },
    sha: hex(3),
    baseSha: hex(2),
    baseRef: 'main',
    branch: 'feature/small-review',
    phase: 'waiting-review',
    issues: [41],
    packet: { path: packetPath, files: packetFiles },
    sourceManifest: [
      {
        path: 'frontend/src/reviewed.ts',
        blob: hex(3),
        mode: '100644',
        baseBlob: hex(4),
        baseMode: '100644',
      },
    ],
    implementation: [1, 2, 3].map((round) => ({
      round,
      status: 'passed',
      subjectSha: hex(round),
      evidence: `evidence/run-${round}.txt`,
    })),
    reviews,
    reviewLedger: {
      schema_version: 1,
      max_rounds: 4,
      rounds: [
        { round: 1, subject_sha: hex(1), verdict: 'approved', review_sha256: digest(report) },
      ],
    },
    reviewReports: { 'claude-review-1.json': report },
    adoption: {
      actor: 'reviewer',
      at: '2026-10-17T00:00:00.000Z',
      manifestSha256: digest('manifest'),
    },
  };
  return { ...value, ...structuredClone(overrides) };
}

test('accepts an imported standalone PR with three retained implementation rounds and actual PR identity', () => {
  const value = subject();
  assert.equal(validateStandaloneSubject(value), value);
  assert.equal(value.repository, 'l2v-hub/ClinicOS');
  assert.equal(value.pr.url, 'https://github.com/l2v-hub/ClinicOS/pull/73');
  assert.equal(value.implementation.length, 3);
});

test('large standalone metadata accommodates four independently bounded reports without weakening normal100KB sanitation', () => {
  const value = subject();
  value.sourceManifest = Array.from({ length: 430 }, (_, i) => ({
    path: `artifacts/task-validation/voice-synthetic-historical-packet-${i}/evidence/recorded-input-${'x'.repeat(30)}.json`,
    blob: hex(3),
    mode: '100644',
    baseBlob: null,
    baseMode: null,
  }));
  value.reviews = [];
  value.reviewLedger.rounds = [];
  value.reviewReports = {};
  for (let i = 1; i <= 4; i++) {
    const report = JSON.stringify({
      subject_sha: hex(i),
      verdict: 'approved',
      summary: 'Reviewed source and evidence. '.repeat(3000),
      findings: [],
    });
    assert.ok(report.length > 80000 && report.length < 100000);
    value.reviews.push({ round: i, status: 'approved', subjectSha: hex(i) });
    value.reviewLedger.rounds.push({
      round: i,
      subject_sha: hex(i),
      verdict: 'approved',
      review_sha256: sha256(report),
    });
    value.reviewReports[`claude-review-${i}.json`] = report;
  }
  assert.ok(JSON.stringify(value).length > 400000);
  assert.equal(validateStandaloneSubject(value), value);
  assert.throws(() => safeText('x'.repeat(100001)), /oversized/);
  value.reviewReports['claude-review-4.json'] = JSON.stringify({
    subject_sha: hex(4),
    verdict: 'approved',
    summary: 'postgresql://synthetic.invalid',
    findings: [],
  });
  value.reviewLedger.rounds[3].review_sha256 = sha256(value.reviewReports['claude-review-4.json']);
  assert.throws(() => validateStandaloneSubject(value), /unsafe/);
});

test('standalone fields, report schema and explicit aggregate remain bounded and secret-safe', () => {
  for (const change of [
    (v) => (v.reason = 'GH_TOKEN=synthetic-private-token'),
    (v) => (v.reason = 'x'.repeat(100001)),
    (v) => (v.reviewReports['claude-review-1.json'] = 'x'.repeat(128001)),
    (v) =>
      (v.reviewReports['claude-review-1.json'] =
        ' '.repeat(150000) + v.reviewReports['claude-review-1.json']),
    (v) => {
      v.large = Array.from({ length: 24 }, () => 'x'.repeat(99000));
    },
  ]) {
    const value = subject();
    change(value);
    assert.throws(() => validateStandaloneSubject(value));
  }
  const value = subject();
  const raw = JSON.stringify({
    subject_sha: hex(1),
    verdict: 'approved',
    summary: 'Valid summary',
    findings: [],
    untrusted: 'extra',
  });
  value.reviewReports['claude-review-1.json'] = raw;
  value.reviewLedger.rounds[0].review_sha256 = sha256(raw);
  assert.throws(() => validateStandaloneSubject(value));
});

test('accepts valid pretty-printed multilingual reports within the review validator limits', () => {
  const value = subject();
  const reportFor = (round, summary, findings = []) =>
    JSON.stringify(
      {
        subject_sha: hex(round),
        verdict: findings.length ? 'changes-requested' : 'approved',
        summary,
        findings,
      },
      null,
      2,
    ) + '\n';
  const oneCjk = reportFor(1, '界'.repeat(50000));
  assert.ok(oneCjk.length < 150000 && Buffer.byteLength(oneCjk) > 128000);
  value.reviewReports['claude-review-1.json'] = oneCjk;
  value.reviewLedger.rounds[0].review_sha256 = sha256(oneCjk);
  assert.equal(validateStandaloneSubject(value), value);

  // Each emoji occupies two UTF-16 code units, while its UTF-8 representation uses four bytes.
  const nearCompactLimit = reportFor(1, '😀'.repeat(49000));
  assert.ok(JSON.stringify(JSON.parse(nearCompactLimit)).length < 100000);
  assert.ok(Buffer.byteLength(nearCompactLimit) > 128000);
  value.reviewReports['claude-review-1.json'] = nearCompactLimit;
  value.reviewLedger.rounds[0].review_sha256 = sha256(nearCompactLimit);
  assert.equal(validateStandaloneSubject(value), value);

  // Four persisted reports stay valid together; pretty JSON with all allowed findings is accepted.
  value.reviews = [];
  value.reviewLedger.rounds = [];
  value.reviewReports = {};
  for (let round = 1; round <= 4; round++) {
    const report = reportFor(round, round % 2 ? '界'.repeat(99000) : '😀'.repeat(49000));
    value.reviews.push({ round, status: 'approved', subjectSha: hex(round) });
    value.reviewLedger.rounds.push({
      round,
      subject_sha: hex(round),
      verdict: 'approved',
      review_sha256: sha256(report),
    });
    value.reviewReports[`claude-review-${round}.json`] = report;
  }
  assert.equal(
    validateStandaloneSubject(value),
    value,
    'All four near-limit multilingual reports persist together',
  );
  const findings = Array.from({ length: 100 }, (_, i) => ({
    severity: 'low',
    file: 'frontend/src/reviewed.ts',
    line: i + 1,
    problem: `問題 ${i} 😀`,
    requested_change: `変更 ${i} を検討`,
    test_expectation: `確認 ${i} を追加`,
  }));
  const report = reportFor(4, '確認'.repeat(30000), findings);
  assert.ok(JSON.stringify(JSON.parse(report)).length < 100000);
  value.reviews[3] = { round: 4, status: 'changes-requested', subjectSha: hex(4) };
  value.reviewLedger.rounds[3] = {
    round: 4,
    subject_sha: hex(4),
    verdict: 'changes-requested',
    review_sha256: sha256(report),
  };
  value.reviewReports['claude-review-4.json'] = report;
  assert.ok(JSON.stringify(value).length < 2 * 1024 * 1024);
  assert.equal(validateStandaloneSubject(value), value);
});

test('512 KiB reservation covers worst-case valid multilingual pretty report and its state escaping', () => {
  const value = subject();
  const findings = Array.from({ length: 100 }, (_, i) => ({
    severity: 'low',
    file: 'frontend/src/reviewed.ts',
    line: i + 1,
    problem: `問題${i}😀\\"`.repeat(24),
    requested_change: `変更${i}😀\\"`.repeat(24),
    test_expectation: `確認${i}😀\\"`.repeat(24),
  }));
  const reportObject = {
    subject_sha: hex(1),
    verdict: 'changes-requested',
    summary: `界😀\\"`.repeat(1400),
    findings,
  };
  const compact = JSON.stringify(reportObject);
  assert.ok(compact.length > 90000 && compact.length < 100000);
  const pretty = JSON.stringify(reportObject, null, 2) + '\n';
  assert.ok(pretty.length <= 150000);
  assert.ok(
    Buffer.byteLength(pretty) > 128000 && Buffer.byteLength(pretty) < RESULT_RESERVATION_BYTES,
  );
  value.reviews[0].status = 'changes-requested';
  value.reviewLedger.rounds[0].verdict = 'changes-requested';
  value.reviewReports['claude-review-1.json'] = pretty;
  value.reviewLedger.rounds[0].review_sha256 = sha256(pretty);
  const before = Buffer.byteLength(JSON.stringify(value));
  const stored = structuredClone(value);
  stored.reviewReports['claude-review-1.json'] = '';
  const withoutReport = Buffer.byteLength(JSON.stringify(stored));
  assert.ok(before - withoutReport > Buffer.byteLength(pretty));
  assert.ok(before - withoutReport < Buffer.byteLength(pretty) * 2);
  assert.equal(validateStandaloneSubject(value), value);
});

test('a subject near 2 MiB validates without pending work but reserves capacity for review and Codex QA', () => {
  const value = subject({ large: Array.from({ length: 18 }, () => 'x'.repeat(99000)) });
  const baselineBytes = Buffer.byteLength(JSON.stringify(value));
  assert.ok(baselineBytes < 2 * 1024 * 1024);
  assert.ok(baselineBytes + RESULT_RESERVATION_BYTES > 2 * 1024 * 1024);
  assert.equal(pendingResultBytes(value), 0);
  assert.equal(validateStandaloneSubject(value), value);

  const runningReview = structuredClone(value);
  runningReview.reviews.push({ round: 2, status: 'running', subjectSha: hex(4) });
  runningReview.reviewLedger.rounds.push({ round: 2, subject_sha: hex(4), verdict: 'running' });
  assert.equal(pendingResultBytes(runningReview), RESULT_RESERVATION_BYTES);
  assert.throws(() => validateStandaloneSubject(runningReview), /capacity|bound/);

  const runningQa = structuredClone(value);
  runningQa.codexFinalReview = { status: 'running', subjectSha: hex(3), claudeRound: 1 };
  assert.equal(pendingResultBytes(runningQa), RESULT_RESERVATION_BYTES);
  assert.throws(() => assertSubjectResultCapacity(runningQa, 2 * 1024 * 1024), /capacity/);
});

test('rejects fake or inconsistent PR identity and more than four implementation rounds', () => {
  for (const overrides of [
    { pr: { number: 73, url: 'https://github.com/example/repo/pull/73' } },
    { repository: 'example/repo' },
    { id: 'standalone-pr-74' },
    {
      implementation: [1, 2, 3, 4, 5].map((round) => ({
        round,
        status: 'passed',
        subjectSha: hex(round),
        evidence: `evidence/run-${round}.txt`,
      })),
    },
  ])
    assert.throws(() => validateStandaloneSubject(subject(overrides)));
});

test('failed uncommitted history retains an honest manifest identity instead of inventing a Git SHA', () => {
  const value = subject();
  Object.assign(value.implementation[0], {
    status: 'failed',
    subjectSha: null,
    uncommitted: true,
    sourceManifestSha256: digest('actual historical uncommitted source manifest'),
  });
  assert.equal(validateStandaloneSubject(value), value);
  delete value.implementation[0].sourceManifestSha256;
  assert.throws(() => validateStandaloneSubject(value));
});

test('rejects unsafe source paths, symlinks, and non-regular source modes', () => {
  for (const entry of [
    { path: '../outside', blob: hex(3), mode: '100644', baseBlob: null, baseMode: null },
    { path: 'frontend/src/link', blob: hex(3), mode: '120000', baseBlob: null, baseMode: null },
    {
      path: 'frontend/src/submodule',
      blob: hex(3),
      mode: '160000',
      baseBlob: null,
      baseMode: null,
    },
  ])
    assert.throws(() => validateStandaloneSubject(subject({ sourceManifest: [entry] })));
});

test('checks review ledger and report digest consistency', () => {
  const value = subject();
  assert.equal(validateStandaloneSubject(value), value);
  value.reviewReports['claude-review-1.json'] = '{"verdict":"changes-requested"}';
  assert.throws(() => validateStandaloneSubject(value));
});

test('standalone state keeps normal batch identity guards and prevents PR and ownership collisions', () => {
  const state = {
    schemaVersion: 1,
    repository: STANDALONE_REPO,
    batches: [],
    standaloneReviews: [subject()],
  };
  assert.equal(validateStandaloneState(state), state);
  const collidingPr = structuredClone(state);
  collidingPr.batches.push({
    id: 'bug-batch-41',
    branch: 'codex/bug-batch-41',
    issues: [41],
    phase: 'blocked',
    implementation: [],
    reviews: [],
    sha: null,
    pr: { number: 73 },
  });
  assert.throws(() => validateStandaloneState(collidingPr));
  const collidingOwner = structuredClone(state);
  collidingOwner.batches.push({
    id: 'bug-batch-41',
    branch: 'feature/small-review',
    issues: [41],
    phase: 'blocked',
    implementation: [],
    reviews: [],
    sha: null,
    pr: null,
  });
  assert.throws(() => validateStandaloneState(collidingOwner));
  const invalidNormalBatch = structuredClone(state);
  invalidNormalBatch.batches.push({
    id: 'bug-batch-41',
    branch: 'wrong-branch',
    issues: [41],
    phase: 'blocked',
    implementation: [],
    reviews: [],
    sha: null,
    pr: null,
  });
  assert.throws(
    () => validateStandaloneState(invalidNormalBatch),
    /invalid durable batch identity/,
  );
});
