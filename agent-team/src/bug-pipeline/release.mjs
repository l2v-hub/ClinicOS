import { MAX_EVIDENCE_BYTES } from './evidence-limits.mjs';
import { implementationAttempts } from './attempt-budget.mjs';
import path from 'node:path';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRunner } from './process.mjs';
import { createGitHub } from './github.mjs';
import {
  DEMO_SOURCE_POLICIES,
  createProofReader,
  createRailwayClient,
  verifyDemoPreflight,
  verifyDemoRelease,
} from './demo-deployment.mjs';
import { createExactDemoDispatcher, createExactDispatchPoster } from './exact-demo-dispatch.mjs';
import { feedbackFingerprint, sha256, validateState } from './contracts.mjs';

const SHA_RE = /^[a-f0-9]{40}$/;
const DIGEST_RE = /^[a-f0-9]{64}$/;

export function releaseSourcePolicy(value = DEMO_SOURCE_POLICIES.trigger) {
  if (!Object.values(DEMO_SOURCE_POLICIES).includes(value))
    throw new TypeError('unknown demo source policy');
  return value;
}

// The exact deployment must still be the current protected-main release when recording or closing.
export async function verifyReleaseDemo({
  sourcePolicy,
  reader,
  verify = verifyDemoRelease,
  ...input
}) {
  sourcePolicy = releaseSourcePolicy(sourcePolicy);
  const checkMain = async () => {
    if (sourcePolicy !== DEMO_SOURCE_POLICIES.exact) return;
    const head = await reader.getJson('commits/main');
    if (!SHA_RE.test(input.mergeSha ?? '') || head?.sha !== input.mergeSha)
      fail('current main changed before exact deployment completion');
    const match = /^https:\/\/github\.com\/l2v-hub\/ClinicOS\/actions\/runs\/([1-9][0-9]*)$/.exec(
      input.runUrl ?? '',
    );
    if (!match) fail('exact deployment run identity missing');
    const run = await reader.getJson(`actions/runs/${match[1]}`);
    if (run?.id !== Number(match[1]) || run.run_attempt !== 1)
      fail('exact deployment run attempt changed');
  };
  await checkMain();
  const proof = await verify({ ...input, reader, sourcePolicy });
  await checkMain();
  return proof;
}

function assertExactDispatchProof(batch, selected, mergeSha, runUrl) {
  if (selected !== DEMO_SOURCE_POLICIES.exact) return;
  const saved = batch.exactDemoDispatches?.deploy;
  if (
    saved?.phase !== 'succeeded' ||
    saved.operation !== 'deploy' ||
    saved.sha !== mergeSha ||
    !Number.isSafeInteger(saved.runId) ||
    saved.runId <= 0 ||
    runUrl !== `https://github.com/l2v-hub/ClinicOS/actions/runs/${saved.runId}`
  )
    fail('exact release requires its durable successful dispatch proof');
}

function assertSavedPolicy(batch, selected) {
  if (batch.release?.sourcePolicy !== undefined && batch.release.sourcePolicy !== selected)
    fail('saved release source policy mismatch');
}

export class ReleaseGateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ReleaseGateError';
  }
}

export function hasReleaseHold(batch) {
  return (
    batch?.releaseHold !== undefined && batch.releaseHold !== null && batch.releaseHold !== false
  );
}

function publicationRecord(batch, status) {
  return {
    status,
    batchId: batch.id,
    reviewedSha: batch.release.reviewedSha,
    mergeSha: batch.release.mergeSha,
    prNumber: batch.pr.number,
    issues: [...batch.issues],
  };
}

export function publicationComplete(batch) {
  const saved = batch.release?.publication;
  return (
    batch.release?.status === 'deployed' &&
    ['deployed', 'not-required'].includes(batch.release.deployment?.status) &&
    batch.release.deployment.reviewedSha === batch.release.reviewedSha &&
    batch.release.deployment.mergeSha === batch.release.mergeSha &&
    saved?.status === 'published' &&
    saved.batchId === batch.id &&
    saved.reviewedSha === batch.sha &&
    saved.reviewedSha === batch.release.reviewedSha &&
    saved.mergeSha === batch.release.mergeSha &&
    Number.isSafeInteger(saved.prNumber) &&
    saved.prNumber === batch.pr?.number &&
    JSON.stringify(saved.issues) === JSON.stringify(batch.issues)
  );
}

