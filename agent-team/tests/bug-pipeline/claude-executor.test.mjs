import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createClaudeExecutor } from '../../src/bug-pipeline/claude-executor.mjs';

const FLAGS = [
  '--json-schema',
  '--model',
  '--max-turns',
  '--print',
  '--output-format',
  '--no-session-persistence',
  '--restricted',
  '--permission-mode',
  '--permission-prompts',
  '--setting-sources',
  '--safe-mode',
  '--tools',
  '--allowedTools',
  '--disallowedTools',
  '--strict-mcp-config',
  '--mcp-config',
  '--disable-slash-commands',
];
const HELP = `Claude Code\n${FLAGS.join('\n')}\n`;
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'summary'],
  properties: {
    status: { type: 'string', enum: ['implemented', 'blocked'] },
    summary: { type: 'string' },
  },
};
const RESULT = { status: 'implemented', summary: 'Synthetic fixture result' };
const RESERVATION = {
  nonce: '0123456789abcdef0123456789abcdef',
  provider: 'claude',
  model: 'haiku',
  status: 'running',
};

async function fixture(t, { hostedActions = false, maxTurns = 4 } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'claude-executor-test-'));
  const cwd = path.join(root, 'worktree');
  const runtimeRoot = path.join(root, 'runtime');
  const configDir = path.join(root, 'personal-claude-profile');
  const executable = path.join(root, 'claude-native');
  await Promise.all([mkdir(cwd), mkdir(configDir), mkdir(runtimeRoot)]);
  await writeFile(executable, 'synthetic native executable placeholder');
  t.after(() => rm(root, { recursive: true, force: true }));
  const calls = [];
  let modelResult = {
    ok: true,
    code: 0,
    stdout: JSON.stringify({ structured_output: RESULT }),
    stderr: '',
  };
  let auth = { loggedIn: true, authMethod: 'claude.ai', subscriptionType: 'max' };
  let help = HELP;
  const run = async (options) => {
    calls.push(options);
    if (options.args[0] === '--version')
      return { ok: true, code: 0, stdout: '2.1.301\n', stderr: '' };
    if (options.args[0] === '--help') return { ok: true, code: 0, stdout: help, stderr: '' };
    if (options.args[0] === 'auth')
      return { ok: true, code: 0, stdout: JSON.stringify(auth), stderr: '' };
    return modelResult;
  };
  const config = { enabled: true, hostedActions, executable, configDir, model: 'haiku', maxTurns };
  const executor = createClaudeExecutor({ run, runtimeRoot, config, now: () => 1_798_000_000_000 });
  return {
    calls,
    config,
    cwd,
    executor,
    get auth() {
      return auth;
    },
    set auth(value) {
      auth = value;
    },
    get help() {
      return help;
    },
    set help(value) {
      help = value;
    },
    get modelResult() {
      return modelResult;
    },
    set modelResult(value) {
      modelResult = value;
    },
    configDir,
    executable,
  };
}

test('preflight checks local CLI capabilities and a matching local Max profile without inference', async (t) => {
  const f = await fixture(t);
  const result = await f.executor.preflight({ cwd: f.cwd });
  assert.equal(result.ready, true);
  assert.equal(result.capabilities.provider, 'claude');
  assert.equal(result.capabilities.model, 'haiku');
  assert.equal(result.capabilities.cliVersion, '2.1.301');
  assert.deepEqual(result.capabilities.localAuth, {
    ready: true,
    loggedIn: true,
    authMethod: 'claude.ai',
    subscriptionType: 'max',
  });
  assert.deepEqual(
    f.calls.map((call) => call.args),
    [['--version'], ['--help'], ['auth', 'status', '--json']],
  );
  assert.ok(f.calls.every((call) => call.envMode === 'claude-execution'));
  assert.ok(f.calls.every((call) => call.command === f.executable));
  assert.ok(f.calls.every((call) => call.claudeConfigDir === f.configDir));
  assert.equal(
    f.calls.some((call) => call.args.includes('--print')),
    false,
  );
});

