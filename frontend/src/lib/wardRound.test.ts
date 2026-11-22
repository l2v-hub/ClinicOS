// Milo fase 4: giro visita a voce — il parser divide la dettatura per paziente e riconosce i
// parametri; nulla è indovinato; nessuna scrittura senza conferma.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyDictation,
  draftIssue,
  draftRequest,
  italianNumber,
  normalizeDictation,
  parseRoundDictation,
  roundSummary,
  startRound,
  updateDraft,
  type RoundPatient,
} from './wardRound';

const roster: RoundPatient[] = [
  { id: 'p-rossi-m', lastName: 'Rossi', firstName: 'Mario', room: '12', bed: '1' },
  { id: 'p-rossi-a', lastName: 'Rossi', firstName: 'Anna', room: '12', bed: '2' },
  { id: 'p-bianchi', lastName: 'Bianchi', firstName: 'Luisa', room: '14', bed: '4' },
  { id: 'p-deluca', lastName: 'De Luca', firstName: 'Giovanni', room: '15', bed: '7' },
  { id: 'p-esposito', lastName: 'Esposito', firstName: 'Carla', room: '16', bed: '9' },
  { id: 'p-ferrari', lastName: 'Ferrari', firstName: 'Paolo', room: '16', bed: '10' },
];
let n = 0;
const ids = () => `id-${++n}`;
const at = new Date('2026-11-22T08:00:00.000Z');

test('Italian number words become digits (as the browser may transcribe them)', () => {
  assert.equal(italianNumber('trentasette'), 37);
  assert.equal(italianNumber('trentotto'), 38);
  assert.equal(italianNumber('centoquaranta'), 140);
  assert.equal(italianNumber('novantacinque'), 95);
  assert.equal(italianNumber('ventuno'), 21);
  assert.equal(italianNumber('uno'), null);
  assert.equal(italianNumber('pressione'), null);
  assert.equal(
    normalizeDictation('Temperatura trentasette e otto, saturazione novantasei%'),
    'temperatura 37 e 8 saturazione 96',
  );
});

test('AC1: five patients dictated in one session, in fragments, give five drafts with the right values', () => {
  let round = startRound(at);
  const fragments = [
    'Mario Rossi pressione 140 su 85, frequenza 92, saturazione 95 in aria ambiente, vigile.',
    'Temperatura 37,2.', // continua Mario Rossi
    'Signora Bianchi: PA 120/70 saturazione novantasei, temperatura trentasette e otto, frequenza respiratoria 18.',
    'Poi letto 7 glicemia 145, polso 76, confuso. Esposito saturazione 91 con ossigeno 2 litri,',
    'frequenza respiratoria 24 temperatura 38 e 5 risponde alla voce. Ferrari pressione 160/95 fc 110',
  ];
  for (const f of fragments) round = applyDictation(round, f, roster, at, ids);
  const byPatient = Object.fromEntries(round.drafts.map((d) => [d.patientId, d.values]));
  assert.equal(round.drafts.length, 5);
  assert.deepEqual(byPatient['p-rossi-m'], {
    pa: '140/85',
    fc: '92',
    spo2: '95',
    o2: 'no',
    coscienza: 'A',
    temperatura: '37,2',
  });
  assert.deepEqual(byPatient['p-bianchi'], {
    pa: '120/70',
    spo2: '96',
    temperatura: '37,8',
    fr: '18',
  });
  assert.deepEqual(byPatient['p-deluca'], { dtx: '145', fc: '76', coscienza: 'C' });
  assert.deepEqual(byPatient['p-esposito'], {
    spo2: '91',
    o2: 'si',
    fr: '24',
    temperatura: '38,5',
    coscienza: 'V',
  });
  assert.deepEqual(byPatient['p-ferrari'], { pa: '160/95', fc: '110' });
  assert.equal(round.unassigned.length, 0);
  // Nessuna bozza è già registrata: tutto aspetta la conferma.
  assert.ok(round.drafts.every((d) => d.status === 'bozza'));
  assert.ok(round.drafts.every((d) => draftIssue(d) === null));
});

