import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  therapyWhereForAccess,
  therapyWhereForDate,
  therapyWhereForDueDate,
} from '../therapy-query.js';

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

test('therapy access scope is pushed into the database predicate', () => {
  const base = therapyWhereForDueDate('2030-06-15');
  assert.deepEqual(therapyWhereForAccess('2030-06-15', { registeredById: 'operator-1' }), {
    AND: [base, { patient: { registeredById: 'operator-1' } }],
  });
  assert.deepEqual(therapyWhereForAccess('2030-06-15', { patientIds: ['p1', 'p2'] }), {
    AND: [base, { patientId: { in: ['p1', 'p2'] } }],
  });
});

test('agenda weekday is filtered before keyset pagination', () => {
  assert.deepEqual(therapyWhereForDueDate('2030-06-15'), {
    AND: [
      therapyWhereForDate('2030-06-15'),
      {
        OR: [
          { giorniSettimana: null },
          { giorniSettimana: '' },
          { giorniSettimana: '6' },
          { giorniSettimana: { startsWith: '6,' } },
          { giorniSettimana: { endsWith: ',6' } },
          { giorniSettimana: { contains: ',6,' } },
        ],
      },
    ],
  });
});

test('weekday matching uses token boundaries instead of matching malformed day 10', () => {
  const where = JSON.stringify(therapyWhereForDueDate('2030-06-10'));
  assert.match(where, /"giorniSettimana":"1"/);
  assert.match(where, /"startsWith":"1,"/);
  assert.match(where, /"endsWith":",1"/);
  assert.match(where, /"contains":",1,"/);
  assert.doesNotMatch(where, /"contains":"1"/);
});

test('legacy weekday migration removes whitespace before tokenized paging is enabled', () => {
  const migration = readFileSync(
    new URL(
      '../../../../prisma/migrations/20260830010000_normalize_therapy_weekdays/migration.sql',
      import.meta.url,
    ),
    'utf8',
  );
  assert.match(migration, /regexp_replace\("giorniSettimana", '\[\[:space:\]\]\+', '', 'g'\)/);
  assert.match(migration, /NULLIF\([\s\S]*,\s*''\s*\)/);
});
