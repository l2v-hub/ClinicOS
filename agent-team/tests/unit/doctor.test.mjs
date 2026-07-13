import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { runDoctor } from '../../src/commands/doctor.mjs';

const config = {
  repository: 'l2v-hub/ClinicOS', baseBranch: 'origin/main',
  runtimeRoot: 'C:/repo/agent-team/.runtime', worktreeRoot: 'C:/repo/agent-team/.worktrees',
  heartbeatTimeoutMs: 45000, commandTimeoutMs: 120000, developmentTimeoutMs: 5400000, qaTimeoutMs: 3600000,
  tools: ['Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash'],
  allowedTools: ['Read', 'Edit', 'Bash(git *)'],
  disallowedTools: ['Task', 'Agent', 'Bash(claude)', 'Bash(claude *)', 'Bash(claude.exe)', 'Bash(claude.exe *)', 'Bash(npx claude)', 'Bash(npx claude *)', 'Bash(npx @anthropic-ai/claude-code)', 'Bash(npx @anthropic-ai/claude-code *)'],
  labels: { readyForDev: 'ready-for-dev', assignedToClaude: 'assigned-to-claude', working: 'agent-working', readyForQa: 'ready-for-qa', qaPassed: 'qa-passed', qaFailed: 'qa-failed', blocked: 'blocked' }
};

const result = (stdout, code = 0, stderr = '') => ({ ok: code === 0, code, stdout, stderr, error: null });
const CLAUDE_HELP = 'Usage: claude [options] --print --output-format <fmt> --permission-mode <mode> --tools <tools...> --allowedTools <tools> --disallowedTools <tools...>';
const CODEX_EXEC_HELP = 'Usage: codex exec [options] --sandbox <mode> --cd <dir> --output-schema <file> --output-last-message <file>';

function healthyRun(overrides = {}) {
  return async ({ command, args }) => {
    const key = `${command} ${args.join(' ')}`;
    if (key in overrides) return overrides[key];
    if (key === 'claude auth status') return result('{"loggedIn":true}');
    if (key === 'claude --help') return result(CLAUDE_HELP);
    if (key === 'codex exec --help') return result(CODEX_EXEC_HELP);
    if (key === 'codex login status') return result('', 0, 'Logged in using ChatGPT\n');
    if (key.startsWith('gh label list')) return result(JSON.stringify(Object.values(config.labels).map((name) => ({ name }))));
    if (key === 'gh api repos/l2v-hub/ClinicOS') return result(JSON.stringify({ permissions: { push: true, admin: false } }));
    if (key.startsWith('git check-ignore')) return result(`${config.runtimeRoot}\n${config.worktreeRoot}\n`);
    if (key.includes('remote get-url')) return result('https://github.com/l2v-hub/ClinicOS.git');
    return result('ok');
  };
}

const probes = { fileExists: async () => true, writableProbe: async () => true };
const doctorArgs = (extra = {}) => ({ config, run: healthyRun(extra.overrides), isSupervisorLive: extra.isSupervisorLive ?? (async () => false), probes: extra.probes ?? probes });

test('doctor passes every contract prerequisite on a healthy workstation', async () => {
  const doctor = await runDoctor(doctorArgs());
  for (const id of ['labels-exist', 'gh-permissions', 'claude-worker-options', 'codex-exec-options', 'config-files', 'worker-permission-policy', 'timeouts-realistic', 'runtime-root-writable', 'roots-ignored', 'duplicate-supervisor']) {
    assert.equal(doctor.checks.find((check) => check.id === id)?.ok, true, `check ${id} must exist and pass`);
  }
  assert.equal(doctor.ok, true);
});

test('doctor marks development unavailable when Claude is unauthenticated', async () => {
  const doctor = await runDoctor(doctorArgs({ overrides: { 'claude auth status': result('{"loggedIn":false}', 1) } }));
  assert.equal(doctor.developmentReady, false);
  assert.equal(doctor.qaReady, true);
  assert.equal(doctor.ok, false);
});

test('doctor accepts Codex login confirmation printed to stderr', async () => {
  const doctor = await runDoctor(doctorArgs());
  assert.equal(doctor.checks.find((check) => check.id === 'codex-auth').ok, true);
  assert.equal(doctor.qaReady, true);
});

test('doctor refuses a duplicate local supervisor and passes the configured heartbeat timeout', async () => {
  let received = null;
  const doctor = await runDoctor(doctorArgs({ isSupervisorLive: async (options) => { received = options; return true; } }));
  assert.equal(doctor.checks.find((check) => check.id === 'duplicate-supervisor').ok, false);
  assert.equal(received.heartbeatTimeoutMs, config.heartbeatTimeoutMs);
});

test('doctor fails closed when a required GitHub label is missing', async () => {
  const partial = Object.values(config.labels).filter((name) => name !== 'agent-working').map((name) => ({ name }));
  const doctor = await runDoctor(doctorArgs({ overrides: { 'gh label list --repo l2v-hub/ClinicOS --limit 200 --json name': result(JSON.stringify(partial)) } }));
  assert.equal(doctor.checks.find((check) => check.id === 'labels-exist').ok, false);
  assert.match(doctor.checks.find((check) => check.id === 'labels-exist').detail, /agent-working/);
  assert.equal(doctor.ok, false);
});

