import { parseProtocolComments } from './history.mjs';
import { arbitrateClaims } from './locks.mjs';

// Pure projection of authoritative GitHub state plus local supervisor health.
export function buildStatusProjection({ local, items, config, now = new Date() }) {
  const issues = items.map(({ issue, pullRequest }) => {
    const protocol = parseProtocolComments(issue.comments ?? []);
    const claims = protocol.filter((entry) => entry.value.message_type === 'work.claim').map((entry) => ({ ...entry.value, comment_id: entry.comment_id }));
    const releasedLeases = new Set(protocol.filter((entry) => entry.value.message_type === 'work.claim_released').map((entry) => entry.value.lease_id));
    // QA-263-010: released claims never project as active, even while their lease is unexpired.
    const liveClaims = claims.filter((claim) => !releasedLeases.has(claim.lease_id));
    const handoffs = protocol.filter((entry) => entry.value.message_type === 'development_handoff').map((entry) => entry.value);
    const qaResults = protocol.filter((entry) => entry.value.message_type === 'qa_result').map((entry) => entry.value);
    const activeClaim = arbitrateClaims(liveClaims, now);
    const lastHandoff = handoffs.at(-1) ?? null;
    const lastQa = qaResults.at(-1) ?? null;
    const attempts = [...handoffs, ...qaResults].map((value) => value.attempt).filter(Number.isInteger);
    return {
      number: issue.number,
      labels: (issue.labels ?? []).map((label) => typeof label === 'string' ? label : label.name),
      active_claim: activeClaim ? { lease_id: activeClaim.lease_id, worker_id: activeClaim.worker_id, attempt: activeClaim.attempt, expires_at: activeClaim.expires_at, comment_id: activeClaim.comment_id } : null,
      released_claims: claims.length - liveClaims.length,
      expired_claims: liveClaims.length - (activeClaim ? 1 : 0),
      last_handoff: lastHandoff ? { attempt: lastHandoff.attempt, subject_sha: lastHandoff.subject_sha, pull_request_number: lastHandoff.pull_request_number } : null,
      last_qa: lastQa ? { attempt: lastQa.attempt, decision: lastQa.decision, subject_sha: lastQa.subject_sha } : null,
      next_attempt: attempts.length ? Math.max(...attempts) + 1 : 1,
      pull_request: pullRequest ? { number: pullRequest.number, draft: pullRequest.isDraft, head_sha: pullRequest.headRefOid, branch: pullRequest.headRefName } : null
    };
  });
  return {
    generated_at: now.toISOString(),
    supervisor: { running: local.supervisor_running, heartbeat_age_ms: local.heartbeat_age_ms, pid: local.pid ?? null },
    issues
  };
}
