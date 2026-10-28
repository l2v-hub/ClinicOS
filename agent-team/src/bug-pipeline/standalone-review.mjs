import { captureReleaseReviewProof } from './release.mjs';
import { AsyncLocalStorage } from 'node:async_hooks';
import {
  githubOperationError,
  isRetryableGitHubFailure,
  recordTransientGitHubFailure,
  MERGE_PREPARATION_TIMEOUT_MS,
} from './github.mjs';
import { randomUUID } from 'node:crypto';
import {
  attemptLimit,
  ENTITY_COLLECTIONS,
  validateOperatorContinuations,
  implementationAttempts,
  activeImplementation,
} from './attempt-budget.mjs';
import { standaloneMergePolicy } from './review-policy.mjs';
import assert from 'node:assert/strict';
import {
  validateState,
  relativeFile,
  safeText,
  sha256,
  feedbackFingerprint,
} from './contracts.mjs';
import { createCommentReviewHandoff } from './comment-review-handoff.mjs';
import { externalReport } from './external-review.mjs';
import { reviewProjection, REVIEW_LABELS } from './issue-review-communication.mjs';
import { validateReview } from '../../../scripts/quality-gate/claude-bug-review.mjs';
import { assertSubjectResultCapacity, controllerFailureCode, stateError } from './github.mjs';

export const STANDALONE_REPO = 'l2v-hub/ClinicOS';
const SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^[a-f0-9]{64}$/;
export const MAX_STANDALONE_SUBJECT_BYTES = 2 * 1024 * 1024;
const clone = (value) => structuredClone(value);
const equal = (a, b) => assert.deepEqual(a, b, 'Frozen standalone subject changed');
const keys = (value, required) => {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value));
  equal(Object.keys(value).sort(), [...required].sort());
};
// A check conclusion is an observation to reconcile, not a failed model session.
// Keep this type local so unrelated assertions and transport errors cannot opt in.
class StandaloneChecksWaiting extends Error {}
const WAITING_CHECKS_REASON =
  'Native PR checks are not passing; waiting for a fresh check observation';