test('doctor fails closed without push permission on the repository', async () => {
  const doctor = await runDoctor(doctorArgs({ overrides: { 'gh api repos/l2v-hub/ClinicOS': result(JSON.stringify({ permissions: { push: false } })) } }));
  assert.equal(doctor.checks.find((check) => check.id === 'gh-permissions').ok, false);
});

test('doctor blocks development when claude help lacks a required worker option', async () => {
  const doctor = await runDoctor(doctorArgs({ overrides: { 'claude --help': result('Usage: claude --print --output-format --permission-mode') } }));
  const check = doctor.checks.find((c) => c.id === 'claude-worker-options');
  assert.equal(check.ok, false);
  assert.match(check.detail, /--allowedTools/);
  assert.equal(doctor.developmentReady, false);
  assert.equal(doctor.qaReady, true);
});

test('doctor blocks QA when codex exec help lacks a required option', async () => {
  const doctor = await runDoctor(doctorArgs({ overrides: { 'codex exec --help': result('Usage: codex exec --sandbox --cd --output-last-message') } }));
  assert.equal(doctor.checks.find((c) => c.id === 'codex-exec-options').ok, false);
  assert.equal(doctor.qaReady, false);
  assert.equal(doctor.developmentReady, true);
});

test('doctor fails closed when referenced prompt or schema files are missing', async () => {
  const doctor = await runDoctor(doctorArgs({ probes: { ...probes, fileExists: async () => false } }));
  assert.equal(doctor.checks.find((c) => c.id === 'config-files').ok, false);
  assert.equal(doctor.ok, false);
});

test('doctor blocks development on an empty worker permission policy', async () => {
  const doctor = await runDoctor({ ...doctorArgs(), config: { ...config, allowedTools: [] } });
  assert.equal(doctor.checks.find((c) => c.id === 'worker-permission-policy').ok, false);
  assert.equal(doctor.developmentReady, false);
});

test('doctor blocks development when claude help lacks --tools or --disallowedTools (QA-263-011)', async () => {
  const doctor = await runDoctor(doctorArgs({ overrides: { 'claude --help': result('Usage: claude --print --output-format <fmt> --permission-mode <mode> --allowedTools <tools>') } }));
  const check = doctor.checks.find((c) => c.id === 'claude-worker-options');
  assert.equal(check.ok, false);
  assert.match(check.detail, /--tools/);
  assert.match(check.detail, /--disallowedTools/);
  assert.equal(doctor.developmentReady, false);
});

test('doctor blocks development when the tool surface exposes a nested-agent tool (QA-263-011)', async () => {
  const doctor = await runDoctor({ ...doctorArgs(), config: { ...config, tools: [...config.tools, 'Task'] } });
  const check = doctor.checks.find((c) => c.id === 'worker-permission-policy');
  assert.equal(check.ok, false);
  assert.match(check.detail, /nested-agent/);
  assert.equal(doctor.developmentReady, false);
});

test('doctor blocks development when a required nested-execution deny rule is missing (QA-263-011)', async () => {
  const doctor = await runDoctor({ ...doctorArgs(), config: { ...config, disallowedTools: config.disallowedTools.filter((rule) => rule !== 'Agent') } });
  const check = doctor.checks.find((c) => c.id === 'worker-permission-policy');
  assert.equal(check.ok, false);
  assert.match(check.detail, /missing Agent/);
  assert.equal(doctor.developmentReady, false);
});

test('doctor fails closed on unrealistic worker timeouts', async () => {
  const doctor = await runDoctor({ ...doctorArgs(), config: { ...config, developmentTimeoutMs: 60000 } });
  assert.equal(doctor.checks.find((c) => c.id === 'timeouts-realistic').ok, false);
});

test('doctor fails closed when the runtime root is not writable', async () => {
  const doctor = await runDoctor(doctorArgs({ probes: { ...probes, writableProbe: async () => false } }));
  assert.equal(doctor.checks.find((c) => c.id === 'runtime-root-writable').ok, false);
});

test('doctor accepts C-quoted Windows paths from git check-ignore', async () => {
  // Real behavior: git check-ignore echoes paths C-style quoted with escaped backslashes.
  const quoted = (value) => `"${value.replace(/\\/g, '\\\\')}"`;
  const winConfig = { ...config, runtimeRoot: 'C:\\repo\\agent-team\\.runtime', worktreeRoot: 'C:\\repo\\agent-team\\.worktrees' };
  const doctor = await runDoctor({
    config: winConfig,
    run: healthyRun({ [`git check-ignore ${winConfig.runtimeRoot} ${winConfig.worktreeRoot}`]: result(`${quoted(winConfig.runtimeRoot)}\n${quoted(winConfig.worktreeRoot)}\n`) }),
    isSupervisorLive: async () => false,
    probes
  });
  assert.equal(doctor.checks.find((c) => c.id === 'roots-ignored').ok, true);
});

test('doctor fails closed when runtime or worktree roots are not git-ignored', async () => {
  const doctor = await runDoctor(doctorArgs({ overrides: { [`git check-ignore ${config.runtimeRoot} ${config.worktreeRoot}`]: result(`${config.runtimeRoot}\n`, 0) } }));
  assert.equal(doctor.checks.find((c) => c.id === 'roots-ignored').ok, false);
});
