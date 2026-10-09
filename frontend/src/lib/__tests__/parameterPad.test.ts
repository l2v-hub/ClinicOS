// Rilevazione rapida: pressione in due campi salvata come "sis/dia", tastierino, valori precedenti.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyPadKey,
  joinPa,
  nextPadField,
  padUpdate,
  padValue,
  previousText,
  previousValues,
  padInput,
  type PadField,
  splitPa,
  whenLabel,
} from '../parameterPad';
import {
  parameterValuesError,
  type ParameterValues,
  type PatientParameterReading,
} from '../patientParameterReadings';
import { news2 } from '../news2';

test('blood pressure is split for the two cards and saved as the usual single value', () => {
  assert.deepEqual(splitPa('148/86'), { pas: '148', pad: '86' });
  assert.deepEqual(splitPa('148 / 86'), { pas: '148', pad: '86' });
  assert.deepEqual(splitPa('148'), { pas: '148', pad: '' });
  assert.deepEqual(splitPa(undefined), { pas: '', pad: '' });
  assert.equal(joinPa('148', '86'), '148/86');
  assert.equal(joinPa('', ''), '');
  let values = {};
  const [k1, v1] = padUpdate(values, 'pas', '148');
  values = { [k1]: v1 };
  const [k2, v2] = padUpdate(values, 'pad', '86');
  assert.equal(k2, 'pa');
  assert.equal(v2, '148/86');
  assert.equal(padValue({ pa: v2 }, 'pad'), '86');
  assert.equal(parameterValuesError({ pa: v2 }), null);
  // Un solo lato compilato non passa la validazione di sempre (nessun dato inventato).
  assert.equal(
    parameterValuesError({ pa: joinPa('148', '') }),
    'Pressione: usa il formato 120/80.',
  );
  assert.equal(padUpdate({}, 'fr', '24')[0], 'fr');
});

test('keypad: digits, one comma only in decimal fields, delete', () => {
  assert.equal(applyPadKey('3', '8', true), '38');
  assert.equal(applyPadKey('38', ',', true), '38,');
  assert.equal(applyPadKey('38,', ',', true), '38,');
  assert.equal(applyPadKey('', ',', true), '');
  assert.equal(applyPadKey('24', ',', false), '24');
  assert.equal(applyPadKey('38,2', 'back', true), '38,');
  assert.equal(applyPadKey('123456', '7', true), '123456');
  assert.equal(nextPadField('fr'), 'spo2');
  assert.equal(nextPadField('pas'), 'pad');
  assert.equal(nextPadField('dtx'), null);
});

test('previous values come from the latest reading that has each field', () => {
  const reading = (measuredAt: string, values: PatientParameterReading['values']) =>
    ({
      id: measuredAt,
      requestId: measuredAt,
      patientId: 'p',
      measuredAt,
      values,
    }) as PatientParameterReading;
  const prev = previousValues([
    reading('2026-09-27T06:05:00.000Z', { fr: '24', pa: '148/86' }),
    reading('2026-09-27T08:00:00.000Z', { spo2: '95', o2: 'si' }),
    reading('2026-09-26T08:00:00.000Z', { fr: '18', temperatura: '38,2' }),
  ]);
  assert.equal(prev.fr?.value, '24');
  assert.equal(prev.spo2?.value, '95');
  assert.equal(prev.pas?.value, '148');
  assert.equal(prev.pad?.value, '86');
  assert.equal(prev.temperatura?.value, '38,2');
  assert.equal(prev.o2?.value, 'si');
  assert.equal(prev.fc, undefined);
});

test('time label is facility time, with the date only for previous days', () => {
  const now = new Date('2026-09-27T10:00:00.000Z');
  assert.equal(whenLabel('2026-09-27T06:05:00.000Z', now), '08:05');
  assert.equal(whenLabel('2026-09-26T06:05:00.000Z', now), '26/09 08:05');
  assert.equal(whenLabel('non-una-data', now), '');
});

