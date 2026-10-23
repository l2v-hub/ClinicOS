import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePlan,
  validateState,
  editableFile,
  relativeFile,
} from '../../src/bug-pipeline/contracts.mjs';

export function planFor(issues = [17, 18]) {
  const batch = Math.min(...issues);
  return {
    groups: [
      {
        title: 'Stabilize the patient list filter',
        feature: 'Patient list',
        rationale: 'The related reports share the same filter behavior.',
        execution: {
          difficulty: 'low',
          mode: 'delegate',
          reason: 'Bounded, independently testable change.',
        },
        analysis:
          'Both issues describe the same feature regression with separate reproduction details.',
        issues: [...issues],
        scope: ['frontend/src/features/patients/filter.ts'],
        fileMap: issues.map((issue) => ({
          issue,
          files: ['frontend/src/features/patients/filter.ts'],
        })),
        separationReason: '',
        acceptance: issues.map((issue) => ({
          issue,
          criteria: [`Issue #${issue} reproduces and is fixed`],
        })),
        tasks: [
          {
            title: 'Fix and cover filter behavior',
            files: ['frontend/src/features/patients/filter.ts'],
            steps: ['Correct filter state handling', 'Add regression coverage'],
          },
        ],
        verification: [
          { command: 'node', args: ['--test', 'frontend/src/features/patients/filter.test.mjs'] },
          { command: 'npm', args: ['--prefix', 'frontend', 'run', 'build'] },
        ],
        evidence: issues.map((issue) => ({
          issue,
          screenshot: `artifacts/task-validation/bug-batch-${batch}/evidence/issue-${issue}.png`,
          trace: `artifacts/task-validation/bug-batch-${batch}/evidence/issue-${issue}-trace.zip`,
          video: '',
        })),
      },
    ],
    blocked: [],
  };
}

const selected = (numbers = [17, 18]) => numbers.map((number) => ({ number }));

test('new triage requires a complete issue/file map and rejects unjustified shared-file splits', () => {
  const split = {
    groups: [planFor([17]).groups[0], planFor([18]).groups[0]],
    blocked: [],
  };
  assert.throws(() => validatePlan(split, selected()), /shared-file groups must be consolidated/);
  for (const group of split.groups)
    group.separationReason = 'Independent root causes in the same utility; coordinate PR order.';
  assert.equal(validatePlan(split, selected()).groups.length, 2);
  split.groups[1].separationReason = ' ';
  assert.throws(() => validatePlan(split, selected()), /shared-file groups/);

  for (const mutate of [
    (g) => {
      g.fileMap.pop();
    },
    (g) => {
      g.fileMap[1].issue = 17;
    },
    (g) => {
      g.fileMap[0].files.push('frontend/src/unrelated.ts');
    },
    (g) => {
      g.scope.push('frontend/src/unmapped.ts');
    },
  ]) {
    const plan = planFor();
    mutate(plan.groups[0]);
    assert.throws(
      () => validatePlan(plan, selected()),
      /file map coverage|outside declared scope|no source issue/,
    );
  }
  const missing = planFor();
  delete missing.groups[0].fileMap;
  assert.throws(() => validatePlan(missing, selected()), /missing fileMap/);
});

test('legacy grouping remains frozen and queue windows reject corrupt durable metadata', () => {
  const group = planFor([17]).groups[0];
  delete group.fileMap;
  delete group.separationReason;
  const state = {
    schemaVersion: 1,
    repository: 'l2v-hub/ClinicOS',
    batches: [
      {
        id: 'bug-batch-17',
        branch: 'codex/bug-batch-17',
        issues: [17],
        plan: group,
        phase: 'planned',
        implementation: [],
        reviews: [],
        sha: null,
        pr: null,
      },
    ],
  };
  const frozen = JSON.stringify(state);
  validateState(state, state.repository);
  assert.equal(JSON.stringify(state), frozen);
  for (const window of [
    { issues: [17], openedAt: 0, changedAt: 1 },
    { issues: [18, 18], openedAt: 0, changedAt: 1 },
    { issues: [18], openedAt: 2, changedAt: 1 },
    { issues: [18], openedAt: 0, changedAt: '1' },
  ])
    assert.throws(
      () => validateState({ ...state, triageQueue: window }, state.repository),
      /invalid triage collection/,
    );
});

test('plan accounts for every selected issue exactly once and permits explicit blocked items', () => {
  assert.equal(validatePlan(planFor(), selected()).groups.length, 1);

  const withBlocked = planFor([17]);
  withBlocked.blocked.push({ issue: 18, reason: 'Missing a reproducible example' });
  assert.equal(validatePlan(withBlocked, selected()).blocked[0].issue, 18);
});

