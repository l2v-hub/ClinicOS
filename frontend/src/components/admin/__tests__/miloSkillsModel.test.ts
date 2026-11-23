import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  diffInstructions,
  feedbackForSkill,
  instructionsInUse,
  instructionsProblem,
  openNegativeCount,
  parseInstructionLines,
  versionInUse,
} from '../role-permissions/miloSkillsModel';
import type { MiloFeedbackItem, MiloSkillVersion } from '../../../lib/miloSkillsApi';

const approved = { label: '1.2.0+r3', instructions: ['Approvata.'] } as MiloSkillVersion;

test('instructions in use: the approved version, otherwise the released ones', () => {
  assert.deepEqual(instructionsInUse({ approved: null, instructions: ['Rilasciata.'] }), [
    'Rilasciata.',
  ]);
  assert.deepEqual(instructionsInUse({ approved, instructions: ['Rilasciata.'] }), ['Approvata.']);
  assert.equal(versionInUse({ approved, releasedVersion: '1.2.0' }), '1.2.0+r3');
  assert.equal(versionInUse({ approved: null, releasedVersion: '1.2.0' }), '1.2.0 (rilasciata)');
  assert.equal(versionInUse({ approved: null, releasedVersion: null }), 'non disponibile');
});

test('one instruction per line; bullets and blank lines are dropped; limits are explained', () => {
  const lines = parseInstructionLines('- Prima istruzione.\n\n  • Seconda   istruzione.\nTerza.\n');
  assert.deepEqual(lines, ['Prima istruzione.', 'Seconda istruzione.', 'Terza.']);
  assert.equal(instructionsProblem(lines), null);
  assert.match(instructionsProblem([]) ?? '', /almeno una istruzione/);
  assert.match(instructionsProblem(Array(21).fill('x')) ?? '', /Al massimo 20/);
  assert.match(
    instructionsProblem(['ok', 'y'.repeat(701)]) ?? '',
    /riga 2 supera i 700 caratteri \(701\)/,
  );
});

test('proposal diff: unchanged and new lines in the proposed order, then the removed ones', () => {
  assert.deepEqual(diffInstructions(['A', 'B', 'C'], ['A', 'D', 'C']), [
    { line: 'A', change: 'same' },
    { line: 'D', change: 'added' },
    { line: 'C', change: 'same' },
    { line: 'B', change: 'removed' },
  ]);
});

test('feedback per specialist: members for specialists, every team answer for the coordinator', () => {
  const item = (id: string, patch: Partial<MiloFeedbackItem>): MiloFeedbackItem => ({
    id,
    rating: 'down',
    question: 'q',
    correction: null,
    mode: 'team',
    intent: null,
    members: [],
    tools: [],
    skillVersions: null,
    operatorName: null,
    operatorRole: 'nurse',
    status: 'open',
    createdAt: '2026-11-23T10:00:00.000Z',
    ...patch,
  });
  const feedback = [
    item('1', { members: ['clinico'] }),
    item('2', { members: ['struttura'], rating: 'up' }),
    item('3', { members: ['clinico'], status: 'used' }),
    item('4', { mode: 'deterministic' }),
  ];
  assert.deepEqual(
    feedbackForSkill(feedback, 'clinico').map((f) => f.id),
    ['1'],
  );
  assert.deepEqual(
    feedbackForSkill(feedback, 'coordinatore').map((f) => f.id),
    ['1', '2'],
  );
  assert.equal(openNegativeCount(feedback), 2);
});
