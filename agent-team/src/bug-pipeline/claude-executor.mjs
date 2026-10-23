import { lstat, mkdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { validateAgainstSchema } from '../core/json-schema.mjs';
import { sanitizeText } from '../core/sanitize.mjs';

const MAX_PROMPT_BYTES = 512 * 1024;
const MAX_SCHEMA_BYTES = 64 * 1024;
const MAX_OUTPUT_BYTES = 512 * 1024;
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_TIMEOUT_MS = 30 * 60 * 1000;
const MIN_TURNS = 1;
const MAX_TURNS = 8;
const FILE_TOOLS = ['Read', 'Edit', 'Write', 'Glob', 'Grep'];
const DENIED_TOOLS = ['Bash', 'PowerShell', 'WebFetch', 'WebSearch', 'Task', 'Agent'];
const REQUIRED_FLAGS = [
  '--json-schema',
  '--model',
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

function fail(code, message) {
  throw Object.assign(new Error(message), { code });
}

function isAbsoluteSafe(value) {
  return typeof value === 'string' && path.isAbsolute(value) && !/[\r\n\0]/.test(value);
}

function inside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
  );
}

function normalizeConfig(config) {
  if (!config || typeof config !== 'object') return { error: 'invalid-configuration' };
  if (config.enabled !== true) return { error: 'disabled' };
  if (config.hostedActions === true) return { error: 'hosted-actions-forbidden' };
  if (!isAbsoluteSafe(config.executable)) return { error: 'executable-path-required' };
  if (!isAbsoluteSafe(config.configDir)) return { error: 'subscription-profile-required' };
  if (
    typeof config.model !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}$/.test(config.model)
  )
    return { error: 'explicit-model-required' };
  if (
    config.maxTurns !== undefined &&
    (!Number.isInteger(config.maxTurns) ||
      config.maxTurns < MIN_TURNS ||
      config.maxTurns > MAX_TURNS)
  )
    return { error: 'turn-limit-out-of-range' };
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > MAX_TIMEOUT_MS)
    return { error: 'timeout-out-of-range' };
  return { config: { ...config, timeoutMs } };
}

async function checkedPaths({ cwd, runtimeRoot, configDir, executable }) {
  if (!isAbsoluteSafe(cwd)) fail('claude-invalid-worktree', 'Claude worktree path is invalid');
  if (!isAbsoluteSafe(runtimeRoot))
    fail('claude-invalid-runtime', 'Claude runtime path is invalid');
  const worktree = await realpath(cwd).catch(() => null);
  if (!worktree || path.resolve(cwd) !== worktree)
    fail('claude-invalid-worktree', 'Claude worktree must be an existing real directory');
  await mkdir(runtimeRoot, { recursive: true, mode: 0o700 }).catch(() => {});
  const runtime = await realpath(runtimeRoot).catch(() => null);
  if (!runtime || inside(worktree, runtime) || inside(runtime, worktree))
    fail('claude-invalid-runtime', 'Claude runtime must resolve outside the worktree');
  const profileStat = await lstat(configDir).catch(() => null);
  const profile = profileStat?.isDirectory() ? await realpath(configDir).catch(() => null) : null;
  if (!profile || profile !== path.resolve(configDir) || inside(worktree, profile))
    fail(
      'claude-invalid-profile',
      'Claude subscription profile must be an existing external directory',
    );
  const executableStat = await lstat(executable).catch(() => null);
  if (!executableStat?.isFile() || executableStat.isSymbolicLink())
    fail('claude-invalid-executable', 'Claude executable must be a regular configured file');
  return { worktree, runtime, profile };
}

function commandResultOk(result) {
  return result?.ok === true && (result.code === undefined || result.code === 0);
}

async function runChecked(run, options, code) {
  let result;
  try {
    result = await run(options);
  } catch {
    fail(code, 'Claude CLI command could not be started');
  }
  if (!commandResultOk(result)) fail(code, 'Claude CLI command failed');
  return result;
}

