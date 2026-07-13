import test from 'node:test';
import assert from 'node:assert/strict';
import { validateConfig } from '../../src/core/config.mjs';
import { runClaudeDevelopment } from '../../src/workers/claude-development-worker.mjs';
import { runCodexQa } from '../../src/workers/codex-qa-worker.mjs';

const SAFE_TOOLS = ['Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash'];
const SAFE_DISALLOWED = [
  'Task',
  'Agent',
  'Bash(claude)',
  'Bash(claude *)',
  'Bash(claude.exe)',
  'Bash(claude.exe *)',
  'Bash(npx claude)',
  'Bash(npx claude *)',
  'Bash(npx @anthropic-ai/claude-code)',
  'Bash(npx @anthropic-ai/claude-code *)'
];
const baseConfig = {
  schemaVersion: 1, repository: 'l2v-hub/ClinicOS', baseBranch: 'origin/main', pollIntervalMs: 15000,
  heartbeatTimeoutMs: 45000, leaseDurationMs: 300000, leaseRefreshMs: 60000, developmentConcurrency: 1,
  qaConcurrency: 1, noProgressLimit: 3, worktreeRoot: 'agent-team/.worktrees', artifactRoot: 'artifacts/task-validation',
  runtimeRoot: 'agent-team/.runtime', commandTimeoutMs: 120000, maxOutputBytes: 1048576,
  developmentTimeoutMs: 5400000, qaTimeoutMs: 3600000,
  tools: SAFE_TOOLS,
  allowedTools: ['Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash(git *)', 'Bash(gh *)', 'Bash(node *)', 'Bash(npm run *)'],
  disallowedTools: SAFE_DISALLOWED,
  labels: { readyForDev: 'ready-for-dev', assignedToClaude: 'assigned-to-claude', working: 'agent-working', readyForQa: 'ready-for-qa', qaPassed: 'qa-passed', qaFailed: 'qa-failed', blocked: 'blocked' }
};

test('config requires a non-empty scoped allowedTools policy without wildcards or bypass flags', () => {
  assert.equal(validateConfig({ ...baseConfig }).allowedTools.length, 9);
  assert.throws(() => validateConfig({ ...baseConfig, allowedTools: [] }), /allowedTools must be a non-empty array/);
  assert.throws(() => validateConfig({ ...baseConfig, allowedTools: ['*'] }), /allowedTools entry must be a scoped tool rule/);
  assert.throws(() => validateConfig({ ...baseConfig, allowedTools: ['Bash(claude --dangerously-skip-permissions *)'] }), /allowedTools entry must not reference bypass options/);
});

test('config requires an explicit tool surface and nested-execution denies (QA-263-011)', () => {
  assert.deepEqual(validateConfig({ ...baseConfig }).disallowedTools, SAFE_DISALLOWED);
  const { tools, ...withoutTools } = baseConfig;
  assert.throws(() => validateConfig(withoutTools), /missing config key: tools/);
  const { disallowedTools, ...withoutDisallowed } = baseConfig;
  assert.throws(() => validateConfig(withoutDisallowed), /missing config key: disallowedTools/);
  assert.throws(() => validateConfig({ ...baseConfig, tools: [...SAFE_TOOLS, 'Task'] }), /tools must not expose a nested-agent tool: Task/);
  assert.throws(() => validateConfig({ ...baseConfig, tools: [...SAFE_TOOLS, 'Agent'] }), /tools must not expose a nested-agent tool: Agent/);
  assert.throws(() => validateConfig({ ...baseConfig, disallowedTools: SAFE_DISALLOWED.filter((rule) => rule !== 'Bash(claude *)') }), /disallowedTools must deny nested Claude execution: missing Bash\(claude \*\)/);
});

test('config requires realistic development and QA timeouts above the command timeout', () => {
  assert.throws(() => validateConfig({ ...baseConfig, developmentTimeoutMs: 120000 }), /developmentTimeoutMs must exceed commandTimeoutMs/);
  assert.throws(() => validateConfig({ ...baseConfig, qaTimeoutMs: 60000 }), /qaTimeoutMs must exceed commandTimeoutMs/);
});

