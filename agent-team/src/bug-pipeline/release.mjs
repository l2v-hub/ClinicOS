import { automationPaused, operatorOwns } from './operator-ownership.mjs';
import { randomUUID } from 'node:crypto';
import { exactBlockCode, archiveRecovery, verifyReleaseAncestry } from './exact-demo-recovery.mjs';
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
  verifyProductionBackend,
  waitForProductionBackend,
} from './demo-deployment.mjs';
import {
  createExactDemoDispatcher,
  createExactDispatchPoster,
  verifyRetiredExactDispatches,
} from './exact-demo-dispatch.mjs';
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
    Boolean(batch?.releaseBlock) ||
    (batch?.releaseHold !== undefined && batch.releaseHold !== null && batch.releaseHold !== false)
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
    !hasReleaseHold(batch) &&
    (!appDeployments(batch).backend ||
      (batch.release.deployment?.production?.sha ===
        (batch.release.deploymentSha ?? batch.release.mergeSha) &&
        DIGEST_RE.test(batch.release.deployment.production.proofSha256 ?? ''))) &&
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
  if (automationPaused(state)) return null;
  return (
    state.batches
      .filter(
        (batch) =>
          !operatorOwns(state, 'batches', batch) &&
          batch.phase === 'ready' &&
          !hasReleaseHold(batch) &&
          !batch.releaseBlock &&
          batch.sha &&
          batch.approvedSha === batch.sha &&
          hasFinalCodexProof(batch, batch.sha) &&
          (batch.release?.status !== 'deployed' || !publicationComplete(batch)),
      )
      .sort((a, b) => Math.min(...a.issues) - Math.min(...b.issues))[0] ?? null
  );
}