const nativeCheckStates = new Set([
  'SUCCESS',
  'FAILURE',
  'ERROR',
  'EXPECTED',
  'PENDING',
  'QUEUED',
  'IN_PROGRESS',
  'WAITING',
  'REQUESTED',
  'CANCELLED',
  'TIMED_OUT',
  'ACTION_REQUIRED',
  'STALE',
  'SKIPPED',
  'NEUTRAL',
  'STARTUP_FAILURE',
  'PASS',
  'FAIL',
  'CANCEL',
  'SKIPPING',
]);
function observedRequiredChecksWaiting(required) {
  if (required?.ok !== false || !Array.isArray(required.details) || !required.details.length)
    return false;
  let unsuccessful = false;
  for (const detail of required.details) {
    if (typeof detail !== 'string') return false;
    if (/^gh pr checks exited (?:1|8)$/.test(detail)) continue;
    const state = /: ([A-Z_]+)$/i.exec(detail)?.[1].toUpperCase();
    if (!nativeCheckStates.has(state)) return false;
    if (!['SUCCESS', 'PASS'].includes(state)) unsuccessful = true;
  }
  return unsuccessful;
}
function attempts(items, review = false, limit = 4) {
  assert.ok(Array.isArray(items) && items.length <= limit, 'Invalid standalone budget');
  for (const [i, item] of items.entries()) {
    assert.equal(item.round, i + 1, 'Noncontiguous attempt history');
    assert.ok(
      ['passed', 'failed', 'running', 'approved', 'changes-requested', 'blocked'].includes(
        item.status,
      ),
    );
    if (!review && item.status !== 'passed' && item.subjectSha === null) {
      assert.equal(item.uncommitted, true, 'Unknown historical SHA must be explicitly uncommitted');
      assert.match(
        item.sourceManifestSha256,
        DIGEST,
        'Uncommitted attempt requires its actual source manifest digest',
      );
    } else assert.match(item.subjectSha, SHA, 'Attempt requires its actual subject SHA');
    if (!review) {
      assert.ok(
        ['passed', 'failed', 'blocked'].includes(item.status),
        'Standalone subjects are review-only',
      );
      relativeFile(item.evidence);
    }
  }
}
function safeStandaloneFields(subject) {
  assert.ok(
    Buffer.byteLength(JSON.stringify(subject)) <= MAX_STANDALONE_SUBJECT_BYTES,
    'Standalone subject exceeds aggregate bound',
  );
  assertSubjectResultCapacity(subject, MAX_STANDALONE_SUBJECT_BYTES);
  let nodes = 0;
  const visit = (value, depth = 0) => {
    assert.ok(++nodes <= 50000 && depth <= 20, 'Standalone structure exceeds bound');
    if (typeof value === 'string') safeText(value);
    else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        safeText(key);
        if (depth === 0 && key === 'reviewReports') {
          assert.ok(child && typeof child === 'object' && !Array.isArray(child));
          for (const [file, content] of Object.entries(child)) {
            safeText(file);
            assert.equal(typeof content, 'string');
            // The validator limits compact JSON by UTF-16 code units, while persisted reports
            // are pretty-printed UTF-8. Account for Unicode expansion and formatting.
            assert.ok(content.length <= 150000, 'Stored review exceeds character bound');
            assert.ok(Buffer.byteLength(content) <= 512000, 'Stored review exceeds byte bound');
          }
        } else visit(child, depth + 1);
      }
    } else
      assert.ok(
        value === null ||
          typeof value === 'boolean' ||
          (typeof value === 'number' && Number.isFinite(value)),
        'Invalid standalone field',
      );
  };
  visit(subject);
}
function validatePacket(packet) {
  keys(packet, ['path', 'files']);
  relativeFile(packet.path);
  assert.ok(packet.path.startsWith('artifacts/task-validation/'));
  assert.ok(
    packet.files && Object.keys(packet.files).length > 0 && Object.keys(packet.files).length <= 200,
  );
  for (const [file, digest] of Object.entries(packet.files)) {
    relativeFile(file);
    assert.match(digest, DIGEST);
  }
}
export function validateStandaloneSubject(subject) {
  safeStandaloneFields(subject);
  assert.equal(subject.kind, 'standalone-pr-review');
  assert.equal(subject.schemaVersion, 1);
  assert.equal(subject.repository, STANDALONE_REPO);
  assert.ok(Number.isSafeInteger(subject.pr?.number) && subject.pr.number > 0);
  assert.equal(subject.id, `standalone-pr-${subject.pr.number}`);
  assert.equal(subject.pr.url, `https://github.com/${STANDALONE_REPO}/pull/${subject.pr.number}`);
  assert.match(subject.sha, SHA);
  assert.match(subject.baseSha, SHA);
  assert.equal(subject.baseRef, 'main');
  assert.ok(
    typeof subject.branch === 'string' &&
      subject.branch.length <= 200 &&
      /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(subject.branch) &&
      !subject.branch.includes('..') &&
      !subject.branch.endsWith('/'),
  );
  if (subject.release) {
    assert.ok(['merging', 'merged'].includes(subject.release.status));
    assert.equal(subject.release.reviewedSha, subject.sha);
    assert.equal(subject.release.prNumber, subject.pr.number);
    if (subject.release.status === 'merged') assert.match(subject.release.mergeSha, SHA);
  }
  assert.ok(
    ['waiting-review', 'reviewing', 'waiting-checks', 'ready', 'blocked'].includes(subject.phase),
  );
  assert.ok(
    Array.isArray(subject.issues) &&
      subject.issues.length <= 25 &&
      new Set(subject.issues).size === subject.issues.length,
  );
  assert.ok(
    subject.issues.every((n) => Number.isSafeInteger(n) && n > 0 && n !== subject.pr.number),
  );
  validatePacket(subject.packet);
  const packets = subject.preservedPackets ?? [];
  assert.ok(Array.isArray(packets) && packets.length <= 32, 'Too many preserved revision packets');
  const packetPaths = new Set([subject.packet.path]);
  for (const packet of packets) {
    validatePacket(packet);
    assert.ok(!packetPaths.has(packet.path), 'Revision packets must have distinct paths');
    packetPaths.add(packet.path);
  }
  for (const file of [
    'task-contract.md',
    'analysis.md',
    'implementation-plan.md',
    'validation-report.md',
    'imported-history.json',
  ])
    assert.ok(subject.packet.files[file], `Missing frozen packet ${file}`);
  assert.ok(
    Array.isArray(subject.sourceManifest) &&
      subject.sourceManifest.length > 0 &&
      subject.sourceManifest.length <= 2000,
  );
  const paths = new Set();
  for (const file of subject.sourceManifest) {
    keys(file, ['path', 'blob', 'mode', 'baseBlob', 'baseMode']);
    relativeFile(file.path);
    assert.ok(!paths.has(file.path) && !file.path.startsWith(subject.packet.path + '/'));
    paths.add(file.path);
    for (const prefix of ['', 'base']) {
      const blob = file[prefix ? 'baseBlob' : 'blob'],
        mode = file[prefix ? 'baseMode' : 'mode'];
      assert.ok(blob === null || SHA.test(blob));
      assert.ok(
        blob === null ? mode === null : ['100644', '100755'].includes(mode),
        'Symlinks/submodules are outside standalone review scope',
      );
    }
    assert.ok(file.blob !== null || file.baseBlob !== null);
  }
  attempts(subject.implementation, false, attemptLimit(subject, 'implementation'));
  assert.ok(subject.implementation.length > 0);
  assert.ok(
    subject.operatorContinuations?.length ||
      implementationAttempts(subject).at(-1).status === 'passed',
    'Implementation/evidence not verified',
  );
  for (const attempt of subject.implementation)
    assert.ok(subject.packet.files[attempt.evidence], 'Attempt evidence must be frozen');
  for (const [index, attempt] of (subject.operatorContinuations ?? []).entries()) {
    assert.equal(attempt.round, subject.implementation.length + index + 1);
    assert.ok(
      ['running', 'implemented-awaiting-independent-qa', 'passed', 'failed', 'blocked'].includes(
        attempt.status,
      ),
    );
    if (attempt.status === 'passed') {
      assert.match(attempt.subjectSha, SHA, 'Passed continuation requires its actual tested SHA');
      relativeFile(attempt.evidence);
    }
  }
  attempts(subject.reviews, true, attemptLimit(subject, 'reviews'));
  assert.ok(
    subject.reviewReports &&
      Object.keys(subject.reviewReports).length <= attemptLimit(subject, 'reviews'),
    'Too many stored review reports',
  );
  for (const [file, content] of Object.entries(subject.reviewReports)) {
    const match = /^claude-review-([1-9][0-9]*)\.json$/.exec(file);
    assert.ok(match && subject.reviews[Number(match[1]) - 1], 'Unbound stored report');
    assert.equal(typeof content, 'string');
    const report = JSON.parse(content);
    // Transport/import verifies the real full tracked tree. Here preserve its complete
    // schema/security bounds, without pretending a changed-file manifest is that tree.
    const locations = new Set(report.findings?.map((f) => relativeFile(f.file)) ?? []);
    validateReview(report, subject.reviews[Number(match[1]) - 1].subjectSha, locations);
  }
  if (subject.reviewLedger) {
    assert.equal(subject.reviewLedger.schema_version, 1);
    assert.equal(subject.reviewLedger.max_rounds, 4);
    assert.equal(subject.reviewLedger.rounds.length, subject.reviews.length);
    for (const [i, round] of subject.reviewLedger.rounds.entries()) {
      assert.equal(round.round, i + 1);
      assert.equal(round.subject_sha, subject.reviews[i].subjectSha);
      assert.equal(round.verdict, subject.reviews[i].status);
      if (!['running', 'failed'].includes(round.verdict)) {
        const content = subject.reviewReports?.[`claude-review-${i + 1}.json`];
        assert.equal(typeof content, 'string');
        assert.equal(sha256(content), round.review_sha256);
      }
    }
  } else assert.equal(subject.reviews.length, 0, 'Existing reviews require their ledger');
  assert.ok(
    subject.adoption?.actor &&
      subject.adoption?.at &&
      DIGEST.test(subject.adoption?.manifestSha256),
  );
  return subject;
}
export function validateStandaloneState(state) {
  validateState(state, STANDALONE_REPO);
  validateOperatorContinuations(state);
  const subjects = state.standaloneReviews ?? [];
  assert.ok(Array.isArray(subjects) && subjects.length <= 1000);
  const ownership = {
    pr: new Set(),
    branch: new Set(),
    issue: new Set(),
    id: new Set(),
  };
  for (const key of ENTITY_COLLECTIONS)
    for (const entity of state[key] ?? []) {
      for (const [kind, values] of [
        ['id', [entity.id]],
        ['pr', [entity.pr?.number]],
        ['branch', [entity.branch]],
        ['issue', entity.issues ?? []],
      ])
        for (const value of values) {
          if (value === undefined || value === null) continue;
          assert.ok(
            !ownership[kind].has(value),
            'PR/branch/issue already has a durable review owner',
          );
          ownership[kind].add(value);
        }
    }
  for (const subject of subjects) validateStandaloneSubject(subject);
  return state;
}

