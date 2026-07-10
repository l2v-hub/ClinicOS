import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onDuty, weekdayIt } from '../../routes/operator-shifts.js';

test('weekdayIt: 2026-07-10 (venerdì) → ven', () => { assert.equal(weekdayIt('2026-07-10'), 'ven'); });

test('onDuty filtra per giorno e disponibilità', () => {
  const shifts = [
    { operatoreId: 'o1', operatoreNome: 'Rossi', giorno: 'ven', oraInizio: '08:00', oraFine: '20:00', disponibile: true },
    { operatoreId: 'o2', operatoreNome: 'Bianchi', giorno: 'ven', oraInizio: '08:00', oraFine: '20:00', disponibile: false },
    { operatoreId: 'o3', operatoreNome: 'Verdi', giorno: 'sab', oraInizio: '08:00', oraFine: '20:00', disponibile: true },
  ];
  const r = onDuty(shifts, 'ven');
  assert.equal(r.length, 1);
  assert.equal(r[0].operatoreNome, 'Rossi');
});
