import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  MAX_OPERATOR_SCHEDULES,
  OPERATOR_SCHEDULE_DAYS,
  OperatorScheduleInputError,
  boundStoredOperatorSchedules,
  operatorScheduleListQuery,
  parseOperatorScheduleInput,
} from '../schedule-contract.js';

function validBody() {
  return {
    turni: [...OPERATOR_SCHEDULE_DAYS].reverse().map((giorno) => ({
      giorno,
      oraInizio: '08:00',
      oraFine: '16:30',
      disponibile: giorno !== 'domenica',
    })),
    note: '  Turno standard  ',
  };
}

test('operator schedule input is canonical, bounded and complete', () => {
  const parsed = parseOperatorScheduleInput('operator-1', validBody());
  assert.deepEqual(
    parsed.turni.map((shift) => shift.giorno),
    OPERATOR_SCHEDULE_DAYS,
  );
  assert.equal(parsed.note, 'Turno standard');
  const overnight = validBody();
  overnight.turni[0] = { ...overnight.turni[0], oraInizio: '22:00', oraFine: '06:00' };
  assert.doesNotThrow(() => parseOperatorScheduleInput('operator-1', overnight));
});

test('operator schedule rejects malformed or oversized write payloads before Prisma', () => {
  const invalid: unknown[] = [
    null,
    { ...validBody(), extra: true },
    { ...validBody(), note: 42 },
    { ...validBody(), note: 'x'.repeat(2001) },
    { ...validBody(), turni: validBody().turni.slice(0, 6) },
    { ...validBody(), turni: [...validBody().turni, validBody().turni[0]] },
    { ...validBody(), turni: validBody().turni.map((shift) => ({ ...shift, extra: true })) },
    {
      ...validBody(),
      turni: validBody().turni.map((shift, index) =>
        index === 0 ? { ...shift, giorno: 'festivo' } : shift,
      ),
    },
    {
      ...validBody(),
      turni: validBody().turni.map((shift, index) =>
        index === 0 ? { ...shift, oraInizio: '25:00' } : shift,
      ),
    },
    {
      ...validBody(),
      turni: validBody().turni.map((shift, index) =>
        index === 0 ? { ...shift, disponibile: 'si' } : shift,
      ),
    },
  ];
  for (const body of invalid) {
    assert.throws(() => parseOperatorScheduleInput('operator-1', body), OperatorScheduleInputError);
  }
  assert.throws(
    () => parseOperatorScheduleInput('../operator', validBody()),
    OperatorScheduleInputError,
  );
  const duplicate = validBody();
  duplicate.turni[0] = { ...duplicate.turni[0], giorno: duplicate.turni[1].giorno };
  assert.throws(
    () => parseOperatorScheduleInput('operator-1', duplicate),
    OperatorScheduleInputError,
  );
});

test('operator schedule reads are projected, bounded, canonical and legacy-safe', () => {
  assert.deepEqual(operatorScheduleListQuery(), {
    select: { id: true, operatorId: true, data: true },
    orderBy: [{ operatorId: 'asc' }, { id: 'asc' }],
    take: MAX_OPERATOR_SCHEDULES + 1,
  });
  const valid = validBody();
  const rows = Array.from({ length: MAX_OPERATOR_SCHEDULES + 1 }, (_, index) => ({
    id: `schedule-${index}`,
    operatorId: `operator-${index}`,
    data: valid,
  }));
  rows[1].data = { turni: 'legacy-corrupt' } as never;
  const admin = boundStoredOperatorSchedules(rows, true);
  assert.equal(admin.overflow, true);
  assert.equal(admin.items.length, MAX_OPERATOR_SCHEDULES - 1);
  assert.equal(admin.invalidRows, 1);
  assert.equal(admin.items[0]?.note, 'Turno standard');
  const directory = boundStoredOperatorSchedules(rows.slice(0, 1), false);
  assert.equal(directory.items[0]?.note, '');
});

test('operator schedule routes validate writes and bound both list endpoints', () => {
  const source = readFileSync(new URL('../../routes/operators.ts', import.meta.url), 'utf8');
  assert.match(source, /parseOperatorScheduleInput\(operatorId, req\.body\)/);
  assert.match(source, /operatorScheduleListQuery\(\)/);
  assert.match(source, /boundStoredOperatorSchedules\(rows, false\)/);
  assert.match(source, /boundStoredOperatorSchedules\(rows, true\)/);
  assert.match(source, /res\.status\(409\)/);
});
