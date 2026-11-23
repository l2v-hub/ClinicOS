// Milo, caso d'uso 4: «Registra del paziente … pressione, ha evacuato, stato vigile, battito».
// Parser deterministico → anteprima con tutti i valori e l'orario → conferma → scrittura con il
// servizio della pagina Parametri. Nessun database: ricerca pazienti e writer sono iniettati.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDictatedParameters } from '../actions/parameter-dictation.js';
import { matchParameterCommand, patientQueryOf } from '../actions/parameters.js';
import { planCommand, executeCommand, type AgnosOperatorContext } from '../actions/orchestrate.js';
import { planAction } from '../voice/plan.js';
import { VoiceError, type VoiceWriter } from '../voice/execute.js';
import { IdempotencyStore } from '../voice/idempotency.js';
import { loadVoiceConfig } from '../voice/config.js';
import { isActionAllowed } from '../actions/catalog.js';
import type { UserContext } from '../gateway/types.js';

const BASSI = { id: 'SEED-PAZ-003', firstName: 'Carla', lastName: 'Bassi' };
const lookup = () => ({
  searchPatients: async (q: string) => (/bassi/i.test(q) ? [BASSI] : []),
  getPatient: async (id: string) => (id === BASSI.id ? BASSI : null),
});
const gatewayCtx: UserContext = {
  userId: 'op1',
  tenantId: 'default',
  roles: ['operatore'],
  permittedPatientIds: null,
  requestId: 'test',
};
const operatorCtx: AgnosOperatorContext = {
  operatorId: 'op1',
  operatorName: 'Inf. Demo',
  gatewayCtx,
};
const CASE_4 =
  'Registra del paziente Bassi pressione 130 su 80, ha evacuato, stato vigile, battito 78';

function fakeWriter() {
  const writes: Array<{ patientId: string; fields: Record<string, unknown> }> = [];
  const refuse = async (): Promise<never> => {
    throw new Error('writer sbagliato');
  };
  const w: VoiceWriter = {
    createVitalSign: refuse,
    updateDemographics: refuse,
    appendNarrative: refuse,
    addDiaryNote: refuse,
    createAppointment: refuse,
    updateAppointment: refuse,
    createConsegna: refuse,
    async createParameterReading(patientId, fields) {
      const replayed = writes.length > 0;
      if (!replayed) writes.push({ patientId, fields: { ...fields } });
      return { id: 'reading-1', replayed };
    },
  };
  return { w, writes };
}
const execDeps = (w: VoiceWriter) => ({
  cfg: loadVoiceConfig({} as NodeJS.ProcessEnv),
  writer: w,
  store: new IdempotencyStore(),
  env: {} as NodeJS.ProcessEnv,
  nowISO: '2026-11-23T09:15:42.731Z', // 10:15 ora della struttura
  parameterLookup: lookup(),
});

test('dettatura: pressione, evacuazione, coscienza e battito in una frase', () => {
  const p = parseDictatedParameters(CASE_4);
  assert.deepEqual(p.values, { pa: '130/80', fc: '78', evacuazione: 'Sì', coscienza: 'A' });
  assert.deepEqual(p.mentioned, ['pa', 'fc', 'coscienza', 'evacuazione']);
  assert.deepEqual(p.problems, []);
});

test('dettatura: numeri in parole, negazioni, ossigeno e temperatura', () => {
  const p = parseDictatedParameters(
    'pressione centotrenta su ottanta, frequenza settantotto, saturazione 96 in aria ambiente, temperatura 37,4, non ha evacuato, confusa',
  );
  assert.deepEqual(p.values, {
    pa: '130/80',
    fc: '78',
    spo2: '96',
    temperatura: '37.4',
    o2: 'no',
    evacuazione: 'No',
    coscienza: 'C',
  });
  assert.deepEqual(p.problems, []);
});

test('dettatura: il parametro nominato senza valore blocca, il valore impossibile non si salva', () => {
  const missing = parseDictatedParameters('registra pressione, ha evacuato, stato vigile, battito');
  assert.deepEqual(missing.values, { evacuazione: 'Sì', coscienza: 'A' });
  assert.deepEqual(missing.problems, [
    'Pressione: manca il valore',
    'Frequenza cardiaca: manca il valore',
  ]);
  const wrong = parseDictatedParameters('pressione 130 su 800, battito 78');
  assert.equal(wrong.values.pa, undefined);
  assert.equal(wrong.values.fc, '78');
  assert.match(wrong.problems.join(' '), /Pressione 130\/800: valore impossibile/);
  const both = parseDictatedParameters('ha evacuato, non ha evacuato, vigile');
  assert.equal(both.values.evacuazione, undefined);
  assert.match(both.problems.join(' '), /Evacuazione: detto sia sì sia no/);
});

test('paziente nominato: titoli, preposizioni, mai una parola dei parametri', () => {
  assert.equal(patientQueryOf(CASE_4), 'Bassi');
  assert.equal(
    patientQueryOf('registra alla signora Colombo Teresa battito 80, vigile'),
    'Colombo Teresa',
  );
  assert.equal(patientQueryOf('registra paziente bassi pressione 120/70 e battito 70'), 'bassi');
  assert.equal(patientQueryOf('registra per Ricci pressione 120/70, ha evacuato'), 'Ricci');
  assert.equal(patientQueryOf('registra pressione 120/70 e battito 70, vigile'), null);
  assert.equal(patientQueryOf('Registra Pressione 120/70 di Battito 70'), null);
});

