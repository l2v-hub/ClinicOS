import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const REQUIRED_CLAUDE_OPTIONS = ['--print', '--output-format', '--permission-mode', '--allowedTools'];
const REQUIRED_CODEX_EXEC_OPTIONS = ['--sandbox', '--cd', '--output-schema', '--output-last-message'];
const REFERENCED_FILES = [
  'agent-team/prompts/claude-development.md',
  'agent-team/prompts/codex-qa.md',
  'agent-team/protocol/schemas/message.schema.json',
  'agent-team/protocol/schemas/development-handoff.schema.json',
  'agent-team/protocol/schemas/qa-result.schema.json',
  'agent-team/protocol/schemas/artifact-manifest.schema.json',
  'agent-team/protocol/schemas/claim.schema.json'
];

function textOf(result) { return `${result.stdout ?? ''}\n${result.stderr ?? ''}`; }

function requireOptions(result, options) {
  if (!result.ok) return { ok: false, detail: result.error || result.stderr || 'help unavailable' };
  const text = textOf(result);
  const missing = options.filter((option) => !text.includes(option));
  return missing.length ? { ok: false, detail: `missing required options: ${missing.join(', ')}` } : { ok: true, detail: 'ok' };
}

const defaultProbes = {
  async fileExists(filePath) { try { await access(filePath); return true; } catch { return false; } },
  async writableProbe(dir) {
    try {
      await mkdir(dir, { recursive: true });
      const probe = path.join(dir, `.doctor-probe-${process.pid}`);
      await writeFile(probe, 'probe');
      await rm(probe, { force: true });
      return true;
    } catch { return false; }
  }
};

