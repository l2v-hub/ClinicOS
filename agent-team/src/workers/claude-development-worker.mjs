import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { formatProtocolComment } from '../core/protocol.mjs';
import { validateAgainstSchema } from '../core/json-schema.mjs';

export async function runClaudeDevelopment({ issue, attempt, config, github, git, run, schema, priorQaResult }) {
  if (!Array.isArray(config.allowedTools) || config.allowedTools.length === 0) {
    throw new Error('claude development launch refused: allowedTools policy is empty or missing — configure a scoped permission policy before launching workers');
  }
  const coordinates = await git.prepareIssueWorktree({ issue, prior: priorQaResult?.coordinates });
  const permanent = await readFile(path.join(process.cwd(), 'agent-team', 'prompts', 'claude-development.md'), 'utf8');
  const context = { repository: config.repository, issue, attempt, base_branch: config.baseBranch, coordinates, unresolved_findings: priorQaResult?.findings ?? [], required_schema: schema };
  const result = await run({ command: 'claude', args: ['--print', '--output-format', 'json', '--permission-mode', 'acceptEdits', '--allowedTools', config.allowedTools.join(',')], cwd: coordinates.path, input: `${permanent}\n<task-data>${JSON.stringify(context)}</task-data>`, timeoutMs: config.developmentTimeoutMs ?? config.commandTimeoutMs, maxOutputBytes: config.maxOutputBytes });
  if (!result.ok) throw new Error(result.error || result.stderr || 'Claude development failed');
  const envelope = JSON.parse(result.stdout);
  const handoff = envelope.structured_output ?? (typeof envelope.result === 'string' ? JSON.parse(envelope.result) : envelope.result ?? envelope);
  try { validateAgainstSchema(handoff, schema); } catch (error) {
    throw new Error(`claude structured output failed schema validation: ${error.message}`);
  }
  const actualSha = await git.headSha(coordinates.path);
  if (handoff.subject_sha !== actualSha) throw new Error('Claude handoff SHA does not equal worktree HEAD');
  const comment = formatProtocolComment(handoff, schema);
  await github.addIssueComment(issue.number, comment);
  if (handoff.pull_request_number) await github.addPullRequestComment(handoff.pull_request_number, comment);
  await github.removeLabels(issue.number, [config.labels.working]);
  await github.addLabels(issue.number, [config.labels.readyForQa]);
  return { ...handoff, coordinates: { ...coordinates, pull_request_number: handoff.pull_request_number, worktree_path: coordinates.path } };
}