const worktree = { prepareIssueWorktree: async () => ({ path: 'C:/tmp/issue-263', branch: 'codex/agent-team', pullRequestNumber: 264 }), headSha: async () => 'a'.repeat(40) };
const githubFake = { addIssueComment: async () => ({ id: 1 }), addPullRequestComment: async () => {}, addLabels: async () => {}, removeLabels: async () => {} };
const handoff = { schema_version: 1, message_type: 'development_handoff', issue_number: 263, pull_request_number: 264, attempt: 2, subject_sha: 'a'.repeat(40), acceptance_criteria: [], resolved_findings: [], commands: [], artifact_refs: [], next_actions: ['ready-for-qa'] };

test('Claude worker passes the scoped allowedTools policy and the development timeout', async () => {
  const calls = [];
  const run = async (call) => { calls.push(call); return { ok: true, code: 0, stdout: JSON.stringify({ structured_output: handoff }), stderr: '', error: null }; };
  await runClaudeDevelopment({ issue: { number: 263, title: 't', body: 'b' }, attempt: 2, config: baseConfig, github: githubFake, git: worktree, run, schema: { type: 'object' }, priorQaResult: null });
  const argv = calls[0].args;
  assert.equal(argv.includes('--allowedTools'), true);
  assert.equal(argv[argv.indexOf('--allowedTools') + 1], baseConfig.allowedTools.join(','));
  assert.equal(calls[0].timeoutMs, baseConfig.developmentTimeoutMs);
  assert.equal(argv.some((arg) => arg.includes('dangerously')), false);
});

test('Claude worker refuses to launch with an empty permission policy and a precise diagnostic', async () => {
  const run = async () => { throw new Error('must not be invoked'); };
  await assert.rejects(
    () => runClaudeDevelopment({ issue: { number: 263, title: 't', body: 'b' }, attempt: 2, config: { ...baseConfig, allowedTools: [] }, github: githubFake, git: worktree, run, schema: { type: 'object' }, priorQaResult: null }),
    /claude development launch refused: allowedTools policy is empty or missing/
  );
});

test('Claude worker rejects a structured handoff that violates the required schema before any GitHub change', async () => {
  const githubCalls = [];
  const github = {
    addIssueComment: async () => { githubCalls.push('comment'); return { id: 1 }; },
    addPullRequestComment: async () => { githubCalls.push('pr-comment'); },
    addLabels: async () => { githubCalls.push('add-labels'); },
    removeLabels: async () => { githubCalls.push('remove-labels'); }
  };
  const run = async () => ({ ok: true, code: 0, stdout: JSON.stringify({ structured_output: { unexpected: true } }), stderr: '', error: null });
  await assert.rejects(
    () => runClaudeDevelopment({ issue: { number: 263, title: 't', body: 'b' }, attempt: 2, config: baseConfig, github, git: worktree, run, schema: { type: 'object', required: ['message_type', 'subject_sha'] }, priorQaResult: null }),
    /claude structured output failed schema validation/
  );
  assert.deepEqual(githubCalls, []);
});

test('Codex QA worker uses the dedicated QA timeout', async () => {
  const calls = [];
  const qa = { schema_version: 1, message_type: 'qa_result', issue_number: 263, pull_request_number: 264, attempt: 2, subject_sha: 'a'.repeat(40), decision: 'qa-passed', acceptance_criteria: [], findings: [], commands: [], artifact_refs: [], next_actions: ['qa-passed'] };
  const run = async (call) => { calls.push(call); return { ok: true, code: 0, stdout: '', stderr: '', error: null, finalMessage: JSON.stringify(qa) }; };
  await runCodexQa({ issue: { number: 263 }, pullRequest: { number: 264, headRefOid: 'a'.repeat(40) }, config: { ...baseConfig, runtimeRoot: (await import('node:os')).tmpdir() }, github: githubFake, run, schema: { type: 'object' }, worktreePath: 'C:/tmp/issue-263' });
  assert.equal(calls[0].timeoutMs, baseConfig.qaTimeoutMs);
});
