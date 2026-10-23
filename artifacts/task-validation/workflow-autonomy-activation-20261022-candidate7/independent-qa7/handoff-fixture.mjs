import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createGitHub } from '../qa-source7/agent-team/src/bug-pipeline/github.mjs';
import { feedbackFingerprint } from '../qa-source7/agent-team/src/bug-pipeline/contracts.mjs';
import {
  COMMENT_REVIEW_MARKER,
  createCommentReviewHandoff,
  handoffFeedbackFingerprint,
} from '../qa-source7/agent-team/src/bug-pipeline/comment-review-handoff.mjs';

const repo = 'l2v-hub/ClinicOS';
const sha = 'a'.repeat(40);
const clone = (value) => structuredClone(value);
const gitBlobSHA = (bytes) =>
  createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const validPlan = {
  title: 'Synthetic regression',
  feature: 'Synthetic feature',
  rationale: 'One source file needs a bounded fix.',
  analysis: 'Synthetic plan for controller tests.',
  execution: { difficulty: 'low', mode: 'direct', reason: 'Single file.' },
  issues: [17],
  scope: ['src/feature.ts'],
  fileMap: [{ issue: 17, files: ['src/feature.ts'] }],
  separationReason: '',
  acceptance: [{ issue: 17, criteria: ['The current selection persists.'] }],
  tasks: [
    {
      title: 'Keep the selection',
      files: ['src/feature.ts'],
      steps: ['Preserve the selected value.'],
    },
  ],
  verification: [
    { command: 'node', args: ['--test', 'feature.test.mjs'] },
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

function fixture({
  failed = false,
  reviewCount,
  actor = 'review-bot',
  authorizationVerifier = true,
  blobState = false,
  automatic = () => false,
} = {}) {
  let round = failed ? 1 : 0;
  const batch = {
    id: 'bug-batch-17',
    branch: 'codex/bug-batch-17',
    issues: [17],
    sha,
    phase: failed ? 'blocked' : 'waiting-review',
    implementation: [{ round: 1, status: 'passed' }],
    reviews: failed
      ? [{ round: 1, subjectSha: sha, status: 'failed' }]
      : Array.from({ length: reviewCount ?? 0 }, (_, index) => ({
          round: index + 1,
          subjectSha: 'b'.repeat(40),
          status: 'changes-requested',
        })),
    reviewLedger: failed
      ? {
          schema_version: 1,
          max_rounds: 4,
          rounds: [
            {
              round: 1,
              subject_sha: sha,
              verdict: 'failed',
              review_sha256: 'c'.repeat(64),
            },
          ],
        }
      : undefined,
    pr: { number: 81, url: `https://github.com/${repo}/pull/81` },
    plan: clone(validPlan),
    ...(failed
      ? {
          externalReview: { status: 'failed', subjectSha: sha, failureCode: 'claude-timeout' },
          releaseHold: { reason: 'Synthetic hold remains in force.' },
        }
      : { externalReview: { status: 'requested', subjectSha: sha } }),
  };
  const remote = { schemaVersion: 1, repository: repo, batches: [batch],
    ...(blobState ? { retainedHistory: 'x'.repeat(1024 * 1024 + 128) } : {}) };
  let actorName = actor;
  let permission = 'write';
  let revokeOnTree = false;
  let onViewIssue = () => {};
  let checks = true;
  const feedback = {
    number: 81,
    state: 'OPEN',
    isDraft: false,
    head: sha,
    headRef: batch.branch,
    headRepo: repo,
    headIsFork: false,
    baseRef: 'main',
    comments: [],
    unresolved: false,
    changesRequested: false,
  };
  const pr = { comments: [] };
  const sources = new Map([[17, { number: 17, state: 'open', comments: [] }]]);
  const calls = [];
  const writes = [];
  const reported = [];
  let commentId = 200;
  const apiRun = async (call) => {
    calls.push(clone(call));
    const endpoint = call.args[1];
    const method = call.args.includes('-X') ? call.args[call.args.indexOf('-X') + 1] : 'GET';
    if (endpoint === 'user') return { ok: true, stdout: JSON.stringify({ login: actorName }) };
    if (/^repos\/l2v-hub\/ClinicOS\/collaborators\/[^/]+\/permission$/.test(endpoint))
      return { ok: true, stdout: JSON.stringify({ permission }) };
    if (endpoint === `repos/${repo}/git/ref/heads/codex/bug-control`)
      return { ok: true, stdout: JSON.stringify({ object: { sha: 'branch-sha' } }) };
    if (endpoint.startsWith(`repos/${repo}/contents/.codex-bug-state.json`)) {
      if (method === 'GET') {
        const bytes = Buffer.from(JSON.stringify(remote), 'utf8');
        return {
          ok: true,
          stdout: JSON.stringify({
            type: 'file',
            sha: gitBlobSHA(bytes),
            size: bytes.length,
            encoding: blobState ? 'none' : 'base64',
            content: blobState ? '' : bytes.toString('base64'),
          }),
        };
      }
      const body = JSON.parse(call.input);
      writes.push({ endpoint, method, body });
      if (body.sha !== gitBlobSHA(Buffer.from(JSON.stringify(remote), 'utf8')))
        return { ok: false, stdout: '', stderr: 'gh: conflict (HTTP 409)' };
      const bytes = Buffer.from(body.content, 'base64');
      const next = JSON.parse(bytes.toString('utf8'));
      for (const key of Object.keys(remote)) delete remote[key];
      Object.assign(remote, next);
      const fileSha = gitBlobSHA(bytes);
      return { ok: true, stdout: JSON.stringify({ content: { sha: fileSha } }) };
    }
    if (endpoint.startsWith(`repos/${repo}/git/blobs/`)) {
      const bytes = Buffer.from(JSON.stringify(remote), 'utf8');
      const oid = gitBlobSHA(bytes);
      assert.equal(endpoint, `repos/${repo}/git/blobs/${oid}`);
      assert.equal(call.maxOutputBytes, 16 * 1024 * 1024);
      return { ok: true, stdout: JSON.stringify({ sha: oid, size: bytes.length, encoding: 'base64',
        content: bytes.toString('base64').match(/.{1,60}/g).join('\n') }) };
    }
    if (endpoint.startsWith(`repos/${repo}/git/trees/`)) {
      if (revokeOnTree) permission = 'read';
      return {
        ok: true,
        stdout: JSON.stringify({
          truncated: false,
          tree: [{ type: 'blob', path: 'src/feature.ts' }],
        }),
      };
    }
    assert.fail(`Unexpected GitHub API call: ${method} ${endpoint}`);
  };
  const github = createGitHub({ cwd: '/synthetic/worktree', repo, run: apiRun });
  github.reviewFeedback = async () => ({
    ...clone(feedback),
    comments: [
      ...clone(feedback.comments),
      ...pr.comments.map((comment) => ({
        id: comment.id,
        author: comment.user.login,
        body: comment.body,
      })),
    ],
  });
  github.viewIssue = async (number) => {
    onViewIssue(number);
    if (number === 81) return { number, state: 'open', comments: clone(pr.comments) };
    return clone(sources.get(number));
  };
  github.requiredChecks = async () => ({ ok: checks });
  github.commentPR = async (number, body) => {
    const comment = { id: ++commentId, body, user: { login: actorName, type: 'User' } };
    pr.comments.push(comment);
    return clone(comment);
  };
  github.publishExternalReview = async (number, head, report, currentRound) => {
    reported.push({ number, head, report: clone(report), round: currentRound });
    const body = `<!-- clinicos-claude-cron:${number}:${head}:${currentRound} -->\nClaude report ${report.verdict}`;
    feedback.comments.push({ id: ++commentId, author: actorName, body });
  };
  let nonceValue = 0, authorizationNonce = 0;
  const handoff = createCommentReviewHandoff({
    github,
    run: apiRun,
    automatic,
    cwd: '/synthetic/worktree',
    now: () => new Date('2026-10-17T00:00:00.000Z'),
    nonce: () => `nonce-${++nonceValue}`,
    authorizationVerifier: authorizationVerifier ? async ({ binding }) => ({
      provenance: 'user-session', grantId: 'synthetic-session', sourceRef: 'test:session',
      consumptionNonce: `grant-${++authorizationNonce}`, binding,
    }) : undefined,
  });
  return {
    batch,
    github,
    handoff,
    remote,
    feedback,
    pr,
    sources,
    calls,
    writes,
    reported,
    setActor: (value) => {
      actorName = value;
    },
    setPermission: (value) => {
      permission = value;
    },
    setChecks: (value) => {
      checks = value;
    },
    revokeOnTree: () => {
      revokeOnTree = true;
    },
    onViewIssue: (fn) => {
      onViewIssue = fn;
    },
  };
}

const validApproved = () => ({
  subject_sha: sha,
  verdict: 'approved',
  summary: 'No actionable findings remain.',
  findings: [],
});

async function requestedClaimed(f) {
  await f.handoff.request(81);
  return f.handoff.claim(81);
}

export {fixture};
