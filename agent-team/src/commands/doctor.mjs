const CHECKS = [
  ['codex-version', 'qa', 'codex', ['--version']], ['codex-help', 'qa', 'codex', ['--help']], ['codex-auth', 'qa', 'codex', ['login', 'status']],
  ['claude-version', 'development', 'claude', ['--version']], ['claude-help', 'development', 'claude', ['--help']], ['claude-auth', 'development', 'claude', ['auth', 'status']],
  ['gh-version', 'both', 'gh', ['--version']], ['gh-auth', 'both', 'gh', ['auth', 'status']], ['git-repository', 'both', 'git', ['rev-parse', '--show-toplevel']],
  ['git-origin', 'both', 'git', ['remote', 'get-url', 'origin']], ['git-worktree', 'both', 'git', ['worktree', 'list', '--porcelain']]
];

function authenticated(id, result) {
  if (!result.ok) return false;
  if (id === 'claude-auth') {
    // Prefer structured output when available; fall back to textual confirmation.
    try { return JSON.parse(result.stdout).loggedIn === true; } catch { return /logged in/i.test(result.stdout); }
  }
  // Codex CLI 0.144.x prints login status to stderr; accept either stream on exit 0.
  if (id === 'codex-auth') return /logged in/i.test(`${result.stdout}\n${result.stderr}`);
  return true;
}

export async function runDoctor({ config, run, isSupervisorLive }) {
  const checks = [];
  for (const [id, blockingFor, command, args] of CHECKS) {
    const result = await run({ command, args, cwd: process.cwd(), timeoutMs: 15000, maxOutputBytes: 65536 });
    let ok = authenticated(id, result);
    if (id === 'git-origin') ok = ok && result.stdout.includes(config.repository);
    checks.push({ id, ok, blockingFor, detail: ok ? 'ok' : (result.error || result.stderr || 'check failed') });
  }
  checks.push({ id: 'duplicate-supervisor', ok: !(await isSupervisorLive()), blockingFor: 'both', detail: 'exclusive local supervisor' });
  const developmentReady = checks.filter((check) => check.blockingFor === 'development' || check.blockingFor === 'both').every((check) => check.ok);
  const qaReady = checks.filter((check) => check.blockingFor === 'qa' || check.blockingFor === 'both').every((check) => check.ok);
  return { ok: developmentReady && qaReady, developmentReady, qaReady, checks };
}
