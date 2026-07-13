import { mkdir, open, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { formatProtocolComment, parseProtocolComment } from './protocol.mjs';

export function arbitrateClaims(claims, now = new Date()) {
  return claims.filter((claim) => Date.parse(claim.expires_at) > now.getTime()).sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) || a.comment_id - b.comment_id)[0] ?? null;
}

const stripLocalFields = ({ comment_id, ...message }) => message;

function parseClaimComments(comments, schema) {
  const claims = [];
  const releasedLeases = new Set();
  for (const comment of comments) {
    try {
      const parsed = parseProtocolComment(comment.body ?? '', schema);
      if (parsed?.message_type === 'work.claim') claims.push({ ...parsed, comment_id: comment.id });
      else if (parsed?.message_type === 'work.claim_released') releasedLeases.add(parsed.lease_id);
    } catch { /* invalid or foreign comment — never a claim competitor */ }
  }
  // QA-263-010: a released lease is permanently out of arbitration, even before its expiry.
  return claims.filter((claim) => !releasedLeases.has(claim.lease_id));
}

export async function acquireGitHubClaim({ github, config, schema, issue, workerId, role = 'claude-development', attempt, branch, worktree, pullRequestNumber, priorQaResultComment, leaseDurationMs, now = new Date() }) {
  const lease = randomUUID();
  const duration = leaseDurationMs ?? config?.leaseDurationMs ?? 300000;
  const claim = {
    schema_version: 1,
    message_type: 'work.claim',
    message_id: `claim-${issue.number}-${attempt}-${lease.slice(0, 8)}`,
    correlation_id: `issue-${issue.number}-attempt-${attempt}`,
    producer_role: role,
    repository: config?.repository ?? 'l2v-hub/ClinicOS',
    issue_number: issue.number,
    attempt,
    worker_id: workerId,
    lease_id: lease,
    role,
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + duration).toISOString()
  };
  if (branch) claim.branch = branch;
  if (worktree) claim.worktree = worktree;
  if (pullRequestNumber) claim.pull_request_number = pullRequestNumber;
  if (priorQaResultComment) claim.prior_qa_result_comment = priorQaResultComment;
  const created = await github.addIssueComment(issue.number, formatProtocolComment(claim, schema));
  claim.comment_id = created.id;
  const competitors = parseClaimComments(await github.listIssueComments(issue.number), schema)
    .filter((candidate) => candidate.issue_number === issue.number && candidate.attempt === attempt);
  const winner = arbitrateClaims(competitors, now);
  return { won: winner?.comment_id === claim.comment_id, claim, winner };
}

export async function refreshGitHubClaim({ github, config, schema, claim, leaseDurationMs, now = new Date() }) {
  const duration = leaseDurationMs ?? config?.leaseDurationMs ?? 300000;
  const refreshed = { ...stripLocalFields(claim), refreshed_at: now.toISOString(), expires_at: new Date(now.getTime() + duration).toISOString() };
  await github.editIssueComment(claim.comment_id, formatProtocolComment(refreshed, schema));
  return { ...refreshed, comment_id: claim.comment_id };
}

export async function releaseGitHubClaim({ github, schema, claim, reason, now = new Date() }) {
  const released = {
    ...stripLocalFields(claim),
    message_type: 'work.claim_released',
    message_id: `${claim.message_id}-released`,
    released_at: now.toISOString(),
    release_reason: reason
  };
  delete released.refreshed_at;
  delete released.refresh_reason;
  await github.addIssueComment(claim.issue_number, formatProtocolComment(released, schema));
  return released;
}

export function recoverActiveClaim({ comments, schema, issueNumber, workerId, now = new Date() }) {
  const mine = parseClaimComments(comments, schema)
    .filter((claim) => claim.issue_number === issueNumber && claim.worker_id === workerId);
  return arbitrateClaims(mine, now);
}

export async function acquireLocalSupervisorLock(runtimeRoot) {
  await mkdir(runtimeRoot, { recursive: true });
  const lockPath = path.join(runtimeRoot, 'supervisor.lock');
  let handle;
  try { handle = await open(lockPath, 'wx'); } catch (error) { if (error.code === 'EEXIST') throw new Error('supervisor already running'); throw error; }
  await handle.writeFile(JSON.stringify({ pid: process.pid, started_at: new Date().toISOString() }));
  await handle.close();
  return { async release() { await rm(lockPath, { force: true }); } };
}

export async function isSupervisorLive(runtimeRoot, { heartbeatTimeoutMs = 45000, now = () => Date.now() } = {}) {
  try { const state = JSON.parse(await readFile(path.join(runtimeRoot, 'heartbeat.json'), 'utf8')); return now() - Date.parse(state.at) < heartbeatTimeoutMs; } catch { return false; }
}

export async function writeHeartbeat(runtimeRoot, state) {
  await mkdir(runtimeRoot, { recursive: true });
  await writeFile(path.join(runtimeRoot, 'heartbeat.json'), JSON.stringify({ ...state, pid: process.pid, at: new Date().toISOString() }));
}
