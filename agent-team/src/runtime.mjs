import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { runProcess } from './adapters/process-runner.mjs';
import { createGitHubAdapter } from './adapters/github.mjs';
import { createGitAdapter } from './adapters/git.mjs';
import { runDoctor } from './commands/doctor.mjs';
import { isSupervisorLive, acquireGitHubClaim } from './core/locks.mjs';
import { runClaudeDevelopment } from './workers/claude-development-worker.mjs';
import { runCodexQa } from './workers/codex-qa-worker.mjs';

const loadSchema = async (repoRoot, name) => JSON.parse(await readFile(path.join(repoRoot, 'agent-team', 'protocol', 'schemas', name), 'utf8'));
const labelsOf = (issue) => (issue.labels ?? []).map((label) => typeof label === 'string' ? label : label.name);

export async function createRuntime({ config, repoRoot, allowCurrentSupervisor = false }) {
  const github = createGitHubAdapter({ run: runProcess, config });
  const git = createGitAdapter({ run: runProcess, config });
  const developmentSchema = await loadSchema(repoRoot, 'development-handoff.schema.json');
  const qaSchema = await loadSchema(repoRoot, 'qa-result.schema.json');
  const doctor = () => runDoctor({ config, run: runProcess, isSupervisorLive: ({ heartbeatTimeoutMs } = {}) => allowCurrentSupervisor ? false : isSupervisorLive(config.runtimeRoot, { heartbeatTimeoutMs: heartbeatTimeoutMs ?? config.heartbeatTimeoutMs }) });
  const listDevelopment = async () => (await github.listIssuesByLabels([config.labels.readyForDev, config.labels.assignedToClaude])).slice(0, config.developmentConcurrency);
  const listQa = async () => {
    const issues = (await github.listIssuesByLabels([config.labels.readyForQa])).slice(0, config.qaConcurrency);
    const items = [];
    for (const issue of issues) {
      const full = await github.viewIssue(issue.number);
      const handoffs = full.comments.map((comment) => { try { const value = JSON.parse(comment.body.split('\n').slice(1).join('\n')); return value.message_type === 'development_handoff' ? value : null; } catch { return null; } }).filter(Boolean);
      const handoff = handoffs.at(-1);
      if (!handoff) continue;
      items.push({ issue: full, pullRequest: await github.viewPullRequest(handoff.pull_request_number), worktreePath: path.join(config.worktreeRoot, `issue-${issue.number}`) });
    }
    return items;
  };
  const runDevelopment = async (issue) => {
    const attempt = 1 + (issue.comments ?? []).filter((comment) => comment.body?.includes('development_handoff')).length;
    const claim = await acquireGitHubClaim({ github, issue, workerId: `${process.env.COMPUTERNAME ?? 'host'}:${process.pid}`, role: 'claude-development', attempt, leaseDurationMs: config.leaseDurationMs });
    if (!claim.won) return { skipped: 'claim-lost' };
    await github.removeLabels(issue.number, [config.labels.readyForDev, config.labels.assignedToClaude, ...(labelsOf(issue).includes(config.labels.qaFailed) ? [config.labels.qaFailed] : [])]);
    await github.addLabels(issue.number, [config.labels.working]);
    return runClaudeDevelopment({ issue, attempt, config, github, git, run: runProcess, schema: developmentSchema, priorQaResult: null });
  };
  const runQa = (item) => runCodexQa({ ...item, config, github, run: runProcess, schema: qaSchema });
  return { github, git, doctor, listDevelopment, listQa, runDevelopment, runQa };
}
