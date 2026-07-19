import test from 'node:test';
import assert from 'node:assert/strict';
import { runClaudeDevelopment } from '../../src/workers/claude-development-worker.mjs';

// Literal policy fixtures (never imported from the implementation) pin the safe worker surface.
const TOOLS = ['Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash'];
const DISALLOWED = [
  'Task',
  'Agent',
  'Bash(claude)',
  'Bash(claude *)',
  'Bash(claude.exe)',
  'Bash(claude.exe *)',
  'Bash(npx claude)',
  'Bash(npx claude *)',
  'Bash(npx @anthropic-ai/claude-code)',
  'Bash(npx @anthropic-ai/claude-code *)',
];
const workerConfig = {
  repository: 'l2v-hub/ClinicOS',
  baseBranch: 'origin/main',
  commandTimeoutMs: 1000,
  developmentTimeoutMs: 5400000,
  tools: TOOLS,
  allowedTools: ['Read', 'Edit', 'Bash(git *)'],
  disallowedTools: DISALLOWED,
  maxOutputBytes: 10000,
  labels: { working: 'agent-working', readyForQa: 'ready-for-qa' },
};

test('Claude worker uses print mode, schema output, safe permissions, and the existing remediation coordinates', async () => {
  const calls = [];
  const handoff = {
    schema_version: 1,
    message_type: 'development_handoff',
    issue_number: 263,
    pull_request_number: 300,
    attempt: 2,
    subject_sha: 'a'.repeat(40),
    acceptance_criteria: [],
    resolved_findings: ['QA-1'],
    commands: [],
    artifact_refs: [],
    next_actions: ['ready-for-qa'],
  };
  const run = async (call) => {
    calls.push(call);
    return {
      ok: true,
      code: 0,
      stdout: JSON.stringify({ structured_output: handoff }),
      stderr: '',
      error: null,
    };
  };
  const git = {
    prepareIssueWorktree: async () => ({
      path: 'C:/tmp/issue-263',
      branch: 'codex/issue-263-agent-team',
      pullRequestNumber: 300,
    }),
    headSha: async () => 'a'.repeat(40),
  };
  const github = {
    addIssueComment: async () => ({ id: 1 }),
    addPullRequestComment: async () => {},
    addLabels: async () => {},
    removeLabels: async () => {},
  };
  const result = await runClaudeDevelopment({
    issue: { number: 263, title: 'Agent Team', body: 'contract' },
    attempt: 2,
    config: workerConfig,
    github,
    git,
    run,
    schema: { type: 'object' },
    priorQaResult: { findings: [{ finding_id: 'QA-1' }] },
  });
  assert.equal(result.subject_sha, 'a'.repeat(40));
  assert.deepEqual(calls[0].args.slice(0, 4), [
    '--print',
    '--output-format',
    'json',
    '--permission-mode',
  ]);
  assert.equal(calls[0].args.includes('acceptEdits'), true);
  assert.equal(
    calls[0].args.some((arg) => arg.includes('dangerously')),
    false,
  );
  assert.match(calls[0].input, /QA-1/);
});

test('Claude worker passes the exact safe argv: restricted tool surface, allow rules, and nested-execution denies (QA-263-011)', async () => {
  const calls = [];
  const handoff = {
    schema_version: 1,
    message_type: 'development_handoff',
    issue_number: 263,
    pull_request_number: 300,
    attempt: 3,
    subject_sha: 'a'.repeat(40),
    acceptance_criteria: [],
    resolved_findings: [],
    commands: [],
    artifact_refs: [],
    next_actions: ['ready-for-qa'],
  };
  const run = async (call) => {
    calls.push(call);
    return {
      ok: true,
      code: 0,
      stdout: JSON.stringify({ structured_output: handoff }),
      stderr: '',
      error: null,
    };
  };
  const git = {
    prepareIssueWorktree: async () => ({
      path: 'C:/tmp/issue-263',
      branch: 'codex/issue-263-agent-team',
      pullRequestNumber: 300,
    }),
    headSha: async () => 'a'.repeat(40),
  };
  const github = {
    addIssueComment: async () => ({ id: 1 }),
    addPullRequestComment: async () => {},
    addLabels: async () => {},
    removeLabels: async () => {},
  };
  await runClaudeDevelopment({
    issue: { number: 263, title: 'Agent Team', body: 'contract' },
    attempt: 3,
    config: workerConfig,
    github,
    git,
    run,
    schema: { type: 'object' },
    priorQaResult: null,
  });
  assert.deepEqual(calls[0].args, [
    '--print',
    '--output-format',
    'json',
    '--permission-mode',
    'acceptEdits',
    '--tools',
    TOOLS.join(','),
    '--allowedTools',
    workerConfig.allowedTools.join(','),
    '--disallowedTools',
    DISALLOWED.join(','),
  ]);
  assert.equal(
    calls[0].args.some((arg) => /bypass|dangerous/i.test(arg)),
    false,
  );
});

test('Claude worker refuses to launch when the policy would allow nested Claude agents', async () => {
  const run = async () => {
    throw new Error('must not be invoked');
  };
  const git = {
    prepareIssueWorktree: async () => {
      throw new Error('worktree must not be prepared');
    },
    headSha: async () => 'a'.repeat(40),
  };
  const github = {};
  await assert.rejects(
    () =>
      runClaudeDevelopment({
        issue: { number: 263, title: 't', body: 'b' },
        attempt: 3,
        config: { ...workerConfig, tools: [...TOOLS, 'Task'] },
        github,
        git,
        run,
        schema: { type: 'object' },
        priorQaResult: null,
      }),
    /claude development launch refused: .*nested-agent/,
  );
  await assert.rejects(
    () =>
      runClaudeDevelopment({
        issue: { number: 263, title: 't', body: 'b' },
        attempt: 3,
        config: { ...workerConfig, disallowedTools: undefined },
        github,
        git,
        run,
        schema: { type: 'object' },
        priorQaResult: null,
      }),
    /claude development launch refused: .*disallowedTools/,
  );
});