export function createStandaloneReview({
  github,
  run,
  cwd,
  now = () => new Date(),
  nonce,
  authorizationVerifier,
  operationTimeouts,
}) {
  const store = github.createStateStore();
  const automaticContext = new AsyncLocalStorage();
  async function api(endpoint, method = 'GET', body) {
    const result = await run({
      command: 'gh',
      args: [
        'api',
        endpoint,
        ...(method === 'GET' ? [] : ['-X', method]),
        ...(body === undefined ? [] : ['--input', '-']),
      ],
      ...(body === undefined ? {} : { input: JSON.stringify(body) }),
      cwd,
      timeoutMs: 30000,
      maxOutputBytes: 16 * 1024 * 1024,
      envMode: 'controller',
    });
    if (!result.ok)
      throw githubOperationError(
        result,
        method === 'GET' && body === undefined ? 'read' : 'projection',
      );
    return result.stdout ? JSON.parse(result.stdout) : null;
  }
  async function native(subject) {
    const pr = await api(`repos/${STANDALONE_REPO}/pulls/${subject.pr.number}`);
    assert.ok(
      pr.number === subject.pr.number &&
        pr.state === 'open' &&
        !pr.merged &&
        !pr.draft &&
        pr.head?.sha === subject.sha &&
        pr.head?.ref === subject.branch &&
        pr.head?.repo?.full_name === STANDALONE_REPO &&
        pr.head?.repo?.fork === false &&
        pr.base?.ref === subject.baseRef &&
        SHA.test(pr.base?.sha ?? '') &&
        pr.base?.repo?.full_name === STANDALONE_REPO,
      'Standalone native PR identity changed',
    );
    const comparison = await api(
      `repos/${STANDALONE_REPO}/compare/${pr.base.sha}...${subject.sha}?per_page=1`,
    );
    assert.ok(
      comparison.base_commit?.sha === pr.base.sha &&
        comparison.merge_base_commit?.sha === subject.baseSha,
      'Standalone authenticated merge base changed',
    );
    for (const number of subject.issues) {
      const issue = await github.viewIssue(number);
      assert.ok(
        issue.number === number &&
          String(issue.state).toLowerCase() === 'open' &&
          !issue.pull_request,
        'Standalone source must be a real open issue',
      );
    }
  }
  let immutable = new Map(),
    activeOperations = 0;
  async function operation(work) {
    if (activeOperations++ === 0) immutable = new Map();
    try {
      return await work();
    } finally {
      if (--activeOperations === 0) immutable.clear();
    }
  }
  async function pinned(key, read) {
    if (!immutable.has(key)) {
      const result = Promise.resolve()
        .then(read)
        .catch((error) => {
          immutable.delete(key);
          throw error;
        });
      immutable.set(key, result);
    }
    return immutable.get(key);
  }
  const readPinned = (file, sha) =>
    pinned(`file:${sha}:${file}`, () => github.readFileAtRevision(file, sha));
  async function inventory(sha) {
    return pinned(`tree:${sha}`, () => readInventory(sha));
  }
  async function readInventory(sha) {
    const tree = await api(`repos/${STANDALONE_REPO}/git/trees/${sha}?recursive=1`);
    assert.equal(tree.truncated, false, 'Incomplete standalone source tree');
    assert.ok(Array.isArray(tree.tree) && tree.tree.length <= 30000);
    return new Map(
      tree.tree.filter((item) => item.type !== 'tree').map((item) => [item.path, item]),
    );
  }
  async function checks(pr) {
    const required = await github.requiredChecks(pr);
    if (observedRequiredChecksWaiting(required))
      throw new StandaloneChecksWaiting('Native required checks are not passing');
    assert.ok(required.ok && required.details?.length, 'Native required checks are not passing');
    const result = await run({
      command: 'gh',
      args: ['pr', 'checks', String(pr), '--repo', STANDALONE_REPO, '--json', 'name,state,bucket'],
      cwd,
      timeoutMs: 30000,
      maxOutputBytes: 1024 * 1024,
      envMode: 'controller',
    });
    if (!result.stdout)
      throw stateError('github-read-failed', 'Native check inventory unavailable');
    const all = JSON.parse(result.stdout);
    assert.ok(
      Array.isArray(all) &&
        all.length > 0 &&
        all.every(
          (check) =>
            typeof check?.name === 'string' &&
            check.name.trim() &&
            ['pass', 'fail', 'pending', 'skipping', 'cancel'].includes(check.bucket),
        ),
      'Native check inventory is malformed',
    );
    assert.ok(
      result.ok ||
        (result.code === 1 && all.some((check) => ['fail', 'cancel'].includes(check.bucket))) ||
        (result.code === 8 && all.some((check) => check.bucket === 'pending')),
      'Native check inventory transport failed',
    );
    if (
      all.some((check) => check.name !== 'Vercel' && !['pass', 'skipping'].includes(check.bucket))
    )
      throw new StandaloneChecksWaiting('A native PR check is failed or pending');
    return { ok: true, details: all };
  }
  async function verify(subject) {
    validateStandaloneSubject(subject);
    assert.equal(
      implementationAttempts(subject).at(-1)?.status,
      'passed',
      'Latest implementation/evidence not verified',
    );
    for (const attempt of subject.operatorContinuations ?? [])
      assert.ok(
        ['passed', 'failed', 'blocked'].includes(attempt.status) &&
          (attempt.status !== 'passed' || subject.packet.files[attempt.evidence]),
        'Completed continuation evidence must be frozen in the adopted revision',
      );
    await native(subject);
    const [head, base] = await Promise.all([inventory(subject.sha), inventory(subject.baseSha)]);
    const tested =
      implementationAttempts(subject).at(-1).subjectSha === subject.sha
        ? head
        : await inventory(implementationAttempts(subject).at(-1).subjectSha);
    const sourceProjection = (tree) =>
      [...tree.values()]
        .filter((item) => !item.path.startsWith('artifacts/task-validation/'))
        .map((item) => ({
          path: item.path,
          sha: item.sha,
          mode: item.mode,
          type: item.type,
        }))
        .sort((a, b) => a.path.localeCompare(b.path));
    equal(sourceProjection(tested), sourceProjection(head));
    const prefix = subject.packet.path + '/';
    const packetFiles = [...head.keys()].filter((file) => file.startsWith(prefix));
    equal(
      packetFiles.sort(),
      Object.keys(subject.packet.files)
        .map((file) => prefix + file)
        .sort(),
    );
    for (const packet of [subject.packet, ...(subject.preservedPackets ?? [])]) {
      const packetPrefix = packet.path + '/';
      for (const [file, digest] of Object.entries(packet.files)) {
        const entry = head.get(packetPrefix + file);
        assert.equal(
          entry?.mode,
          '100644',
          'Frozen packet must remain a regular file on current head',
        );
        const remote = await readPinned(packetPrefix + file, subject.sha);
        assert.equal(remote.sha256, digest, 'Frozen packet digest changed on current head');
      }
    }
    const changed = [...new Set([...head.keys(), ...base.keys()])]
      .filter(
        (file) =>
          !file.startsWith(prefix) &&
          (head.get(file)?.sha !== base.get(file)?.sha ||
            head.get(file)?.mode !== base.get(file)?.mode),
      )
      .sort();
    equal(changed, subject.sourceManifest.map((file) => file.path).sort());
    for (const entry of subject.sourceManifest) {
      const before = base.get(entry.path),
        after = head.get(entry.path);
      equal(entry, {
        path: entry.path,
        blob: after?.sha ?? null,
        mode: after?.mode ?? null,
        baseBlob: before?.sha ?? null,
        baseMode: before?.mode ?? null,
      });
    }
    const raw = await readPinned(prefix + 'imported-history.json', subject.sha);
    const history = JSON.parse(raw.content);
    equal(history.implementation, subject.implementation);
    const importedContinuations = history.operatorContinuations ?? [];
    equal(
      importedContinuations,
      (subject.operatorContinuations ?? []).slice(0, importedContinuations.length),
    );
    assert.ok(importedContinuations.length <= (subject.operatorContinuations?.length ?? 0));
    if (subject.adoption?.subjectSha === subject.sha && subject.operatorContinuations?.length)
      equal(importedContinuations, subject.operatorContinuations);
    equal(history.sourceManifest, subject.sourceManifest);
    equal(
      history.packetFiles,
      Object.fromEntries(
        Object.entries(subject.packet.files).filter(([file]) => file !== 'imported-history.json'),
      ),
    );
    // Imported rounds are an immutable prefix; new claims append without changing history.
    assert.ok(Array.isArray(history.reviews) && history.reviews.length <= subject.reviews.length);
    if (subject.adoption?.importedReviewCount !== undefined)
      assert.equal(
        history.reviews.length,
        subject.adoption.importedReviewCount,
        'Frozen imported review prefix changed',
      );
    equal(history.reviews, subject.reviews.slice(0, history.reviews.length));
    if (history.reviews.length) {
      equal(
        history.reviewLedger.rounds,
        subject.reviewLedger.rounds.slice(0, history.reviews.length),
      );
      for (const [file, content] of Object.entries(history.reviewReports ?? {}))
        equal(content, subject.reviewReports[file]);
    }
    await native(subject);
    return subject;
  }
  const handoff = createCommentReviewHandoff({
    github,
    run,
    cwd,
    now,
    nonce,
    authorizationVerifier,
    operationTimeouts,
    automatic: () => automaticContext.getStore() === true,
    subjectAdapter: {
      validate: validateStandaloneState,
      subjects: (state) => state.standaloneReviews ?? [],
      live: native,
      reservationGuard: (subject) => checks(subject.pr.number),
      recoveryVerify: verify,
    },
  });
  async function adopt(manifest) {
    keys(manifest, [
      'schemaVersion',
      'repository',
      'pr',
      'sha',
      'baseSha',
      'baseRef',
      'branch',
      'issues',
      'packet',
      'sourceManifest',
      'implementation',
      'reviews',
      'reviewLedger',
      'reviewReports',
      'releaseHold',
    ]);
    const actor = await handoff.actor();
    const state = validateStandaloneState(
      (await store.load()) ?? {
        schemaVersion: 1,
        repository: STANDALONE_REPO,
        batches: [],
      },
    );
    const previous = state.standaloneReviews?.find((s) => s.pr.number === manifest.pr.number);
    const subject = {
      ...clone(manifest),
      ...Object.fromEntries(
        [
          'budgetExtensions',
          'budgetAuthorizationCutover',
          'operatorContinuations',
          'operatorCoordination',
        ]
          .filter((key) => previous?.[key])
          .map((key) => [key, clone(previous[key])]),
      ),
      kind: 'standalone-pr-review',
      id: `standalone-pr-${manifest.pr.number}`,
      phase: 'waiting-review',
      adoption: {
        actor,
        at: now().toISOString(),
        subjectSha: manifest.sha,
        importedReviewCount: manifest.reviews.length,
        manifestSha256: sha256(JSON.stringify(manifest)),
      },
    };
    await verify(subject);
    await checks(subject.pr.number);
    state.standaloneReviews ??= [];
    if (previous) {
      assert.notEqual(subject.sha, previous.sha, 'New verified SHA required for revision adoption');
      assert.ok(
        !activeImplementation(previous) &&
          !previous.reviews.some((r) => r.status === 'running') &&
          previous.codexFinalReview?.status !== 'running',
        'Existing worker owns the subject',
      );
      equal(subject.branch, previous.branch);
      equal(subject.issues, previous.issues);
      equal(subject.releaseHold, previous.releaseHold);
      assert.ok(subject.implementation.length >= previous.implementation.length);
      equal(
        subject.implementation.slice(0, previous.implementation.length),
        previous.implementation,
      );
      equal(subject.reviews, previous.reviews);
      equal(subject.reviewLedger, previous.reviewLedger ?? null);
      equal(subject.reviewReports, previous.reviewReports ?? {});
      assert.notEqual(
        subject.packet.path,
        previous.packet.path,
        'Append a new revision packet; historical packets are immutable',
      );
      for (const attempt of previous.implementation)
        equal(subject.packet.files[attempt.evidence], previous.packet.files[attempt.evidence]);
      for (const key of [
        'budgetExtensions',
        'budgetAuthorizationCutover',
        'operatorContinuations',
        'operatorCoordination',
        'recoveryHistory',
        'reviewHandoffHistory',
        'qaHistory',
        'codexFinalReviewHistory',
        'codexFinalQaInfrastructure',
        'finalQaAllowances',
        'finalQaHistoryResolutions',
        'mergeHistory',
      ])
        if (previous[key]) subject[key] = clone(previous[key]);
      if (previous.codexFinalReview) {
        subject.qaHistory ??= [];
        subject.qaHistory.push(clone(previous.codexFinalReview));
      }
      if (previous.release) {
        assert.equal(previous.release.status, 'merging', 'A merged subject is terminal');
        // verify() and the persistence guard authenticate an OPEN different head.
        subject.mergeHistory ??= [];
        subject.mergeHistory.push(clone(previous.release));
      }
      subject.preservedPackets = [
        ...clone(previous.preservedPackets ?? []),
        clone(previous.packet),
      ];
      subject.adoptionHistory = [...(previous.adoptionHistory ?? []), clone(previous.adoption)];
      state.standaloneReviews[state.standaloneReviews.indexOf(previous)] = subject;
    } else {
      assert.ok(
        !state.standaloneReviews.some((s) => s.branch === subject.branch),
        'Standalone branch already owned',
      );
      state.standaloneReviews.push(subject);
    }
    validateStandaloneState(state);
    await store.save(state, {
      rebaseIndependentSubjects: validateStandaloneState,
      guard: async () => {
        await verify(subject);
        assert.ok(await github.authorized(actor));
        await checks(subject.pr.number);
      },
    });
    return clone(subject);
  }
  async function ownership(subject) {
    if (automaticContext.getStore() === true) await handoff.load(subject.pr.number);
  }
  async function current(expected) {
    const { batch } = await handoff.load(expected.pr.number);
    equal(batch, expected);
    await native(batch);
    await ownership(expected);
    return batch;
  }
  async function mergeReceipt(expected) {
    const actor = await handoff.actor();
    const { batch } = await handoff.load(expected.pr.number);
    equal(batch, expected);
    assert.equal(
      batch.release?.status,
      'merging',
      'Merge recovery requires its durable reservation',
    );
    equal(
      batch.release.reviewProof,
      captureReleaseReviewProof(
        {
          ...batch,
          codexFinalReview: batch.release.reviewProof?.finalCodexReview,
        },
        { repository: STANDALONE_REPO, collection: 'standaloneReviews' },
      ),
    );
    const pr = await api(`repos/${STANDALONE_REPO}/pulls/${expected.pr.number}`);
    assert.ok(
      pr.number === expected.pr.number &&
        pr.head?.sha === expected.sha &&
        pr.head?.ref === expected.branch &&
        pr.head?.repo?.full_name === STANDALONE_REPO &&
        pr.head?.repo?.fork === false &&
        pr.base?.ref === 'main' &&
        pr.base?.repo?.full_name === STANDALONE_REPO,
      'Merge recovery identity changed',
    );
    assert.ok(await github.authorized(actor));
    if (pr.state === 'open' && !pr.merged) return null;
    assert.ok(
      pr.state === 'closed' && pr.merged && SHA.test(pr.merge_commit_sha),
      'No exact-SHA confirmed merge receipt',
    );
    return {
      number: expected.pr.number,
      reviewedSha: expected.sha,
      mergeSha: pr.merge_commit_sha,
    };
  }
  async function guardSubject(subject, login) {
    assert.equal(await handoff.actor(), login, 'Persistence actor changed');
    if (subject.release?.status === 'merged') {
      equal(
        subject.release.reviewProof,
        captureReleaseReviewProof(
          {
            ...subject,
            codexFinalReview: subject.release.reviewProof?.finalCodexReview,
          },
          { repository: STANDALONE_REPO, collection: 'standaloneReviews' },
        ),
      );
      const pr = await api(`repos/${STANDALONE_REPO}/pulls/${subject.pr.number}`);
      assert.ok(
        pr.number === subject.pr.number &&
          pr.state === 'closed' &&
          pr.merged &&
          pr.head?.sha === subject.sha &&
          pr.head?.ref === subject.branch &&
          pr.head?.repo?.full_name === STANDALONE_REPO &&
          pr.head?.repo?.fork === false &&
          pr.base?.ref === 'main' &&
          pr.base?.repo?.full_name === STANDALONE_REPO &&
          pr.merge_commit_sha === subject.release.mergeSha,
        'Merged receipt changed before persistence',
      );
    } else await native(subject);
    assert.ok(await github.authorized(login), 'Persistence actor lost authorization');
    await ownership(subject);
  }
  async function finalize(pr, { workspace, infrastructureFiles }) {
    let state = validateStandaloneState(await store.load());
    let subject = state.standaloneReviews?.find((item) => item.pr.number === pr);
    assert.ok(subject, 'Finalize supports explicitly adopted standalone subjects only');
    await handoff.actor();
    if (
      subject.lastTransientFailure?.subjectSha === subject.sha &&
      subject.lastTransientFailure.nextRetryAt > now().getTime()
    )
      return clone(subject);
    let persistenceFailed = false;
    const save = async (options) => {
      validateStandaloneState(state);
      state.updatedAt = now().toISOString();
      try {
        await store.save(state, {
          ...options,
          rebaseIndependentSubjects: validateStandaloneState,
        });
      } catch (error) {
        persistenceFailed = true;
        throw error;
      }
    };
    try {
      await finalizeStandaloneSubject({
        subject,
        controller: {
          ...handoff,
          verify,
          current,
          mergeReceipt,
          checks,
          publishState,
          guardSubject,
          ownership,
        },
        github,
        workspace,
        save,
        infrastructureFiles,
        now,
      });
      if (subject.lastTransientFailure) {
        delete subject.lastTransientFailure;
        await save();
      }
    } catch (error) {
      if (persistenceFailed) throw error;
      state = validateStandaloneState(await store.load());
      subject = state.standaloneReviews?.find((item) => item.pr.number === pr);
      assert.ok(subject, 'Finalize owner disappeared');
      if (error?.code === 'review-operator-owned')
        return { status: 'skipped', reason: 'operator-owned' };
      if (isRetryableGitHubFailure(error)) {
        if (!recordTransientGitHubFailure(subject, now().getTime())) {
          await save();
          throw error;
        }
        subject.failureCode = 'github-transient-exhausted';
      } else {
        subject.failureCode = controllerFailureCode(error);
        delete subject.failureOperation;
        if (['projection', 'merge', 'mutation', 'read'].includes(error.operation))
          subject.failureOperation = error.operation;
      }
      subject.phase = 'blocked';
      delete subject.approvedSha;
      subject.reason = 'Standalone finalization requires explicit recovery';
      await save();
    }

    return clone(subject);
  }
  async function publishState(subject) {
    const expected = clone(subject);
    await current(expected);
    const projection = reviewProjection(expected, externalReport);
    if (projection.skip) return projection;
    if (expected.issues.length)
      return {
        status: 'unsupported',
        outcome: 'unsupported-standalone-issues',
      };
    const actor = await handoff.actor();
    async function write(endpoint, method, body) {
      const started = performance.now();
      await current(expected);
      assert.ok(await github.authorized(actor));
      await ownership(expected);
      assert.ok(performance.now() - started <= 60000);
      for (let retry = 0; ; retry++) {
        try {
          return await api(endpoint, method, body);
        } catch (error) {
          if (retry >= 2 || !error.retryable || error.operation !== 'projection') throw error;
          await new Promise((resolve) => setTimeout(resolve, 25 * 2 ** retry));
          await current(expected);
          assert.ok(await github.authorized(actor));
          await ownership(expected);
        }
      }
    }
    // Labels are a PR-only projection, and never authorize transitions or source issues.
    for (let count = 0; count <= REVIEW_LABELS.length + 1; count++) {
      const issue = await github.viewIssue(expected.pr.number);
      assert.ok(issue.pull_request && String(issue.state).toLowerCase() === 'open');
      const labels = issue.labels.map((item) => (typeof item === 'string' ? item : item.name));
      if (!labels.includes(projection.label)) {
        await write(`repos/${STANDALONE_REPO}/issues/${expected.pr.number}/labels`, 'POST', {
          labels: [projection.label],
        });
        continue;
      }
      const stale = labels.find(
        (label) => REVIEW_LABELS.includes(label) && label !== projection.label,
      );
      if (stale) {
        await write(
          `repos/${STANDALONE_REPO}/issues/${expected.pr.number}/labels/${encodeURIComponent(stale)}`,
          'DELETE',
        );
        continue;
      }
      return projection;
    }
    assert.fail('Standalone PR labels did not converge');
  }
  const gated = async (name, ...args) =>
    operation(async () => {
      await checks(args[0]);
      await verify((await handoff.load(args[0])).batch);
      return handoff[name](...args);
    });
  return {
    ...handoff,
    request: (...args) => gated('request', ...args),
    claim: (pr, options) => gated('claim', pr, options === undefined ? undefined : clone(options)),
    submit: (...args) => gated('submit', ...args),
    failOwnedClaim: (...args) => operation(() => handoff.failOwnedClaim(...args)),
    reconcilePR: (...args) => gated('reconcilePR', ...args),
    recover: (...args) => operation(() => handoff.recover(...args)),
    extendBudget: (...args) => operation(() => handoff.extendBudget(...args)),
    adopt: (...args) => operation(() => adopt(...args)),
    verify: (...args) => operation(() => verify(...args)),
    publishState: (...args) => operation(() => publishState(...args)),
    operation,
    automatic: (work) => {
      assert.equal(typeof work, 'function');
      return automaticContext.run(true, work);
    },
    ownership,
    current,
    checks,
    mergeReceipt,
    finalize: (...args) => operation(() => finalize(...args)),
    guardSubject,
  };
}

