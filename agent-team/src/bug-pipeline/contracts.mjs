import path from 'node:path';
import { createHash } from 'node:crypto';
import { validateAgainstSchema } from '../core/json-schema.mjs';
import { sanitizeText } from '../core/sanitize.mjs';

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
      issues: list(integer),
      scope: list(string),
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
export function validatePlan(plan, issues) {
  validateAgainstSchema(plan, planSchema);
  safeText(JSON.stringify(plan));
  if (plan.groups.length > 20 || plan.blocked.length > 100) throw new Error('plan too large');
  const selected = new Set(issues.map((i) => i.number));
  const seen = [];
  for (const group of plan.groups) {
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
        b[key].length > MAX_CYCLES ||
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
        { groups: [b.plan], blocked: [] },
        b.issues.map((number) => ({ number })),
      );
  }
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