test('live NEWS2 of the prototype example is 6 only when all seven are present', () => {
  const full = {
    fr: '24',
    spo2: '92',
    o2: 'no',
    pa: '148/86',
    fc: '108',
    coscienza: 'A',
    temperatura: '38,2',
  };
  assert.equal(news2(full).total, 6);
  assert.equal(news2(full).complete, true);
  const partial = news2({ ...full, coscienza: '' });
  assert.equal(partial.complete, false);
  assert.deepEqual(partial.missing, ['coscienza']);
});

/** Simula la digitazione carattere per carattere nel campo (come un onChange per tasto). */
function typeInto(key: PadField, text: string, start: ParameterValues = {}): ParameterValues {
  let values = { ...start };
  let current: PadField = key;
  for (const ch of text) {
    const next = padInput(values, current, padValue(values, current) + ch);
    if (!next) continue;
    values = { ...values, [next.field]: next.value };
    if (next.split) current = 'pad';
  }
  return values;
}

test('typed, pasted or dictated text is kept exactly: never a different valid number', () => {
  // digitato un carattere alla volta
  assert.equal(typeInto('temperatura', '37°5').temperatura, '37°5');
  assert.equal(typeInto('temperatura', '3,8,2').temperatura, '3,8,2');
  assert.equal(typeInto('fc', '1O8').fc, '1O8');
  assert.equal(typeInto('fr', '2.4').fr, '2.4');
  assert.equal(typeInto('dtx', '>600').dtx, '>600');
  // incollato o dettato in un colpo solo
  const paste = (key: PadField, text: string) => padInput({}, key, text);
  assert.equal(paste('spo2', 'SpO2 98')?.value, 'SpO2 98');
  assert.equal(paste('dtx', '6,1 mmol/L')?.value, '6,1 mmol/L');
  assert.equal(paste('temperatura', '-1')?.value, '-1');
  // la validazione di sempre li rifiuta tutti
  for (const values of [
    { temperatura: '37°5' },
    { temperatura: '3,8,2' },
    { fc: '1O8' },
    { dtx: '>600' },
    { spo2: 'SpO2 98' },
    { dtx: '6,1 mmol/L' },
    { temperatura: '-1' },
  ])
    assert.notEqual(parameterValuesError(values), null, JSON.stringify(values));
  assert.match(parameterValuesError({ fr: '2.4' }) ?? '', /Frequenza respiratoria/);
  // numeri puliti passano come sono
  assert.equal(typeInto('temperatura', '37.5').temperatura, '37.5');
  assert.equal(parameterValuesError({ temperatura: '37.5', spo2: '98', fc: '108' }), null);
});

test('systolic splits on the first slash without dropping anything', () => {
  assert.equal(typeInto('pas', '120/80').pa, '120/80');
  assert.equal(padInput({}, 'pas', '120/100')?.value, '120/100');
  assert.equal(padInput({}, 'pas', '120/80/70')?.value, '120/80/70');
  assert.notEqual(parameterValuesError({ pa: '120/80/70' }), null);
  assert.equal(padInput({}, 'pas', '/'), null);
  assert.equal(padInput({ pa: '/86' }, 'pas', '130/')?.value, '130/86');
  assert.notEqual(parameterValuesError({ pa: padInput({}, 'pas', 'PA 120/100')!.value }), null);
});

test('"Prima" never claims an absence that the unread history could contradict', () => {
  const values = previousValues([
    {
      id: 'r',
      requestId: 'r',
      patientId: 'p',
      measuredAt: '2026-09-27T06:05:00.000Z',
      values: { fr: '24' },
    } as PatientParameterReading,
  ]);
  const now = new Date('2026-09-27T10:00:00.000Z');
  assert.equal(
    previousText({ status: 'ready', values, hasMore: false, count: 1 }, 'fr', now),
    'Prima: 24 · Misurato il 27/09/2026 08:05 · 3 ore fa',
  );
  assert.equal(
    previousText({ status: 'ready', values, hasMore: false, count: 1 }, 'dtx', now),
    'Nessuna rilevazione precedente',
  );
  assert.equal(
    previousText({ status: 'ready', values, hasMore: true, count: 50 }, 'dtx', now),
    'Prima: non fra le ultime 50 rilevazioni',
  );
  assert.equal(previousText({ status: 'error' }, 'fr', now), 'Precedente non disponibile');
  assert.equal(previousText({ status: 'loading' }, 'fr', now), 'Prima: …');
});