test('AC3: ambiguous surname, unknown patient, text without patient and impossible values', () => {
  const ambiguous = parseRoundDictation('Rossi pressione 130/80', roster);
  assert.equal(ambiguous.segments[0].patientId, null);
  assert.deepEqual(ambiguous.segments[0].candidates, ['p-rossi-m', 'p-rossi-a']);
  assert.match(ambiguous.segments[0].notes[0], /più pazienti possibili/);

  const byBed = parseRoundDictation('Rossi letto 2 saturazione 97', roster);
  assert.equal(byBed.segments[0].patientId, 'p-rossi-a');

  const conflict = parseRoundDictation('Bianchi letto 9 saturazione 97', roster);
  assert.equal(conflict.segments[0].patientId, null);
  assert.deepEqual(conflict.segments[0].candidates, ['p-bianchi', 'p-esposito']);

  const unknown = parseRoundDictation('letto 30 saturazione 97', roster);
  assert.equal(unknown.segments[0].patientId, null);
  assert.match(unknown.segments[0].notes[0], /non trovato/);

  const orphan = parseRoundDictation('saturazione 97', roster);
  assert.equal(orphan.segments[0].patientId, null);
  assert.match(orphan.segments[0].notes.join(' '), /senza paziente/);

  const wrong = parseRoundDictation(
    'Ferrari pressione 120/800 temperatura 375 saturazione 97',
    roster,
  );
  assert.deepEqual(wrong.segments[0].values, { spo2: '97' });
  assert.match(wrong.segments[0].notes.join(' '), /PA 120\/800: valore impossibile/);

  const o2 = parseRoundDictation('Ferrari in aria poi in ossigeno', roster);
  assert.equal(o2.segments[0].values.o2, undefined);
  assert.match(o2.segments[0].notes.join(' '), /scegli tu/);
});

test('unassigned fragments go to the summary; a corrected value is noted', () => {
  let round = startRound(at);
  round = applyDictation(round, 'saturazione 97', roster, at, ids);
  round = applyDictation(round, 'Ferrari pressione 150/90', roster, at, ids);
  round = applyDictation(round, 'anzi pressione 145/90', roster, at, ids);
  const [draft] = round.drafts;
  assert.equal(draft.values.pa, '145/90');
  assert.match(draft.notes.join(' '), /PA aggiornata: 150\/90 → 145\/90/);
  assert.equal(round.unassigned.length, 1);
});

test('AC2/AC4: confirmation request carries only that patient values and a stable requestId', () => {
  let round = startRound(at);
  round = applyDictation(round, 'Ferrari pressione 150/90 saturazione 94', roster, at, ids);
  round = applyDictation(round, 'Bianchi temperatura 36,9', roster, at, ids);
  const ferrari = round.drafts[0];
  const req = draftRequest(ferrari);
  assert.deepEqual(req, {
    requestId: ferrari.requestId,
    measuredAt: '2026-11-22T08:00:00.000Z',
    values: { pa: '150/90', spo2: '94' },
  });
  // Errore di rete: la bozza resta, con lo stesso requestId per il nuovo tentativo.
  round = updateDraft(round, ferrari.key, { status: 'errore', error: 'rete' });
  assert.equal(draftRequest(round.drafts[0]).requestId, ferrari.requestId);
  round = updateDraft(round, ferrari.key, { status: 'registrato', error: undefined });
  // Un valore dettato dopo la registrazione apre una NUOVA bozza (nuova rilevazione).
  round = applyDictation(round, 'Ferrari saturazione 96', roster, at, ids);
  const summary = roundSummary(round);
  assert.deepEqual(
    summary.registered.map((d) => d.patientId),
    ['p-ferrari'],
  );
  assert.deepEqual(
    summary.pending.map((d) => [d.patientId, d.values]),
    [
      ['p-bianchi', { temperatura: '36,9' }],
      ['p-ferrari', { spo2: '96' }],
    ],
  );
  assert.notEqual(summary.pending[1].requestId, ferrari.requestId);
});

test('a hand-edited value goes through the Parametri page checks before confirmation', () => {
  let round = applyDictation(startRound(at), 'Ferrari saturazione 94', roster, at, ids);
  round = updateDraft(round, round.drafts[0].key, { values: { spo2: '940' } });
  assert.match(draftIssue(round.drafts[0]) ?? '', /SpO₂/);
  round = updateDraft(round, round.drafts[0].key, { values: { pa: '120-80' } });
  assert.match(draftIssue(round.drafts[0]) ?? '', /Pressione: usa il formato/);
});

test('an ambiguous fragment can be assigned by hand to one of the candidates', async () => {
  const { assignUnassigned } = await import('./wardRound');
  let round = applyDictation(startRound(at), 'Rossi pressione 130/80', roster, at, ids);
  assert.equal(round.unassigned.length, 1);
  round = assignUnassigned(round, 0, 'p-rossi-a', at, ids);
  assert.equal(round.unassigned.length, 0);
  assert.deepEqual(round.drafts[0].values, { pa: '130/80' });
  assert.equal(round.drafts[0].patientId, 'p-rossi-a');
  // Il frammento successivo senza nome continua lo stesso paziente.
  round = applyDictation(round, 'saturazione 97', roster, at, ids);
  assert.deepEqual(round.drafts[0].values, { pa: '130/80', spo2: '97' });
});