function assertNoReleaseHold(batch) {
  if (hasReleaseHold(batch) || batch?.releaseBlock)
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

function hasFinalCodexProof(batch, sha) {
  // Both comment handoffs and the original external worker persist externalReview;
  // the channel value is not an authorization switch.
  if (!batch.externalReview) return true;
  const proof = batch.codexFinalReview;
  return Boolean(
    proof?.status === 'verified' &&
    proof.subjectSha === sha &&
    sha === batch.sha &&
    proof.claudeRound === batch.reviews.length &&
    typeof batch.feedbackFingerprint === 'string' &&
    batch.feedbackFingerprint.length > 0 &&
    proof.feedbackFingerprint === batch.feedbackFingerprint &&
    batch.externalReview.subjectSha === sha &&
    batch.externalReview.feedbackFingerprint === batch.feedbackFingerprint,
  );
}
function verifyFinalCodexProof(batch, sha) {
  if (!hasFinalCodexProof(batch, sha))
    fail('external review requires verified final Codex proof for this SHA, round and feedback');
}

function verifyReviewProof(batch, sha) {
  verifyFinalCodexProof(batch, sha);
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
  if ((deployments.runtime || deployments.backend) && configured?.railway !== true)
    fail('RAILWAY_TOKEN is required before merging Railway service changes');
}

// Freeze the entire authorized subject, including plan, evidence and review ledgers.
// Remote verification must never acquire a newly loaded PR or source-issue set.
function releaseSubject(batch) {
  return JSON.stringify(batch);
}

function assertAutomaticReleaseOwnership(state, batch, automatic) {
  if (automatic && (automationPaused(state) || (batch && operatorOwns(state, 'batches', batch))))
    throw Object.assign(new ReleaseGateError('Automatic release subject is operator-owned'), {
      code: 'release-operator-owned',
    });
}

function freshReleaseGuard({ batch, store, repo, automatic = false }) {
  const batchId = batch.id;
  const expected = releaseSubject(batch);
  return async () => {
    const state = store ? structuredClone(validateState(await store.load(), repo)) : null;
    const current = state ? state.batches.find((item) => item.id === batchId) : batch;
    if (state) assertAutomaticReleaseOwnership(state, current, automatic);
    assertNoReleaseHold(current);
    if (current) verifyFinalCodexProof(current, current.sha);
    if (!current || releaseSubject(current) !== expected)
      fail('verified release identity changed during asynchronous verification');
    return { state, current };
  };
}

async function persistReleaseTransition({ state, batch, guard, store, repo, automatic = false }) {
  const saved = structuredClone(batch);
  const afterSave = freshReleaseGuard({ batch: saved, store, repo, automatic });
  await store.save(structuredClone(state), { guard });
  await afterSave();
  return saved;
}

// A block is durable and fail-closed even for older helpers that only honor releaseHold.
async function verifyExactReleaseTarget({ batch, github, sourcePolicy }) {
  if (sourcePolicy !== DEMO_SOURCE_POLICIES.exact) return;
  const deploymentSha = batch.release?.deploymentSha ?? batch.release?.mergeSha;
  if (
    !SHA_RE.test(deploymentSha ?? '') ||
    typeof github.currentReleaseMain !== 'function' ||
    (await github.currentReleaseMain()) !== deploymentSha
  ) {
    const error = new ReleaseGateError('current main changed before exact deployment completion');
    error.code = 'EXACT_MAIN_CHANGED';
    throw error;
  }
  if (deploymentSha !== batch.release.mergeSha)
    await github.verifyReleaseAncestry({
      originalMergeSha: batch.release.mergeSha,
      deploymentSha,
    });
}

async function persistExactBlock({ batch, store, github, repo, guard, code }) {
  const { state, current } = await guard();
  current.releaseBlock = {
    id: randomUUID(),
    code,
    reviewedSha: current.sha,
    mergeSha: current.release?.mergeSha ?? null,
    at: new Date().toISOString(),
  };
  current.releaseHold = 'exact-release-block';
  const expected = JSON.stringify(current);
  await store.save(structuredClone(state), { guard });
  const blockedGuard = async () => {
    const fresh = validateState(await store.load(), repo);
    const item = fresh.batches.find((x) => x.id === current.id);
    if (JSON.stringify(item) !== expected) fail('blocked release ownership changed');
  };
  await blockedGuard();
  const marker = `<!-- codex-bug-pipeline:release-block:${current.id}:${current.releaseBlock.id} -->`;
  const productionHint = ['PRODUCTION_RUN_REQUIRED', 'PRODUCTION_RUN_PENDING_TIMEOUT'].includes(
    code,
  )
    ? ` Deve esistere un deploy di produzione per lo SHA main esatto ${current.release?.deploymentSha ?? current.release?.mergeSha ?? current.sha}; può essere necessario un dispatch manuale esplicito di deploy-backend.yml su main. Il controller non avvia quel deploy.`
    : '';
  const body = `${marker}\nRilascio bloccato: ${code}.${productionHint} Le issue restano aperte. Solo un recupero esplicito autorizzato può creare un nuovo intento; un retry non ridistribuisce.`;
  for (const number of [...new Set([current.pr.number, ...current.issues])]) {
    await blockedGuard();
    const issue = await github.viewIssue(number);
    if (!(issue.comments ?? []).some((x) => x.body === body))
      await github.commentIssue(number, body, { guard: blockedGuard });
    await github.setIssueStatus(number, 'Bloccato', { guard: blockedGuard });
  }
}

export async function recoverExactRelease({
  repo,
  github,
  store,
  batchId,
  reviewedSha,
  blockId,
  context,
  newId,
  now,
}) {
  if (
    repo !== 'l2v-hub/ClinicOS' ||
    !SHA_RE.test(reviewedSha ?? '') ||
    typeof blockId !== 'string' ||
    typeof github?.authorizeReleaseRecovery !== 'function' ||
    typeof github.currentReleaseMain !== 'function'
  )
    fail('explicit authenticated exact recovery required');
  const state = structuredClone(validateState(await store.load(), repo));
  const batch = state.batches.find((item) => item.id === batchId);
  if (
    !batch ||
    batch.sha !== reviewedSha ||
    batch.releaseBlock?.id !== blockId ||
    batch.releaseBlock.reviewedSha !== reviewedSha ||
    batch.releaseHold !== 'exact-release-block' ||
    (batch.release &&
      (batch.release.sourcePolicy !== DEMO_SOURCE_POLICIES.exact ||
        !['merged', 'deployed'].includes(batch.release.status)))
  )
    fail('recovery must match the current blocked approved subject');
  const snapshot = JSON.stringify(batch);
  const guard = async () => {
    const current = validateState(await store.load(), repo).batches.find((x) => x.id === batchId);
    if (JSON.stringify(current) !== snapshot) fail('recovery ownership changed');
  };
  const actor = await github.authorizeReleaseRecovery(context);
  await guard();
  const checked = structuredClone(batch);
  delete checked.releaseHold;
  delete checked.releaseBlock;
  const candidate = await verifyCurrentCandidate({
    batch: checked,
    sha: reviewedSha,
    repo,
    github,
  });
  if (
    (candidate.feedback.state === 'MERGED') !== Boolean(batch.release?.mergeSha) ||
    (batch.release?.mergeSha && candidate.feedback.mergeCommitSha !== batch.release.mergeSha)
  )
    fail('recovery original merge identity changed');
  const deploymentSha = await github.currentReleaseMain();
  if (!SHA_RE.test(deploymentSha ?? '')) fail('authenticated current main required');
  if (batch.release?.mergeSha) {
    if (typeof github.verifyReleaseAncestry !== 'function')
      fail('authenticated ancestry reader required');
    await github.verifyReleaseAncestry({
      originalMergeSha: batch.release.mergeSha,
      deploymentSha,
    });
  }
  await guard();
  if (
    (await github.authorizeReleaseRecovery(context)) !== actor ||
    (await github.currentReleaseMain()) !== deploymentSha
  )
    fail('recovery authorization or current main changed');
  await guard();
  const oldDispatches = structuredClone(batch.exactDemoDispatches ?? {});
  const recoveryBlockedAt = batch.releaseBlock.at;
  const oldRecoveries = structuredClone(batch.exactReleaseRecoveries ?? []);
  const oldExclusions = structuredClone(batch.exactDemoRecovery?.excludedDispatches ?? []);
  const verifyOldRuns = async (retirementProof) => {
    if (!Object.keys(oldDispatches).length && !oldRecoveries.length && !oldExclusions.length)
      return {
        retiredRunIds: [],
        noRunProofs: [],
        retiredRuns: [],
        lateRetiredRunIds: [],
      };
    if (typeof github.verifyExactRecoveryRuns !== 'function')
      fail('retired run verification required');
    return github.verifyExactRecoveryRuns({
      dispatches: oldDispatches,
      recoveries: oldRecoveries,
      excludedDispatches: oldExclusions,
      blockedAt: recoveryBlockedAt,
      retirementProof,
    });
  };
  const retirementProof = await verifyOldRuns();
  const recoveryGuard = async () => {
    await guard();
    if (
      (await github.authorizeReleaseRecovery(context)) !== actor ||
      (await github.currentReleaseMain()) !== deploymentSha
    )
      fail('recovery authorization or current main changed');
    if (batch.release?.mergeSha)
      await github.verifyReleaseAncestry({
        originalMergeSha: batch.release.mergeSha,
        deploymentSha,
      });
    if (JSON.stringify(await verifyOldRuns(retirementProof)) !== JSON.stringify(retirementProof))
      fail('retired run identities changed');
    await guard();
  };
  await recoveryGuard();
  const archive = archiveRecovery(batch, {
    actor,
    deploymentSha,
    extraRunIds: [
      ...retirementProof.retiredRunIds,
      ...retirementProof.lateRetiredRunIds.map((proof) => proof.runId),
    ],
    retirementProof,
    newId,
    now,
  });
  await store.save(structuredClone(state), { guard: recoveryGuard });
  const after = validateState(await store.load(), repo).batches.find((x) => x.id === batchId);
  if (JSON.stringify(after) !== JSON.stringify(batch)) fail('recovery persistence changed');
  return {
    status: 'recovered',
    batchId,
    reviewedSha,
    deploymentSha,
    recoveryId: archive.id,
  };
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
  automatic = false,
}) {
  if (typeof automatic !== 'boolean')
    throw new TypeError('automatic release context must be boolean');
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
  assertAutomaticReleaseOwnership(initial, batch, automatic);
  assertNoReleaseHold(batch);
  verifyFinalCodexProof(batch, reviewedSha);
  assertSavedPolicy(batch, sourcePolicy);
  let guard = freshReleaseGuard({ batch, store, repo, automatic });
  const exact = sourcePolicy === DEMO_SOURCE_POLICIES.exact;
  const ensureExact = async (operation, expectedSha) => {
    if (!execute && batch.exactDemoDispatches?.[operation] === undefined)
      fail('execution flag required before exact workflow dispatch');
    if (typeof github.ensureExactDemoRun !== 'function') fail('exact dispatch adapter unavailable');
    try {
      return await github.ensureExactDemoRun({
        operation,
        expectedSha,
        progress: batch.exactDemoDispatches?.[operation],
        excludedRunIds: batch.exactDemoRecovery?.excludedRunIds ?? [],
        excludedDispatchIds: batch.exactDemoRecovery?.excludedDispatchIds ?? [],
        excludedDispatches: batch.exactDemoRecovery?.excludedDispatches ?? [],
        guard: () => guard(),
        saveProgress: async (progress) => {
          if (JSON.stringify(batch.exactDemoDispatches?.[operation]) === JSON.stringify(progress))
            return;
          const oldGuard = guard;
          const { state, current } = await oldGuard();
          current.exactDemoDispatches = {
            ...current.exactDemoDispatches,
            [operation]: progress,
          };
          const saved = await persistReleaseTransition({
            state,
            batch: current,
            guard: oldGuard,
            store,
            repo,
            automatic,
          });
          Object.assign(batch, saved);
          guard = freshReleaseGuard({ batch, store, repo, automatic });
        },
      });
    } catch (error) {
      if (error?.code === 'release-operator-owned') throw error;
      await persistExactBlock({
        batch,
        store,
        github,
        repo,
        guard,
        code: exactBlockCode(error),
      });
      throw error;
    }
  };
  const preflight = async () => {
    if (exact) return ensureExact('preflight', batch.exactDemoRecovery?.deploymentSha);
    if (typeof github.verifyDemoPreflight !== 'function')
      fail('trusted demo preflight reader unavailable');
    return github.verifyDemoPreflight({ sourcePolicy });
  };
  const finishMerged = async (result) => {
    if (exact && result.deployments.backend) {
      const deploymentSha = batch.release?.deploymentSha ?? result.mergeSha;
      if (deploymentSha !== result.mergeSha)
        await github.verifyReleaseAncestry({
          originalMergeSha: result.mergeSha,
          deploymentSha,
        });
      const proof = await ensureExact('deploy', deploymentSha);
      return { ...result, deploymentSha, railwayRunUrl: proof.runUrl };
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

  const candidate = await verifyCurrentCandidate({
    batch,
    sha: reviewedSha,
    repo,
    github,
  });
  await guard();
  try {
    assertDeploymentPrerequisites(candidate.deployments, configured, sourcePolicy);
  } catch (error) {
    if (exact && candidate.deployments.backend)
      await persistExactBlock({
        batch,
        store,
        github,
        repo,
        guard,
        code: 'PRODUCTION_BINDING_REQUIRED',
      });
    throw error;
  }
  if (candidate.deployments.backend) {
    if (exact && candidate.feedback.state === 'MERGED') {
      if (batch.exactDemoRecovery?.postMerge) await preflight();
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
      ...(batch.release?.deploymentSha ? { deploymentSha: batch.release.deploymentSha } : {}),
      prNumber: batch.pr.number,
      deployments: candidate.deployments,
    };
    const saved = await persistReleaseTransition({
      state,
      batch: current,
      guard,
      store,
      repo,
      automatic,
    });
    Object.assign(batch, saved);
    guard = freshReleaseGuard({ batch, store, repo, automatic });
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
  const merge = await github.mergePullRequest(batch.pr.number, reviewedSha, {
    guard: mergeGuard,
  });
  const { state, current } = await guard();
  current.release = {
    sourcePolicy,
    status: 'merged',
    reviewedSha,
    mergeSha: merge.mergeSha,
    prNumber: batch.pr.number,
    deployments: finalCandidate.deployments,
  };
  const saved = await persistReleaseTransition({
    state,
    batch: current,
    guard,
    store,
    repo,
    automatic,
  });
  Object.assign(batch, saved);
  guard = freshReleaseGuard({ batch, store, repo, automatic });
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
  productionRailwayRunUrl = '',
  deploymentSha,
  runtimeRunUrl = '',
  sourcePolicy,
  productionWait = {},
  automatic = false,
}) {
  if (typeof automatic !== 'boolean')
    throw new TypeError('automatic release context must be boolean');
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
  assertAutomaticReleaseOwnership(initial, batch, automatic);
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
  const guard = freshReleaseGuard({ batch, store, repo, automatic });
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
  deploymentSha ??= batch.release.deploymentSha ?? mergeSha;
  if (!SHA_RE.test(deploymentSha) || deploymentSha !== (batch.release.deploymentSha ?? mergeSha))
    fail('deployment SHA does not match authorized release');
  vercelUrl ||= batch.release.deployment?.vercelUrl || '';
  railwayRunUrl ||= batch.release.deployment?.railwayRunUrl || '';
  productionRailwayRunUrl ||= batch.release.deployment?.productionRailwayRunUrl || '';
  runtimeRunUrl ||= batch.release.deployment?.runtimeRunUrl || '';
  if (deployments.frontend && !validateDeploymentUrl(vercelUrl, 'vercel'))
    fail('successful Vercel deployment URL is required for frontend changes');
  if (deployments.backend && !validateDeploymentUrl(railwayRunUrl, 'railway'))
    fail('successful Railway workflow URL is required for backend changes');
  if (deployments.runtime && !validateDeploymentUrl(runtimeRunUrl, 'railway'))
    fail('successful Railway workflow URL is required for AI runtime changes');

  if (deployments.backend)
    assertExactDispatchProof(batch, sourcePolicy, deploymentSha, railwayRunUrl);
  let demo, production;
  try {
    if (deployments.backend) {
      if (typeof github.verifyProductionBackend !== 'function') {
        const error = new Error('PRODUCTION_RUN_REQUIRED');
        error.code = 'PRODUCTION_RUN_REQUIRED';
        throw error;
      }
      production = await waitForProductionBackend({
        ...productionWait,
        verify: () =>
          github.verifyProductionBackend({
            deploymentSha,
            runUrl: productionRailwayRunUrl,
          }),
        guard: async () => {
          await guard();
          await verifyExactReleaseTarget({ batch, github, sourcePolicy });
        },
      });
      if (
        production?.sha !== deploymentSha ||
        !DIGEST_RE.test(production.proofSha256 ?? '') ||
        !validateDeploymentUrl(production.runUrl, 'railway')
      ) {
        const error = new Error('PRODUCTION_PROOF_FAILED');
        error.code = 'PRODUCTION_PROOF_FAILED';
        throw error;
      }
      productionRailwayRunUrl = production.runUrl;
    }
    if (deployments.backend) await verifyExactReleaseTarget({ batch, github, sourcePolicy });
    if (deployments.backend) {
      if (typeof github.verifyDemoRelease !== 'function')
        fail('trusted demo release verifier unavailable');
      demo = await github.verifyDemoRelease({
        runUrl: railwayRunUrl,
        mergeSha: deploymentSha,
        reviewedSha: batch.release.reviewedSha,
        sourcePolicy,
      });
    }
    if (deployments.backend) await verifyExactReleaseTarget({ batch, github, sourcePolicy });
  } catch (error) {
    if (sourcePolicy === DEMO_SOURCE_POLICIES.exact)
      await persistExactBlock({
        batch,
        store,
        github,
        repo,
        guard,
        code: exactBlockCode(error),
      });
    throw error;
  }
  const { state, current } = await guard();
  current.release.deployment = {
    status:
      deployments.frontend || deployments.backend || deployments.runtime
        ? 'deployed'
        : 'not-required',
    reviewedSha: current.release.reviewedSha,
    mergeSha,
    deploymentSha,
    ...(deployments.frontend ? { vercelUrl } : {}),
    ...(deployments.backend ? { railwayRunUrl, demo, productionRailwayRunUrl, production } : {}),
    ...(deployments.runtime ? { runtimeRunUrl } : {}),
    completedAt: new Date().toISOString(),
  };
  current.release.status = 'deployed';
  current.release.publication = publicationRecord(current, 'pending');
  const saved = await persistReleaseTransition({
    state,
    batch: current,
    guard,
    store,
    repo,
    automatic,
  });

  await publishDeploymentCompletion({
    batch: saved,
    github,
    store,
    repo,
    sourcePolicy,
    automatic,
  });
  return {
    ok: true,
    status: current.release.deployment.status,
    batchId,
    mergeSha,
    deployments,
  };
}

export async function publishDeploymentCompletion({
  batch,
  github,
  store,
  repo,
  sourcePolicy,
  automatic = false,
}) {
  if (typeof automatic !== 'boolean')
    throw new TypeError('automatic release context must be boolean');
  if (automatic && !store?.load)
    throw new TypeError('automatic completion requires a durable store');
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
  const { vercelUrl, railwayRunUrl, runtimeRunUrl, productionRailwayRunUrl } = deployment;
  const deploymentSha = batch.release.deploymentSha ?? mergeSha;
  if (deployment.deploymentSha !== undefined && deployment.deploymentSha !== deploymentSha)
    fail('completion deployment SHA mismatch');
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
      deployment.demo.receipt.mergeSha !== deploymentSha ||
      deployment.demo.reviewedSha !== reviewedSha ||
      deployment.demo.runUrl !== railwayRunUrl)
  )
    fail('completion requires the verified demo deployment receipt');
  if (deployments.backend)
    assertExactDispatchProof(batch, sourcePolicy, deploymentSha, railwayRunUrl);
  const fresh = freshReleaseGuard({
    batch: store ? batch : suppliedBatch,
    store,
    repo,
    automatic,
  });
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
    if (deployments.backend) {
      try {
        await verifyExactReleaseTarget({
          batch: current,
          github,
          sourcePolicy,
        });
      } catch (error) {
        if (error?.code === 'release-operator-owned') throw error;
        if (sourcePolicy === DEMO_SOURCE_POLICIES.exact && store)
          await persistExactBlock({
            batch: current,
            store,
            github,
            repo,
            guard: fresh,
            code: exactBlockCode(error),
          });
        throw error;
      }
    }
    return verified;
  };
  await guard();
  if (publicationComplete(batch)) return { status: 'published' };
  if (deployments.backend) {
    if (typeof github.verifyDemoRelease !== 'function')
      fail('trusted live demo verifier unavailable');
    try {
      if (typeof github.verifyProductionBackend !== 'function' || !deployment.production) {
        const error = new Error('PRODUCTION_RUN_REQUIRED');
        error.code = 'PRODUCTION_RUN_REQUIRED';
        throw error;
      }
      await verifyExactReleaseTarget({ batch, github, sourcePolicy });
      const currentProduction = await github.verifyProductionBackend({
        deploymentSha,
        runUrl: productionRailwayRunUrl,
      });
      if (JSON.stringify(currentProduction) !== JSON.stringify(deployment.production)) {
        const error = new Error('PRODUCTION_PROOF_FAILED');
        error.code = 'PRODUCTION_PROOF_FAILED';
        throw error;
      }
      if (sourcePolicy === DEMO_SOURCE_POLICIES.exact && deploymentSha !== mergeSha)
        await github.verifyReleaseAncestry({
          originalMergeSha: mergeSha,
          deploymentSha,
        });
      const currentProof = await github.verifyDemoRelease({
        runUrl: railwayRunUrl,
        mergeSha: deploymentSha,
        reviewedSha,
        sourcePolicy,
      });
      if (
        currentProof.artifactDigest !== deployment.demo.artifactDigest ||
        currentProof.receiptSha256 !== deployment.demo.receiptSha256
      )
        fail('persisted demo receipt differs from trusted current proof');
    } catch (error) {
      if (error?.code === 'release-operator-owned') throw error;
      if (sourcePolicy === DEMO_SOURCE_POLICIES.exact)
        await persistExactBlock({
          batch,
          store,
          github,
          repo,
          guard,
          code: exactBlockCode(error),
        });
      throw error;
    }
  }
  const batchId = batch.id;
  const marker = `<!-- codex-bug-pipeline:deployment:${batchId}:${mergeSha} -->`;
  const links = [
    `[PR](${batch.pr.url})`,
    ...(deployments.frontend ? [`[Frontend produzione](${vercelUrl})`] : []),
    ...(deployments.backend
      ? [
          `[Railway produzione verificato](${productionRailwayRunUrl})`,
          `[Railway demo verificato](${railwayRunUrl})`,
        ]
      : []),
    ...(deployments.runtime ? [`[Deploy AI runtime riuscito](${runtimeRunUrl})`] : []),
  ];
  const body = `${marker}\n**Rilascio verificato** — verifiche, evidenze e review completate per ${batchId} sulla revisione ${reviewedSha}, merge ${mergeSha}, revisione distribuita ${deploymentSha}. ${links.join(' · ')}.`;
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
    await persistReleaseTransition({
      state,
      batch: current,
      guard,
      store,
      repo,
      automatic,
    });
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
  if (!['release', 'record', 'recover'].includes(mode)) fail('fixed release action required');
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
          env: {
            ...env,
            GH_TOKEN: env.BUG_PIPELINE_ACTIONS_TOKEN,
            GITHUB_TOKEN: undefined,
          },
          runtimeRoot,
        }),
        cwd: root,
      }),
    });
    github.ensureExactDemoRun = (input) => dispatcher.ensure(input);
  }
  github.verifyExactRecoveryRuns = (input) =>
    verifyRetiredExactDispatches({ ...input, reader: proofReader() });
  github.currentReleaseMain = async () => (await proofReader().getJson('commits/main')).sha;
  github.verifyReleaseAncestry = (input) =>
    verifyReleaseAncestry({ ...input, reader: proofReader() });
  github.verifyProductionBackend = (input) =>
    verifyProductionBackend({ ...input, reader: proofReader() });
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
      productionRailwayRunUrl: env.PRODUCTION_RAILWAY_DEPLOYMENT_RUN_URL || '',
      deploymentSha: env.BUG_PIPELINE_DEPLOYMENT_SHA || undefined,
      runtimeRunUrl: env.RUNTIME_DEPLOYMENT_RUN_URL || '',
      sourcePolicy,
      automatic: env.GITHUB_EVENT_NAME === 'workflow_run',
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
      await writeOutputs({
        status: 'no-ready-batch',
        frontend: 'false',
        backend: 'false',
      });
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
  if (mode === 'recover') {
    if (env.GITHUB_EVENT_NAME !== 'workflow_dispatch')
      fail('recovery requires explicit manual invocation');
    const recovered = await recoverExactRelease({
      repo,
      github,
      store,
      batchId,
      reviewedSha,
      blockId: env.BUG_PIPELINE_RECOVERY_BLOCK_ID || event.inputs?.recovery_block_id,
      context: {
        repository: repo,
        eventName: env.GITHUB_EVENT_NAME,
        ref: env.GITHUB_REF,
        workflowRef: env.GITHUB_WORKFLOW_REF,
        actor: env.GITHUB_ACTOR,
        triggeringActor: env.GITHUB_TRIGGERING_ACTOR,
        sha: env.GITHUB_SHA,
        workflowSha: env.GITHUB_WORKFLOW_SHA,
      },
    });
    await writeOutputs({
      status: 'recovered',
      batch_id: batchId,
      reviewed_sha: reviewedSha,
    });
    console.log(JSON.stringify(recovered));
    return 0;
  }
  const result = await releaseBatch({
    repo,
    github,
    store,
    batchId,
    reviewedSha,
    execute: true,
    automatic: env.GITHUB_EVENT_NAME === 'workflow_run',
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
    deployment_sha: result.deploymentSha || result.mergeSha || '',
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