export function selectAutoReleaseBatch(state) {
  return (
    state.batches
      .filter(
        (batch) =>
          batch.phase === 'ready' &&
          !hasReleaseHold(batch) &&
          batch.sha &&
          batch.approvedSha === batch.sha &&
          (batch.release?.status !== 'deployed' || !publicationComplete(batch)),
      )
      .sort((a, b) => Math.min(...a.issues) - Math.min(...b.issues))[0] ?? null
  );
}

function assertNoReleaseHold(batch) {
  if (hasReleaseHold(batch))
    fail('durable releaseHold prevents merge, deployment recording and closure');
}

function fail(message) {
  throw new ReleaseGateError(message);
}

function appDeployments(batch) {
  const scope = batch.plan.scope;
  return {
    frontend: scope.some(
      (file) =>
        file === 'frontend' ||
        file.startsWith('frontend/') ||
        ['package.json', 'package-lock.json', 'npm-shrinkwrap.json'].includes(file),
    ),
    backend: scope.some(
      (file) =>
        file.startsWith('backend/') ||
        file.startsWith('prisma/') ||
        [
          'package.json',
          'package-lock.json',
          'npm-shrinkwrap.json',
          'railway.json',
          '.github/workflows/deploy-backend.yml',
        ].includes(file),
    ),
    runtime: scope.some(
      (file) =>
        file.startsWith('clinicos-ai-runtime/') || file === '.github/workflows/deploy-runtime.yml',
    ),
  };
}

function validateIssuePullUrl(url, repo, number) {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'github.com' &&
      parsed.pathname === `/${repo}/pull/${number}` &&
      !parsed.search &&
      !parsed.hash
    );
  } catch {
    return false;
  }
}

function verifyReviewProof(batch, sha) {
  const lastReview = batch.reviews.at(-1);
  if (
    !lastReview ||
    lastReview.round !== batch.reviews.length ||
    lastReview.status !== 'approved' ||
    lastReview.subjectSha !== sha
  ) {
    fail('the latest durable Claude review does not approve this exact revision');
  }
  const rounds = batch.reviewLedger?.rounds;
  const ledger = Array.isArray(rounds) ? rounds.at(-1) : null;
  if (
    !ledger ||
    ledger.round !== lastReview.round ||
    ledger.subject_sha !== sha ||
    ledger.verdict !== 'approved' ||
    !DIGEST_RE.test(ledger.review_sha256 ?? '')
  ) {
    fail('the Claude review ledger is absent, stale, or inconsistent');
  }
  const reportContent = batch.reviewReports?.[`claude-review-${lastReview.round}.json`];
  if (typeof reportContent !== 'string' || sha256(reportContent) !== ledger.review_sha256) {
    fail('the persisted Claude review report does not match its digest');
  }
  let report;
  try {
    report = JSON.parse(reportContent);
  } catch {
    fail('the persisted Claude review report is invalid JSON');
  }
  if (
    report.subject_sha !== sha ||
    report.verdict !== 'approved' ||
    !report.summary?.trim() ||
    !Array.isArray(report.findings) ||
    report.findings.length !== 0
  ) {
    fail('the persisted Claude review report is not a clean approval for the reviewed revision');
  }
}

async function verifyEvidence(batch, github) {
  const sourcePlan = batch.plan.evidence;
  const recorded = batch.evidence;
  if (
    !Array.isArray(sourcePlan) ||
    sourcePlan.length !== batch.issues.length ||
    !Array.isArray(recorded) ||
    recorded.length !== sourcePlan.length
  ) {
    fail('complete per-issue evidence manifest is required');
  }
  const packet = `artifacts/task-validation/${batch.id}`;
  const byIssue = new Map(recorded.map((entry) => [entry.issue, entry]));
  if (byIssue.size !== sourcePlan.length) fail('duplicate or missing issue evidence');

  const manifestFile = await github.readFileAtRevision(
    `${packet}/evidence-manifest.json`,
    batch.sha,
  );
  if (!manifestFile.content) fail('committed evidence manifest content is unavailable');
  let manifest;
  try {
    manifest = JSON.parse(manifestFile.content);
  } catch {
    fail('committed evidence manifest is invalid JSON');
  }
  if (JSON.stringify(manifest) !== JSON.stringify(recorded))
    fail('committed evidence manifest differs from durable state');

  for (const expected of sourcePlan) {
    const actual = byIssue.get(expected.issue);
    if (!actual || !actual.files?.screenshot || !actual.files?.trace)
      fail(`screenshot and trace evidence are required for issue #${expected.issue}`);
    for (const kind of ['screenshot', 'trace', ...(expected.video ? ['video'] : [])]) {
      const saved = actual.files[kind];
      const expectedPath = expected[kind];
      if (
        !saved ||
        saved.path !== expectedPath ||
        !saved.path.startsWith(`${packet}/evidence/`) ||
        saved.path.split('/').some((part) => part === '..') ||
        !DIGEST_RE.test(saved.sha256 ?? '') ||
        !Number.isSafeInteger(saved.bytes) ||
        saved.bytes < 16 ||
        saved.bytes > MAX_EVIDENCE_BYTES
      ) {
        fail(`invalid ${kind} evidence metadata for issue #${expected.issue}`);
      }
      const remote = await github.readFileAtRevision(saved.path, batch.sha);
      if (remote.sha256 !== saved.sha256 || remote.bytes !== saved.bytes)
        fail(`remote ${kind} evidence digest mismatch for issue #${expected.issue}`);
    }
    if (!expected.video && actual.files.video)
      fail(`unexpected video metadata for issue #${expected.issue}`);
  }
}

