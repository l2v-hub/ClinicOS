// Milo, caso d'uso 5: «va modificata la terapia e aggiunto un diuretico ogni 8 ore per 5 giorni e
// poi avvisami quando ha completato». Milo non prescrive: prepara il testo nella forma del flusso
// «Prepara prescrizione», chiede il farmaco se manca e passa la mano al medico.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchPrescriptionRequest, prescriptionHandoff } from '../actions/prescriptions.js';
import { planCommand, type AgnosOperatorContext } from '../actions/orchestrate.js';
import { parseDiaryTherapyText } from '../../therapies/diary-therapy-parse.js';
import { extractPrescriptionText, extractPatientQuery } from '../../skills/interpreter.js';
import type { UserContext } from '../gateway/types.js';

const TODAY = '2026-11-23';
const ENV = {} as NodeJS.ProcessEnv;
const CASE_5 =
  'A fronte di alcuni valori va modificata la terapia e aggiunto un diuretico ogni 8 ore per 5 giorni e poi registrami una notifica per avvisarmi che ha completato la terapia';
const FERRIOLI = { id: 'SEED-PAZ-001', firstName: 'Anna', lastName: 'Ferrioli' };
const lookup = {
  searchPatients: async (q: string) => (/ferrioli/i.test(q) ? [FERRIOLI] : []),
  getPatient: async (id: string) => (id === FERRIOLI.id ? FERRIOLI : null),
};
const gatewayCtx: UserContext = {
  userId: 'doc1',
  tenantId: 'default',
  roles: ['operatore'],
  permittedPatientIds: null,
  requestId: 'test',
};
const doctor: AgnosOperatorContext = { operatorId: 'doc1', operatorName: 'Medico 1', gatewayCtx };
const deps = {
  parameterLookup: lookup,
  now: () => new Date('2026-11-23T09:00:00.000Z'),
  env: ENV,
  runRead: async () => {
    throw new Error('la richiesta di prescrizione non deve diventare una lettura qualunque');
  },
  loadPreviewContext: async () => ({}),
};

test('«un diuretico» è una classe: Milo non sceglie il farmaco, propone orari e periodo', () => {
  const r = matchPrescriptionRequest(CASE_5, TODAY, ENV);
  assert.ok(r);
  assert.equal(r.drug, null);
  assert.equal(r.drugClass, 'diuretico');
  assert.equal(r.canonical, null);
  assert.deepEqual(r.times, ['06:00', '14:00', '22:00']);
  assert.equal(r.timesProposed, true);
  assert.deepEqual([r.from, r.to, r.days], ['2026-11-23', '2026-11-27', 5]);
  assert.equal(r.wantsCompletionAlert, true);
  assert.match(r.missing.join(' '), /«diuretico» è una classe, non un farmaco/);
  const h = prescriptionHandoff(r, 'Ferrioli Anna');
  assert.equal(h.message, null);
  assert.match(h.text, /Non scelgo io il farmaco/);
});

test('farmaco e dose nominati: testo nella forma che il flusso di prescrizione legge davvero', () => {
  const r = matchPrescriptionRequest(
    'prescrivi a Ferrioli furosemide 25 mg 1 cpr ogni 8 ore per 5 giorni e avvisami quando ha finito',
    TODAY,
    ENV,
  );
  assert.ok(r);
  assert.equal(r.canonical, 'Furosemide 25 mg 1 cpr ore 6, 14 e 22 dal 23/11 al 27/11');
  const parsed = parseDiaryTherapyText(r.canonical, TODAY);
  assert.equal(parsed.row.farmacoNome, 'FUROSEMIDE');
  assert.equal(parsed.row.dosaggio, '25 mg');
  assert.deepEqual(parsed.row.orari, ['06:00', '14:00', '22:00']);
  assert.deepEqual([parsed.row.dataInizio, parsed.row.dataFine], ['2026-11-23', '2026-11-27']);
  const h = prescriptionHandoff(r, 'Ferrioli Anna');
  assert.equal(
    h.message,
    'Prepara una prescrizione per Ferrioli Anna: «Furosemide 25 mg 1 cpr ore 6, 14 e 22 dal 23/11 al 27/11»',
  );
  // Lo stesso messaggio, letto dall'interprete del flusso «Prepara prescrizione».
  assert.equal(extractPrescriptionText(h.message), r.canonical);
  assert.equal(extractPatientQuery(h.message), 'Ferrioli Anna');
  assert.match(h.text, /Terapia completata/);
});