async function finalizeStandaloneSubjectBody({
  subject,
  controller,
  github,
  workspace,
  save,
  infrastructureFiles = [],
  now = () => new Date(),
}) {
  const login = await controller.actor();
  await controller.ownership?.(subject);
  const persist = async (options) => {
    const expected = JSON.stringify(subject);
    await save({
      ...options,
      guard: async () => {
        if (options?.guard) await options.guard();
        await controller.guardSubject(subject, login);
        equal(JSON.stringify(subject), expected);
      },
    });
  };
  if (subject.release?.status === 'merged') return;
  if (subject.release?.status === 'merging') {
    const receipt = await controller.mergeReceipt(subject);
    if (receipt) {
      subject.release = {
        ...subject.release,
        status: 'merged',
        reviewedSha: subject.sha,
        prNumber: subject.pr.number,
        mergeSha: receipt.mergeSha,
      };
      await persist();
      return;
    }
    return; // An open PR with an existing merge reservation may still have an active owner.
  }
  const review = await standaloneReviewStep({
    subject,
    controller,
    github,
    workspace,
    save: persist,
    now,
  });
  if (review?.status === 'pending') return;
  await controller.publishState(subject);
  const files = subject.sourceManifest
    .map((file) => file.path)
    .filter((file) => !file.startsWith('artifacts/task-validation/'));
  if (
    subject.phase === 'ready' &&
    !subject.releaseHold &&
    files.length &&
    files.every((file) => infrastructureFiles.includes(file))
  ) {
    const readiness = await mergeStandaloneReview({
      subject,
      controller,
      github,
      infrastructureFiles,
    });
    if (readiness.reason) return;
    subject.release = {
      status: 'merging',
      reviewedSha: subject.sha,
      prNumber: subject.pr.number,
      nonce: randomUUID(),
      reservedAt: now().toISOString(),
      reviewProof: captureReleaseReviewProof(subject, {
        repository: STANDALONE_REPO,
        collection: 'standaloneReviews',
      }),
    };
    await persist();
    let receipt;
    try {
      receipt = await mergeStandaloneReview({
        subject,
        controller,
        github,
        infrastructureFiles,
        execute: true,
        now,
      });
    } catch (error) {
      if (
        error.code !== 'github-write-rejected' ||
        error.operation !== 'merge' ||
        !(
          (error.httpStatus >= 400 && error.httpStatus < 500 && error.httpStatus !== 408) ||
          error.diagnostic === 'graphql-merge-refusal'
        )
      )
        throw error;
      // Only a definite rejection plus a fresh exact-head OPEN native observation
      // can end this reservation. Transport uncertainty retains its tombstone.
      await controller.current(subject);
      subject.mergeHistory ??= [];
      subject.mergeHistory.push(clone(subject.release));
      delete subject.release;
      subject.phase = 'blocked';
      subject.failureCode = 'github-merge-rejected';
      subject.failureOperation = 'merge';
      subject.reason = 'Definite merge rejection; exact-head open PR verified for explicit resume';
      delete subject.approvedSha;
      await persist();
      return;
    }
    subject.release = {
      ...subject.release,
      status: 'merged',
      reviewedSha: subject.sha,
      prNumber: subject.pr.number,
      mergeSha: receipt.mergeSha,
    };
    await persist();
  }
}