function parseAuth(stdout) {
  let auth;
  try {
    auth = JSON.parse(stdout);
  } catch {
    return { ready: false, loggedIn: false, authMethod: null, subscriptionType: null };
  }
  const rawSubscription =
    typeof auth?.subscriptionType === 'string' ? auth.subscriptionType.toLowerCase() : null;
  const subscriptionType = ['max', 'pro', 'team', 'enterprise', 'free'].includes(rawSubscription)
    ? rawSubscription
    : rawSubscription === null
      ? null
      : 'other';
  const authMethod =
    auth?.authMethod === 'claude.ai'
      ? 'claude.ai'
      : typeof auth?.authMethod === 'string'
        ? 'other'
        : null;
  const loggedIn = auth?.loggedIn === true;
  return {
    ready: loggedIn && authMethod === 'claude.ai' && subscriptionType === 'max',
    loggedIn,
    authMethod,
    subscriptionType,
  };
}

function makeArgs({ model, maxTurns, turnsBounded, schema }) {
  const jsonSchema = JSON.stringify(schema);
  const args = [
    '--print',
    '--output-format',
    'json',
    '--no-session-persistence',
    '--restricted',
    '--safe-mode',
    '--permission-mode',
    'acceptEdits',
    '--permission-prompts',
    'none',
    '--setting-sources',
    '',
    '--strict-mcp-config',
    '--mcp-config',
    JSON.stringify({ mcpServers: {} }),
    '--disable-slash-commands',
    '--model',
    model,
    '--json-schema',
    jsonSchema,
    '--tools',
    FILE_TOOLS.join(','),
    '--allowedTools',
    FILE_TOOLS.join(','),
    '--disallowedTools',
    DENIED_TOOLS.join(','),
  ];
  if (turnsBounded) {
    args.push('--max-turns', String(maxTurns));
  }
  return args;
}

