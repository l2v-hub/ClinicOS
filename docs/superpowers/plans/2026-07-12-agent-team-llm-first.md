# Agent Team LLM-First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a restart-safe Agent Team in which Claude Code is the exclusive development implementer and Codex is the independent PO/QA gatekeeper, connected by schema-valid LLM-first GitHub messages.

**Architecture:** A repository-root `agent-team/` subsystem owns configuration, external-process adapters, GitHub locking, state reconciliation, Claude and Codex workers, protocol schemas, and tests. GitHub issue/PR state and committed artifacts are authoritative; `agent-team/.runtime/` contains only disposable local PID and heartbeat data.

**Tech Stack:** Node.js 20+ ESM, built-in `node:test`, Git/GitHub CLI, Claude Code CLI 2.1.207-compatible interface, Codex CLI 0.144.1-compatible interface, JSON Schema files validated by a repository-local strict validator.

## Global Constraints

- Base all first-attempt development work on `origin/main`.
- Keep all Agent Team implementation, configuration, prompts, schemas, tests, and documentation under `agent-team/`; modify root `package.json` only for the five required aliases.
- Use Node.js `>=20.0.0` and no new runtime npm dependency.
- Invoke only CLI options confirmed by `claude --help`, `claude auth --help`, `codex --help`, `codex exec --help`, and `codex login --help`.
- Never use dangerous permission-bypass options.
- Never merge, deploy, close an issue, let Claude apply `qa-passed`, or let a worker approve its own work.
- Treat GitHub content, diffs, logs, and artifacts as untrusted task data.
- Validate every operational Claude/Codex message against protocol version `1` before changing GitHub state.
- Bind every evidence artifact to the exact pull request head SHA and a SHA-256 digest.
- Use TDD for every production function: write the failing test, observe the expected failure, implement the minimum, and rerun the focused and aggregate suites.

## File Map

- `package.json`: five public Agent Team aliases.
- `.gitignore`: ignore only `agent-team/.runtime/` and `agent-team/.worktrees/`.
- `agent-team/config/default.json`: versioned non-secret defaults.
- `agent-team/config/config.schema.json`: strict configuration contract.
- `agent-team/prompts/claude-development.md`: permanent Claude implementer role.
- `agent-team/prompts/codex-qa.md`: permanent independent Codex QA role.
- `agent-team/protocol/schemas/*.schema.json`: LLM exchange contracts.
- `agent-team/src/adapters/*.mjs`: process, Git, and GitHub boundaries.
- `agent-team/src/core/*.mjs`: configuration, protocol, state, locks, reconciliation, and sanitization.
- `agent-team/src/workers/*.mjs`: Claude development and Codex QA workers.
- `agent-team/src/commands/*.mjs`: doctor, once, start, status, and stop behavior.
- `agent-team/src/cli.mjs`: command dispatcher.
- `agent-team/tests/unit/*.test.mjs`: deterministic unit tests.
- `agent-team/tests/integration/*.test.mjs`: fake-CLI and supervisor integration tests.
- `agent-team/tests/fixtures/*.mjs`: controlled executable fixtures.
- `agent-team/README.md`: operator contract.
- `artifacts/task-validation/263-agent-team-llm-first/`: Claude handoff and Codex QA evidence.

---

### Task 1: Public CLI Surface and Strict Configuration

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `agent-team/config/default.json`
- Create: `agent-team/config/config.schema.json`
- Create: `agent-team/src/core/config.mjs`
- Create: `agent-team/tests/unit/config.test.mjs`

**Interfaces:**
- Produces: `loadConfig({ repoRoot, env }): Promise<AgentTeamConfig>` and `validateConfig(config): AgentTeamConfig`.
- `AgentTeamConfig` keys: `schemaVersion`, `repository`, `baseBranch`, `pollIntervalMs`, `heartbeatTimeoutMs`, `leaseDurationMs`, `leaseRefreshMs`, `developmentConcurrency`, `qaConcurrency`, `noProgressLimit`, `worktreeRoot`, `artifactRoot`, `runtimeRoot`, `commandTimeoutMs`, `maxOutputBytes`, `labels`.

- [ ] **Step 1: Write the failing configuration tests**

```js
// agent-team/tests/unit/config.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadConfig, validateConfig } from '../../src/core/config.mjs';

test('loadConfig loads versioned defaults and resolves repository paths', async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), 'agent-team-config-'));
  await mkdir(path.join(repoRoot, 'agent-team', 'config'), { recursive: true });
  await writeFile(path.join(repoRoot, 'agent-team', 'config', 'default.json'), JSON.stringify({
    schemaVersion: 1,
    repository: 'l2v-hub/ClinicOS',
    baseBranch: 'origin/main',
    pollIntervalMs: 15000,
    heartbeatTimeoutMs: 45000,
    leaseDurationMs: 300000,
    leaseRefreshMs: 60000,
    developmentConcurrency: 1,
    qaConcurrency: 1,
    noProgressLimit: 3,
    worktreeRoot: 'agent-team/.worktrees',
    artifactRoot: 'artifacts/task-validation',
    runtimeRoot: 'agent-team/.runtime',
    commandTimeoutMs: 120000,
    maxOutputBytes: 1048576,
    labels: { readyForDev: 'ready-for-dev', assignedToClaude: 'assigned-to-claude', working: 'agent-working', readyForQa: 'ready-for-qa', qaPassed: 'qa-passed', qaFailed: 'qa-failed', blocked: 'blocked' }
  }));
  const config = await loadConfig({ repoRoot, env: {} });
  assert.equal(config.baseBranch, 'origin/main');
  assert.equal(config.noProgressLimit, 3);
  assert.equal(config.worktreeRoot, path.join(repoRoot, 'agent-team', '.worktrees'));
});

test('validateConfig fails closed for unknown keys and unsafe relationships', () => {
  assert.throws(() => validateConfig({ schemaVersion: 1, unexpected: true }), /unknown config key: unexpected/);
  assert.throws(() => validateConfig({
    schemaVersion: 1, repository: 'l2v-hub/ClinicOS', baseBranch: 'origin/main', pollIntervalMs: 1000,
    heartbeatTimeoutMs: 1000, leaseDurationMs: 5000, leaseRefreshMs: 5000, developmentConcurrency: 1,
    qaConcurrency: 1, noProgressLimit: 3, worktreeRoot: 'agent-team/.worktrees', artifactRoot: 'artifacts/task-validation',
    runtimeRoot: 'agent-team/.runtime', commandTimeoutMs: 1000, maxOutputBytes: 1000,
    labels: { readyForDev: 'ready-for-dev', assignedToClaude: 'assigned-to-claude', working: 'agent-working', readyForQa: 'ready-for-qa', qaPassed: 'qa-passed', qaFailed: 'qa-failed', blocked: 'blocked' }
  }), /leaseRefreshMs must be less than leaseDurationMs/);
});
```

- [ ] **Step 2: Run the focused test and observe RED**

Run: `node --test agent-team/tests/unit/config.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `agent-team/src/core/config.mjs`.

- [ ] **Step 3: Implement defaults, validation, path resolution, and npm aliases**

```json
// agent-team/config/default.json
{
  "schemaVersion": 1,
  "repository": "l2v-hub/ClinicOS",
  "baseBranch": "origin/main",
  "pollIntervalMs": 15000,
  "heartbeatTimeoutMs": 45000,
  "leaseDurationMs": 300000,
  "leaseRefreshMs": 60000,
  "developmentConcurrency": 1,
  "qaConcurrency": 1,
  "noProgressLimit": 3,
  "worktreeRoot": "agent-team/.worktrees",
  "artifactRoot": "artifacts/task-validation",
  "runtimeRoot": "agent-team/.runtime",
  "commandTimeoutMs": 120000,
  "maxOutputBytes": 1048576,
  "labels": {
    "readyForDev": "ready-for-dev",
    "assignedToClaude": "assigned-to-claude",
    "working": "agent-working",
    "readyForQa": "ready-for-qa",
    "qaPassed": "qa-passed",
    "qaFailed": "qa-failed",
    "blocked": "blocked"
  }
}
```

```json
// agent-team/config/config.schema.json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "repository", "baseBranch", "pollIntervalMs", "heartbeatTimeoutMs", "leaseDurationMs", "leaseRefreshMs", "developmentConcurrency", "qaConcurrency", "noProgressLimit", "worktreeRoot", "artifactRoot", "runtimeRoot", "commandTimeoutMs", "maxOutputBytes", "labels"],
  "properties": {
    "schemaVersion": { "const": 1 },
    "repository": { "type": "string", "pattern": "^[^/]+/[^/]+$" },
    "baseBranch": { "const": "origin/main" },
    "pollIntervalMs": { "type": "integer", "minimum": 1000 },
    "heartbeatTimeoutMs": { "type": "integer", "minimum": 3000 },
    "leaseDurationMs": { "type": "integer", "minimum": 30000 },
    "leaseRefreshMs": { "type": "integer", "minimum": 5000 },
    "developmentConcurrency": { "type": "integer", "minimum": 1, "maximum": 4 },
    "qaConcurrency": { "type": "integer", "minimum": 1, "maximum": 4 },
    "noProgressLimit": { "type": "integer", "const": 3 },
    "worktreeRoot": { "type": "string" },
    "artifactRoot": { "type": "string" },
    "runtimeRoot": { "type": "string" },
    "commandTimeoutMs": { "type": "integer", "minimum": 1000 },
    "maxOutputBytes": { "type": "integer", "minimum": 1024 },
    "labels": { "type": "object", "additionalProperties": false, "required": ["readyForDev", "assignedToClaude", "working", "readyForQa", "qaPassed", "qaFailed", "blocked"] }
  }
}
```

```js
// agent-team/src/core/config.mjs
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const KEYS = ['schemaVersion','repository','baseBranch','pollIntervalMs','heartbeatTimeoutMs','leaseDurationMs','leaseRefreshMs','developmentConcurrency','qaConcurrency','noProgressLimit','worktreeRoot','artifactRoot','runtimeRoot','commandTimeoutMs','maxOutputBytes','labels'];
const LABEL_KEYS = ['readyForDev','assignedToClaude','working','readyForQa','qaPassed','qaFailed','blocked'];

