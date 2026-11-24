import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dischargeConfirmMessage,
  dischargeDoneMessage,
  dischargeRecordLabel,
  isDischarged,
  parseDischargeResponse,
  readmitConfirmMessage,
} from '../patientDischarge';

test('only «dimesso» counts as discharged', () => {
  assert.equal(isDischarged({ statoRicovero: 'dimesso' }), true);
  for (const stato of ['ricoverato', 'ambulatoriale', 'day_hospital'] as const)
    assert.equal(isDischarged({ statoRicovero: stato }), false);
});

test('the server answer is accepted only for this patient and only with the «dimesso» status', () => {
  const answer = {
    patientId: 'p1',
    data: { statoRicovero: 'dimesso', diagnosiIngresso: 'x' },
    discharge: {
      alreadyDischarged: false,
      date: '2026-11-24',
      freedBeds: [{ room: '103', bed: 'A' }, { room: 7 }, null],
    },
  };
  assert.deepEqual(parseDischargeResponse('p1', answer), {
    data: answer.data,
    freedBeds: [{ room: '103', bed: 'A' }],
  });
  // The same answer is not a successful undo, and an undo answer is not a successful discharge.
  assert.equal(parseDischargeResponse('p1', answer, 'undo'), null);
  const undone = { patientId: 'p1', data: { statoRicovero: 'day_hospital' }, undo: {} };
  assert.deepEqual(parseDischargeResponse('p1', undone, 'undo'), {
    data: undone.data,
    freedBeds: [],
  });
  assert.equal(parseDischargeResponse('p1', undone), null);
  assert.equal(parseDischargeResponse('p2', answer), null);
  assert.equal(
    parseDischargeResponse('p1', { ...answer, data: { statoRicovero: 'ricoverato' } }),
    null,
  );
  assert.equal(parseDischargeResponse('p1', { ...answer, data: [] }), null);
  assert.equal(parseDischargeResponse('p1', null), null);
  assert.deepEqual(
    parseDischargeResponse('p1', { patientId: 'p1', data: { statoRicovero: 'dimesso' } }),
    { data: { statoRicovero: 'dimesso' }, freedBeds: [] },
  );
});

test('the confirmation says what happens and names the bed when there is one', () => {
  const withBed = dischargeConfirmMessage({
    patientName: 'Colombo Aldo',
    bedLabel: 'Camera 103 · Letto A',
    dischargeFormCompiled: true,
  });
  assert.match(withBed, /Colombo Aldo esce dalle liste dei presenti/);
  assert.match(withBed, /Camera 103 · Letto A\) viene liberato da oggi/);
  assert.match(withBed, /resta consultabile/);
  assert.doesNotMatch(withBed, /non è ancora compilata/);

  const bare = dischargeConfirmMessage({
    patientName: 'Colombo Aldo',
    bedLabel: null,
    dischargeFormCompiled: false,
  });
  assert.match(bare, /Non risulta un posto letto assegnato/);
  assert.match(bare, /scheda di dimissione non è ancora compilata/);
  assert.match(readmitConfirmMessage('Colombo Aldo'), /posto letto non viene riassegnato/);
});

test('the outcome names the freed bed; the record line says who discharged and when', () => {
  assert.equal(dischargeDoneMessage([]), 'Paziente dimesso: non compare più tra i presenti.');
  assert.match(
    dischargeDoneMessage([{ room: '103', bed: 'A' }]),
    /Posto letto liberato: Camera 103 · Letto A\.$/,
  );
  assert.equal(
    dischargeRecordLabel({
      dimissioneRegistrata: { data: '2026-11-24', operatore: 'Infermiere 1' },
    }),
    'Dimesso il 24/11/2026 da Infermiere 1',
  );
  assert.equal(
    dischargeRecordLabel({ dimissioneRegistrata: { data: '2026-11-24' } }),
    'Dimesso il 24/11/2026',
  );
  assert.equal(dischargeRecordLabel({}), null);
  assert.equal(dischargeRecordLabel({ dimissioneRegistrata: { data: 'ieri' } }), null);
});
