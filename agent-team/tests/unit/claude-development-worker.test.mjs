import test from 'node:test';
import assert from 'node:assert/strict';
import { runClaudeDevelopment } from '../../src/workers/claude-development-worker.mjs';

test('Claude worker uses print mode, schema output, safe permissions, and the existing remediation coordinates', async () => {
  const calls = [];
  const handoff = { schema_version: 1, message_type: 'development_handoff', issue_number: 263, pull_request_number: 300, attempt: 2, subject_sha: 'a'.repeat(40), acceptance_criteria: [], resolved_findings: ['QA-1'], commands: [], artifact_refs: [], next_actions: ['ready-for-qa'] };
  const run = async (call) => { calls.push(call); return { ok: true, code: 0, stdout: JSON.stringify({ structured_output: handoff }), stderr: '', error: null }; };
  const git = { prepareIssueWorktree: async () => ({ path: 'C:/tmp/issue-263', branch: 'codex/issue-263-agent-team', pullRequestNumber: 300 }), headSha: async () => 'a'.repeat(40) };
  const github = { addIssueComment: async () => ({ id: 1 }), addPullRequestComment: async () => {}, addLabels: async () => {}, removeLabels: async () => {} };
  const result = await runClaudeDevelopment({ issue: { number: 263, title: 'Agent Team', body: 'contract' }, attempt: 2, config: { repository: 'l2v-hub/ClinicOS', baseBranch: 'origin/main', commandTimeoutMs: 1000, developmentTimeoutMs: 5400000, allowedTools: ['Read', 'Edit', 'Bash(git *)'], maxOutputBytes: 10000, labels: { working: 'agent-working', readyForQa: 'ready-for-qa' } }, github, git, run, schema: { type: 'object' }, priorQaResult: { findings: [{ finding_id: 'QA-1' }] } });
  assert.equal(result.subject_sha, 'a'.repeat(40));
  assert.deepEqual(calls[0].args.slice(0, 4), ['--print', '--output-format', 'json', '--permission-mode']);
  assert.equal(calls[0].args.includes('acceptEdits'), true);
  assert.equal(calls[0].args.some((arg) => arg.includes('dangerously')), false);
  assert.match(calls[0].input, /QA-1/);
});