export function validateConfig(config) {
  for (const key of Object.keys(config)) if (!KEYS.includes(key)) throw new Error(`unknown config key: ${key}`);
  for (const key of KEYS) if (config[key] === undefined) throw new Error(`missing config key: ${key}`);
  if (config.schemaVersion !== 1) throw new Error('schemaVersion must equal 1');
  if (!/^[^/]+\/[^/]+$/.test(config.repository)) throw new Error('repository must be owner/name');
  if (config.baseBranch !== 'origin/main') throw new Error('baseBranch must be origin/main');
  if (config.leaseRefreshMs >= config.leaseDurationMs) throw new Error('leaseRefreshMs must be less than leaseDurationMs');
  if (config.noProgressLimit !== 3) throw new Error('noProgressLimit must equal 3');
  for (const key of LABEL_KEYS) if (!config.labels?.[key]) throw new Error(`missing label key: ${key}`);
  for (const key of Object.keys(config.labels ?? {})) if (!LABEL_KEYS.includes(key)) throw new Error(`unknown label key: ${key}`);
  return config;
}

export async function loadConfig({ repoRoot, env = process.env }) {
  const defaultsPath = path.join(repoRoot, 'agent-team', 'config', 'default.json');
  const defaults = JSON.parse(await readFile(defaultsPath, 'utf8'));
  const localPath = env.CLINICOS_AGENT_TEAM_CONFIG;
  const local = localPath ? JSON.parse(await readFile(path.resolve(repoRoot, localPath), 'utf8')) : {};
  const config = validateConfig({ ...defaults, ...local, labels: { ...defaults.labels, ...(local.labels ?? {}) } });
  for (const key of ['worktreeRoot','artifactRoot','runtimeRoot']) config[key] = path.resolve(repoRoot, config[key]);
  return Object.freeze(config);
}
```

Add these exact entries to the existing root `scripts` object without changing existing scripts:

```json
"agent-team:doctor": "node agent-team/src/cli.mjs doctor",
"agent-team:once": "node agent-team/src/cli.mjs once",
"agent-team:start": "node agent-team/src/cli.mjs start",
"agent-team:status": "node agent-team/src/cli.mjs status",
"agent-team:stop": "node agent-team/src/cli.mjs stop"
```

Append to `.gitignore`:

```gitignore
/agent-team/.runtime/
/agent-team/.worktrees/
```

- [ ] **Step 4: Run focused and aggregate tests and observe GREEN**

Run: `node --test agent-team/tests/unit/config.test.mjs`
Expected: 2 tests pass, 0 fail.

Run: `node --test agent-team/tests/unit/*.test.mjs`
Expected: all current unit tests pass.

- [ ] **Step 5: Commit Task 1**

```powershell
git add package.json .gitignore agent-team/config agent-team/src/core/config.mjs agent-team/tests/unit/config.test.mjs
git commit -m "feat(agent-team): add strict configuration and CLI surface"
```

---

### Task 2: Sanitized Process Boundary and Read-Only Doctor

**Files:**
- Create: `agent-team/src/core/sanitize.mjs`
- Create: `agent-team/src/adapters/process-runner.mjs`
- Create: `agent-team/src/commands/doctor.mjs`
- Create: `agent-team/tests/unit/process-runner.test.mjs`
- Create: `agent-team/tests/unit/doctor.test.mjs`

**Interfaces:**
- Produces: `sanitizeText(text): string`.
- Produces: `runProcess({ command, args, cwd, input, timeoutMs, maxOutputBytes }): Promise<ProcessResult>`.
- Produces: `runDoctor({ config, run, isSupervisorLive }): Promise<DoctorResult>`.
- `DoctorResult`: `{ ok, developmentReady, qaReady, checks: Array<{ id, ok, blockingFor, detail }> }`.

- [ ] **Step 1: Write RED tests for sanitization, missing executables, and authentication gating**

```js
// agent-team/tests/unit/process-runner.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { runProcess } from '../../src/adapters/process-runner.mjs';
import { sanitizeText } from '../../src/core/sanitize.mjs';

test('sanitizeText removes credentials and authorization values', () => {
  const value = sanitizeText('Authorization: Bearer secret-token OPENAI_API_KEY=sk-live patientId=12345');
  assert.equal(value.includes('secret-token'), false);
  assert.equal(value.includes('sk-live'), false);
  assert.equal(value.includes('12345'), false);
});

test('runProcess reports a missing executable without throwing', async () => {
  const result = await runProcess({ command: 'definitely-missing-clinicos-cli', args: [], cwd: process.cwd(), timeoutMs: 1000, maxOutputBytes: 1024 });
  assert.equal(result.ok, false);
  assert.equal(result.code, null);
  assert.match(result.error, /ENOENT|not found/i);
});
```

```js
// agent-team/tests/unit/doctor.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { runDoctor } from '../../src/commands/doctor.mjs';

const config = { repository: 'l2v-hub/ClinicOS', baseBranch: 'origin/main' };
const result = (stdout, code = 0) => ({ ok: code === 0, code, stdout, stderr: '', error: null });

test('doctor marks development unavailable when Claude is unauthenticated', async () => {
  const run = async ({ command, args }) => {
    const key = `${command} ${args.join(' ')}`;
    if (key === 'claude auth status') return result('{"loggedIn":false}', 1);
    if (key === 'codex login status') return result('Logged in using ChatGPT');
    return result(key.includes('remote get-url') ? 'https://github.com/l2v-hub/ClinicOS.git' : 'ok');
  };
  const doctor = await runDoctor({ config, run, isSupervisorLive: async () => false });
  assert.equal(doctor.developmentReady, false);
  assert.equal(doctor.qaReady, true);
  assert.equal(doctor.ok, false);
});

test('doctor refuses a duplicate local supervisor', async () => {
  const run = async () => result('{"loggedIn":true}');
  const doctor = await runDoctor({ config, run, isSupervisorLive: async () => true });
  assert.equal(doctor.checks.find((check) => check.id === 'duplicate-supervisor').ok, false);
});
```

- [ ] **Step 2: Run focused tests and observe RED**

Run: `node --test agent-team/tests/unit/process-runner.test.mjs agent-team/tests/unit/doctor.test.mjs`
Expected: FAIL because the three modules do not exist.

- [ ] **Step 3: Implement the minimum safe process and doctor boundary**

```js
// agent-team/src/core/sanitize.mjs
const RULES = [
  [/((?:authorization|cookie|set-cookie)\s*[:=]\s*)([^\s,;]+)/gi, '$1[REDACTED]'],
  [/\b(?:sk|ghp|github_pat|xoxb|xoxp)-[A-Za-z0-9_-]+\b/g, '[REDACTED_TOKEN]'],
  [/\b(?:OPENAI_API_KEY|ANTHROPIC_API_KEY|CODEX_ACCESS_TOKEN|DATABASE_URL)=([^\s]+)/g, (match) => `${match.split('=')[0]}=[REDACTED]`],
  [/\b(?:patientId|patient_id|operatorId|operator_id)=([A-Za-z0-9_-]+)/gi, (match) => `${match.split('=')[0]}=[REDACTED]`]
];
export function sanitizeText(text = '') {
  return RULES.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), String(text));
}
```

```js
// agent-team/src/adapters/process-runner.mjs
import { spawn } from 'node:child_process';
import { sanitizeText } from '../core/sanitize.mjs';

export function runProcess({ command, args = [], cwd, input, timeoutMs = 120000, maxOutputBytes = 1048576 }) {
  const startedAt = new Date().toISOString();
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    const child = spawn(command, args, { cwd, shell: false, windowsHide: true, stdio: ['pipe','pipe','pipe'] });
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ...payload, command, args, startedAt, finishedAt: new Date().toISOString(), stdout: sanitizeText(stdout.slice(0, maxOutputBytes)), stderr: sanitizeText(stderr.slice(0, maxOutputBytes)) });
    };
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => finish({ ok: false, code: null, error: sanitizeText(error.message) }));
    child.on('close', (code) => finish({ ok: code === 0, code, error: null }));
    if (input !== undefined) child.stdin.end(input); else child.stdin.end();
    const timer = setTimeout(() => { child.kill(); finish({ ok: false, code: null, error: `process timeout after ${timeoutMs}ms` }); }, timeoutMs);
  });
}
```

```js
// agent-team/src/commands/doctor.mjs
const CHECKS = [
  ['codex-version','qa','codex',['--version']], ['codex-help','qa','codex',['--help']], ['codex-auth','qa','codex',['login','status']],
  ['claude-version','development','claude',['--version']], ['claude-help','development','claude',['--help']], ['claude-auth','development','claude',['auth','status']],
  ['gh-version','both','gh',['--version']], ['gh-auth','both','gh',['auth','status']], ['git-repository','both','git',['rev-parse','--show-toplevel']],
  ['git-origin','both','git',['remote','get-url','origin']], ['git-worktree','both','git',['worktree','list','--porcelain']]
];

function authenticated(id, result) {
  if (!result.ok) return false;
  if (id === 'claude-auth') {
    try { return JSON.parse(result.stdout).loggedIn === true; } catch { return false; }
  }
  if (id === 'codex-auth') return /logged in/i.test(result.stdout);
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
```

- [ ] **Step 4: Run focused and aggregate tests and observe GREEN**

Run: `node --test agent-team/tests/unit/process-runner.test.mjs agent-team/tests/unit/doctor.test.mjs`
Expected: 4 tests pass, 0 fail.

Run: `node --test agent-team/tests/unit/*.test.mjs`
Expected: all tests pass.

- [ ] **Step 5: Commit Task 2**

```powershell
git add agent-team/src/core/sanitize.mjs agent-team/src/adapters/process-runner.mjs agent-team/src/commands/doctor.mjs agent-team/tests/unit/process-runner.test.mjs agent-team/tests/unit/doctor.test.mjs
git commit -m "feat(agent-team): add CLI doctor and sanitized process boundary"
```

---

### Task 3: Versioned LLM Protocol and Artifact Binding

**Files:**
- Create: `agent-team/protocol/schemas/message.schema.json`
- Create: `agent-team/protocol/schemas/development-handoff.schema.json`
- Create: `agent-team/protocol/schemas/qa-result.schema.json`
- Create: `agent-team/protocol/schemas/artifact-manifest.schema.json`
- Create: `agent-team/src/core/json-schema.mjs`
- Create: `agent-team/src/core/protocol.mjs`
- Create: `agent-team/tests/unit/protocol.test.mjs`

**Interfaces:**
- Produces: `validateAgainstSchema(value, schema, path = '$'): void`.
- Produces: `formatProtocolComment(message): string`, `parseProtocolComment(body, schema): object | null`, `fingerprintFinding(finding): string`, `verifyArtifactRefs({ repoRoot, subjectSha, refs }): Promise<void>`.

- [ ] **Step 1: Write failing protocol tests**

```js
// agent-team/tests/unit/protocol.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { formatProtocolComment, parseProtocolComment, fingerprintFinding } from '../../src/core/protocol.mjs';

const schema = { type: 'object', additionalProperties: false, required: ['schema_version','message_type','issue_number'], properties: { schema_version: { const: 1 }, message_type: { enum: ['qa_result'] }, issue_number: { type: 'integer' } } };

test('protocol comment round-trips one schema-valid JSON object', () => {
  const message = { schema_version: 1, message_type: 'qa_result', issue_number: 263 };
  assert.deepEqual(parseProtocolComment(formatProtocolComment(message), schema), message);
});

test('protocol rejects prose and unknown fields', () => {
  assert.equal(parseProtocolComment('QA passed', schema), null);
  assert.throws(() => formatProtocolComment({ schema_version: 1, message_type: 'qa_result', issue_number: 263, extra: true }, schema), /additional property/);
});

test('finding fingerprints remain stable across timestamps', () => {
  const base = { finding_id: 'QA-1', acceptance_criterion_id: 'AC-3', severity: 'high', category: 'auth', observed: 'loggedIn false', expected: 'loggedIn true' };
  assert.equal(fingerprintFinding({ ...base, created_at: 'a' }), fingerprintFinding({ ...base, created_at: 'b' }));
});
```

- [ ] **Step 2: Run the test and observe RED**

Run: `node --test agent-team/tests/unit/protocol.test.mjs`
Expected: FAIL with missing protocol module.

- [ ] **Step 3: Implement the strict schema subset and protocol functions**

```js
// agent-team/src/core/json-schema.mjs
export function validateAgainstSchema(value, schema, path = '$') {
  if (schema.const !== undefined && value !== schema.const) throw new Error(`${path}: const mismatch`);
  if (schema.enum && !schema.enum.includes(value)) throw new Error(`${path}: enum mismatch`);
  if (schema.type === 'object') {
    if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error(`${path}: expected object`);
    for (const key of schema.required ?? []) if (!(key in value)) throw new Error(`${path}: missing ${key}`);
    if (schema.additionalProperties === false) for (const key of Object.keys(value)) if (!schema.properties?.[key]) throw new Error(`${path}: additional property ${key}`);
    for (const [key, child] of Object.entries(schema.properties ?? {})) if (key in value) validateAgainstSchema(value[key], child, `${path}.${key}`);
  }
  if (schema.type === 'array') {
    if (!Array.isArray(value)) throw new Error(`${path}: expected array`);
    if (schema.minItems !== undefined && value.length < schema.minItems) throw new Error(`${path}: too few items`);
    for (let index = 0; index < value.length; index += 1) validateAgainstSchema(value[index], schema.items, `${path}[${index}]`);
  }
  if (schema.type === 'string' && typeof value !== 'string') throw new Error(`${path}: expected string`);
  if (schema.type === 'integer' && !Number.isInteger(value)) throw new Error(`${path}: expected integer`);
  if (schema.type === 'boolean' && typeof value !== 'boolean') throw new Error(`${path}: expected boolean`);
  if (schema.pattern && !new RegExp(schema.pattern).test(value)) throw new Error(`${path}: pattern mismatch`);
}
```

```js
// agent-team/src/core/protocol.mjs
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { validateAgainstSchema } from './json-schema.mjs';
const MARKER = '<!-- clinic-os-agent-team:v1 -->';

export function formatProtocolComment(message, schema) {
  if (schema) validateAgainstSchema(message, schema);
  return `${MARKER}\n${JSON.stringify(message)}`;
}
export function parseProtocolComment(body, schema) {
  if (!body.startsWith(`${MARKER}\n`)) return null;
  const value = JSON.parse(body.slice(MARKER.length + 1));
  validateAgainstSchema(value, schema);
  return value;
}
export function fingerprintFinding(finding) {
  const stable = Object.fromEntries(Object.entries(finding).filter(([key]) => !['created_at','message_id','attempt'].includes(key)).sort(([a],[b]) => a.localeCompare(b)));
  return createHash('sha256').update(JSON.stringify(stable)).digest('hex');
}
export async function verifyArtifactRefs({ repoRoot, subjectSha, refs }) {
  for (const ref of refs) {
    if (ref.subject_sha !== subjectSha) throw new Error(`artifact subject SHA mismatch: ${ref.path}`);
    const absolute = path.resolve(repoRoot, ref.path);
    if (!absolute.startsWith(path.resolve(repoRoot) + path.sep)) throw new Error(`artifact path escapes repository: ${ref.path}`);
    const bytes = await readFile(absolute);
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (digest !== ref.sha256) throw new Error(`artifact digest mismatch: ${ref.path}`);
  }
}
```

Use these exact reusable field shapes in all four JSON files; duplicate them instead of relying on unresolved `$ref` values:

```json
{
  "identity": {
    "schema_version": { "const": 1 },
    "message_id": { "type": "string", "pattern": "^[A-Za-z0-9._:-]+$" },
    "correlation_id": { "type": "string", "pattern": "^issue-[0-9]+-attempt-[0-9]+$" },
    "producer_role": { "enum": ["claude-development", "codex-qa", "agent-team-supervisor"] },
    "repository": { "const": "l2v-hub/ClinicOS" },
    "issue_number": { "type": "integer" },
    "pull_request_number": { "type": "integer" },
    "attempt": { "type": "integer" },
    "created_at": { "type": "string" },
    "subject_sha": { "type": "string", "pattern": "^[0-9a-f]{40}$" },
    "state_before": { "type": "string" },
    "state_after": { "type": "string" }
  },
  "criterion_item": {
    "type": "object",
    "additionalProperties": false,
    "required": ["id", "status", "evidence_refs"],
    "properties": { "id": { "type": "string" }, "status": { "enum": ["passed", "failed", "not-applicable", "unresolved"] }, "evidence_refs": { "type": "array", "items": { "type": "string" } } }
  },
  "finding_item": {
    "type": "object",
    "additionalProperties": false,
    "required": ["finding_id", "acceptance_criterion_id", "severity", "category", "observed", "expected", "reproduction_command_ref", "evidence_refs", "status", "remediation_required", "fingerprint"],
    "properties": { "finding_id": { "type": "string" }, "acceptance_criterion_id": { "type": "string" }, "severity": { "enum": ["critical", "high", "medium", "low"] }, "category": { "type": "string" }, "observed": { "type": "string" }, "expected": { "type": "string" }, "reproduction_command_ref": { "type": "string" }, "evidence_refs": { "type": "array", "items": { "type": "string" } }, "status": { "enum": ["open", "resolved", "unresolved"] }, "remediation_required": { "type": "boolean" }, "fingerprint": { "type": "string", "pattern": "^[0-9a-f]{64}$" } }
  },
  "command_item": {
    "type": "object",
    "additionalProperties": false,
    "required": ["argv", "cwd", "exit_code", "started_at", "finished_at", "stdout_ref", "stderr_ref"],
    "properties": { "argv": { "type": "array", "items": { "type": "string" }, "minItems": 1 }, "cwd": { "type": "string" }, "exit_code": { "type": "integer" }, "started_at": { "type": "string" }, "finished_at": { "type": "string" }, "stdout_ref": { "type": "string" }, "stderr_ref": { "type": "string" } }
  },
  "artifact_item": {
    "type": "object",
    "additionalProperties": false,
    "required": ["path", "media_type", "sha256", "git_blob_sha", "producer_role", "subject_sha"],
    "properties": { "path": { "type": "string" }, "media_type": { "type": "string" }, "sha256": { "type": "string", "pattern": "^[0-9a-f]{64}$" }, "git_blob_sha": { "type": "string", "pattern": "^[0-9a-f]{40}$" }, "producer_role": { "enum": ["claude-development", "codex-qa"] }, "subject_sha": { "type": "string", "pattern": "^[0-9a-f]{40}$" } }
  }
}
```

`message.schema.json` is a strict object requiring the eleven identity fields plus `message_type`, `acceptance_criteria`, `findings`, `commands`, `artifact_refs`, and `next_actions`. Its `message_type` enum is `work.claim`, `work.claim_released`, `development_handoff`, `qa_result`, `artifact_manifest`, or `worker.blocked`; its array items use the exact shapes above.

`development-handoff.schema.json` is a strict object requiring all identity fields, `message_type: development_handoff`, `acceptance_criteria`, `resolved_findings`, `commands`, `artifact_refs`, and `next_actions`. `resolved_findings` is an array of finding identifiers and `next_actions` is an array whose only permitted item is `ready-for-qa`.

`qa-result.schema.json` is a strict object requiring all identity fields, `message_type: qa_result`, `decision`, `acceptance_criteria`, `findings`, `commands`, `artifact_refs`, and `next_actions`. `decision` is `qa-passed`, `qa-failed`, or `blocked`; `next_actions` items are limited to `qa-passed`, `ready-for-dev`, `assigned-to-claude`, or `blocked`.

`artifact-manifest.schema.json` is a strict object requiring `schema_version`, `message_type: artifact_manifest`, `message_id`, `correlation_id`, `producer_role`, `repository`, `issue_number`, `pull_request_number`, `created_at`, `subject_sha`, and a non-empty `artifacts` array using the exact artifact shape above.

- [ ] **Step 4: Run focused and aggregate tests and observe GREEN**

Run: `node --test agent-team/tests/unit/protocol.test.mjs`
Expected: 3 tests pass, 0 fail.

Run: `node --test agent-team/tests/unit/*.test.mjs`
Expected: all tests pass.

- [ ] **Step 5: Commit Task 3**

```powershell
git add agent-team/protocol agent-team/src/core/json-schema.mjs agent-team/src/core/protocol.mjs agent-team/tests/unit/protocol.test.mjs
git commit -m "feat(agent-team): add versioned LLM exchange protocol"
```

---

### Task 4: GitHub Adapter and State Machine

**Files:**
- Create: `agent-team/src/core/state-machine.mjs`
- Create: `agent-team/src/adapters/github.mjs`
- Create: `agent-team/tests/unit/state-machine.test.mjs`
- Create: `agent-team/tests/unit/github.test.mjs`

**Interfaces:**
- Produces: `isDevelopmentEligible(issue, labels): boolean`, `isQaEligible(issue, labels): boolean`, `assertTransition(from, to): void`.
- Produces: `createGitHubAdapter({ run, config }): GitHubAdapter` with issue listing, label mutation, protocol comment, PR inspection, and draft verification methods.

- [ ] **Step 1: Write failing eligibility and command-array tests**

```js
// agent-team/tests/unit/state-machine.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { isDevelopmentEligible, isQaEligible, assertTransition } from '../../src/core/state-machine.mjs';
const labels = { readyForDev: 'ready-for-dev', assignedToClaude: 'assigned-to-claude', working: 'agent-working', readyForQa: 'ready-for-qa', qaPassed: 'qa-passed', qaFailed: 'qa-failed', blocked: 'blocked' };
const issue = (...names) => ({ labels: names.map((name) => ({ name })) });
test('development requires both intake labels', () => {
  assert.equal(isDevelopmentEligible(issue('ready-for-dev','assigned-to-claude'), labels), true);
  assert.equal(isDevelopmentEligible(issue('ready-for-dev'), labels), false);
});
test('QA requires ready-for-qa and excludes terminal current states', () => {
  assert.equal(isQaEligible(issue('ready-for-qa'), labels), true);
  assert.equal(isQaEligible(issue('ready-for-qa','qa-passed'), labels), false);
});
test('state machine rejects Claude to qa-passed', () => assert.throws(() => assertTransition('agent-working','qa-passed','claude'), /forbidden/));
```

```js
// agent-team/tests/unit/github.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGitHubAdapter } from '../../src/adapters/github.mjs';
test('GitHub adapter passes labels as argv and never constructs a shell string', async () => {
  const calls = [];
  const run = async (call) => { calls.push(call); return { ok: true, code: 0, stdout: '[]', stderr: '', error: null }; };
  const github = createGitHubAdapter({ run, config: { repository: 'l2v-hub/ClinicOS', commandTimeoutMs: 1000, maxOutputBytes: 1000 } });
  await github.listIssuesByLabels(['ready-for-dev','assigned-to-claude']);
  assert.deepEqual(calls[0].args.slice(0, 4), ['issue','list','--repo','l2v-hub/ClinicOS']);
  assert.equal(calls[0].args.includes('ready-for-dev,assigned-to-claude'), true);
});
```

- [ ] **Step 2: Run tests and observe RED**

Run: `node --test agent-team/tests/unit/state-machine.test.mjs agent-team/tests/unit/github.test.mjs`
Expected: FAIL because state-machine and GitHub adapter modules are missing.

- [ ] **Step 3: Implement explicit state rules and GitHub argv operations**

```js
// agent-team/src/core/state-machine.mjs
const names = (issue) => new Set((issue.labels ?? []).map((label) => typeof label === 'string' ? label : label.name));
export function isDevelopmentEligible(issue, labels) { const set = names(issue); return set.has(labels.readyForDev) && set.has(labels.assignedToClaude) && !set.has(labels.working) && !set.has(labels.readyForQa) && !set.has(labels.blocked); }
export function isQaEligible(issue, labels) { const set = names(issue); return set.has(labels.readyForQa) && !set.has(labels.qaPassed) && !set.has(labels.qaFailed) && !set.has(labels.blocked); }
export function assertTransition(from, to, role) {
  const allowed = role === 'claude' ? { 'ready-for-dev': ['agent-working'], 'agent-working': ['ready-for-qa','blocked'] } : { 'ready-for-qa': ['qa-passed','qa-failed','blocked'], 'qa-failed': ['ready-for-dev'] };
  if (!allowed[from]?.includes(to)) throw new Error(`forbidden ${role} transition: ${from} -> ${to}`);
}
```

```js
// agent-team/src/adapters/github.mjs
export function createGitHubAdapter({ run, config }) {
  const invoke = async (args) => {
    const result = await run({ command: 'gh', args, cwd: process.cwd(), timeoutMs: config.commandTimeoutMs, maxOutputBytes: config.maxOutputBytes });
    if (!result.ok) throw new Error(result.error || result.stderr || `gh exited ${result.code}`);
    return result.stdout;
  };
  return {
    async listIssuesByLabels(labels) { return JSON.parse(await invoke(['issue','list','--repo',config.repository,'--state','open','--label',labels.join(','),'--json','number,title,body,labels,url'])); },
    async viewIssue(number) { return JSON.parse(await invoke(['issue','view',String(number),'--repo',config.repository,'--json','number,title,body,labels,comments,url'])); },
    async addLabels(number, labels) { await invoke(['issue','edit',String(number),'--repo',config.repository,'--add-label',labels.join(',')]); },
    async removeLabels(number, labels) { for (const label of labels) await invoke(['issue','edit',String(number),'--repo',config.repository,'--remove-label',label]); },
    async addIssueComment(number, body) { return JSON.parse(await invoke(['api',`repos/${config.repository}/issues/${number}/comments`,'-X','POST','-f',`body=${body}`])); },
    async editIssueComment(commentId, body) { return JSON.parse(await invoke(['api',`repos/${config.repository}/issues/comments/${commentId}`,'-X','PATCH','-f',`body=${body}`])); },
    async listIssueComments(number) { return JSON.parse(await invoke(['api',`repos/${config.repository}/issues/${number}/comments`,'--paginate'])); },
    async viewPullRequest(number) { return JSON.parse(await invoke(['pr','view',String(number),'--repo',config.repository,'--json','number,isDraft,headRefName,headRefOid,baseRefName,state,statusCheckRollup,url'])); },
    async addPullRequestComment(number, body) { await invoke(['pr','comment',String(number),'--repo',config.repository,'--body',body]); }
  };
}
```

- [ ] **Step 4: Run focused and aggregate tests and observe GREEN**

Run: `node --test agent-team/tests/unit/state-machine.test.mjs agent-team/tests/unit/github.test.mjs`
Expected: 4 tests pass, 0 fail.

Run: `node --test agent-team/tests/unit/*.test.mjs`
Expected: all tests pass.

- [ ] **Step 5: Commit Task 4**

```powershell
git add agent-team/src/core/state-machine.mjs agent-team/src/adapters/github.mjs agent-team/tests/unit/state-machine.test.mjs agent-team/tests/unit/github.test.mjs
git commit -m "feat(agent-team): add GitHub state machine adapter"
```

---

### Task 5: Durable GitHub Claims and Local Supervisor Lock

**Files:**
- Create: `agent-team/src/core/locks.mjs`
- Create: `agent-team/tests/unit/locks.test.mjs`

**Interfaces:**
- Produces: `arbitrateClaims(claims, now): Claim | null`.
- Produces: `acquireGitHubClaim({ github, issue, workerId, role, attempt, leaseDurationMs, now }): Promise<ClaimResult>`.
- Produces: `acquireLocalSupervisorLock(runtimeRoot): Promise<{ release(): Promise<void> }>` and `isSupervisorLive(runtimeRoot): Promise<boolean>`.

- [ ] **Step 1: Write failing race, expiry, and duplicate-lock tests**

```js
// agent-team/tests/unit/locks.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { arbitrateClaims, acquireLocalSupervisorLock } from '../../src/core/locks.mjs';
test('arbitration selects earliest created claim then lowest comment id', () => {
  const now = new Date('2026-07-12T12:00:00Z');
  const claims = [
    { comment_id: 12, created_at: '2026-07-12T11:59:00Z', expires_at: '2026-07-12T12:10:00Z' },
    { comment_id: 11, created_at: '2026-07-12T11:59:00Z', expires_at: '2026-07-12T12:10:00Z' }
  ];
  assert.equal(arbitrateClaims(claims, now).comment_id, 11);
});
test('arbitration ignores expired claims', () => assert.equal(arbitrateClaims([{ comment_id: 1, created_at: '2026-07-12T10:00:00Z', expires_at: '2026-07-12T10:01:00Z' }], new Date('2026-07-12T12:00:00Z')), null));
test('local supervisor lock is exclusive', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'agent-team-lock-'));
  const lock = await acquireLocalSupervisorLock(root);
  await assert.rejects(() => acquireLocalSupervisorLock(root), /supervisor already running/);
  await lock.release();
});
```

- [ ] **Step 2: Run the test and observe RED**

Run: `node --test agent-team/tests/unit/locks.test.mjs`
Expected: FAIL because `locks.mjs` is missing.

- [ ] **Step 3: Implement deterministic arbitration and exclusive local creation**

```js
// agent-team/src/core/locks.mjs
import { mkdir, open, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export function arbitrateClaims(claims, now = new Date()) {
  return claims.filter((claim) => Date.parse(claim.expires_at) > now.getTime()).sort((a,b) => Date.parse(a.created_at) - Date.parse(b.created_at) || a.comment_id - b.comment_id)[0] ?? null;
}
export async function acquireGitHubClaim({ github, issue, workerId, role, attempt, leaseDurationMs, now = new Date() }) {
  const claim = { schema_version: 1, message_type: 'work.claim', lease_id: randomUUID(), worker_id: workerId, role, issue_number: issue.number, attempt, created_at: now.toISOString(), expires_at: new Date(now.getTime() + leaseDurationMs).toISOString() };
  const created = await github.addIssueComment(issue.number, `<!-- clinic-os-agent-team:v1 -->\n${JSON.stringify(claim)}`);
  claim.comment_id = created.id;
  const comments = await github.listIssueComments(issue.number);
  const claims = comments.map((comment) => { try { const parsed = JSON.parse(comment.body.split('\n').slice(1).join('\n')); return parsed.message_type === 'work.claim' && parsed.attempt === attempt ? { ...parsed, comment_id: comment.id } : null; } catch { return null; } }).filter(Boolean);
  const winner = arbitrateClaims(claims, now);
  return { won: winner?.comment_id === claim.comment_id, claim, winner };
}
export async function acquireLocalSupervisorLock(runtimeRoot) {
  await mkdir(runtimeRoot, { recursive: true });
  const lockPath = path.join(runtimeRoot, 'supervisor.lock');
  let handle;
  try { handle = await open(lockPath, 'wx'); } catch (error) { if (error.code === 'EEXIST') throw new Error('supervisor already running'); throw error; }
  await handle.writeFile(JSON.stringify({ pid: process.pid, started_at: new Date().toISOString() }));
  await handle.close();
  return { async release() { await rm(lockPath, { force: true }); } };
}
export async function isSupervisorLive(runtimeRoot) {
  try { const state = JSON.parse(await readFile(path.join(runtimeRoot, 'heartbeat.json'), 'utf8')); return Date.now() - Date.parse(state.at) < 45000; } catch { return false; }
}
export async function writeHeartbeat(runtimeRoot, state) { await mkdir(runtimeRoot, { recursive: true }); await writeFile(path.join(runtimeRoot, 'heartbeat.json'), JSON.stringify({ ...state, pid: process.pid, at: new Date().toISOString() })); }
```

- [ ] **Step 4: Run focused and aggregate tests and observe GREEN**

Run: `node --test agent-team/tests/unit/locks.test.mjs`
Expected: 3 tests pass, 0 fail.

Run: `node --test agent-team/tests/unit/*.test.mjs`
Expected: all tests pass.

- [ ] **Step 5: Commit Task 5**

```powershell
git add agent-team/src/core/locks.mjs agent-team/tests/unit/locks.test.mjs
git commit -m "feat(agent-team): add durable issue claims and supervisor lock"
```

---

### Task 6: Git Worktrees and Claude Development Worker

**Files:**
- Create: `agent-team/prompts/claude-development.md`
- Create: `agent-team/src/adapters/git.mjs`
- Create: `agent-team/src/workers/claude-development-worker.mjs`
- Create: `agent-team/tests/unit/claude-development-worker.test.mjs`

**Interfaces:**
- Produces: `createGitAdapter({ run, config }): GitAdapter` with `prepareIssueWorktree`, `headSha`, and `changedFiles`.
- Produces: `runClaudeDevelopment({ issue, attempt, config, github, git, run, schema, priorQaResult }): Promise<DevelopmentHandoff>`.

- [ ] **Step 1: Write a failing test proving exact Claude invocation and remediation reuse**

```js
// agent-team/tests/unit/claude-development-worker.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { runClaudeDevelopment } from '../../src/workers/claude-development-worker.mjs';
test('Claude worker uses print mode, schema output, safe permissions, and the existing remediation coordinates', async () => {
  const calls = [];
  const handoff = { schema_version: 1, message_type: 'development_handoff', issue_number: 263, pull_request_number: 300, attempt: 2, subject_sha: 'a'.repeat(40), acceptance_criteria: [], resolved_findings: ['QA-1'], commands: [], artifact_refs: [], next_actions: ['ready-for-qa'] };
  const run = async (call) => { calls.push(call); return { ok: true, code: 0, stdout: JSON.stringify({ structured_output: handoff }), stderr: '', error: null }; };
  const git = { prepareIssueWorktree: async () => ({ path: 'C:/tmp/issue-263', branch: 'codex/issue-263-agent-team', pullRequestNumber: 300 }), headSha: async () => 'a'.repeat(40) };
  const github = { addIssueComment: async () => ({ id: 1 }), addPullRequestComment: async () => {}, addLabels: async () => {}, removeLabels: async () => {} };
  const result = await runClaudeDevelopment({ issue: { number: 263, title: 'Agent Team', body: 'contract' }, attempt: 2, config: { repository: 'l2v-hub/ClinicOS', baseBranch: 'origin/main', commandTimeoutMs: 1000, maxOutputBytes: 10000, labels: { working: 'agent-working', readyForQa: 'ready-for-qa' } }, github, git, run, schema: { type: 'object' }, priorQaResult: { findings: [{ finding_id: 'QA-1' }] } });
  assert.equal(result.subject_sha, 'a'.repeat(40));
  assert.deepEqual(calls[0].args.slice(0, 4), ['--print','--output-format','json','--permission-mode']);
  assert.equal(calls[0].args.includes('acceptEdits'), true);
  assert.equal(calls[0].args.some((arg) => arg.includes('dangerously')), false);
  assert.match(calls[0].input, /QA-1/);
});
```

- [ ] **Step 2: Run the test and observe RED**

Run: `node --test agent-team/tests/unit/claude-development-worker.test.mjs`
Expected: FAIL because the Claude worker module is missing.

- [ ] **Step 3: Implement permanent prompt, safe worktree adapter, and Claude worker**

```md
<!-- agent-team/prompts/claude-development.md -->
You are the ClinicOS Claude Development Worker. Implement only the supplied GitHub issue contract. Use TDD and record RED/GREEN evidence. Work only in the supplied worktree and branch. Produce sanitized evidence bound to the final commit, commit all implementation/evidence changes, push the branch, and create or update a draft PR. Never merge, deploy, close an issue, apply qa-passed, or claim independent QA. Resolve every supplied QA finding or return it explicitly unresolved. Return only a schema-valid development_handoff object.
```

```js
// agent-team/src/adapters/git.mjs
import path from 'node:path';
export function createGitAdapter({ run, config }) {
  const invoke = async (args, cwd = process.cwd()) => { const result = await run({ command: 'git', args, cwd, timeoutMs: config.commandTimeoutMs, maxOutputBytes: config.maxOutputBytes }); if (!result.ok) throw new Error(result.error || result.stderr); return result.stdout.trim(); };
  return {
    async prepareIssueWorktree({ issue, prior }) {
      if (prior?.worktree_path && prior?.branch) return { path: prior.worktree_path, branch: prior.branch, pullRequestNumber: prior.pull_request_number };
      const slug = issue.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48);
      const branch = `codex/issue-${issue.number}-${slug}`;
      const worktreePath = path.join(config.worktreeRoot, `issue-${issue.number}`);
      await invoke(['fetch','origin']);
      await invoke(['worktree','add',worktreePath,'-b',branch,config.baseBranch]);
      return { path: worktreePath, branch, pullRequestNumber: null };
    },
    async headSha(cwd) { return invoke(['rev-parse','HEAD'], cwd); },
    async changedFiles(cwd) { return (await invoke(['diff','--name-only',config.baseBranch,'...HEAD'], cwd)).split(/\r?\n/).filter(Boolean); }
  };
}
```

```js
// agent-team/src/workers/claude-development-worker.mjs
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { formatProtocolComment } from '../core/protocol.mjs';
export async function runClaudeDevelopment({ issue, attempt, config, github, git, run, schema, priorQaResult }) {
  const coordinates = await git.prepareIssueWorktree({ issue, prior: priorQaResult?.coordinates });
  const permanent = await readFile(path.join(process.cwd(),'agent-team','prompts','claude-development.md'),'utf8');
  const context = { repository: config.repository, issue, attempt, base_branch: config.baseBranch, coordinates, unresolved_findings: priorQaResult?.findings ?? [], required_schema: schema };
  const result = await run({ command: 'claude', args: ['--print','--output-format','json','--permission-mode','acceptEdits','--json-schema',JSON.stringify(schema)], cwd: coordinates.path, input: `${permanent}\n<task-data>${JSON.stringify(context)}</task-data>`, timeoutMs: config.commandTimeoutMs, maxOutputBytes: config.maxOutputBytes });
  if (!result.ok) throw new Error(result.error || result.stderr || 'Claude development failed');
  const envelope = JSON.parse(result.stdout);
  const handoff = envelope.structured_output ?? (typeof envelope.result === 'string' ? JSON.parse(envelope.result) : envelope.result ?? envelope);
  const actualSha = await git.headSha(coordinates.path);
  if (handoff.subject_sha !== actualSha) throw new Error('Claude handoff SHA does not equal worktree HEAD');
  const comment = formatProtocolComment(handoff, schema);
  await github.addIssueComment(issue.number, comment);
  if (handoff.pull_request_number) await github.addPullRequestComment(handoff.pull_request_number, comment);
  await github.removeLabels(issue.number, [config.labels.working]);
  await github.addLabels(issue.number, [config.labels.readyForQa]);
  return { ...handoff, coordinates: { ...coordinates, pull_request_number: handoff.pull_request_number, worktree_path: coordinates.path } };
}
```

- [ ] **Step 4: Run focused and aggregate tests and observe GREEN**

Run: `node --test agent-team/tests/unit/claude-development-worker.test.mjs`
Expected: 1 test passes, 0 fail.

Run: `node --test agent-team/tests/unit/*.test.mjs`
Expected: all tests pass.

- [ ] **Step 5: Commit Task 6**

```powershell
git add agent-team/prompts/claude-development.md agent-team/src/adapters/git.mjs agent-team/src/workers/claude-development-worker.mjs agent-team/tests/unit/claude-development-worker.test.mjs
git commit -m "feat(agent-team): add Claude development worker"
```

---

### Task 7: Independent Codex QA Worker and Claude Remediation Loop

**Files:**
- Create: `agent-team/prompts/codex-qa.md`
- Create: `agent-team/src/workers/codex-qa-worker.mjs`
- Create: `agent-team/src/core/remediation.mjs`
- Create: `agent-team/tests/unit/codex-qa-worker.test.mjs`
- Create: `agent-team/tests/unit/remediation.test.mjs`

**Interfaces:**
- Produces: `runCodexQa({ issue, pullRequest, config, github, run, schema, worktreePath }): Promise<QaResult>`.
- Produces: `nextRemediationState({ qaResults, noProgressLimit }): 'ready-for-dev' | 'blocked'`.

- [ ] **Step 1: Write failing QA independence, SHA rejection, and no-progress tests**

```js
// agent-team/tests/unit/codex-qa-worker.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { runCodexQa } from '../../src/workers/codex-qa-worker.mjs';
test('Codex QA uses output schema and rejects a result for another SHA', async () => {
  const qa = { schema_version: 1, message_type: 'qa_result', issue_number: 263, pull_request_number: 300, attempt: 1, subject_sha: 'b'.repeat(40), decision: 'qa-passed', acceptance_criteria: [], findings: [], commands: [], artifact_refs: [], next_actions: [] };
  const run = async (call) => ({ ok: true, code: 0, stdout: '', stderr: '', error: null, finalMessage: JSON.stringify(qa), call });
  const github = { addIssueComment: async () => {}, addPullRequestComment: async () => {}, addLabels: async () => {}, removeLabels: async () => {} };
  await assert.rejects(() => runCodexQa({ issue: { number: 263, body: 'contract' }, pullRequest: { number: 300, headRefOid: 'a'.repeat(40) }, config: { repository: 'l2v-hub/ClinicOS', runtimeRoot: 'C:/tmp/runtime', commandTimeoutMs: 1000, maxOutputBytes: 1000, labels: {} }, github, run, schema: { type: 'object' }, worktreePath: 'C:/tmp/worktree' }), /QA subject SHA mismatch/);
});
```

```js
// agent-team/tests/unit/remediation.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { nextRemediationState } from '../../src/core/remediation.mjs';
const failed = (sha, fingerprint) => ({ decision: 'qa-failed', subject_sha: sha, findings: [{ fingerprint, status: 'open' }] });
test('three equivalent failures without changed SHA become blocked', () => assert.equal(nextRemediationState({ qaResults: [failed('a','x'),failed('a','x'),failed('a','x')], noProgressLimit: 3 }), 'blocked'));
test('a changed SHA restarts remediation eligibility', () => assert.equal(nextRemediationState({ qaResults: [failed('a','x'),failed('b','x')], noProgressLimit: 3 }), 'ready-for-dev'));
```

- [ ] **Step 2: Run focused tests and observe RED**

Run: `node --test agent-team/tests/unit/codex-qa-worker.test.mjs agent-team/tests/unit/remediation.test.mjs`
Expected: FAIL because QA and remediation modules are missing.

- [ ] **Step 3: Implement independent Codex invocation and feedback transition**

```md
<!-- agent-team/prompts/codex-qa.md -->
You are the independent ClinicOS Codex QA Gatekeeper. Do not implement or repair code. Review the exact PR head SHA, issue acceptance criteria, diff, CI state, and evidence. Independently rerun pertinent build, typecheck, unit, integration, functional, Playwright, privacy, security, secret, and artifact-binding checks. Reject skipped tests and evidence not bound to the reviewed SHA. Emit only a schema-valid qa_result. Never merge, deploy, close the issue, or approve Claude based on its claim alone.
```

```js
// agent-team/src/core/remediation.mjs
export function nextRemediationState({ qaResults, noProgressLimit }) {
  const tail = qaResults.slice(-noProgressLimit);
  if (tail.length < noProgressLimit) return 'ready-for-dev';
  const signature = (result) => `${result.subject_sha}:${result.findings.filter((finding) => finding.status === 'open').map((finding) => finding.fingerprint).sort().join(',')}`;
  return new Set(tail.map(signature)).size === 1 ? 'blocked' : 'ready-for-dev';
}
```

```js
// agent-team/src/workers/codex-qa-worker.mjs
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { formatProtocolComment, verifyArtifactRefs } from '../core/protocol.mjs';
export async function runCodexQa({ issue, pullRequest, config, github, run, schema, worktreePath }) {
  await mkdir(config.runtimeRoot, { recursive: true });
  const outputPath = path.join(config.runtimeRoot, `qa-${issue.number}-${pullRequest.headRefOid}.json`);
  const prompt = await readFile(path.join(process.cwd(),'agent-team','prompts','codex-qa.md'),'utf8');
  const context = { repository: config.repository, issue, pull_request: pullRequest, required_schema: schema };
  const result = await run({ command: 'codex', args: ['exec','--sandbox','workspace-write','--cd',worktreePath,'--output-schema',path.join(process.cwd(),'agent-team','protocol','schemas','qa-result.schema.json'),'--output-last-message',outputPath,'-'], cwd: worktreePath, input: `${prompt}\n<task-data>${JSON.stringify(context)}</task-data>`, timeoutMs: config.commandTimeoutMs, maxOutputBytes: config.maxOutputBytes });
  if (!result.ok) throw new Error(result.error || result.stderr || 'Codex QA failed');
  const qaResult = result.finalMessage ? JSON.parse(result.finalMessage) : JSON.parse(await readFile(outputPath,'utf8'));
  if (qaResult.subject_sha !== pullRequest.headRefOid) throw new Error('QA subject SHA mismatch');
  await verifyArtifactRefs({ repoRoot: worktreePath, subjectSha: pullRequest.headRefOid, refs: qaResult.artifact_refs });
  const comment = formatProtocolComment(qaResult, schema);
  await github.addIssueComment(issue.number, comment);
  await github.addPullRequestComment(pullRequest.number, comment);
  await github.removeLabels(issue.number, [config.labels.readyForQa]);
  if (qaResult.decision === 'qa-passed') await github.addLabels(issue.number, [config.labels.qaPassed]);
  if (qaResult.decision === 'blocked') await github.addLabels(issue.number, [config.labels.blocked]);
  if (qaResult.decision === 'qa-failed') {
    await github.addLabels(issue.number, [config.labels.qaFailed, config.labels.readyForDev, config.labels.assignedToClaude]);
  }
  return qaResult;
}
```

- [ ] **Step 4: Run focused and aggregate tests and observe GREEN**

Run: `node --test agent-team/tests/unit/codex-qa-worker.test.mjs agent-team/tests/unit/remediation.test.mjs`
Expected: 3 tests pass, 0 fail.

Run: `node --test agent-team/tests/unit/*.test.mjs`
Expected: all tests pass.

- [ ] **Step 5: Commit Task 7**

```powershell
git add agent-team/prompts/codex-qa.md agent-team/src/workers/codex-qa-worker.mjs agent-team/src/core/remediation.mjs agent-team/tests/unit/codex-qa-worker.test.mjs agent-team/tests/unit/remediation.test.mjs
git commit -m "feat(agent-team): add independent Codex QA remediation loop"
```

---

### Task 8: Reconciler and Five Operational Commands

**Files:**
- Create: `agent-team/src/core/reconciler.mjs`
- Create: `agent-team/src/runtime.mjs`
- Create: `agent-team/src/commands/doctor-entry.mjs`
- Create: `agent-team/src/commands/once.mjs`
- Create: `agent-team/src/commands/start.mjs`
- Create: `agent-team/src/commands/status.mjs`
- Create: `agent-team/src/commands/stop.mjs`
- Create: `agent-team/src/cli.mjs`
- Create: `agent-team/tests/integration/supervisor.test.mjs`

**Interfaces:**
- Produces: `reconcileOnce(dependencies): Promise<ReconcileResult>`.
- Produces one JSON stdout object and a meaningful exit code for each public command.

- [ ] **Step 1: Write failing integration tests for doctor gating and duplicate start**

```js
// agent-team/tests/integration/supervisor.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { reconcileOnce } from '../../src/core/reconciler.mjs';
import { acquireLocalSupervisorLock } from '../../src/core/locks.mjs';
test('reconciler never launches development when doctor says Claude is unavailable', async () => {
  let developmentRuns = 0;
  const result = await reconcileOnce({ doctor: async () => ({ developmentReady: false, qaReady: true }), listDevelopment: async () => [{ number: 263 }], listQa: async () => [], runDevelopment: async () => { developmentRuns += 1; }, runQa: async () => {} });
  assert.equal(developmentRuns, 0);
  assert.equal(result.development.skipped_reason, 'doctor-not-ready');
});
test('duplicate supervisor lock remains rejected', async () => {
  const runtimeRoot = await mkdtemp(path.join(tmpdir(), 'agent-team-supervisor-'));
  const first = await acquireLocalSupervisorLock(runtimeRoot);
  await assert.rejects(() => acquireLocalSupervisorLock(runtimeRoot), /already running/);
  await first.release();
});
```

- [ ] **Step 2: Run the integration test and observe RED**

Run: `node --test agent-team/tests/integration/supervisor.test.mjs`
Expected: FAIL because `reconciler.mjs` is missing.

- [ ] **Step 3: Implement reconciliation and command dispatch**

```js
// agent-team/src/core/reconciler.mjs
export async function reconcileOnce({ doctor, listDevelopment, listQa, runDevelopment, runQa }) {
  const health = await doctor();
  const result = { doctor: health, development: { processed: [], skipped_reason: null }, qa: { processed: [], skipped_reason: null } };
  if (health.developmentReady) for (const issue of await listDevelopment()) { await runDevelopment(issue); result.development.processed.push(issue.number); }
  else result.development.skipped_reason = 'doctor-not-ready';
  if (health.qaReady) for (const item of await listQa()) { await runQa(item); result.qa.processed.push(item.issue.number); }
  else result.qa.skipped_reason = 'doctor-not-ready';
  return result;
}
```

Use this exact composition boundary; keep all testable behavior in the imported pure modules:

```js
// agent-team/src/runtime.mjs
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { runProcess } from './adapters/process-runner.mjs';
import { createGitHubAdapter } from './adapters/github.mjs';
import { createGitAdapter } from './adapters/git.mjs';
import { runDoctor } from './commands/doctor.mjs';
import { isSupervisorLive, acquireGitHubClaim } from './core/locks.mjs';
import { runClaudeDevelopment } from './workers/claude-development-worker.mjs';
import { runCodexQa } from './workers/codex-qa-worker.mjs';

const loadSchema = async (repoRoot, name) => JSON.parse(await readFile(path.join(repoRoot,'agent-team','protocol','schemas',name),'utf8'));
const labelsOf = (issue) => (issue.labels ?? []).map((label) => typeof label === 'string' ? label : label.name);

export async function createRuntime({ config, repoRoot, allowCurrentSupervisor = false }) {
  const github = createGitHubAdapter({ run: runProcess, config });
  const git = createGitAdapter({ run: runProcess, config });
  const developmentSchema = await loadSchema(repoRoot,'development-handoff.schema.json');
  const qaSchema = await loadSchema(repoRoot,'qa-result.schema.json');
  const doctor = () => runDoctor({ config, run: runProcess, isSupervisorLive: () => allowCurrentSupervisor ? false : isSupervisorLive(config.runtimeRoot) });
  const listDevelopment = async () => (await github.listIssuesByLabels([config.labels.readyForDev,config.labels.assignedToClaude])).slice(0,config.developmentConcurrency);
  const listQa = async () => {
    const issues = (await github.listIssuesByLabels([config.labels.readyForQa])).slice(0,config.qaConcurrency);
    const items = [];
    for (const issue of issues) {
      const full = await github.viewIssue(issue.number);
      const handoffs = full.comments.map((comment) => { try { const value = JSON.parse(comment.body.split('\n').slice(1).join('\n')); return value.message_type === 'development_handoff' ? value : null; } catch { return null; } }).filter(Boolean);
      const handoff = handoffs.at(-1);
      if (!handoff) continue;
      items.push({ issue: full, pullRequest: await github.viewPullRequest(handoff.pull_request_number), worktreePath: path.join(config.worktreeRoot,`issue-${issue.number}`) });
    }
    return items;
  };
  const runDevelopment = async (issue) => {
    const attempt = 1 + (issue.comments ?? []).filter((comment) => comment.body?.includes('development_handoff')).length;
    const claim = await acquireGitHubClaim({ github, issue, workerId: `${process.env.COMPUTERNAME ?? 'host'}:${process.pid}`, role: 'claude-development', attempt, leaseDurationMs: config.leaseDurationMs });
    if (!claim.won) return { skipped: 'claim-lost' };
    await github.removeLabels(issue.number,[config.labels.readyForDev,config.labels.assignedToClaude,config.labels.qaFailed]);
    await github.addLabels(issue.number,[config.labels.working]);
    return runClaudeDevelopment({ issue, attempt, config, github, git, run: runProcess, schema: developmentSchema, priorQaResult: null });
  };
  const runQa = (item) => runCodexQa({ ...item, config, github, run: runProcess, schema: qaSchema });
  return { github, git, doctor, listDevelopment, listQa, runDevelopment, runQa };
}
```

```js
// agent-team/src/commands/doctor-entry.mjs
import { createRuntime } from '../runtime.mjs';
export async function run({ config, repoRoot }) { const runtime = await createRuntime({ config, repoRoot }); return runtime.doctor(); }
```

```js
// agent-team/src/commands/once.mjs
import { createRuntime } from '../runtime.mjs';
import { reconcileOnce } from '../core/reconciler.mjs';
export async function run({ config, repoRoot, allowCurrentSupervisor = false }) {
  const runtime = await createRuntime({ config, repoRoot, allowCurrentSupervisor });
  const result = await reconcileOnce(runtime);
  return { ok: result.doctor.developmentReady || result.doctor.qaReady, ...result };
}
```

```js
// agent-team/src/commands/start.mjs
import { spawn } from 'node:child_process';
import { access, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { acquireLocalSupervisorLock, isSupervisorLive, writeHeartbeat } from '../core/locks.mjs';
import { run as runDoctor } from './doctor-entry.mjs';
import { run as runOnce } from './once.mjs';
export async function run({ config, repoRoot, mode }) {
  if (mode === 'start') {
    if (await isSupervisorLive(config.runtimeRoot)) return { ok: false, started: false, error: 'supervisor already running' };
    const health = await runDoctor({ config, repoRoot });
    if (!health.developmentReady || !health.qaReady) return { ok: false, started: false, error: 'doctor prerequisites failed', doctor: health };
    const child = spawn(process.execPath,[path.join(repoRoot,'agent-team','src','cli.mjs'),'loop'],{cwd:repoRoot,detached:true,stdio:'ignore',windowsHide:true});
    child.unref();
    return { ok: true, started: true, pid: child.pid };
  }
  const lock = await acquireLocalSupervisorLock(config.runtimeRoot);
  const stopPath = path.join(config.runtimeRoot,'stop.request');
  await rm(stopPath,{force:true});
  try {
    while (true) {
      try { await access(stopPath); break; } catch {}
      const result = await runOnce({ config, repoRoot, allowCurrentSupervisor: true });
      await writeHeartbeat(config.runtimeRoot,{ ok: result.ok, result });
      await delay(config.pollIntervalMs);
    }
    return { ok: true, stopped: true };
  } finally { await lock.release(); await rm(stopPath,{force:true}); }
}
```

```js
// agent-team/src/commands/status.mjs
import { readFile } from 'node:fs/promises';
import path from 'node:path';
export async function run({ config }) {
  try { const heartbeat = JSON.parse(await readFile(path.join(config.runtimeRoot,'heartbeat.json'),'utf8')); return { ok: true, running: Date.now() - Date.parse(heartbeat.at) < config.heartbeatTimeoutMs, ...heartbeat }; }
  catch { return { ok: true, running: false, workers: [], issues: [], pull_requests: [], attempts: [], leases: [], subject_shas: [], last_error: null }; }
}
```

```js
// agent-team/src/commands/stop.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
export async function run({ config }) { await mkdir(config.runtimeRoot,{recursive:true}); await writeFile(path.join(config.runtimeRoot,'stop.request'),new Date().toISOString()); return { ok: true, stop_requested: true }; }
```

```js
// agent-team/src/cli.mjs
#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './core/config.mjs';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const config = await loadConfig({ repoRoot });
const command = process.argv[2];
const modules = { doctor: './commands/doctor-entry.mjs', once: './commands/once.mjs', start: './commands/start.mjs', status: './commands/status.mjs', stop: './commands/stop.mjs', loop: './commands/start.mjs' };
if (!modules[command]) { console.error(JSON.stringify({ ok: false, error: `unknown command: ${command}` })); process.exit(2); }
const handler = await import(modules[command]);
const result = await handler.run({ config, repoRoot, mode: command });
console.log(JSON.stringify(result));
if (result.ok === false) process.exitCode = 1;
```

Keep `doctor.mjs` pure for unit tests; only `doctor-entry.mjs` performs runtime composition.

- [ ] **Step 4: Run integration, unit, and command smoke tests and observe GREEN**

Run: `node --test agent-team/tests/integration/supervisor.test.mjs`
Expected: 2 tests pass, 0 fail.

Run: `node --test agent-team/tests/unit/*.test.mjs agent-team/tests/integration/*.test.mjs`
Expected: all tests pass.

Run: `npm run agent-team:doctor`
Expected on the verified workstation: exit 0; `developmentReady: true`; `qaReady: true`; Claude, Codex, GitHub, Git, repository, configuration, worktree, and duplicate-supervisor checks are all true. Sanitize email/account identifiers in captured evidence.

- [ ] **Step 5: Commit Task 8**

```powershell
git add agent-team/src/core/reconciler.mjs agent-team/src/commands agent-team/src/cli.mjs agent-team/tests/integration/supervisor.test.mjs
git commit -m "feat(agent-team): add restart-safe supervisor commands"
```

---

### Task 9: Operator Documentation, Evidence, and Prohibited-Action Gate

**Files:**
- Create: `agent-team/README.md`
- Create: `agent-team/tests/integration/prohibited-actions.test.mjs`
- Create: `artifacts/task-validation/263-agent-team-llm-first/task-contract.md`
- Create: `artifacts/task-validation/263-agent-team-llm-first/validation-report.md`
- Create: `artifacts/task-validation/263-agent-team-llm-first/agent-team/development-handoff.json`
- Create: `artifacts/task-validation/263-agent-team-llm-first/agent-team/artifact-manifest.json`
- Create: `artifacts/task-validation/263-agent-team-llm-first/test-results/unit.tap`
- Create: `artifacts/task-validation/263-agent-team-llm-first/test-results/integration.tap`

**Interfaces:**
- Produces reproducible operator and QA evidence for issue #263.
- The Claude validation report final state is `READY FOR CODEX QA`, never `CLOSED — VERIFIED`.

- [ ] **Step 1: Write a failing static prohibited-action test**

```js
// agent-team/tests/integration/prohibited-actions.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
async function files(root) { const out = []; for (const entry of await readdir(root,{withFileTypes:true})) { const full = path.join(root,entry.name); if (entry.isDirectory()) out.push(...await files(full)); else if (/\.(mjs|json|md)$/.test(entry.name)) out.push(full); } return out; }
test('runtime source contains no prohibited automatic action or bypass invocation', async () => {
  const sourceFiles = (await files(path.resolve('agent-team/src')));
  const source = (await Promise.all(sourceFiles.map((file) => readFile(file,'utf8')))).join('\n');
  for (const pattern of [/dangerously-skip-permissions/,/dangerously-bypass-approvals/,/\bgh\s+pr\s+merge\b/,/\bgh\s+issue\s+close\b/,/\bvercel\s+deploy\b/,/\brailway\s+up\b/]) assert.equal(pattern.test(source), false, `prohibited pattern: ${pattern}`);
});
```

- [ ] **Step 2: Run the static test and confirm its baseline result**

Run: `node --test agent-team/tests/integration/prohibited-actions.test.mjs`
Expected: PASS if no prohibited path was introduced; if it fails, remove the prohibited runtime invocation and rerun until green.

- [ ] **Step 3: Write exact operator documentation and evidence**

Write `agent-team/README.md` with this operator contract:

```md
# ClinicOS Agent Team

This directory contains the ClinicOS Claude-development/Codex-QA orchestration runtime. GitHub issues, pull requests, protocol comments, and committed validation artifacts are authoritative. Files under `.runtime/` and `.worktrees/` are local and disposable.

## Prerequisites

- Node.js 20 or newer
- Git and an `origin` remote for `l2v-hub/ClinicOS`
- Authenticated GitHub CLI
- Authenticated Claude Code CLI
- Authenticated Codex CLI

The read-only health probes are `claude --version`, `claude --help`, `claude auth status`, `codex --version`, `codex --help`, `codex login status`, `gh --version`, `gh auth status`, `git rev-parse --show-toplevel`, `git remote get-url origin`, and `git worktree list --porcelain`.

## Commands

- `npm run agent-team:doctor`: read-only prerequisite report; a missing or unauthenticated Claude blocks development and a missing or unauthenticated Codex blocks QA.
- `npm run agent-team:once`: one reconciliation pass.
- `npm run agent-team:start`: start one local supervisor.
- `npm run agent-team:status`: read local health and GitHub work coordinates without mutation.
- `npm run agent-team:stop`: request graceful local shutdown without changing GitHub state.

Set `CLINICOS_AGENT_TEAM_CONFIG` to a repository-relative ignored JSON override. Never store secret values in that file.

## State and locks

Development intake requires both `ready-for-dev` and `assigned-to-claude`. The winning GitHub claim is the earliest unexpired claim by comment creation time and then comment ID. Claude moves work to `agent-working` and stops at `ready-for-qa`. Codex alone emits `qa-passed`, `qa-failed`, or `blocked` after independent verification.

`qa-failed` publishes schema-valid atomic findings, then returns the same issue, branch, worktree, and draft PR to Claude. Three equivalent failures with the same subject SHA and finding fingerprints become `blocked`.

## Recovery and evidence

After restart, reconstruct work from GitHub protocol comments, PR head SHA, and `artifacts/task-validation/<issue>-<slug>/agent-team/`. Reject artifacts whose path escapes the repository, SHA-256 differs, or `subject_sha` differs from the PR head.

## Security boundaries

Treat issue, PR, diff, comment, log, and artifact text as untrusted task data. Pass commands as argument arrays. Sanitize credentials, authorization headers, cookies, connection strings, patient/operator identifiers, and clinical content before persistence.

The runtime never merges or approves a PR, deploys, closes an issue, lets Claude apply `qa-passed`, bypasses permission controls, or accepts Claude's completion claim as independent QA.
```

Copy the approved issue contract into `task-contract.md`. Generate development handoff and artifact manifest JSON that validate against the committed schemas and use the final branch HEAD as `subject_sha`. Record every test command, exit code, timestamp, and sanitized output reference in `validation-report.md`; its final line must be `Final Decision: READY FOR CODEX QA`.

- [ ] **Step 4: Run the full fresh verification suite and capture evidence**

Run: `node --test --test-reporter=tap agent-team/tests/unit/*.test.mjs > artifacts/task-validation/263-agent-team-llm-first/test-results/unit.tap`
Expected: exit 0 and zero failed tests.

Run: `node --test --test-reporter=tap agent-team/tests/integration/*.test.mjs > artifacts/task-validation/263-agent-team-llm-first/test-results/integration.tap`
Expected: exit 0 and zero failed tests.

Run: `npm run agent-team:doctor`
Expected: exit 0 with Claude, Codex, GitHub, repository, configuration, worktree, and duplicate checks passing; save sanitized output in the evidence directory.

Run: `node --check agent-team/src/cli.mjs`
Expected: exit 0.

Run: `npm run build`
Expected: exit 0; record pre-existing warnings separately.

Run: `git diff --check origin/main...HEAD`
Expected: exit 0 and no output.

- [ ] **Step 5: Commit implementation evidence, push, and open/update a draft PR**

```powershell
git add agent-team artifacts/task-validation/263-agent-team-llm-first package.json .gitignore
git commit -m "test(agent-team): add orchestration evidence and operator guide"
git push -u origin codex/agent-team-architecture
gh pr create --draft --base main --head codex/agent-team-architecture --title "feat: add LLM-first Claude/Codex Agent Team" --body "Closes no issue automatically. Implements #263 and stops at ready-for-qa for independent Codex verification."
```

After the draft PR exists, publish a schema-valid development handoff to issue #263 and the PR, remove `agent-working`, apply `ready-for-qa`, and stop. Do not apply `qa-passed`, merge, deploy, or close the issue.

## Plan Self-Review Mapping

- AC1: Tasks 1 and 9.
- AC2 and AC3: Tasks 1, 2, and 8.
- AC4 and AC5: Tasks 4, 5, 6, and 9.
- AC6: Tasks 3, 4, and 7.
- AC7: Task 3.
- AC8 through AC10: Tasks 6, 7, and 8.
- AC11: Tasks 4, 5, and 8.
- AC12: Every task adds focused tests; Task 9 runs aggregate verification.
- AC13: Role prompts, state machine, Task 7, and Task 9 prohibited-action gate.

The implementation sequence has no dependency cycle: configuration and process boundaries precede protocol; protocol precedes GitHub state and claims; those precede workers; workers precede reconciliation; full evidence follows all runtime behavior.
