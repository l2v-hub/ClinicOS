
UNTRUSTED SOURCE frontend/src/lib/authAvailability.ts
Git blob: f849e47a769aa4d9596c1c3826491206fd3490bd
Full SHA256: 176da8946bc947cffbc1b92361747365e4fc43c840fcb16d6bd7293b996cc6f6
Full bytes: 2528; contiguous range [0,2528)
---BEGIN EXACT SOURCE---
export interface AuthStatus {
  mode: 'entra' | 'demo' | 'disabled';
  temporaryDemo: boolean;
  simulator: boolean;
  syntheticOnly: boolean;
  expiresAt: string | null;
}

export type AuthCheckState = 'checking' | 'available' | 'unavailable';
export type AuthAvailability = 'checking' | 'unavailable' | 'expired' | 'disabled' | 'ready';

/** Status is public configuration, never an identity or an authorization grant. */
export function parseAuthStatus(payload: unknown): AuthStatus {
  const invalid = () => {
    throw new Error('auth_status_invalid');
  };
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return invalid();
  const value = payload as Record<string, unknown>;
  if (value.mode !== 'entra' && value.mode !== 'demo' && value.mode !== 'disabled')
    return invalid();
  if (typeof value.temporaryDemo !== 'boolean') return invalid();
  if (value.simulator !== undefined && typeof value.simulator !== 'boolean') return invalid();
  if (value.syntheticOnly !== undefined && typeof value.syntheticOnly !== 'boolean')
    return invalid();
  // Expiry is optional explanatory metadata, not an authentication gate.
  // A stale demo variable must not override an enabled Entra/demo server mode.
  // Unusable metadata cannot prove expiration of an already-disabled service.
  const expiresAt =
    typeof value.expiresAt === 'string' &&
    value.expiresAt.length <= 50 &&
    Number.isFinite(Date.parse(value.expiresAt))
      ? value.expiresAt
      : null;
  if (value.mode !== 'demo' && (value.simulator === true || value.temporaryDemo)) return invalid();
  return {
    mode: value.mode,
    temporaryDemo: value.temporaryDemo,
    simulator: value.simulator === true,
    syntheticOnly: value.syntheticOnly === true,
    expiresAt,
  };
}

export function canStartLogin(check: AuthCheckState, status: AuthStatus | null): boolean {
  return check === 'available' && (status?.mode === 'demo' || status?.mode === 'entra');
}

export function authAvailability(
  check: AuthCheckState,
  status: AuthStatus | null,
  now = Date.now(),
): AuthAvailability {
  if (check !== 'available') return check;
  if (!status) return 'unavailable';
  if (status.mode !== 'disabled') return 'ready';
  // The server mode alone denies access. Browser time only chooses explanatory copy;
  // it must never enable/disable a server-authorized demo or replace /auth/me.
  return status.syntheticOnly && status.expiresAt !== null && Date.parse(status.expiresAt) <= now
    ? 'expired'
    : 'disabled';
}

---END EXACT SOURCE---

UNTRUSTED SOURCE agent-team/src/bug-pipeline/contracts.mjs
Git blob: 4b2b261933bbbfe30fa43419edb885b766851709
Full SHA256: 084599442394406bd89ee5ae7c4a25417c48da47adbfbc281dc533ad511d1482
Full bytes: 11325; contiguous range [0,11325)
---BEGIN EXACT SOURCE---
import { attemptLimit, validateOperatorContinuations } from './attempt-budget.mjs';
import path from 'node:path';
import { validAutomationHandback, validOperatorTakeover } from './operator-ownership.mjs';
import { createHash } from 'node:crypto';
import { validateAgainstSchema } from '../core/json-schema.mjs';
import { sanitizeText } from '../core/sanitize.mjs';
import { legacyExecution } from './routing.mjs';

