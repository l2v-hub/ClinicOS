import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { runProcess } from './adapters/process-runner.mjs';
import { createGitHubAdapter } from './adapters/github.mjs';
import { createGitAdapter, isSameWorktreePath } from './adapters/git.mjs';
import { runDoctor } from './commands/doctor.mjs';
import { isSupervisorLive, acquireGitHubClaim, releaseGitHubClaim, refreshGitHubClaim, recoverActiveClaim } from './core/locks.mjs';
import { rebuildRemediationContext } from './core/history.mjs';
import { formatProtocolComment } from './core/protocol.mjs';
import { runClaudeDevelopment } from './workers/claude-development-worker.mjs';
import { runCodexQa } from './workers/codex-qa-worker.mjs';

const loadSchema = async (repoRoot, name) => JSON.parse(await readFile(path.join(repoRoot, 'agent-team', 'protocol', 'schemas', name), 'utf8'));
const labelsOf = (issue) => (issue.labels ?? []).map((label) => typeof label === 'string' ? label : label.name);

export async function createRuntime({ config, repoRoot, allowCurrentSupervisor = false, overrides = {} }) {
  const run = overrides.run ?? runProcess;
  const github = overrides.github ?? createGitHubAdapter({ run, config });
  const git = overrides.git ?? createGitAdapter({ run, config });
  const workerId = overrides.workerId ?? `${process.env.COMPUTERNAME ?? 'host'}:${process.pid}`;
  const schemas = {
    development: await loadSchema(repoRoot, 'development-handoff.schema.json'),
    qa: await loadSchema(repoRoot, 'qa-result.schema.json'),
    claim: await loadSchema(repoRoot, 'claim.schema.json'),
    blocked: await loadSchema(repoRoot, 'worker-blocked.schema.json'),
    binding: await loadSchema(repoRoot, 'evidence-binding.schema.json')
  };
  const doctor = overrides.doctor ?? (() => runDoctor({ config, run, isSupervisorLive: ({ heartbeatTimeoutMs } = {}) => allowCurrentSupervisor ? false : isSupervisorLive(config.runtimeRoot, { heartbeatTimeoutMs: heartbeatTimeoutMs ?? config.heartbeatTimeoutMs }) }));

  const listDevelopment = async () => (await github.listIssuesByLabels([config.labels.readyForDev, config.labels.assignedToClaude])).slice(0, config.developmentConcurrency);

  const listQa = async () => {
    const issues = (await github.listIssuesByLabels([config.labels.readyForQa])).slice(0, config.qaConcurrency);
    const items = [];
    for (const issue of issues) {
      const full = await github.viewIssue(issue.number);
      const context = rebuildRemediationContext({ comments: full.comments, issueNumber: issue.number, config });
      if (!context.lastHandoff) continue;
      items.push({ issue: full, pullRequest: await github.viewPullRequest(context.lastHandoff.pull_request_number), worktreePath: path.join(config.worktreeRoot, `issue-${issue.number}`) });
    }
    return items;
  };

  const publishBlocked = async (issue, context) => {
    const blocked = {
      schema_version: 1,
      message_type: 'worker.blocked',
      message_id: `blocked-${issue.number}-${context.attempt}`,
      correlation_id: `issue-${issue.number}-attempt-${context.attempt}`,
      producer_role: 'agent-team-supervisor',
      repository: config.repository,
      issue_number: issue.number,
      attempt: context.attempt,
      created_at: new Date().toISOString(),
      reason: `no-progress: ${config.noProgressLimit} consecutive equivalent qa-failed results without a changed subject SHA or finding set`,
      state_before: config.labels.readyForDev,
      state_after: config.labels.blocked,
      qa_history: context.qaHistory.slice(-config.noProgressLimit).map((result) => ({ attempt: result.attempt, subject_sha: result.subject_sha, decision: result.decision }))
    };
    await github.addIssueComment(issue.number, formatProtocolComment(blocked, schemas.blocked));
    await github.removeLabels(issue.number, [config.labels.readyForDev, config.labels.assignedToClaude, ...(labelsOf(issue).includes(config.labels.qaFailed) ? [config.labels.qaFailed] : [])]);
    await github.addLabels(issue.number, [config.labels.blocked]);
  };

  const runDevelopment = async (listed) => {
    const issue = await github.viewIssue(listed.number);
    const context = rebuildRemediationContext({ comments: issue.comments ?? [], issueNumber: issue.number, config });
    if (context.blocked) {
      await publishBlocked(issue, context);
      return { skipped: 'no-progress-blocked', issue: issue.number };
    }
    let priorQaResult = context.priorQaResult;
    if (priorQaResult?.coordinates?.pull_request_number) {
      const pullRequest = await github.viewPullRequest(priorQaResult.coordinates.pull_request_number);
      priorQaResult = { ...priorQaResult, coordinates: { ...priorQaResult.coordinates, branch: pullRequest.headRefName } };
    }
    // QA-263-015: resolve the authoritative worktree read-only BEFORE claiming, so the
    // published claim names the exact registered checkout the Claude process will run in
    // and a losing claimant never mutates branches or worktrees.
    const resolved = await git.resolveIssueWorktree({ issue, prior: priorQaResult?.coordinates });
    const acquired = await acquireGitHubClaim({
      github, config, schema: schemas.claim, issue, workerId, role: 'claude-development', attempt: context.attempt,
      branch: resolved.branch ?? priorQaResult?.coordinates?.branch, worktree: resolved.path,
      pullRequestNumber: resolved.pullRequestNumber ?? priorQaResult?.coordinates?.pull_request_number
    });
    if (!acquired.won) return { skipped: 'claim-lost', issue: issue.number };
    await github.removeLabels(issue.number, [config.labels.readyForDev, config.labels.assignedToClaude, ...(labelsOf(issue).includes(config.labels.qaFailed) ? [config.labels.qaFailed] : [])]);
    await github.addLabels(issue.number, [config.labels.working]);
    let handoff;
    try {
      const coordinates = await git.prepareIssueWorktree({ issue, prior: priorQaResult?.coordinates });
      // QA-263-015: the prepared checkout must be the claimed one — a divergence means the
      // claim no longer describes the mutation target and the run must fail closed.
      if (!isSameWorktreePath(coordinates.path, resolved.path)) {
        throw new Error(`prepared worktree ${coordinates.path} does not match the claimed authoritative worktree ${resolved.path}`);
      }
      handoff = await runClaudeDevelopment({
        issue, attempt: context.attempt, config, github, git, run, schema: schemas.development, priorQaResult, coordinates,
        lease: { refresh: () => refreshGitHubClaim({ github, config, schema: schemas.claim, claim: acquired.claim }), intervalMs: config.leaseRefreshMs }
      });
    } catch (error) {
      await releaseGitHubClaim({ github, schema: schemas.claim, claim: acquired.claim, reason: `worker-failure: ${error.message}`.slice(0, 300) });
      // QA-263-013: a failed worker must return the issue to the configured claimable
      // development state — never leave it agent-working with no active claim.
      await github.removeLabels(issue.number, [config.labels.working]);
      await github.addLabels(issue.number, [config.labels.readyForDev, config.labels.assignedToClaude]);
      throw error;
    }
    // QA-263-010: a successful run must release its claim too — only after the handoff is
    // preserved on GitHub, so ready-for-qa never carries an active development claim.
    await releaseGitHubClaim({ github, schema: schemas.claim, claim: acquired.claim, reason: `development-handoff-published: ${handoff.message_id}` });
    return handoff;
  };

  const runQa = (item) => runCodexQa({ ...item, config, github, run, schema: schemas.qa });

  const refreshClaim = (claim) => refreshGitHubClaim({ github, config, schema: schemas.claim, claim });
  const recoverClaim = async (issueNumber) => recoverActiveClaim({ comments: await github.listIssueComments(issueNumber), schema: schemas.claim, issueNumber, workerId });

  return { config, github, git, run, workerId, schemas, doctor, listDevelopment, listQa, runDevelopment, runQa, refreshClaim, recoverClaim };
}