test('preflight blocks hosted Actions and invalid config before spawning', async (t) => {
  const f = await fixture(t, { hostedActions: true });
  const result = await f.executor.preflight({ cwd: f.cwd });
  assert.equal(result.ready, false);
  assert.equal(result.reason, 'hosted-actions-forbidden');
  assert.equal(f.calls.length, 0);
});

test('preflight blocks unsupported turn bounds before auth or inference', async (t) => {
  const f = await fixture(t);
  f.help = HELP.replace('--json-schema\n', '');
  const result = await f.executor.preflight({ cwd: f.cwd });
  assert.equal(result.ready, false);
  assert.equal(result.reason, 'required-cli-flags-unavailable');
  assert.deepEqual(
    f.calls.map((call) => call.args[0]),
    ['--version', '--help'],
  );
});

test('preflight accepts a CLI without optional max-turns and reports time-only bounding', async (t) => {
  const f = await fixture(t);
  f.help = HELP.replace('--max-turns\n', '');
  const result = await f.executor.preflight({ cwd: f.cwd });
  assert.equal(result.ready, true);
  assert.equal(result.capabilities.turnsBounded, false);
  assert.equal(result.capabilities.timeBounded, true);
});

test('preflight requires a logged-in claude.ai Max profile', async (t) => {
  const f = await fixture(t);
  f.auth = { loggedIn: true, authMethod: 'claude.ai', subscriptionType: 'pro' };
  const result = await f.executor.preflight({ cwd: f.cwd });
  assert.equal(result.ready, false);
  assert.equal(result.reason, 'local-max-subscription-required');
  assert.equal(f.calls.length, 3);
  assert.equal(
    f.calls.some((call) => call.args.includes('--print')),
    false,
  );
});

test('preflight exposes only whitelisted auth metadata', async (t) => {
  const f = await fixture(t);
  f.auth = {
    loggedIn: false,
    authMethod: 'ANTHROPIC_API_KEY=fixture-secret',
    subscriptionType: 'fixture-secret',
  };
  const result = await f.executor.preflight({ cwd: f.cwd });
  assert.equal(result.ready, false);
  assert.deepEqual(result.capabilities.localAuth, {
    ready: false,
    loggedIn: false,
    authMethod: 'other',
    subscriptionType: 'other',
  });
  assert.equal(JSON.stringify(result).includes('fixture-secret'), false);
});

test('execute uses a fresh restricted file-only session and returns validated structured output', async (t) => {
  const f = await fixture(t);
  const result = await f.executor.execute({
    cwd: f.cwd,
    prompt: 'Synthetic bounded task',
    schema: SCHEMA,
    reservation: RESERVATION,
  });
  assert.deepEqual(result, RESULT);
  const call = f.calls.at(-1);
  assert.equal(call.envMode, 'claude-execution');
  assert.equal(call.claudeConfigDir, f.configDir);
  assert.equal(call.cwd, f.cwd);
  assert.equal(call.input, 'Synthetic bounded task');
  assert.equal(call.timeoutMs, 10 * 60 * 1000);
  assert.equal(call.maxOutputBytes, 512 * 1024);
  const args = call.args;
  const value = (name) => args[args.indexOf(name) + 1];
  assert.ok(args.includes('--restricted'));
  assert.ok(args.includes('--safe-mode'));
  assert.ok(args.includes('--no-session-persistence'));
  assert.ok(args.includes('--disable-slash-commands'));
  assert.ok(args.includes('--strict-mcp-config'));
  assert.equal(value('--permission-mode'), 'acceptEdits');
  assert.equal(value('--permission-prompts'), 'none');
  assert.equal(value('--setting-sources'), '');
  assert.equal(value('--model'), 'haiku');
  assert.equal(value('--max-turns'), '4');
  assert.deepEqual(JSON.parse(value('--json-schema')), SCHEMA);
  assert.deepEqual(JSON.parse(value('--mcp-config')), { mcpServers: {} });
  assert.equal(value('--tools'), 'Read,Edit,Write,Glob,Grep');
  assert.equal(value('--allowedTools'), 'Read,Edit,Write,Glob,Grep');
  assert.equal(value('--disallowedTools'), 'Bash,PowerShell,WebFetch,WebSearch,Task,Agent');
  for (const forbidden of ['Bash', 'PowerShell', 'WebFetch', 'WebSearch', 'Task', 'Agent'])
    assert.equal(value('--tools').split(',').includes(forbidden), false);
  assert.equal(args.includes('--resume'), false);
  assert.equal(args.includes('--dangerously-skip-permissions'), false);
  assert.equal(args.includes('--bare'), false);
});

