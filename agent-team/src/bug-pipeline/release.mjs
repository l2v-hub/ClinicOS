import path from 'node:path';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRunner } from './process.mjs';
import { createGitHub } from './github.mjs';
import { feedbackFingerprint, sha256, validateState } from './contracts.mjs';

const SHA_RE = /^[a-f0-9]{40}$/;
const DIGEST_RE = /^[a-f0-9]{64}$/;

export class ReleaseGateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ReleaseGateError';
  }
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
        saved.bytes > 25 * 1024 * 1024
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

async function verifyCurrentCandidate({ batch, sha, repo, github, verifyBlobs = true }) {
  if (batch.phase !== 'ready' || batch.sha !== sha || batch.approvedSha !== sha)
    fail('batch is not ready and approved for the supplied reviewed SHA');
  if (batch.implementation.at(-1)?.status !== 'passed')
    fail('latest implementation attempt did not pass validation');
  verifyReviewProof(batch, sha);
  if (!batch.pr || !validateIssuePullUrl(batch.pr.url, repo, batch.pr.number))
    fail('durable PR identity does not match this repository');
  if (verifyBlobs) await verifyEvidence(batch, github);

  for (const issueNumber of batch.issues) {
    const issue = await github.viewIssue(issueNumber);
    if (String(issue.state ?? '').toLowerCase() !== 'open')
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

function assertDeploymentPrerequisites(deployments, configured) {
  if (configured?.botToken !== true)
    fail(
      'CLINICOS_BOT_TOKEN is required before release so the main push triggers authorized CI/deploy workflows',
    );
  if (deployments.frontend && configured?.vercel !== true)
    fail(
      'Vercel production token and project bindings are required before merging frontend changes',
    );
  if ((deployments.backend || deployments.runtime) && configured?.railway !== true)
    fail('RAILWAY_TOKEN is required before merging Railway service changes');
}

export async function releaseBatch({
  repo,
  github,
  store,
  batchId,
  reviewedSha,
  execute = false,
  configured = {},
}) {
  if (typeof repo !== 'string' || !repo.includes('/')) throw new TypeError('repo is required');
  if (typeof batchId !== 'string' || !/^bug-batch-[1-9][0-9]*$/.test(batchId))
    throw new TypeError('a valid batch_id is required');
  if (typeof reviewedSha !== 'string' || !SHA_RE.test(reviewedSha))
    throw new TypeError('a full reviewed commit SHA is required');
  if (!github || !store?.load || !store?.save)
    throw new TypeError('GitHub adapter and durable state store are required');

  let state = validateState(await store.load(), repo);
  let batch = state.batches.find((candidate) => candidate.id === batchId);
  if (!batch) fail('batch is absent from durable state');
  if (batch.release?.status === 'deployed') {
    if (batch.release.reviewedSha !== reviewedSha)
      fail('batch is already deployed from a different reviewed revision');
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
  assertDeploymentPrerequisites(candidate.deployments, configured);
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
    batch.release = {
      status: 'merged',
      reviewedSha,
      mergeSha: candidate.feedback.mergeCommitSha,
      prNumber: batch.pr.number,
      deployments: candidate.deployments,
    };
    await store.save(state);
    return {
      ok: true,
      status: 'merged',
      alreadyMerged: true,
      batchId,
      reviewedSha,
      mergeSha: candidate.feedback.mergeCommitSha,
      deployments: candidate.deployments,
    };
  }

  if (candidate.feedback.isDraft) await github.draftReady(batch.pr.number);

  // Re-read state, review feedback and branch-protection checks immediately before merge.
  state = validateState(await store.load(), repo);
  batch = state.batches.find((candidateBatch) => candidateBatch.id === batchId);
  const finalCandidate = await verifyCurrentCandidate({
    batch,
    sha: reviewedSha,
    repo,
    github,
    verifyBlobs: false,
  });
  if (finalCandidate.feedback.state !== 'OPEN' || finalCandidate.feedback.isDraft)
    fail('PR must be open and ready for review before merge');

  const merge = await github.mergePullRequest(batch.pr.number, reviewedSha);
  batch.release = {
    status: 'merged',
    reviewedSha,
    mergeSha: merge.mergeSha,
    prNumber: batch.pr.number,
    deployments: finalCandidate.deployments,
  };
  await store.save(state);
  return {
    ok: true,
    status: 'merged',
    batchId,
    reviewedSha,
    mergeSha: merge.mergeSha,
    deployments: finalCandidate.deployments,
  };
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
}) {
  if (
    typeof batchId !== 'string' ||
    !/^bug-batch-[1-9][0-9]*$/.test(batchId) ||
    !SHA_RE.test(mergeSha ?? '')
  )
    throw new TypeError('invalid deployment batch or merge SHA');
  const state = validateState(await store.load(), repo);
  const batch = state.batches.find((item) => item.id === batchId);
  if (
    !batch?.release ||
    !['merged', 'deployed'].includes(batch.release.status) ||
    batch.release.mergeSha !== mergeSha
  )
    fail('deployment does not match a recorded production merge');
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

  batch.release.deployment = {
    status:
      deployments.frontend || deployments.backend || deployments.runtime
        ? 'deployed'
        : 'not-required',
    reviewedSha: batch.release.reviewedSha,
    mergeSha,
    ...(deployments.frontend ? { vercelUrl } : {}),
    ...(deployments.backend ? { railwayRunUrl } : {}),
    ...(deployments.runtime ? { runtimeRunUrl } : {}),
    completedAt: new Date().toISOString(),
  };
  batch.release.status = 'deployed';
  await store.save(state);

  const marker = `<!-- codex-bug-pipeline:deployment:${batchId}:${mergeSha} -->`;
  const links = [
    `[PR](${batch.pr.url})`,
    ...(deployments.frontend ? [`[Frontend produzione](${vercelUrl})`] : []),
    ...(deployments.backend ? [`[Deploy Railway riuscito](${railwayRunUrl})`] : []),
    ...(deployments.runtime ? [`[Deploy AI runtime riuscito](${runtimeRunUrl})`] : []),
  ];
  const body = `${marker}\nRelease completata per ${batchId} sulla revisione ${batch.release.reviewedSha}, merge ${mergeSha}. ${links.join(' · ')}. L’issue resta aperta per la verifica funzionale.`;
  for (const issueNumber of batch.issues) {
    const issue = await github.viewIssue(issueNumber);
    const alreadyPosted = (issue.comments ?? []).some((comment) =>
      String(comment.body ?? '').includes(marker),
    );
    if (!alreadyPosted) await github.commentIssue(issueNumber, body);
  }
  return { ok: true, status: batch.release.deployment.status, batchId, mergeSha, deployments };
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
  const mode = env.BUG_PIPELINE_RELEASE_ACTION || 'release';

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
    const candidates = state.batches.filter(
      (batch) =>
        batch.phase === 'ready' &&
        batch.sha &&
        batch.approvedSha === batch.sha &&
        batch.release?.status !== 'deployed',
    );
    if (candidates.length === 0) {
      await writeOutputs({ status: 'no-ready-batch', frontend: 'false', backend: 'false' });
      console.log(JSON.stringify({ status: 'no-ready-batch' }));
      return 0;
    }
    candidates.sort((a, b) => Math.min(...a.issues) - Math.min(...b.issues));
    batchId = candidates[0].id;
    reviewedSha = candidates[0].approvedSha;
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
