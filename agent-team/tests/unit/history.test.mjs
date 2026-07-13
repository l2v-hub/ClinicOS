import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { parseProtocolComments, rebuildRemediationContext } from '../../src/core/history.mjs';

const MARKER = '<!-- clinic-os-agent-team:v1 -->';
const comment = (id, value) => ({ id, created_at: value.created_at ?? '2026-07-12T14:00:00Z', body: `${MARKER}\n${JSON.stringify(value)}` });

const handoff1 = { schema_version: 1, message_type: 'development_handoff', message_id: 'dev-263-1', correlation_id: 'issue-263-attempt-1', producer_role: 'claude-development', repository: 'l2v-hub/ClinicOS', issue_number: 263, pull_request_number: 264, attempt: 1, created_at: '2026-07-12T14:41:05Z', subject_sha: '6'.repeat(40), state_before: 'agent-working', state_after: 'ready-for-qa', acceptance_criteria: [], resolved_findings: [], commands: [], artifact_refs: [], next_actions: ['ready-for-qa'] };
const qaFail1 = { schema_version: 1, message_type: 'qa_result', message_id: 'qa-263-1', correlation_id: 'issue-263-attempt-1', producer_role: 'codex-qa', repository: 'l2v-hub/ClinicOS', issue_number: 263, pull_request_number: 264, attempt: 1, created_at: '2026-07-12T18:20:43Z', subject_sha: '6'.repeat(40), state_before: 'ready-for-qa', state_after: 'qa-failed', decision: 'qa-failed', acceptance_criteria: [], findings: [ { finding_id: 'QA-263-001', acceptance_criterion_id: 'AC8', severity: 'critical', category: 'remediation-loop', observed: 'findings never reach Claude', expected: 'findings flow back', reproduction_command_ref: 'rg', evidence_refs: ['runtime.mjs'], status: 'open', remediation_required: true, fingerprint: 'a'.repeat(64) }, { finding_id: 'QA-263-002', acceptance_criterion_id: 'AC5', severity: 'critical', category: 'claude-worker', observed: 'x', expected: 'y', reproduction_command_ref: 'rg', evidence_refs: [], status: 'resolved', remediation_required: false, fingerprint: 'b'.repeat(64) } ], commands: [], artifact_refs: [], next_actions: ['ready-for-dev'] };

test('parseProtocolComments skips prose and invalid protocol payloads without throwing', () => {
  const parsed = parseProtocolComments([
    { id: 1, created_at: 'x', body: 'plain prose' },
    { id: 2, created_at: 'x', body: `${MARKER}\n{not json` },
    comment(3, handoff1)
  ]);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].value.message_type, 'development_handoff');
  assert.equal(parsed[0].comment_id, 3);
});

test('rebuildRemediationContext returns next attempt, open findings, and stable coordinates', () => {
  const context = rebuildRemediationContext({
    comments: [comment(10, handoff1), comment(11, qaFail1)],
    issueNumber: 263,
    config: { worktreeRoot: 'C:/repo/agent-team/.worktrees', noProgressLimit: 3 }
  });
  assert.equal(context.attempt, 2);
  assert.equal(context.blocked, false);
  assert.equal(context.priorQaResult.findings.length, 1);
  assert.equal(context.priorQaResult.findings[0].finding_id, 'QA-263-001');
  assert.equal(context.priorQaResult.coordinates.pull_request_number, 264);
  assert.equal(context.priorQaResult.coordinates.worktree_path, path.join('C:/repo/agent-team/.worktrees', 'issue-263'));
  assert.equal(context.lastQaResult.decision, 'qa-failed');
});

test('rebuildRemediationContext reports blocked after three equivalent failed attempts', () => {
  const equivalent = (attempt, commentId) => comment(commentId, { ...qaFail1, attempt, message_id: `qa-263-${attempt}`, correlation_id: `issue-263-attempt-${attempt}` });
  const context = rebuildRemediationContext({
    comments: [comment(20, handoff1), equivalent(1, 21), equivalent(2, 22), equivalent(3, 23)],
    issueNumber: 263,
    config: { worktreeRoot: 'C:/repo', noProgressLimit: 3 }
  });
  assert.equal(context.blocked, true);
  assert.equal(context.qaHistory.length, 3);
});

test('rebuildRemediationContext starts fresh issues at attempt 1 with no prior QA', () => {
  const context = rebuildRemediationContext({ comments: [], issueNumber: 500, config: { worktreeRoot: 'C:/repo', noProgressLimit: 3 } });
  assert.equal(context.attempt, 1);
  assert.equal(context.priorQaResult, null);
  assert.equal(context.blocked, false);
});