function verifyChecks(checks) {
  if (
    !checks ||
    checks.ok !== true ||
    !Array.isArray(checks.details) ||
    checks.details.length === 0
  ) {
    fail('required branch-protection checks are missing, pending, failed, or unavailable');
  }
}

async function verifyCurrentCandidate({
  batch,
  sha,
  repo,
  github,
  verifyBlobs = true,
  allowClosedIssues = false,
}) {
  assertNoReleaseHold(batch);
  if (batch.phase !== 'ready' || batch.sha !== sha || batch.approvedSha !== sha)
    fail('batch is not ready and approved for the supplied reviewed SHA');
  if (implementationAttempts(batch).at(-1)?.status !== 'passed')
    fail('latest implementation attempt did not pass validation');
  verifyReviewProof(batch, sha);
  if (!batch.pr || !validateIssuePullUrl(batch.pr.url, repo, batch.pr.number))
    fail('durable PR identity does not match this repository');
  if (verifyBlobs) await verifyEvidence(batch, github);

  for (const issueNumber of batch.issues) {
    const issue = await github.viewIssue(issueNumber);
    const state = String(issue.state ?? '').toLowerCase();
    if (state !== 'open' && !(allowClosedIssues && state === 'closed'))
      fail(`source issue #${issueNumber} is no longer open`);
  }

  const feedback = await github.reviewFeedback(batch.pr.number);
  if (
    feedback.number !== batch.pr.number ||
    feedback.url !== batch.pr.url ||
    feedback.head !== sha ||
    feedback.headRef !== batch.branch ||
    feedback.headRepo !== repo ||
    feedback.headIsFork !== false ||
    feedback.baseRef !== 'main'
  ) {
    fail('pull request repository, branch, base, fork status, or head SHA changed');
  }
  if (!['OPEN', 'MERGED'].includes(feedback.state))
    fail('pull request is closed without a confirmed merge');
  if (
    feedback.unresolved ||
    feedback.changesRequested ||
    feedbackFingerprint(feedback) !== batch.feedbackFingerprint
  ) {
    fail('new, unresolved, or changes-requested PR feedback invalidates the Claude approval');
  }
  const checks = await github.requiredChecks(batch.pr.number);
  verifyChecks(checks);
  return { feedback, checks, deployments: appDeployments(batch) };
}

function assertDeploymentPrerequisites(deployments, configured, sourcePolicy) {
  if (configured?.botToken !== true)
    fail(
      'CLINICOS_BOT_TOKEN is required before release so the main push triggers authorized CI/deploy workflows',
    );
  if (deployments.frontend && configured?.vercel !== true)
    fail(
      'Vercel production token and project bindings are required before merging frontend changes',
    );
  if (
    (deployments.runtime || (deployments.backend && sourcePolicy !== DEMO_SOURCE_POLICIES.exact)) &&
    configured?.railway !== true
  )
    fail('RAILWAY_TOKEN is required before merging Railway service changes');
}

// Freeze the entire authorized subject, including plan, evidence and review ledgers.
// Remote verification must never acquire a newly loaded PR or source-issue set.
function releaseSubject(batch) {
  return JSON.stringify(batch);
}

function freshReleaseGuard({ batch, store, repo }) {
  const batchId = batch.id;
  const expected = releaseSubject(batch);
  return async () => {
    const state = store ? structuredClone(validateState(await store.load(), repo)) : null;
    const current = state ? state.batches.find((item) => item.id === batchId) : batch;
    assertNoReleaseHold(current);
    if (!current || releaseSubject(current) !== expected)
      fail('verified release identity changed during asynchronous verification');
    return { state, current };
  };
}