// This boundary never executes or edits PR code. Findings go back to the orchestrator.
export async function standaloneReviewStep({
  subject,
  controller,
  github,
  workspace,
  save,
  now = () => new Date(),
  nonce = randomUUID,
}) {
  if (activeImplementation(subject)) return { status: 'pending' };
  if (subject.phase === 'blocked') return;
  // A durable running record is ownership, not evidence that its worker stopped.
  // Another invocation must remain read-only until that owner records a result.
  if (subject.codexFinalReview?.status === 'running') return { status: 'pending' };
  if (!(await controller.reconcile(subject, save))) return;
  await controller.verify(subject);
  const report = externalReport(subject);
  const feedback = await github.reviewFeedback(subject.pr.number);
  const fingerprint = feedbackFingerprint(feedback);
  const block = async (reason) => {
    await controller.ownership?.(subject);
    subject.phase = 'blocked';
    subject.reason = reason;
    delete subject.approvedSha;
    await save();
  };
  if (
    report.verdict !== 'approved' ||
    report.findings.length ||
    subject.externalReview.feedbackChanged ||
    fingerprint !== subject.externalReview.feedbackFingerprint ||
    feedback.unresolved ||
    feedback.changesRequested
  )
    return block(
      'Standalone review findings or changed feedback require orchestrator-owned correction within imported budgets',
    );
  if (!subject.codexFinalReview) {
    subject.codexFinalReview = {
      status: 'running',
      subjectSha: subject.sha,
      claudeRound: subject.reviews.length,
      feedbackFingerprint: fingerprint,
      reservedAt: now().toISOString(),
      nonce: nonce(),
    };
    await save(); // Persistent ownership before independent model invocation.
    let qa;
    try {
      await controller.ownership?.(subject);
      qa = await workspace.finalQaStandalone(subject);
    } catch (error) {
      if (error?.code === 'review-operator-owned') throw error;
      subject.codexFinalReview.status = 'failed';
      subject.codexFinalReview.failureCode = controllerFailureCode(error);
      await save(); // The owning worker records its failed result and releases its allowance.
      throw error;
    }
    safeText(qa.summary);
    subject.codexFinalReview.status = qa.status === 'verified' ? 'verified' : 'blocked';
    subject.codexFinalReview.summary = qa.summary;
    await save();
  }
  if (
    subject.codexFinalReview.status !== 'verified' ||
    subject.codexFinalReview.subjectSha !== subject.sha ||
    subject.codexFinalReview.claudeRound !== subject.reviews.length ||
    subject.codexFinalReview.feedbackFingerprint !== fingerprint
  )
    return block(
      'Independent standalone Codex QA blocked or interrupted; explicit recovery required',
    );
  await controller.verify(subject);
  const after = await github.reviewFeedback(subject.pr.number);
  if (after.head !== subject.sha || feedbackFingerprint(after) !== fingerprint)
    return block('Standalone feedback changed during independent QA');
  const checks = await controller.checks(subject.pr.number);
  subject.approvedSha = subject.sha;
  subject.feedbackFingerprint = fingerprint;
  subject.phase = checks.ok && checks.details?.length ? 'ready' : 'waiting-checks';
  if (subject.phase === 'ready' && subject.reason === WAITING_CHECKS_REASON) delete subject.reason;
  await save();
}

