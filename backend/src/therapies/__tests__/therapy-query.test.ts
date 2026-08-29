import { test } from 'node:test';
import assert from 'node:assert/strict';
import { therapyWhereForDate } from '../therapy-query.js';

test('therapy query bounds periodic and one-off therapies to the requested day', () => {
  assert.deepEqual(therapyWhereForDate('2030-06-15'), {
    stato: 'attiva',
    tipo: { not: 'al_bisogno' },
    OR: [
      { tipo: 'una_tantum', dataSomministrazione: '2030-06-15' },
      {
        tipo: { not: 'una_tantum' },
        dataInizio: { lte: '2030-06-15' },
        OR: [{ dataFine: null }, { dataFine: { gte: '2030-06-15' } }],
      },
    ],
  });
});