test('execute omits optional turn flag when the CLI does not document it', async (t) => {
  const f = await fixture(t);
  f.help = HELP.replace('--max-turns\n', '');
  const result = await f.executor.execute({
    cwd: f.cwd,
    prompt: 'Synthetic bounded task',
    schema: SCHEMA,
    reservation: RESERVATION,
  });
  assert.deepEqual(result, RESULT);
  const call = f.calls.at(-1);
  assert.equal(call.args.includes('--max-turns'), false);
  assert.equal(call.timeoutMs, 10 * 60 * 1000);
});

test('execute rejects invalid reservation and oversized prompt before preflight', async (t) => {
  const f = await fixture(t);
  await assert.rejects(
    f.executor.execute({
      cwd: f.cwd,
      prompt: 'task',
      schema: SCHEMA,
      reservation: { ...RESERVATION, model: 'opus' },
    }),
    { code: 'claude-reservation-invalid' },
  );
  await assert.rejects(
    f.executor.execute({
      cwd: f.cwd,
      prompt: 'x'.repeat(512 * 1024 + 1),
      schema: SCHEMA,
      reservation: RESERVATION,
    }),
    { code: 'claude-prompt-invalid' },
  );
  assert.equal(f.calls.length, 0);
});

test('execute rejects malformed, missing, provider-error and schema-invalid envelopes', async (t) => {
  const f = await fixture(t);
  const cases = [
    ['not json', 'claude-result-invalid'],
    [JSON.stringify({ result: RESULT }), 'claude-result-missing'],
    [JSON.stringify({ is_error: true, structured_output: RESULT }), 'claude-provider-error'],
    [
      JSON.stringify({
        error: { type: 'rate_limit_error', message: 'private diagnostic' },
        structured_output: RESULT,
      }),
      'claude-provider-error',
    ],
    [JSON.stringify({ subtype: 'error_max_turns' }), 'claude-turn-limit'],
    [
      JSON.stringify({ structured_output: { status: 'invented', summary: 'x' } }),
      'claude-result-schema-invalid',
    ],
  ];
  for (const [stdout, code] of cases) {
    f.modelResult = { ok: true, code: 0, stdout, stderr: 'private diagnostic' };
    await assert.rejects(
      f.executor.execute({ cwd: f.cwd, prompt: 'task', schema: SCHEMA, reservation: RESERVATION }),
      (error) => error.code === code && !error.message.includes('private diagnostic'),
    );
  }
});

test('execute rejects timeout, process failure, and bounded output overflow', async (t) => {
  const f = await fixture(t);
  const call = () =>
    f.executor.execute({ cwd: f.cwd, prompt: 'task', schema: SCHEMA, reservation: RESERVATION });
  f.modelResult = { ok: false, error: 'timeout', stdout: '', stderr: 'secret' };
  await assert.rejects(call(), { code: 'claude-timeout' });
  f.modelResult = { ok: false, code: 1, stdout: '', stderr: 'secret' };
  await assert.rejects(call(), { code: 'claude-process-failed' });
  f.modelResult = { ok: true, code: 0, stdout: 'x'.repeat(512 * 1024 + 1), stderr: '' };
  await assert.rejects(call(), { code: 'claude-output-limit' });
});

test('configuration rejects invalid executable/profile paths and out-of-range turns', async (t) => {
  const f = await fixture(t, { maxTurns: 9 });
  const invalid = createClaudeExecutor({
    run: async () => assert.fail('must not launch'),
    runtimeRoot: path.join(path.dirname(f.cwd), 'another-runtime'),
    config: { ...f.config },
  });
  const result = await invalid.preflight({ cwd: f.cwd });
  assert.equal(result.ready, false);
  assert.equal(result.reason, 'turn-limit-out-of-range');
});