async function persistReleaseTransition({ state, batch, guard, store, repo }) {
  const saved = structuredClone(batch);
  const afterSave = freshReleaseGuard({ batch: saved, store, repo });
  await store.save(structuredClone(state), { guard });
  await afterSave();
  return saved;
}

export async function releaseBatch({
  repo,
  github,
  store,
  batchId,
  reviewedSha,
  execute = false,
  configured = {},
  sourcePolicy,
}) {
  sourcePolicy = releaseSourcePolicy(sourcePolicy);
  if (sourcePolicy === DEMO_SOURCE_POLICIES.exact && repo !== 'l2v-hub/ClinicOS')
    fail('exact demo release requires the fixed repository');
  if (typeof repo !== 'string' || !repo.includes('/')) throw new TypeError('repo is required');
  if (typeof batchId !== 'string' || !/^bug-batch-[1-9][0-9]*$/.test(batchId))
    throw new TypeError('a valid batch_id is required');
  if (typeof reviewedSha !== 'string' || !SHA_RE.test(reviewedSha))
    throw new TypeError('a full reviewed commit SHA is required');
  if (!github || !store?.load || !store?.save)
    throw new TypeError('GitHub adapter and durable state store are required');

  const initial = validateState(await store.load(), repo);
  const batch = structuredClone(initial.batches.find((candidate) => candidate.id === batchId));
  if (!batch) fail('batch is absent from durable state');
  assertNoReleaseHold(batch);
  assertSavedPolicy(batch, sourcePolicy);
  let guard = freshReleaseGuard({ batch, store, repo });
  const exact = sourcePolicy === DEMO_SOURCE_POLICIES.exact;
  const ensureExact = async (operation, expectedSha) => {
    if (!execute && batch.exactDemoDispatches?.[operation] === undefined)
      fail('execution flag required before exact workflow dispatch');
    if (typeof github.ensureExactDemoRun !== 'function') fail('exact dispatch adapter unavailable');
    return github.ensureExactDemoRun({
      operation,
      expectedSha,
      progress: batch.exactDemoDispatches?.[operation],
      guard: () => guard(),
      saveProgress: async (progress) => {
        if (JSON.stringify(batch.exactDemoDispatches?.[operation]) === JSON.stringify(progress))
          return;
        const oldGuard = guard;
        const { state, current } = await oldGuard();
        current.exactDemoDispatches = { ...current.exactDemoDispatches, [operation]: progress };
        const saved = await persistReleaseTransition({
          state,
          batch: current,
          guard: oldGuard,
          store,
          repo,
        });
        Object.assign(batch, saved);
        guard = freshReleaseGuard({ batch, store, repo });
      },
    });
  };
  const preflight = async () => {
    if (exact) return ensureExact('preflight');
    if (typeof github.verifyDemoPreflight !== 'function')
      fail('trusted demo preflight reader unavailable');
    return github.verifyDemoPreflight({ sourcePolicy });
  };
  const finishMerged = async (result) => {
    if (exact && result.deployments.backend) {
      const proof = await ensureExact('deploy', result.mergeSha);
      return { ...result, railwayRunUrl: proof.runUrl };
    }
    return result;
  };
  if (batch.release?.status === 'deployed') {
    if (batch.release.reviewedSha !== reviewedSha)
      fail('batch is already deployed from a different reviewed revision');
    const candidate = await verifyCurrentCandidate({
      batch,
      sha: reviewedSha,
      repo,
      github,
      allowClosedIssues: true,
    });
    if (
      candidate.feedback.state !== 'MERGED' ||
      candidate.feedback.mergeCommitSha !== batch.release.mergeSha ||
      !SHA_RE.test(batch.release.mergeSha ?? '') ||
      batch.release.deployment?.reviewedSha !== reviewedSha ||
      batch.release.deployment?.mergeSha !== batch.release.mergeSha ||
      !['deployed', 'not-required'].includes(batch.release.deployment?.status)
    )
      fail('deployed recovery must match the verified reviewed merge');
    await guard();

    return {
      ok: true,
      status: 'deployed',
      batchId,
      reviewedSha,
      mergeSha: batch.release.mergeSha,
      deployments: { frontend: false, backend: false, runtime: false },
      deployment: batch.release.deployment,
    };
  }

  const candidate = await verifyCurrentCandidate({ batch, sha: reviewedSha, repo, github });
  await guard();
  assertDeploymentPrerequisites(candidate.deployments, configured, sourcePolicy);
  if (candidate.deployments.backend) {
    if (exact && candidate.feedback.state === 'MERGED') {
      if (batch.exactDemoDispatches?.preflight?.phase !== 'succeeded')
        fail('exact merge recovery requires the saved successful preflight');
    } else await preflight();
  }
  await guard();
  if (!execute)
    return {
      ok: true,
      status: 'ready-to-release',
      batchId,
      reviewedSha,
      deployments: candidate.deployments,
    };

  if (candidate.feedback.state === 'MERGED') {
    if (batch.release?.reviewedSha && batch.release.reviewedSha !== reviewedSha)
      fail('recorded merge belongs to a different reviewed revision');
    if (!SHA_RE.test(candidate.feedback.mergeCommitSha ?? ''))
      fail('merged PR has no verifiable merge commit');
    const { state, current } = await guard();
    current.release = {
      sourcePolicy,
      status: 'merged',
      reviewedSha,
      mergeSha: candidate.feedback.mergeCommitSha,
      prNumber: batch.pr.number,
      deployments: candidate.deployments,
    };
    const saved = await persistReleaseTransition({ state, batch: current, guard, store, repo });
    Object.assign(batch, saved);
    guard = freshReleaseGuard({ batch, store, repo });
    return finishMerged({
      ok: true,
      status: 'merged',
      alreadyMerged: true,
      batchId,
      reviewedSha,
      mergeSha: candidate.feedback.mergeCommitSha,
      deployments: candidate.deployments,
    });
  }

  if (candidate.feedback.isDraft) {
    await guard();
    await github.draftReady(batch.pr.number, { guard });
    await guard();
  }

  // Reverify the frozen target, then compare fresh durable authorization again.
  await guard();
  const finalCandidate = await verifyCurrentCandidate({
    batch,
    sha: reviewedSha,
    repo,
    github,
    verifyBlobs: false,
  });
  await guard();
  if (finalCandidate.deployments.backend) await preflight();
  await guard();
  if (finalCandidate.feedback.state !== 'OPEN' || finalCandidate.feedback.isDraft)
    fail('PR must be open and ready for review before merge');

  const mergeGuard =
    exact && finalCandidate.deployments.backend
      ? async () => {
          await guard();
          await preflight();
          return guard();
        }
      : guard;
  const merge = await github.mergePullRequest(batch.pr.number, reviewedSha, { guard: mergeGuard });
  const { state, current } = await guard();
  current.release = {
    sourcePolicy,
    status: 'merged',
    reviewedSha,
    mergeSha: merge.mergeSha,
    prNumber: batch.pr.number,
    deployments: finalCandidate.deployments,
  };
  const saved = await persistReleaseTransition({ state, batch: current, guard, store, repo });
  Object.assign(batch, saved);
  guard = freshReleaseGuard({ batch, store, repo });
  return finishMerged({
    ok: true,
    status: 'merged',
    batchId,
    reviewedSha,
    mergeSha: merge.mergeSha,
    deployments: finalCandidate.deployments,
  });
}

