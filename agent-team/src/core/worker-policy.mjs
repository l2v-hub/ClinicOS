// Fail-closed Claude worker tool policy (QA-263-011). A production development worker gets an
// explicit tool surface (--tools) that contains no nested-agent tool, plus explicit deny rules
// (--disallowedTools) for nested agents and any Claude subprocess invocation through the shell.
// Deny rules take precedence over allow rules, so nested Claude execution stays unavailable even
// where broad Bash allow rules (node/npx) would otherwise reach the claude binary. Combined with
// the process-tree timeout kill in the process runner, a worker timeout or shutdown cannot leave
// an Agent Team-owned Claude process alive: no such process can be created in the first place.

export const NESTED_AGENT_TOOLS = ['Task', 'Agent'];

export const REQUIRED_DISALLOWED_TOOLS = [
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

const SCOPED_RULE = /^[A-Za-z][A-Za-z0-9_-]*(\(.+\))?$/;
const BARE_TOOL = /^[A-Za-z][A-Za-z0-9_-]*$/;

export function validateWorkerToolPolicy({ tools, allowedTools, disallowedTools } = {}) {
  const errors = [];
  if (!Array.isArray(tools) || tools.length === 0) {
    errors.push('tools must be a non-empty array naming the exact Claude tool surface');
  } else {
    for (const tool of tools) {
      if (typeof tool !== 'string' || !BARE_TOOL.test(tool)) errors.push(`tools entry must be a bare tool name: ${tool}`);
      else if (NESTED_AGENT_TOOLS.includes(tool)) errors.push(`tools must not expose a nested-agent tool: ${tool}`);
    }
  }
  if (!Array.isArray(allowedTools) || allowedTools.length === 0) {
    errors.push('allowedTools policy is empty or missing — configure a scoped permission policy before launching workers');
  }
  if (!Array.isArray(disallowedTools) || disallowedTools.length === 0) {
    errors.push('disallowedTools policy is empty or missing — nested Claude execution must be explicitly denied');
  } else {
    for (const rule of disallowedTools) {
      if (typeof rule !== 'string' || !SCOPED_RULE.test(rule)) errors.push(`disallowedTools entry must be a scoped tool rule: ${rule}`);
    }
    for (const required of REQUIRED_DISALLOWED_TOOLS) {
      if (!disallowedTools.includes(required)) errors.push(`disallowedTools must deny nested Claude execution: missing ${required}`);
    }
  }
  for (const [key, rules] of [['tools', tools], ['allowedTools', allowedTools], ['disallowedTools', disallowedTools]]) {
    if (!Array.isArray(rules)) continue;
    for (const rule of rules) {
      if (typeof rule === 'string' && /dangerous|bypass/i.test(rule)) errors.push(`${key} entry must not reference bypass options: ${rule}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

// The single authoritative worker argv: documented Claude CLI options only, permission mode
// pinned to acceptEdits, never a bypass or dangerous flag.
export function buildClaudeWorkerArgs(config) {
  const policy = validateWorkerToolPolicy(config);
  if (!policy.ok) throw new Error(`claude development launch refused: ${policy.errors.join('; ')}`);
  return [
    '--print', '--output-format', 'json', '--permission-mode', 'acceptEdits',
    '--tools', config.tools.join(','),
    '--allowedTools', config.allowedTools.join(','),
    '--disallowedTools', config.disallowedTools.join(',')
  ];
}
