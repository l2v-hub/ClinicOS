import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { formatProtocolComment, verifyArtifactRefs } from '../core/protocol.mjs';

export async function runCodexQa({ issue, pullRequest, config, github, run, schema, worktreePath }) {
  await mkdir(config.runtimeRoot, { recursive: true });
  const outputPath = path.join(config.runtimeRoot, `qa-${issue.number}-${pullRequest.headRefOid}.json`);
  const prompt = await readFile(path.join(process.cwd(), 'agent-team', 'prompts', 'codex-qa.md'), 'utf8');
  const context = { repository: config.repository, issue, pull_request: pullRequest, required_schema: schema };
  const result = await run({ command: 'codex', args: ['exec', '--sandbox', 'workspace-write', '--cd', worktreePath, '--output-schema', path.join(process.cwd(), 'agent-team', 'protocol', 'schemas', 'qa-result.schema.json'), '--output-last-message', outputPath, '-'], cwd: worktreePath, input: `${prompt}\n<task-data>${JSON.stringify(context)}</task-data>`, timeoutMs: config.commandTimeoutMs, maxOutputBytes: config.maxOutputBytes });
  if (!result.ok) throw new Error(result.error || result.stderr || 'Codex QA failed');
  const qaResult = result.finalMessage ? JSON.parse(result.finalMessage) : JSON.parse(await readFile(outputPath, 'utf8'));
  if (qaResult.subject_sha !== pullRequest.headRefOid) throw new Error('QA subject SHA mismatch');
  await verifyArtifactRefs({ repoRoot: worktreePath, subjectSha: pullRequest.headRefOid, refs: qaResult.artifact_refs });
  const comment = formatProtocolComment(qaResult, schema);
  await github.addIssueComment(issue.number, comment);
  await github.addPullRequestComment(pullRequest.number, comment);
  await github.removeLabels(issue.number, [config.labels.readyForQa]);
  if (qaResult.decision === 'qa-passed') await github.addLabels(issue.number, [config.labels.qaPassed]);
  if (qaResult.decision === 'blocked') await github.addLabels(issue.number, [config.labels.blocked]);
  if (qaResult.decision === 'qa-failed') {
    await github.addLabels(issue.number, [config.labels.qaFailed, config.labels.readyForDev, config.labels.assignedToClaude]);
  }
  return qaResult;
}