function validateDeploymentUrl(value, kind) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    if (kind === 'vercel')
      return url.hostname === 'clinicos-eosin.vercel.app' || url.hostname.endsWith('.vercel.app');
    return (
      url.hostname === 'github.com' &&
      /^\/l2v-hub\/ClinicOS\/actions\/runs\/[1-9][0-9]*$/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

export async function recordDeployment({
  repo,
  github,
  store,
  batchId,
  mergeSha,
  vercelUrl = '',
  railwayRunUrl = '',
  runtimeRunUrl = '',
  sourcePolicy,
}) {
  sourcePolicy = releaseSourcePolicy(sourcePolicy);
  if (
    typeof batchId !== 'string' ||
    !/^bug-batch-[1-9][0-9]*$/.test(batchId) ||
    !SHA_RE.test(mergeSha ?? '')
  )
    throw new TypeError('invalid deployment batch or merge SHA');
  const initial = validateState(await store.load(), repo);
  const batch = structuredClone(initial.batches.find((item) => item.id === batchId));
  if (
    !batch?.release ||
    !['merged', 'deployed'].includes(batch.release.status) ||
    batch.release.mergeSha !== mergeSha
  )
    fail('deployment does not match a recorded production merge');
  assertNoReleaseHold(batch);
  assertSavedPolicy(batch, sourcePolicy);
  if (
    batch.phase !== 'ready' ||
    batch.sha !== batch.release.reviewedSha ||
    batch.approvedSha !== batch.sha ||
    implementationAttempts(batch).at(-1)?.status !== 'passed' ||
    (batch.release.prNumber !== undefined && batch.release.prNumber !== batch.pr?.number)
  )
    fail('recorded release no longer matches its approved candidate');
  verifyReviewProof(batch, batch.sha);
  const guard = freshReleaseGuard({ batch, store, repo });
  if (publicationComplete(batch))
    return {
      ok: true,
      status: 'deployed',
      batchId,
      mergeSha,
      deployments: appDeployments(batch),
      alreadyPublished: true,
    };
  const deployments = appDeployments(batch);
  vercelUrl ||= batch.release.deployment?.vercelUrl || '';
  railwayRunUrl ||= batch.release.deployment?.railwayRunUrl || '';
  runtimeRunUrl ||= batch.release.deployment?.runtimeRunUrl || '';
  if (deployments.frontend && !validateDeploymentUrl(vercelUrl, 'vercel'))
    fail('successful Vercel deployment URL is required for frontend changes');
  if (deployments.backend && !validateDeploymentUrl(railwayRunUrl, 'railway'))
    fail('successful Railway workflow URL is required for backend changes');
  if (deployments.runtime && !validateDeploymentUrl(runtimeRunUrl, 'railway'))
    fail('successful Railway workflow URL is required for AI runtime changes');

  if (deployments.backend) assertExactDispatchProof(batch, sourcePolicy, mergeSha, railwayRunUrl);
  let demo;
  if (deployments.backend) {
    if (typeof github.verifyDemoRelease !== 'function')
      fail('trusted demo release verifier unavailable');
    demo = await github.verifyDemoRelease({
      runUrl: railwayRunUrl,
      mergeSha,
      reviewedSha: batch.release.reviewedSha,
      sourcePolicy,
    });
  }
  const { state, current } = await guard();
  current.release.deployment = {
    status:
      deployments.frontend || deployments.backend || deployments.runtime
        ? 'deployed'
        : 'not-required',
    reviewedSha: current.release.reviewedSha,
    mergeSha,
    ...(deployments.frontend ? { vercelUrl } : {}),
    ...(deployments.backend ? { railwayRunUrl, demo } : {}),
    ...(deployments.runtime ? { runtimeRunUrl } : {}),
    completedAt: new Date().toISOString(),
  };
  current.release.status = 'deployed';
  current.release.publication = publicationRecord(current, 'pending');
  const saved = await persistReleaseTransition({ state, batch: current, guard, store, repo });

  await publishDeploymentCompletion({ batch: saved, github, store, repo, sourcePolicy });
  return { ok: true, status: current.release.deployment.status, batchId, mergeSha, deployments };
}

export async function publishDeploymentCompletion({ batch, github, store, repo, sourcePolicy }) {
  sourcePolicy = releaseSourcePolicy(sourcePolicy);
  assertSavedPolicy(batch, sourcePolicy);
  const suppliedBatch = batch;
  batch = structuredClone(batch);
  assertNoReleaseHold(batch);
  const { mergeSha, reviewedSha, deployment } = batch.release ?? {};
  if (
    batch.release?.status !== 'deployed' ||
    !SHA_RE.test(mergeSha ?? '') ||
    !SHA_RE.test(reviewedSha ?? '') ||
    !['deployed', 'not-required'].includes(deployment?.status)
  )
    fail('completion publication requires durable verified deployment facts');
  const { vercelUrl, railwayRunUrl, runtimeRunUrl } = deployment;
  const deployments = appDeployments(batch);
  if (
    deployment.reviewedSha !== reviewedSha ||
    deployment.mergeSha !== mergeSha ||
    batch.sha !== reviewedSha
  )
    fail('completion deployment revision does not match its reviewed merge');
  if (
    (deployments.frontend && !validateDeploymentUrl(vercelUrl, 'vercel')) ||
    (deployments.backend && !validateDeploymentUrl(railwayRunUrl, 'railway')) ||
    (deployments.runtime && !validateDeploymentUrl(runtimeRunUrl, 'railway'))
  )
    fail('completion publication requires the confirmed deployment links');
  if (
    deployments.backend &&
    (!deployment.demo?.receipt ||
      deployment.demo.receipt.mergeSha !== mergeSha ||
      deployment.demo.reviewedSha !== reviewedSha ||
      deployment.demo.runUrl !== railwayRunUrl)
  )
    fail('completion requires the verified demo deployment receipt');
  if (deployments.backend) assertExactDispatchProof(batch, sourcePolicy, mergeSha, railwayRunUrl);
  const fresh = freshReleaseGuard({ batch: store ? batch : suppliedBatch, store, repo });
  const guard = async () => {
    const verified = await fresh();
    const current = verified.current;
    if (
      current.phase !== 'ready' ||
      current.sha !== reviewedSha ||
      current.approvedSha !== reviewedSha ||
      implementationAttempts(current).at(-1)?.status !== 'passed'
    )
      fail('verified release identity changed before issue publication or closure');
    verifyReviewProof(current, reviewedSha);
    return verified;
  };
  await guard();
  if (publicationComplete(batch)) return { status: 'published' };
  if (deployments.backend) {
    if (typeof github.verifyDemoRelease !== 'function')
      fail('trusted live demo verifier unavailable');
    const currentProof = await github.verifyDemoRelease({
      runUrl: railwayRunUrl,
      mergeSha,
      reviewedSha,
      sourcePolicy,
    });
    if (
      currentProof.artifactDigest !== deployment.demo.artifactDigest ||
      currentProof.receiptSha256 !== deployment.demo.receiptSha256
    )
      fail('persisted demo receipt differs from trusted current proof');
  }
  const batchId = batch.id;
  const marker = `<!-- codex-bug-pipeline:deployment:${batchId}:${mergeSha} -->`;
  const links = [
    `[PR](${batch.pr.url})`,
    ...(deployments.frontend ? [`[Frontend produzione](${vercelUrl})`] : []),
    ...(deployments.backend ? [`[Deploy Railway riuscito](${railwayRunUrl})`] : []),
    ...(deployments.runtime ? [`[Deploy AI runtime riuscito](${runtimeRunUrl})`] : []),
  ];
  const body = `${marker}\n**Rilascio verificato** — verifiche, evidenze e review completate per ${batchId} sulla revisione ${reviewedSha}, merge ${mergeSha}. ${links.join(' · ')}.`;
  for (const issueNumber of batch.issues) {
    await guard();
    const issue = await github.viewIssue(issueNumber);
    await guard();
    const alreadyPosted = (issue.comments ?? []).some((comment) =>
      String(comment.body ?? '').includes(marker),
    );
    if (!alreadyPosted) await github.commentIssue(issueNumber, body, { guard });
    await guard();
    await github.setIssueStatus(issueNumber, 'Risolto', { guard });
  }
  const { state, current } = await guard();
  current.release.publication = {
    ...publicationRecord(current, 'published'),
    completedAt: new Date().toISOString(),
  };
  if (store) {
    await persistReleaseTransition({ state, batch: current, guard, store, repo });
  }
  return { status: 'published' };
}

async function writeOutputs(outputs) {
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(
      process.env.GITHUB_OUTPUT,
      Object.entries(outputs)
        .map(([key, value]) => `${key}=${value}\n`)
        .join(''),
    );
  }
}

