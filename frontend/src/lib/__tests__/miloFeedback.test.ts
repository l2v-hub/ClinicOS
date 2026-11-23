import { test } from 'node:test';
import assert from 'node:assert/strict';
import { miloFeedbackBody } from '../miloFeedback';

const TEAM = {
  intent: 'patient_status',
  mode: 'team',
  answerText: 'La saturazione è 93% [1].',
  results: [{ valore: 'segreto' }],
  team: {
    members: ['clinico', 'sorveglianza'],
    tools: ['get_patient_parameters', 'get_patient_parameters', 'get_patient_news2'],
    skills: { clinico: '1.2.0' },
  },
};

test('feedback carries the question and the answer metadata, never its content', () => {
  const body = miloFeedbackBody(
    'a1b2c3d4-0000',
    '  Come va Bassi?  ',
    TEAM,
    'down',
    ' mancava la SpO₂ ',
  );
  assert.deepEqual(body, {
    answerId: 'a1b2c3d4-0000',
    rating: 'down',
    question: 'Come va Bassi?',
    correction: 'mancava la SpO₂',
    mode: 'team',
    intent: 'patient_status',
    members: ['clinico', 'sorveglianza'],
    tools: ['get_patient_parameters', 'get_patient_news2'],
    skillVersions: { clinico: '1.2.0' },
  });
  assert.ok(!JSON.stringify(body).includes('93%'));
  assert.ok(!JSON.stringify(body).includes('segreto'));
});

test('a positive rating never sends a correction; the classic path reports its planned reads', () => {
  const body = miloFeedbackBody(
    'a1b2c3d4-0001',
    'quante camere?',
    {
      intent: 'rooms_occupancy',
      mode: 'deterministic',
      plan: { tools: [{ tool: 'query_rooms_occupancy' }] },
    },
    'up',
    'testo ignorato',
  );
  assert.equal('correction' in body, false);
  assert.deepEqual(body.tools, ['query_rooms_occupancy']);
  assert.deepEqual(body.members, []);
  assert.equal('skillVersions' in body, false);
});

test('question and correction are bounded', () => {
  const body = miloFeedbackBody('a1b2c3d4-0002', 'q'.repeat(900), {}, 'down', 'c'.repeat(3000));
  assert.equal(body.question.length, 500);
  assert.equal(body.correction?.length, 1000);
});
