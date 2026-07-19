import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateWorkerToolPolicy,
  buildClaudeWorkerArgs,
  NESTED_AGENT_TOOLS,
  REQUIRED_DISALLOWED_TOOLS,
} from '../../src/core/worker-policy.mjs';

// Literal fixtures on purpose: the safe policy is pinned by value, never echoed from the
// implementation, so any weakening of the shipped policy fails these tests (QA-263-011).
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
  'Bash(npx @anthropic-ai/claude-code *)',
];
const SAFE_ALLOWED = [
  'Read',
  'Edit',
  'Write',
  'Glob',
  'Grep',
  'Bash(git *)',
  'Bash(gh *)',
  'Bash(node *)',
  'Bash(npm run *)',
  'Bash(npx *)',
  'Bash(mkdir *)',
];
const safeConfig = {
  tools: SAFE_TOOLS,
  allowedTools: SAFE_ALLOWED,
  disallowedTools: SAFE_DISALLOWED,
};

test('the module constants pin every nested-agent surface', () => {
  assert.deepEqual(NESTED_AGENT_TOOLS, ['Task', 'Agent']);
  assert.deepEqual(REQUIRED_DISALLOWED_TOOLS, SAFE_DISALLOWED);
});

test('buildClaudeWorkerArgs produces the exact safe argv with --tools and --disallowedTools', () => {
  assert.deepEqual(buildClaudeWorkerArgs(safeConfig), [
    '--print',
    '--output-format',
    'json',
    '--permission-mode',
    'acceptEdits',
    '--tools',
    SAFE_TOOLS.join(','),
    '--allowedTools',
    SAFE_ALLOWED.join(','),
    '--disallowedTools',
    SAFE_DISALLOWED.join(','),
  ]);
});

test('the built argv never references bypass or dangerous permission modes', () => {
  const argv = buildClaudeWorkerArgs(safeConfig);
  assert.equal(
    argv.some((arg) => /bypass|dangerous/i.test(arg)),
    false,
  );
  assert.equal(argv[argv.indexOf('--permission-mode') + 1], 'acceptEdits');
});

test('a policy exposing a nested-agent tool is rejected with a precise diagnostic', () => {
  for (const nested of ['Task', 'Agent']) {
    const policy = validateWorkerToolPolicy({ ...safeConfig, tools: [...SAFE_TOOLS, nested] });
    assert.equal(policy.ok, false);
    assert.match(
      policy.errors.join('; '),
      new RegExp(`tools must not expose a nested-agent tool: ${nested}`),
    );
  }
});

test('a policy missing a required nested-execution deny rule is rejected', () => {
  for (const required of SAFE_DISALLOWED) {
    const policy = validateWorkerToolPolicy({
      ...safeConfig,
      disallowedTools: SAFE_DISALLOWED.filter((rule) => rule !== required),
    });
    assert.equal(policy.ok, false, `dropping ${required} must invalidate the policy`);
    assert.match(
      policy.errors.join('; '),
      /disallowedTools must deny nested Claude execution: missing /,
    );
  }
});

test('empty or missing tool policies fail closed', () => {
  assert.equal(validateWorkerToolPolicy({ ...safeConfig, tools: [] }).ok, false);
  assert.equal(validateWorkerToolPolicy({ ...safeConfig, tools: undefined }).ok, false);
  assert.equal(validateWorkerToolPolicy({ ...safeConfig, allowedTools: [] }).ok, false);
  assert.equal(validateWorkerToolPolicy({ ...safeConfig, disallowedTools: undefined }).ok, false);
  assert.match(
    validateWorkerToolPolicy({ ...safeConfig, disallowedTools: undefined }).errors.join('; '),
    /disallowedTools policy is empty or missing/,
  );
});

test('bypass tokens are rejected in every policy list', () => {
  assert.equal(
    validateWorkerToolPolicy({
      ...safeConfig,
      allowedTools: [...SAFE_ALLOWED, 'Bash(claude --dangerously-skip-permissions *)'],
    }).ok,
    false,
  );
  assert.equal(
    validateWorkerToolPolicy({ ...safeConfig, tools: [...SAFE_TOOLS, 'BypassTool'] }).ok,
    false,
  );
});

test('buildClaudeWorkerArgs refuses an unsafe policy before any spawn', () => {
  assert.throws(
    () => buildClaudeWorkerArgs({ ...safeConfig, tools: [...SAFE_TOOLS, 'Task'] }),
    /claude development launch refused: .*nested-agent/,
  );
  assert.throws(
    () => buildClaudeWorkerArgs({ ...safeConfig, disallowedTools: [] }),
    /claude development launch refused: .*disallowedTools/,
  );
});
