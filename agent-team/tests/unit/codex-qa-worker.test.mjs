import test from 'node:test';
import assert from 'node:assert/strict';
import { runCodexQa } from '../../src/workers/codex-qa-worker.mjs';

test('Codex QA uses output schema and rejects a result for another SHA', async () => {
  const qa = { schema_version: 1, message_type: 'qa_result', issue_number: 263, pull_request_number: 300, attempt: 1, subject_sha: 'b'.repeat(40), decision: 'qa-passed', acceptance_criteria: [], findings: [], commands: [], artifact_refs: [], next_actions: [] };
  const run = async (call) => ({ ok: true, code: 0, stdout: '', stderr: '', error: null, finalMessage: JSON.stringify(qa), call });
  const github = { addIssueComment: async () => {}, addPullRequestComment: async () => {}, addLabels: async () => {}, removeLabels: async () => {} };
  await assert.rejects(() => runCodexQa({ issue: { number: 263, body: 'contract' }, pullRequest: { number: 300, headRefOid: 'a'.repeat(40) }, config: { repository: 'l2v-hub/ClinicOS', runtimeRoot: 'C:/tmp/runtime', commandTimeoutMs: 1000, maxOutputBytes: 1000, labels: {} }, github, run, schema: { type: 'object' }, worktreePath: 'C:/tmp/worktree' }), /QA subject SHA mismatch/);
});