test('plan rejects duplicated, missing, and unselected issue coverage', () => {
  const duplicate = planFor();
  duplicate.groups[0].issues.push(18);
  duplicate.groups[0].acceptance.push({ issue: 18, criteria: ['duplicate coverage'] });
  duplicate.groups[0].evidence.push({ ...duplicate.groups[0].evidence[1] });
  assert.throws(
    () => validatePlan(duplicate, selected()),
    /per-issue acceptance\/evidence coverage is incomplete|triage must account/,
  );

  const missing = planFor();
  missing.groups[0].issues = [17];
  missing.groups[0].acceptance = missing.groups[0].acceptance.slice(0, 1);
  missing.groups[0].evidence = missing.groups[0].evidence.slice(0, 1);
  missing.groups[0].fileMap = missing.groups[0].fileMap.slice(0, 1);
  assert.throws(() => validatePlan(missing, selected()), /triage must account/);

  const unexpected = planFor();
  unexpected.groups[0].issues[1] = 999;
  unexpected.groups[0].acceptance[1].issue = 999;
  unexpected.groups[0].evidence[1].issue = 999;
  unexpected.groups[0].fileMap[1].issue = 999;
  assert.throws(() => validatePlan(unexpected, selected()), /triage must account/);
});

test('plan rejects task files outside the declared editable scope', () => {
  const plan = planFor();
  plan.groups[0].tasks[0].files.push('frontend/src/features/patients/unrelated.ts');
  assert.throws(() => validatePlan(plan, selected()), /task outside declared file scope/);
});

test('editable paths reject credentials, automation control files, and path traversal', () => {
  for (const file of [
    'AGENTS.md',
    'frontend/AGENTS.md',
    'AGENTS.override.md',
    'CLAUDE.md',
    'CLAUDE.local.md',
    'backend/CLAUDE.md',
    '.codex/config.toml',
    'frontend/.codex/config.toml',
  ])
    assert.throws(() => editableFile(file), /outside implementation scope/);
  for (const file of [
    '.github/workflows/bug-pipeline.yml',
    '.agents/skills/codex-bug-triage/SKILL.md',
    '.env.production',
    'backend/credentials.json',
    'scripts/security/scan.mjs',
  ])
    assert.throws(() => editableFile(file), /outside implementation scope/);
  for (const file of [
    '../outside.ts',
    'frontend/../backend/file.ts',
    '/tmp/file.ts',
    'frontend\\file.ts',
    'frontend/$HOME.ts',
  ]) {
    assert.throws(() => relativeFile(file), /invalid relative path/);
  }
});

test('new plans require execution assessment while existing frozen state remains byte-for-byte unchanged', () => {
  const plan = planFor();
  delete plan.groups[0].execution;
  assert.throws(() => validatePlan(plan, selected()), /missing execution/);
  const group = plan.groups[0],
    lead = Math.min(...group.issues);
  const state = {
    schemaVersion: 1,
    repository: 'l2v-hub/ClinicOS',
    batches: [
      {
        id: `bug-batch-${lead}`,
        branch: `codex/bug-batch-${lead}`,
        issues: group.issues,
        plan: group,
        phase: 'planned',
        implementation: [],
        reviews: [],
        sha: null,
        pr: null,
      },
    ],
  };
  const before = JSON.stringify(state);
  validateState(state, state.repository);
  assert.equal(JSON.stringify(state), before);
  for (const invalid of [null, false, 0, '']) {
    group.execution = invalid;
    assert.throws(() => validateState(state, state.repository), /expected object/);
  }
});

test('plan requires screenshot and Playwright trace evidence for each source issue', () => {
  const missing = planFor();
  missing.groups[0].evidence.pop();
  assert.throws(
    () => validatePlan(missing, selected()),
    /per-issue acceptance\/evidence coverage is incomplete/,
  );

  const noScreenshot = planFor();
  noScreenshot.groups[0].evidence[0].screenshot = '';
  assert.throws(() => validatePlan(noScreenshot, selected()), /invalid relative path/);

  const noTrace = planFor();
  noTrace.groups[0].evidence[1].trace = 'artifacts/task-validation/bug-batch-17/evidence/trace.txt';
  assert.throws(() => validatePlan(noTrace, selected()), /evidence must be inside/);

  const wrongIssue = planFor();
  wrongIssue.groups[0].evidence[1].issue = 17;
  assert.throws(
    () => validatePlan(wrongIssue, selected()),
    /per-issue acceptance\/evidence coverage is incomplete/,
  );
});

test('Claude1 F1 canonical handback schema preserves legacy/stale grants but rejects malformed audit', () => {
  const state = {
    schemaVersion: 1,
    repository: 'l2v-hub/ClinicOS',
    batches: [],
    operatorTakeover: { active: true, nonce: 'new' },
  };
  assert.equal(validateState(state, state.repository), state);
  const valid = {
    enabled: true,
    mode: 'new-unclaimed-only',
    takeoverNonce: 'old',
    authorizedActor: 'maintainer',
    handedBackAt: '2026-10-22T00:00:00Z',
    protectedSubjects: [],
  };
  state.operatorTakeover.automation = valid;
  assert.equal(
    validateState(state, state.repository),
    state,
    'stale identity is valid data, but never grants authority',
  );
  for (const patch of [
    { takeoverNonce: '' },
    { authorizedActor: ' ' },
    { handedBackAt: '2026-02-30T00:00:00Z' },
    { handedBackAt: 'yesterday' },
    { protectedSubjects: [{ collection: 'unknown', id: 'x' }] },
    { enabled: 'true' },
  ]) {
    state.operatorTakeover.automation = { ...valid, ...patch };
    assert.throws(
      () => validateState(state, state.repository),
      /invalid operator automation handback/,
    );
  }
});