test('orari detti, orari configurati, intervallo senza orari standard', () => {
  const said = matchPrescriptionRequest(
    'aggiungi Lasix 25 mg per os alle 8 e 20 per 3 giorni',
    TODAY,
    ENV,
  );
  assert.equal(said?.canonical, 'Lasix 25 mg per os ore 8 e 20 dal 23/11 al 25/11');
  assert.equal(said?.timesProposed, false);
  const configured = matchPrescriptionRequest(
    'prescrivi furosemide 25 mg ogni 8 ore per 2 giorni',
    TODAY,
    { MILO_EVERY_8H: '07:00,15:00,23:00' } as NodeJS.ProcessEnv,
  );
  assert.deepEqual(configured?.times, ['07:00', '15:00', '23:00']);
  const odd = matchPrescriptionRequest('prescrivi furosemide 25 mg ogni 5 ore', TODAY, ENV);
  assert.equal(odd?.canonical, null);
  assert.match(odd?.missing.join(' ') ?? '', /ogni 5 ore/);
});

test('non è una prescrizione nuova: domande, modifiche, sospensioni, parametri', () => {
  for (const text of [
    'che terapia ha Bassi?',
    'modifica la terapia di Rossi',
    'sospendi il diuretico',
    'Aggiungi una nuova terapia con paracetamolo',
    'registra pressione 130/80 e battito 70',
    'quante camere sono occupate',
  ])
    assert.equal(matchPrescriptionRequest(text, TODAY, ENV), null, text);
});

test('pannello di Milo: tabella della prescrizione e pulsante verso il flusso del medico', async () => {
  const r = await planCommand(
    {
      text: 'prescrivi a Ferrioli furosemide 25 mg 1 cpr ogni 8 ore per 5 giorni e avvisami quando ha finito',
      channel: 'testo',
      operatorCtx: doctor,
    },
    deps,
  );
  assert.equal(r.preview, null);
  assert.equal(r.read?.intent, 'prescription_handoff');
  assert.equal(r.read?.results.length, 0);
  const [table, handoff] = r.read?.blocks ?? [];
  assert.equal(table.type, 'table');
  assert.deepEqual(
    table.type === 'table' ? table.rows.map((row) => `${row.campo}: ${row.valore}`) : [],
    [
      'Paziente: Ferrioli Anna',
      'Farmaco: Furosemide',
      'Dose: 25 mg',
      'Quantità: 1 cpr',
      'Orari: 06:00, 14:00, 22:00 (proposti per «ogni 8 ore»: modificabili)',
      'Periodo: dal 23/11 al 27/11 (5 giorni)',
      'Avviso a fine terapia: sì, automatico',
    ],
  );
  assert.equal(handoff.type, 'handoff');
  assert.equal(handoff.type === 'handoff' ? handoff.label : '', 'Prepara la prescrizione');
});

test('caso 5 alla lettera, paziente aperto: Milo chiede il farmaco e non offre il pulsante', async () => {
  const r = await planCommand(
    { text: CASE_5, channel: 'voce', currentPatientId: FERRIOLI.id, operatorCtx: doctor },
    deps,
  );
  assert.equal(r.read?.intent, 'prescription_handoff');
  assert.match(r.read?.answerText ?? '', /«diuretico» è una classe, non un farmaco/);
  assert.deepEqual(
    (r.read?.blocks ?? []).map((b) => b.type),
    ['table'],
  );
});

test('chi non può prescrivere riceve il rifiuto del ruolo, mai il testo preparato', async () => {
  const r = await planCommand(
    {
      text: 'prescrivi a Ferrioli furosemide 25 mg 1 cpr ogni 8 ore per 5 giorni',
      channel: 'testo',
      operatorCtx: { ...doctor, canPrescribe: false },
    },
    deps,
  );
  assert.equal(r.read, null);
  assert.equal(r.plan.actionType, 'refuse_forbidden');
  assert.match(r.preview?.refusal ?? '', /riservata al medico/);
});

test('cancellazioni e modifiche di una terapia esistente restano rifiuti', async () => {
  const del = await planCommand(
    { text: 'elimina il diuretico ogni 8 ore', channel: 'testo', operatorCtx: doctor },
    deps,
  );
  assert.equal(del.plan.actionType, 'refuse_forbidden');
  assert.equal(del.plan.refusalKind, 'delete');
  const change = await planCommand(
    { text: 'modifica la terapia di Rossi', channel: 'testo', operatorCtx: doctor },
    deps,
  );
  assert.equal(change.plan.actionType, 'refuse_forbidden');
  assert.equal(change.read, null);
});