export async function main({ env = process.env, args = process.argv.slice(2) } = {}) {
  const sourcePolicy = releaseSourcePolicy(env.BUG_PIPELINE_DEMO_SOURCE_POLICY);
  const mode = env.BUG_PIPELINE_RELEASE_ACTION || 'release';
  if (
    sourcePolicy === DEMO_SOURCE_POLICIES.exact &&
    mode !== 'record' &&
    !env.BUG_PIPELINE_ACTIONS_TOKEN
  )
    fail('scoped Actions dispatch binding required');
  if (
    sourcePolicy === DEMO_SOURCE_POLICIES.exact &&
    (env.GITHUB_REPOSITORY !== 'l2v-hub/ClinicOS' ||
      env.GITHUB_REF !== 'refs/heads/main' ||
      env.GITHUB_WORKFLOW_REF !==
        'l2v-hub/ClinicOS/.github/workflows/codex-bug-release.yml@refs/heads/main' ||
      !['workflow_dispatch', 'workflow_run'].includes(env.GITHUB_EVENT_NAME))
  )
    fail('exact dispatch requires the fixed protected main release workflow');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const runtimeRoot = path.join(
    env.RUNNER_TEMP || path.dirname(root),
    '.clinicos-release-sessions',
  );
  await mkdir(runtimeRoot, { recursive: true, mode: 0o700 });
  const run = createRunner({ env, runtimeRoot });
  const repo = env.GITHUB_REPOSITORY || 'l2v-hub/ClinicOS';
  const github = createGitHub({ cwd: root, repo, run });
  const store = github.createStateStore();
  const proofReader = () => createProofReader({ token: env.GH_TOKEN || env.GITHUB_TOKEN });
  github.verifyDemoPreflight = () => verifyDemoPreflight({ reader: proofReader(), sourcePolicy });
  if (sourcePolicy === DEMO_SOURCE_POLICIES.exact && mode !== 'record') {
    const dispatcher = createExactDemoDispatcher({
      reader: proofReader(),
      postDispatch: createExactDispatchPoster({
        run: createRunner({
          env: { ...env, GH_TOKEN: env.BUG_PIPELINE_ACTIONS_TOKEN, GITHUB_TOKEN: undefined },
          runtimeRoot,
        }),
        cwd: root,
      }),
    });
    github.ensureExactDemoRun = (input) => dispatcher.ensure(input);
  }
  github.verifyDemoRelease = (input) =>
    verifyReleaseDemo({
      ...input,
      sourcePolicy,
      reader: proofReader(),
      client: createRailwayClient({ token: env.RAILWAY_DEMO_TOKEN }),
    });

  if (mode === 'record') {
    const result = await recordDeployment({
      repo,
      github,
      store,
      batchId: env.BUG_PIPELINE_BATCH_ID,
      mergeSha: env.BUG_PIPELINE_MERGE_SHA,
      vercelUrl: env.VERCEL_DEPLOYMENT_URL || '',
      railwayRunUrl: env.RAILWAY_DEPLOYMENT_RUN_URL || '',
      runtimeRunUrl: env.RUNTIME_DEPLOYMENT_RUN_URL || '',
      sourcePolicy,
    });
    console.log(JSON.stringify(result));
    return 0;
  }

  const event = env.GITHUB_EVENT_PATH
    ? JSON.parse(await readFile(env.GITHUB_EVENT_PATH, 'utf8'))
    : {};
  let batchId = env.BUG_PIPELINE_BATCH_ID || event.inputs?.batch_id || '';
  let reviewedSha = env.BUG_PIPELINE_REVIEWED_SHA || event.inputs?.reviewed_sha || '';
  const execute = env.BUG_PIPELINE_RELEASE_EXECUTE === 'true';
  if (env.GITHUB_EVENT_NAME === 'workflow_run') {
    if (
      env.BUG_PIPELINE_AUTO_RELEASE !== 'true' ||
      event.workflow_run?.conclusion !== 'success' ||
      event.workflow_run?.name !== 'Codex bug pipeline' ||
      event.workflow_run?.head_branch !== 'main' ||
      event.workflow_run?.head_repository?.full_name !== repo
    ) {
      fail(
        'automatic release requires a successful Codex bug pipeline run and BUG_PIPELINE_AUTO_RELEASE=true',
      );
    }
    const state = validateState(await store.load(), repo);
    const candidate = selectAutoReleaseBatch(state);
    if (!candidate) {
      await writeOutputs({ status: 'no-ready-batch', frontend: 'false', backend: 'false' });
      console.log(JSON.stringify({ status: 'no-ready-batch' }));
      return 0;
    }
    batchId = candidate.id;
    reviewedSha = candidate.approvedSha;
  } else if (env.GITHUB_EVENT_NAME === 'workflow_dispatch') {
    if (env.GITHUB_REF !== 'refs/heads/main' || !batchId || !reviewedSha)
      fail('workflow_dispatch from main requires both batch_id and reviewed_sha');
  } else if (!args.includes('--run')) {
    fail('release requires GitHub workflow_dispatch or the trusted pipeline workflow_run event');
  }

  if (execute !== true)
    fail('release execution flag is not enabled for this trusted workflow invocation');
  const result = await releaseBatch({
    repo,
    github,
    store,
    batchId,
    reviewedSha,
    execute: true,
    sourcePolicy,
    configured: {
      botToken: env.CLINICOS_BOT_TOKEN_CONFIGURED === 'true',
      vercel: env.VERCEL_CONFIGURED === 'true',
      railway: env.RAILWAY_CONFIGURED === 'true',
    },
  });
  await writeOutputs({
    status: result.status,
    batch_id: result.batchId,
    reviewed_sha: result.reviewedSha,
    merge_sha: result.mergeSha || '',
    frontend: String(result.deployments?.frontend === true),
    backend: String(result.deployments?.backend === true),
    runtime: String(result.deployments?.runtime === true),
    railway_url: result.railwayRunUrl || '',
  });
  console.log(JSON.stringify(result));
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = await main();
  } catch {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    const diagnostics = path.join(root, 'agent-team', '.runtime', 'bug-pipeline');
    await mkdir(diagnostics, { recursive: true });
    await writeFile(
      path.join(diagnostics, 'release-diagnostic.json'),
      JSON.stringify({
        status: 'blocked-release',
        reason:
          'Inspect protected environment credentials, durable approvals, evidence and required checks.',
      }) + '\n',
    );
    console.error(
      'Production release blocked: durable approval or deployment prerequisites did not pass.',
    );
    process.exitCode = 1;
  }
}