// A bounded release entry for explicitly allowlisted infrastructure only. Clinical and
// provider/runtime changes continue to require the normal verified deployment controller.
// No caller flag can transfer a clinical PR into this infrastructure merge path.
export async function mergeStandaloneReview({
  subject,
  controller,
  github,
  infrastructureFiles,
  execute = false,
  now = () => new Date(),
}) {
  const expected = clone(subject);
  const actor = await controller.actor();
  const preparationStart = Date.parse(expected.release?.reservedAt);
  const preparationDeadline = preparationStart + MERGE_PREPARATION_TIMEOUT_MS;
  const preparationLive = () => {
    assert.equal(expected.release?.status, 'merging', 'Merge requires its durable reservation');
    const clock = now().getTime();
    assert.ok(
      clock >= preparationStart && clock < preparationDeadline,
      'Merge preparation deadline expired before command',
    );
  };
  const guard = async () => {
    await controller.current(expected);
    assert.ok(await github.authorized(actor), 'Merge actor lost authorization');
    assert.ok(
      expected.releaseHold === undefined ||
        expected.releaseHold === null ||
        expected.releaseHold === false,
      'Standalone releaseHold prevents merge',
    );
    assert.equal(expected.phase, 'ready');
    assert.equal(
      implementationAttempts(expected).at(-1)?.status,
      'passed',
      'Latest implementation attempt did not pass validation',
    );
    assert.equal(expected.approvedSha, expected.sha);
    assert.equal(expected.codexFinalReview?.status, 'verified');
    assert.equal(expected.codexFinalReview.subjectSha, expected.sha);
    assert.equal(expected.codexFinalReview.claudeRound, expected.reviews.length);
    assert.equal(expected.codexFinalReview.feedbackFingerprint, expected.feedbackFingerprint);
    const proof = captureReleaseReviewProof(expected, {
      repository: STANDALONE_REPO,
      collection: 'standaloneReviews',
    });

    const report = externalReport(expected);
    assert.ok(
      report.verdict === 'approved' &&
        report.findings.length === 0 &&
        expected.externalReview?.status === 'published' &&
        !expected.externalReview.feedbackChanged,
    );
    const feedback = await github.reviewFeedback(expected.pr.number);
    assert.ok(
      feedback.state === 'OPEN' &&
        !feedback.isDraft &&
        feedback.head === expected.sha &&
        !feedback.unresolved &&
        !feedback.changesRequested &&
        feedbackFingerprint(feedback) === expected.feedbackFingerprint,
      'Current PR feedback invalidates standalone approval',
    );
    await controller.checks(expected.pr.number);
    const files = expected.sourceManifest
      .map((file) => file.path)
      .filter((file) => !file.startsWith('artifacts/task-validation/'));
    const native = await github.nativeReviewAuthorization(expected.pr.number, expected.sha, {
      excludedLogins: [actor, expected.externalReview?.owner],
    });
    const policy = standaloneMergePolicy({
      files,
      reviewer: expected.externalReview?.owner,
      actor,
      native,
    });
    if (policy === 'human-protected-trust-root') return policy;
    if (policy && !(native.humanApproved && native.protectedReviews)) return policy;
    assert.ok(
      Array.isArray(infrastructureFiles) && infrastructureFiles.length > 0,
      'Explicit trusted infrastructure allowlist required',
    );
    assert.ok(
      files.length > 0 &&
        files.every(
          (file) =>
            infrastructureFiles.includes(file) && /^(?:agent-team\/tests\/|docs\/)/.test(file),
        ),
      'Application or deployment changes require the verified deployment release controller',
    );
    await controller.current(expected);
    assert.ok(await github.authorized(actor));
    if (execute) {
      preparationLive();
      equal(expected.release.reviewProof, proof);
    }
  };
  const reason = await guard();
  if (reason)
    return {
      status: 'ready-to-merge',
      pr: expected.pr.number,
      reviewedSha: expected.sha,
      reason,
      humanReviewRequired: true,
    };
  if (!execute)
    return {
      status: 'ready-to-merge',
      pr: expected.pr.number,
      reviewedSha: expected.sha,
    };
  // The existing adapter preserves actual branch protections and --match-head-commit.
  // The result is a merge receipt, never a deployment or source issue completion.
  return github.mergePullRequest(expected.pr.number, expected.sha, {
    guard: async () => {
      assert.equal(
        await guard(),
        undefined,
        'Native human review or independent reviewer required',
      );
    },
  });
}

// Automatic mode is invocation-local even when a trusted controller was built earlier.
export async function finalizeStandaloneSubject(options) {
  const { automatic = false, controller } = options;
  assert.equal(typeof automatic, 'boolean');
  const reconcile = async () => {
    try {
      return await finalizeStandaloneSubjectBody(options);
    } catch (error) {
      if (!(error instanceof StandaloneChecksWaiting)) throw error;
      const { subject, save } = options;
      // A changed head, owner, packet or durable reservation is not a CI wait.
      await controller.current(subject);
      const actor = await controller.actor();
      await controller.ownership?.(subject);
      subject.phase = 'waiting-checks';
      subject.reason = WAITING_CHECKS_REASON;
      const expected = JSON.stringify(subject);
      await save({
        guard: async () => {
          await controller.guardSubject(subject, actor);
          equal(JSON.stringify(subject), expected);
        },
      });
    }
  };
  if (!automatic) return reconcile();
  assert.equal(
    typeof controller.automatic,
    'function',
    'Automatic standalone controller context required',
  );
  assert.equal(
    typeof controller.ownership,
    'function',
    'Automatic standalone ownership guard required',
  );
  return controller.automatic(reconcile);
}