const string = { type: 'string' };
const integer = { type: 'integer' };
const list = (items) => ({ type: 'array', items, minItems: 1 });
const object = (properties) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
export const planSchema = object({
  groups: {
    type: 'array',
    items: object({
      title: string,
      feature: string,
      rationale: string,
      analysis: string,
      execution: object({
        difficulty: { type: 'string', enum: ['low', 'medium', 'high'] },
        mode: { type: 'string', enum: ['direct', 'delegate'] },
        reason: string,
      }),
      issues: list(integer),
      scope: list(string),
      fileMap: list(object({ issue: integer, files: list(string) })),
      separationReason: string,
      acceptance: list(object({ issue: integer, criteria: list(string) })),
      tasks: list(object({ title: string, files: list(string), steps: list(string) })),
      verification: list(object({ command: string, args: list(string) })),
      evidence: list(object({ issue: integer, screenshot: string, trace: string, video: string })),
    }),
  },
  blocked: { type: 'array', items: object({ issue: integer, reason: string }) },
});
export const MAX_CYCLES = 4;
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
export function safeText(value) {
  if (
    typeof value !== 'string' ||
    value.length > 100_000 ||
    sanitizeText(value) !== value ||
    /(?:sk-ant-|github_pat_|ghp_[a-z0-9]{25}|postgres(?:ql)?:\/\/)/i.test(value)
  )
    throw new Error('unsafe or oversized structured text');
  return value;
}
export function relativeFile(file) {
  if (
    typeof file !== 'string' ||
    !file ||
    file.length > 300 ||
    path.posix.isAbsolute(file) ||
    file.includes('\\') ||
    file.split('/').some((p) => !p || p === '.' || p === '..') ||
    /[\x00-\x1f`$]/.test(file)
  )
    throw new Error('invalid relative path');
  return file;
}
export function editableFile(file) {
  relativeFile(file);
  if (
    /^(?:agent-team)(?:\/|$)/.test(file) ||
    /(?:^|\/)(?:\.git(?:hub)?|\.agents|\.claude|\.codex)(?:\/|$)/.test(file) ||
    /(?:^|\/)(?:AGENTS(?:\.override)?|CLAUDE(?:\.local)?)\.md$/.test(file) ||
    /^scripts\/(?:quality-gate|security)\//.test(file) ||
    /(?:^|\/)\.env(?:\.|$)/.test(file) ||
    /(?:^|\/)(?:credentials|auth)\.json$/.test(file)
  )
    throw new Error('automation control or credential path is outside implementation scope');
  return file;
}
export function validatePlan(
  plan,
  issues,
  { allowLegacyExecution = false, allowLegacyGrouping = false } = {},
) {
  const checked =
    (allowLegacyExecution || allowLegacyGrouping) && Array.isArray(plan?.groups)
      ? {
          ...plan,
          groups: plan.groups.map((group) => ({
            ...group,
            ...(allowLegacyExecution && group.execution === undefined
              ? { execution: legacyExecution }
              : {}),
            ...(allowLegacyGrouping &&
            group.fileMap === undefined &&
            group.separationReason === undefined
              ? {
                  fileMap: group.issues.map((issue) => ({ issue, files: group.scope })),
                  separationReason: '',
                }
              : {}),
          })),
        }
      : plan;
  validateAgainstSchema(checked, planSchema);
  safeText(JSON.stringify(plan));
  if (plan.groups.length > 20 || plan.blocked.length > 100) throw new Error('plan too large');
  const selected = new Set(issues.map((i) => i.number));
  const seen = [];
  for (const group of checked.groups) {
    if (group.execution && !group.execution.reason.trim())
      throw new Error('missing execution rationale');
    if ([group.title, group.feature, group.rationale, group.analysis].some((s) => !s.trim()))
      throw new Error('missing grouping analysis');
    if (group.issues.length > 20 || group.verification.length > 12 || group.tasks.length > 50)
      throw new Error('batch too large');
    seen.push(...group.issues);
    const exactCoverage = (entries) =>
      entries.length === group.issues.length &&
      new Set(entries).size === entries.length &&
      entries.every((n) => group.issues.includes(n));
    if (
      !exactCoverage(group.acceptance.map((a) => a.issue)) ||
      !exactCoverage(group.evidence.map((e) => e.issue))
    )
      throw new Error('per-issue acceptance/evidence coverage is incomplete');
    group.scope.forEach(editableFile);
    if (!exactCoverage(group.fileMap.map((entry) => entry.issue)))
      throw new Error('per-issue file map coverage is incomplete');
    for (const entry of group.fileMap)
      for (const file of entry.files) {
        editableFile(file);
        if (!group.scope.includes(file)) throw new Error('issue file outside declared scope');
      }
    if (group.scope.some((file) => !group.fileMap.some((entry) => entry.files.includes(file))))
      throw new Error('scope file has no source issue');
    for (const task of group.tasks)
      for (const file of task.files) {
        editableFile(file);
        if (!group.scope.includes(file)) throw new Error('task outside declared file scope');
      }
    for (const command of group.verification) {
      if (
        !['node', 'npm', 'python3'].includes(command.command) ||
        command.args.length > 50 ||
        command.args.some((a) => a.length > 1000 || /[\x00-\x1f]/.test(a))
      )
        throw new Error('invalid verification command');
    }
    if (
      !group.verification.some(
        (c) =>
          c.command === 'npm' &&
          JSON.stringify(c.args) === JSON.stringify(['--prefix', 'frontend', 'run', 'build']),
      ) ||
      !group.verification.some((c) =>
        c.args.some((a) => a === 'test' || a === '--test' || /(?:test|spec)\.[cm]?[jt]s$/.test(a)),
      )
    )
      throw new Error('verification requires the frontend build and meaningful regression tests');
    const evidenceRoot = `artifacts/task-validation/bug-batch-${Math.min(...group.issues)}/evidence/`;
    for (const item of group.evidence)
      for (const [kind, extension] of [
        ['screenshot', '.png'],
        ['trace', '.zip'],
        ['video', null],
      ]) {
        const file = item[kind];
        if (kind === 'video' && file === '') continue;
        relativeFile(file);
        if (
          !file.startsWith(evidenceRoot) ||
          (extension && !file.endsWith(extension)) ||
          (kind === 'video' && !/\.(?:webm|mp4)$/.test(file))
        )
          throw new Error('evidence must be inside the batch evidence directory');
      }
  }
  for (let i = 0; i < checked.groups.length; i++)
    for (const other of checked.groups.slice(i + 1)) {
      const group = checked.groups[i];
      if (
        group.scope.some((file) => other.scope.includes(file)) &&
        (!group.separationReason.trim() || !other.separationReason.trim())
      )
        throw new Error('shared-file groups must be consolidated or explicitly justify separation');
    }
  for (const item of plan.blocked) {
    seen.push(item.issue);
    if (!item.reason.trim()) throw new Error('missing blocked reason');
  }
  if (
    seen.length !== selected.size ||
    new Set(seen).size !== seen.length ||
    seen.some((n) => !selected.has(n))
  )
    throw new Error('triage must account for every selected issue exactly once');
  return plan;
}
export function validateState(state, repo) {
  if (
    !state ||
    state.schemaVersion !== 1 ||
    state.repository !== repo ||
    !Array.isArray(state.batches) ||
    state.batches.length > 1000
  )
    throw new Error('invalid durable pipeline state');
  // Legacy takeovers without a handback stay valid and globally paused. A stale
  // well-formed grant is also valid data, but cannot enable the new nonce.
  if (
    state.operatorTakeover?.automation !== undefined &&
    !validAutomationHandback(state.operatorTakeover.automation)
  )
    throw new Error('invalid operator automation handback');
  if (state.operatorTakeover !== undefined && !validOperatorTakeover(state.operatorTakeover))
    throw new Error('invalid operator takeover');
  const issues = new Set();
  for (const b of state.batches) {
    if (
      !/^bug-batch-[1-9][0-9]*$/.test(b.id) ||
      b.branch !== `codex/${b.id}` ||
      !Array.isArray(b.issues) ||
      !b.issues.length ||
      b.id !== `bug-batch-${Math.min(...b.issues)}` ||
      ![
        'planned',
        'implementing',
        'simplifying',
        'validating',
        'publishing',
        'reviewing',
        'waiting-review',
        'waiting-checks',
        'ready',
        'blocked',
      ].includes(b.phase)
    )
      throw new Error('invalid durable batch identity');
    for (const n of b.issues) {
      if (!Number.isSafeInteger(n) || n < 1 || issues.has(n))
        throw new Error('duplicate durable issue');
      issues.add(n);
    }
    for (const key of ['implementation', 'reviews']) {
      if (
        !Array.isArray(b[key]) ||
        b[key].length > attemptLimit(b, key) ||
        b[key].some(
          (a, i) =>
            a.round !== i + 1 ||
            !['running', 'passed', 'failed', 'approved', 'changes-requested', 'blocked'].includes(
              a.status,
            ),
        )
      )
        throw new Error('invalid durable attempt budget');
    }
    if (b.sha && !/^[a-f0-9]{40}$/.test(b.sha)) throw new Error('invalid durable revision');
    if (b.pr && (!Number.isSafeInteger(b.pr.number) || b.pr.number < 1))
      throw new Error('invalid PR coordinates');
    if (b.phase !== 'blocked')
      validatePlan(
        {
          groups: [
            b.grouping === undefined
              ? b.plan
              : {
                  ...b.plan,
                  fileMap: b.grouping?.fileMap,
                  separationReason: b.grouping?.separationReason,
                },
          ],
          blocked: [],
        },
        b.issues.map((number) => ({ number })),
        { allowLegacyExecution: true, allowLegacyGrouping: b.grouping === undefined },
      );
  }
  if (state.triageQueue) {
    const queue = state.triageQueue;
    if (
      !Array.isArray(queue.issues) ||
      !queue.issues.length ||
      new Set(queue.issues).size !== queue.issues.length ||
      queue.issues.some((n) => !Number.isSafeInteger(n) || n < 1 || issues.has(n)) ||
      !Number.isSafeInteger(queue.openedAt) ||
      !Number.isSafeInteger(queue.changedAt) ||
      queue.openedAt < 0 ||
      queue.changedAt < queue.openedAt
    )
      throw new Error('invalid triage collection window');
  }
  validateOperatorContinuations(state);
  return state;
}
export function feedbackFingerprint(feedback) {
  return sha256(
    JSON.stringify({
      comments: feedback.comments,
      unresolved: feedback.unresolved,
      changesRequested: feedback.changesRequested,
    }),
  );
}

---END EXACT SOURCE---

UNTRUSTED SOURCE agent-team/src/core/sanitize.mjs
Git blob: 6520e5e5f57029e9d25dc71e37bc8813a5f98485
Full SHA256: 1a4d2b9565663b3ed5a593cdecf7cbadbd6f9cd6ef296a4b8c1c426b08ca042b
Full bytes: 1012; contiguous range [0,1012)
---BEGIN EXACT SOURCE---
const RULES = [
  // Header-style credentials: swallow the optional auth scheme so the token value never survives.
  [
    /((?:authorization|cookie|set-cookie)\s*[:=]\s*)((?:bearer|basic|token)\s+)?([^\s,;]+)/gi,
    '$1[REDACTED]',
  ],
  [/\b(?:sk|ghp|github_pat|gho|xoxb|xoxp)[_-][A-Za-z0-9_-]+\b/g, '[REDACTED_TOKEN]'],
  [
    /\b(?:OPENAI_API_KEY|ANTHROPIC_API_KEY|CLAUDE_CODE_OAUTH_TOKEN|CODEX_ACCESS_TOKEN|DATABASE_URL|GITHUB_TOKEN|GH_TOKEN)=([^\s]+)/g,
    (match) => `${match.split('=')[0]}=[REDACTED]`,
  ],
  [
    /\b(?:patientId|patient_id|operatorId|operator_id)=([A-Za-z0-9_-]+)/gi,
    (match) => `${match.split('=')[0]}=[REDACTED]`,
  ],
];

export function sanitizeText(text = '') {
  const redacted = RULES.reduce(
    (value, [pattern, replacement]) => value.replace(pattern, replacement),
    String(text),
  );
  // Deterministic hygiene: captured evidence must pass `git diff --check` (no trailing whitespace).
  return redacted.replace(/[ \t]+(\r?\n)/g, '$1').replace(/[ \t]+$/, '');
}

---END EXACT SOURCE---