export function createClaudeExecutor({ run, runtimeRoot, config, now = Date.now }) {
  if (typeof run !== 'function') throw new TypeError('run must be a process runner');
  if (typeof now !== 'function') throw new TypeError('now must be a function');
  const normalized = normalizeConfig(config);

  async function preflight({ cwd } = {}) {
    const capabilities = {
      provider: 'claude',
      model: normalized.config?.model ?? null,
      cliVersion: null,
      supportedFlags: [],
      turnsBounded: false,
      timeBounded: true,
      localAuth: { loggedIn: false, authMethod: null, subscriptionType: null },
      checkedAt: new Date(now()).toISOString(),
    };
    if (normalized.error) return { ready: false, reason: normalized.error, capabilities };
    let paths;
    try {
      paths = await checkedPaths({ cwd, runtimeRoot, ...normalized.config });
    } catch (error) {
      return { ready: false, reason: error.code || 'claude-path-preflight-failed', capabilities };
    }
    const base = {
      command: normalized.config.executable,
      cwd: paths.worktree,
      envMode: 'claude-execution',
      claudeConfigDir: paths.profile,
      timeoutMs: 30_000,
      maxOutputBytes: 64 * 1024,
    };
    try {
      const version = await runChecked(
        run,
        { ...base, args: ['--version'] },
        'claude-version-failed',
      );
      const help = await runChecked(run, { ...base, args: ['--help'] }, 'claude-help-failed');
      const helpText = `${help.stdout ?? ''}\n${help.stderr ?? ''}`;
      capabilities.cliVersion = sanitizeText(String(version.stdout ?? '').trim()).slice(0, 80);
      capabilities.supportedFlags = REQUIRED_FLAGS.filter((flag) => helpText.includes(flag));
      capabilities.turnsBounded =
        helpText.includes('--max-turns') && Number.isInteger(normalized.config.maxTurns);
      const missingFlags = REQUIRED_FLAGS.filter(
        (flag) => !capabilities.supportedFlags.includes(flag),
      );
      if (missingFlags.length)
        return { ready: false, reason: 'required-cli-flags-unavailable', capabilities };
      const authResult = await runChecked(
        run,
        { ...base, args: ['auth', 'status', '--json'] },
        'claude-auth-status-failed',
      );
      capabilities.localAuth = parseAuth(String(authResult.stdout ?? ''));
      if (!capabilities.localAuth.ready)
        return { ready: false, reason: 'local-max-subscription-required', capabilities };
      return { ready: true, reason: null, capabilities };
    } catch (error) {
      return { ready: false, reason: error.code || 'claude-preflight-failed', capabilities };
    }
  }

  async function execute({ cwd, prompt, schema, reservation } = {}) {
    if (
      !reservation ||
      reservation.provider !== 'claude' ||
      reservation.model !== normalized.config?.model ||
      reservation.status !== 'running' ||
      typeof reservation.nonce !== 'string' ||
      !/^[A-Za-z0-9._-]{8,128}$/.test(reservation.nonce)
    )
      fail('claude-reservation-invalid', 'Claude execution requires its exact running reservation');
    if (typeof prompt !== 'string' || Buffer.byteLength(prompt, 'utf8') > MAX_PROMPT_BYTES)
      fail('claude-prompt-invalid', 'Claude prompt is invalid or exceeds the configured limit');
    if (!schema || typeof schema !== 'object' || Array.isArray(schema))
      fail('claude-schema-invalid', 'Claude structured output schema must be an object');
    let schemaJson;
    try {
      schemaJson = JSON.stringify(schema);
    } catch {
      fail('claude-schema-invalid', 'Claude structured output schema is not JSON serializable');
    }
    if (Buffer.byteLength(schemaJson, 'utf8') > MAX_SCHEMA_BYTES)
      fail('claude-schema-invalid', 'Claude structured output schema exceeds the configured limit');
    if (normalized.error)
      fail(`claude-${normalized.error}`, 'Claude execution profile is not configured');
    const ready = await preflight({ cwd });
    if (!ready.ready)
      fail('claude-preflight-not-ready', `Claude preflight blocked: ${ready.reason}`);
    const { worktree, profile } = await checkedPaths({ cwd, runtimeRoot, ...normalized.config });
    const args = makeArgs({
      model: normalized.config.model,
      maxTurns: normalized.config.maxTurns,
      turnsBounded: ready.capabilities.turnsBounded,
      schema,
    });
    let result;
    try {
      result = await run({
        command: normalized.config.executable,
        args,
        cwd: worktree,
        input: prompt,
        envMode: 'claude-execution',
        claudeConfigDir: profile,
        timeoutMs: normalized.config.timeoutMs,
        maxOutputBytes: MAX_OUTPUT_BYTES,
      });
    } catch {
      fail('claude-process-failed', 'Claude execution ended without a confirmed result');
    }
    if (result?.error === 'timeout') fail('claude-timeout', 'Claude execution timed out');
    if (result?.error === 'output-limit')
      fail('claude-output-limit', 'Claude output exceeded the configured limit');
    if (!commandResultOk(result))
      fail('claude-process-failed', 'Claude execution failed without a confirmed result');
    const stdout = String(result.stdout ?? '');
    if (!stdout || Buffer.byteLength(stdout, 'utf8') > MAX_OUTPUT_BYTES)
      fail('claude-output-limit', 'Claude output was empty or exceeded the configured limit');
    let envelope;
    try {
      envelope = JSON.parse(stdout);
    } catch {
      fail('claude-result-invalid', 'Claude returned malformed JSON');
    }
    if (envelope?.subtype === 'error_max_turns')
      fail('claude-turn-limit', 'Claude reached its configured turn limit');
    if (
      envelope?.error != null ||
      envelope?.is_error === true ||
      (typeof envelope?.subtype === 'string' && envelope.subtype.startsWith('error'))
    )
      fail('claude-provider-error', 'Claude returned an error envelope');
    if (!Object.hasOwn(envelope ?? {}, 'structured_output'))
      fail('claude-result-missing', 'Claude response did not contain structured output');
    try {
      validateAgainstSchema(envelope.structured_output, schema);
    } catch {
      fail(
        'claude-result-schema-invalid',
        'Claude structured output did not match the required schema',
      );
    }
    return envelope.structured_output;
  }

  return { preflight, execute };
}