export async function runDoctor({ config, run, isSupervisorLive, probes = defaultProbes }) {
  const checks = [];
  const push = (id, blockingFor, ok, detail) => checks.push({ id, ok, blockingFor, detail: ok ? 'ok' : detail });
  const invoke = (command, args) => run({ command, args, cwd: process.cwd(), timeoutMs: 15000, maxOutputBytes: 65536 });

  // CLI availability and authentication probes (read-only).
  const cli = [
    ['codex-version', 'qa', 'codex', ['--version'], (r) => ({ ok: r.ok, detail: r.error || r.stderr || 'check failed' })],
    ['codex-help', 'qa', 'codex', ['--help'], (r) => ({ ok: r.ok, detail: r.error || r.stderr || 'check failed' })],
    ['codex-exec-options', 'qa', 'codex', ['exec', '--help'], (r) => requireOptions(r, REQUIRED_CODEX_EXEC_OPTIONS)],
    ['codex-auth', 'qa', 'codex', ['login', 'status'], (r) => ({ ok: r.ok && /logged in/i.test(textOf(r)), detail: r.error || r.stderr || 'not authenticated' })],
    ['claude-version', 'development', 'claude', ['--version'], (r) => ({ ok: r.ok, detail: r.error || r.stderr || 'check failed' })],
    ['claude-help', 'development', 'claude', ['--help'], (r) => ({ ok: r.ok, detail: r.error || r.stderr || 'check failed' })],
    ['claude-worker-options', 'development', 'claude', ['--help'], (r) => requireOptions(r, REQUIRED_CLAUDE_OPTIONS)],
    ['claude-auth', 'development', 'claude', ['auth', 'status'], (r) => {
      if (!r.ok) return { ok: false, detail: r.error || r.stderr || 'not authenticated' };
      try { return { ok: JSON.parse(r.stdout).loggedIn === true, detail: 'not logged in' }; } catch { return { ok: /logged in/i.test(textOf(r)), detail: 'not logged in' }; }
    }],
    ['gh-version', 'both', 'gh', ['--version'], (r) => ({ ok: r.ok, detail: r.error || r.stderr || 'check failed' })],
    ['gh-auth', 'both', 'gh', ['auth', 'status'], (r) => ({ ok: r.ok, detail: r.error || r.stderr || 'check failed' })],
    ['gh-permissions', 'both', 'gh', ['api', `repos/${config.repository}`], (r) => {
      if (!r.ok) return { ok: false, detail: r.error || r.stderr || 'repository unreadable' };
      try { return { ok: JSON.parse(r.stdout).permissions?.push === true, detail: 'push permission missing for the authenticated account' }; } catch { return { ok: false, detail: 'repository permissions unreadable' }; }
    }],
    ['labels-exist', 'both', 'gh', ['label', 'list', '--repo', config.repository, '--limit', '200', '--json', 'name'], (r) => {
      if (!r.ok) return { ok: false, detail: r.error || r.stderr || 'label list unavailable' };
      try {
        const names = new Set(JSON.parse(r.stdout).map((label) => label.name));
        const missing = Object.values(config.labels ?? {}).filter((name) => !names.has(name));
        return missing.length ? { ok: false, detail: `missing labels: ${missing.join(', ')}` } : { ok: true, detail: 'ok' };
      } catch { return { ok: false, detail: 'label list unreadable' }; }
    }],
    ['git-repository', 'both', 'git', ['rev-parse', '--show-toplevel'], (r) => ({ ok: r.ok, detail: r.error || r.stderr || 'check failed' })],
    ['git-origin', 'both', 'git', ['remote', 'get-url', 'origin'], (r) => ({ ok: r.ok && r.stdout.includes(config.repository), detail: r.error || r.stderr || `origin does not reference ${config.repository}` })],
    ['git-worktree', 'both', 'git', ['worktree', 'list', '--porcelain'], (r) => ({ ok: r.ok, detail: r.error || r.stderr || 'check failed' })],
    ['roots-ignored', 'both', 'git', ['check-ignore', config.runtimeRoot, config.worktreeRoot], (r) => {
      const listed = (r.stdout ?? '').split(/\r?\n/).filter(Boolean);
      const missing = [config.runtimeRoot, config.worktreeRoot].filter((root) => !listed.includes(root));
      return missing.length ? { ok: false, detail: `not git-ignored: ${missing.join(', ')}` } : { ok: true, detail: 'ok' };
    }]
  ];
  for (const [id, blockingFor, command, args, validate] of cli) {
    const result = await invoke(command, args);
    const { ok, detail } = validate(result);
    push(id, blockingFor, ok, detail);
  }

  // Local configuration and filesystem prerequisites.
  const missingFiles = [];
  for (const file of REFERENCED_FILES) if (!(await probes.fileExists(path.resolve(file)))) missingFiles.push(file);
  push('config-files', 'both', missingFiles.length === 0, `missing referenced files: ${missingFiles.join(', ')}`);

  const policyOk = Array.isArray(config.allowedTools) && config.allowedTools.length > 0
    && config.allowedTools.every((rule) => typeof rule === 'string' && rule.length > 0 && !/dangerous|bypass/i.test(rule));
  push('worker-permission-policy', 'development', policyOk, 'allowedTools policy is empty, missing, or references bypass options');

  const timeoutsOk = Number.isInteger(config.developmentTimeoutMs) && Number.isInteger(config.qaTimeoutMs)
    && config.developmentTimeoutMs > config.commandTimeoutMs && config.qaTimeoutMs > config.commandTimeoutMs
    && config.developmentTimeoutMs >= 300000 && config.qaTimeoutMs >= 300000;
  push('timeouts-realistic', 'both', timeoutsOk, 'developmentTimeoutMs and qaTimeoutMs must exceed commandTimeoutMs and be at least 300000ms');

  push('runtime-root-writable', 'both', await probes.writableProbe(config.runtimeRoot), `runtime root is not writable: ${config.runtimeRoot}`);

  push('duplicate-supervisor', 'both', !(await isSupervisorLive({ heartbeatTimeoutMs: config.heartbeatTimeoutMs })), 'another live supervisor owns this runtime root');

  const developmentReady = checks.filter((check) => check.blockingFor === 'development' || check.blockingFor === 'both').every((check) => check.ok);
  const qaReady = checks.filter((check) => check.blockingFor === 'qa' || check.blockingFor === 'both').every((check) => check.ok);
  return { ok: developmentReady && qaReady, developmentReady, qaReady, checks };
}
