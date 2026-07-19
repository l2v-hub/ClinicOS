import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { formatProtocolComment } from '../core/protocol.mjs';
import { validateAgainstSchema } from '../core/json-schema.mjs';
import { buildClaudeWorkerArgs } from '../core/worker-policy.mjs';
import { startLeaseHeartbeat } from '../core/locks.mjs';

export async function runClaudeDevelopment({
  issue,
  attempt,
  config,
  github,
  git,
  run,
  schema,
  priorQaResult,
  coordinates: claimedCoordinates,
  lease,
}) {
  // Fail closed before any spawn or worktree change: the argv builder refuses unscoped policies
  // (QA-263-002) and any policy that could reach a nested Claude agent (QA-263-011).
  const args = buildClaudeWorkerArgs(config);
  // QA-263-015: when the supervisor already resolved and claimed the authoritative worktree,
  // the process must run exactly there — the claim and the spawn cwd are the same coordinates.
  const coordinates =
    claimedCoordinates ??
    (await git.prepareIssueWorktree({ issue, prior: priorQaResult?.coordinates }));
  const permanent = await readFile(
    path.join(process.cwd(), 'agent-team', 'prompts', 'claude-development.md'),
    'utf8',
  );
  const context = {
    repository: config.repository,
    issue,
    attempt,
    base_branch: config.baseBranch,
    coordinates,
    unresolved_findings: priorQaResult?.findings ?? [],
    required_schema: schema,
  };
  // QA-263-015: keep the GitHub lease alive for the whole Claude execution. A failed refresh
  // means the lease is lost: the heartbeat signal aborts and the runner kills the owned tree.
  const heartbeat = lease
    ? startLeaseHeartbeat({ refresh: lease.refresh, intervalMs: lease.intervalMs })
    : null;
  let result;
  try {
    result = await run({
      command: 'claude',
      args,
      cwd: coordinates.path,
      input: `${permanent}\n<task-data>${JSON.stringify(context)}</task-data>`,
      timeoutMs: config.developmentTimeoutMs ?? config.commandTimeoutMs,
      maxOutputBytes: config.maxOutputBytes,
      signal: heartbeat?.signal,
    });
  } finally {
    heartbeat?.stop();
  }
  if (!result.ok) throw new Error(result.error || result.stderr || 'Claude development failed');
  const envelope = JSON.parse(result.stdout);
  const handoff =
    envelope.structured_output ??
    (typeof envelope.result === 'string'
      ? JSON.parse(envelope.result)
      : (envelope.result ?? envelope));
  try {
    validateAgainstSchema(handoff, schema);
  } catch (error) {
    throw new Error(`claude structured output failed schema validation: ${error.message}`);
  }
  const actualSha = await git.headSha(coordinates.path);
  if (handoff.subject_sha !== actualSha)
    throw new Error('Claude handoff SHA does not equal worktree HEAD');
  const comment = formatProtocolComment(handoff, schema);
  await github.addIssueComment(issue.number, comment);
  if (handoff.pull_request_number)
    await github.addPullRequestComment(handoff.pull_request_number, comment);
  await github.removeLabels(issue.number, [config.labels.working]);
  await github.addLabels(issue.number, [config.labels.readyForQa]);
  return {
    ...handoff,
    coordinates: {
      ...coordinates,
      pull_request_number: handoff.pull_request_number,
      worktree_path: coordinates.path,
    },
  };
}
