// Milo: motivi per cui una risposta del team non viene mostrata (diagnostica senza contenuti).
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ??= 'postgresql://unit:unit@127.0.0.1:1/unit_no_db';
const { teamRejection, acceptTeamAnswer } = await import('../assistant/team.js');

const source = { sourceType: 'VITAL_SIGN', patientId: 'p', recordId: 'r1', label: 'x' };
const grant = (sources: unknown[]) => ({ sources, results: [] }) as never;

test('rejection reasons', () => {
  assert.equal(teamRejection({ answerText: '' }, grant([source])), 'no_text');
  assert.equal(
    teamRejection({ answerText: 'PA 150/90.', citedSources: [source] as never }, grant([])),
    'no_reads',
  );
  assert.equal(
    teamRejection({ answerText: 'PA 150/90.', citedSources: [] }, grant([source])),
    'no_citations',
  );
  assert.equal(
    teamRejection(
      { answerText: 'PA 150/90.', citedSources: [{ ...source, recordId: 'x' }] as never },
      grant([source]),
    ),
    'ungrounded',
  );
  assert.equal(
    teamRejection(
      { answerText: 'Ho registrato la pressione.', citedSources: [source] as never },
      grant([source]),
    ),
    'action_claim',
  );
  assert.equal(
    teamRejection(
      { answerText: 'PA 150/90 [1].', citedSources: [source] as never },
      grant([source]),
    ),
    null,
  );
  assert.ok(
    acceptTeamAnswer(
      { answerText: 'PA 150/90 [1].', citedSources: [source] as never },
      grant([source]),
    ),
  );
});
