import path from 'node:path';
import { nextRemediationState } from './remediation.mjs';

const MARKER = '<!-- clinic-os-agent-team:v1 -->';

// Tolerant protocol reader: invalid or non-protocol comments are task data, never crashes.
export function parseProtocolComments(comments = []) {
  const parsed = [];
  for (const comment of comments) {
    const body = comment.body ?? '';
    if (!body.startsWith(`${MARKER}\n`)) continue;
    try {
      const value = JSON.parse(body.slice(MARKER.length + 1));
      if (value?.schema_version !== 1 || typeof value.message_type !== 'string') continue;
      parsed.push({ comment_id: comment.id, created_at: comment.created_at, value });
    } catch {
      /* untrusted comment body — ignore */
    }
  }
  return parsed;
}

export function rebuildRemediationContext({ comments, issueNumber, config }) {
  const protocol = parseProtocolComments(comments).filter(
    (entry) => entry.value.issue_number === issueNumber || entry.value.issue_number === undefined,
  );
  const handoffs = protocol
    .filter((entry) => entry.value.message_type === 'development_handoff')
    .map((entry) => entry.value);
  const qaResults = protocol
    .filter((entry) => entry.value.message_type === 'qa_result')
    .map((entry) => entry.value);
  const attempts = [...handoffs, ...qaResults]
    .map((value) => value.attempt)
    .filter(Number.isInteger);
  const attempt = attempts.length ? Math.max(...attempts) + 1 : 1;
  const lastHandoff = handoffs.at(-1) ?? null;
  const lastQaResult = qaResults.at(-1) ?? null;
  const qaHistory = qaResults.filter((result) => result.decision === 'qa-failed');
  const blocked =
    qaHistory.length >= (config.noProgressLimit ?? 3) &&
    nextRemediationState({ qaResults: qaHistory, noProgressLimit: config.noProgressLimit ?? 3 }) ===
      'blocked';
  let priorQaResult = null;
  if (lastQaResult && lastQaResult.decision === 'qa-failed') {
    priorQaResult = {
      ...lastQaResult,
      findings: (lastQaResult.findings ?? []).filter((finding) => finding.status === 'open'),
      coordinates: {
        pull_request_number:
          lastQaResult.pull_request_number ?? lastHandoff?.pull_request_number ?? null,
        worktree_path: path.join(config.worktreeRoot, `issue-${issueNumber}`),
        branch: null,
      },
    };
  }
  return { attempt, blocked, priorQaResult, lastHandoff, lastQaResult, qaHistory };
}