test('il comando è riconosciuto solo quando serve: un parametro solo resta al comando storico', () => {
  assert.equal(matchParameterCommand('registra pressione 130/80 alle 9'), null);
  assert.equal(planAction('registra pressione 130/80 alle 9').actionType, 'create_vital_sign');
  assert.equal(matchParameterCommand('come va la pressione e il battito di Bassi?'), null);
  assert.equal(
    matchParameterCommand('aggiungi una nota al diario: pressione 130/80, vigile, ha evacuato'),
    null,
  );
  const evac = matchParameterCommand('registra che ha evacuato', { currentPatientId: 'p1' });
  assert.equal(evac?.actionType, 'create_parameter_reading');
  assert.equal(evac?.patientId, 'p1');
  const noPatient = matchParameterCommand('registra pressione 120/70 e battito 70');
  assert.ok(noPatient?.ambiguities.some((a) => /Paziente non identificato/.test(a)));
  assert.equal(isActionAllowed('create_parameter_reading', {} as NodeJS.ProcessEnv), true);
});

test('anteprima: tutti i valori, orario esplicito, paziente risolto per nome', async () => {
  const r = await planCommand(
    { text: CASE_4, channel: 'testo', operatorCtx },
    { parameterLookup: lookup() },
  );
  assert.equal(r.plan.actionType, 'create_parameter_reading');
  assert.equal(r.plan.patientId, BASSI.id);
  assert.equal(r.read, null);
  assert.ok(r.preview);
  assert.equal(r.preview.title, 'Registra parametri');
  assert.equal(r.preview.patientName, 'Bassi Carla');
  assert.equal(r.preview.canExecute, true);
  assert.deepEqual(
    r.preview.lines.map((l) => `${l.label}: ${l.value}`),
    [
      'Pressione: 130/80 mmHg',
      'Frequenza cardiaca: 78 bpm',
      'Coscienza: Vigile (A)',
      'Evacuazione: Sì',
      'Orario: adesso (ora della conferma)',
      'Dove: Pagina Parametri del paziente',
    ],
  );
});

test('anteprima bloccata: valore mancante, paziente non trovato, orario nel futuro', async () => {
  const missing = await planCommand(
    {
      text: 'Registra del paziente Bassi pressione, ha evacuato, stato vigile, battito',
      channel: 'voce',
      operatorCtx,
    },
    { parameterLookup: lookup() },
  );
  assert.equal(missing.preview?.canExecute, false);
  assert.deepEqual(missing.preview?.ambiguities, [
    'Pressione: manca il valore',
    'Frequenza cardiaca: manca il valore',
  ]);
  const unknown = await planCommand(
    { text: CASE_4.replace('Bassi', 'Sconosciuto'), channel: 'testo', operatorCtx },
    { parameterLookup: lookup() },
  );
  assert.equal(unknown.preview?.canExecute, false);
  assert.ok(unknown.plan.ambiguities.some((a) => /non trovato/.test(a)));
  const { w, writes } = fakeWriter();
  await assert.rejects(
    executeCommand(
      {
        text: `${CASE_4} alle 23:50`,
        channel: 'testo',
        idempotencyKey: 'k-future',
        confirmed: true,
        operatorCtx,
      },
      execDeps(w),
    ),
    (e: unknown) =>
      e instanceof VoiceError && e.kind === 'ambiguous' && /nel futuro/.test(e.message),
  );
  assert.equal(writes.length, 0);
});

test('conferma: una sola rilevazione con tutti i valori, orario della conferma, niente doppioni', async () => {
  const { w, writes } = fakeWriter();
  const deps = execDeps(w);
  const input = {
    text: CASE_4,
    channel: 'testo' as const,
    idempotencyKey: 'k-case4',
    confirmed: true,
    operatorCtx,
  };
  const r1 = await executeCommand(input, deps);
  assert.equal(r1.ok, true);
  assert.equal(r1.actionType, 'create_parameter_reading');
  assert.equal(r1.recordId, 'reading-1');
  assert.equal(r1.deduped, false);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].patientId, BASSI.id);
  assert.deepEqual(writes[0].fields.values, {
    pa: '130/80',
    fc: '78',
    evacuazione: 'Sì',
    coscienza: 'A',
  });
  assert.equal(writes[0].fields.measuredAt, '2026-11-23T09:15:42.000Z');
  const r2 = await executeCommand(input, deps);
  assert.equal(r2.deduped, true);
  assert.equal(writes.length, 1);
});

test('conferma con orario detto: oggi alle 08:30 ora della struttura', async () => {
  const { w, writes } = fakeWriter();
  await executeCommand(
    {
      text: `${CASE_4} alle 8:30`,
      channel: 'voce',
      idempotencyKey: 'k-time',
      confirmed: true,
      operatorCtx,
    },
    execDeps(w),
  );
  assert.equal(writes[0].fields.measuredAt, '2026-11-23T07:30:00.000Z');
});

test('senza conferma o senza permesso del ruolo non si scrive', async () => {
  const { w, writes } = fakeWriter();
  await assert.rejects(
    executeCommand(
      {
        text: 'registra pressione 130 su 80, ha evacuato, stato vigile, battito 78',
        channel: 'testo',
        patientId: BASSI.id,
        idempotencyKey: 'k-no',
        confirmed: false,
        operatorCtx,
      },
      execDeps(w),
    ),
    (e: unknown) => e instanceof VoiceError && e.kind === 'confirmation_required',
  );
  await assert.rejects(
    executeCommand(
      {
        text: CASE_4,
        channel: 'testo',
        idempotencyKey: 'k-role',
        confirmed: true,
        operatorCtx: { ...operatorCtx, allowsAction: (a) => a !== 'create_parameter_reading' },
      },
      execDeps(w),
    ),
    (e: unknown) => e instanceof VoiceError && e.kind === 'capability_denied',
  );
  assert.equal(writes.length, 0);
});
