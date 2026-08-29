import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AppointmentWriteInputError,
  parseAppointmentCreateBody,
  parseAppointmentPatchBody,
} from '../write-validation.js';
import { toScheduledAt } from '../../services/appointment-service.js';

test('appointment writes accept bounded real values', () => {
  assert.deepEqual(
    parseAppointmentCreateBody({
      patientId: 'patient_1',
      operatorId: 'op-1',
      data: '2030-02-28',
      ora: '23:59',
      tipologia: 'Controllo',
      durata: 30,
      stato: 'programmato',
      note: 'nota',
      operatorName: 'ignored',
    }),
    {
      patientId: 'patient_1',
      operatorId: 'op-1',
      data: '2030-02-28',
      ora: '23:59',
      tipologia: 'Controllo',
      durata: 30,
      stato: 'programmato',
      note: 'nota',
    },
  );
  assert.deepEqual(parseAppointmentPatchBody({ ora: '08:05', note: '' }), {
    data: undefined,
    ora: '08:05',
    operatorId: undefined,
    tipologia: undefined,
    note: '',
    durata: undefined,
    stato: undefined,
  });
});

test('appointment wall-clock encoding is host-timezone and DST independent', () => {
  assert.equal(toScheduledAt('2030-03-31', '00:30').toISOString(), '2030-03-31T00:30:00.000Z');
  assert.equal(toScheduledAt('2030-10-27', '23:30').toISOString(), '2030-10-27T23:30:00.000Z');
});

for (const [label, body] of [
  ['impossible date', { patientId: 'p1', operatorId: 'o1', data: '2030-02-30', ora: '08:00' }],
  ['invalid time', { patientId: 'p1', operatorId: 'o1', data: '2030-02-28', ora: '25:00' }],
  [
    'coerced duration',
    { patientId: 'p1', operatorId: 'o1', data: '2030-02-28', ora: '08:00', durata: '30' },
  ],
  [
    'unknown field',
    { patientId: 'p1', operatorId: 'o1', data: '2030-02-28', ora: '08:00', admin: true },
  ],
  [
    'oversized note',
    { patientId: 'p1', operatorId: 'o1', data: '2030-02-28', ora: '08:00', note: 'x'.repeat(2001) },
  ],
] as const) {
  test(`appointment writes reject ${label}`, () => {
    assert.throws(() => parseAppointmentCreateBody(body), AppointmentWriteInputError);
  });
}
