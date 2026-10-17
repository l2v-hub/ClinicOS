import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildInvioPSModel } from '../invioPSModel';
import type { Paziente, CartellaPaziente, PatientTherapyAPI, Diagnosi } from '../../../types';
// ── Test fixtures ──────────────────────────────────────────────────────────────

const PAZIENTE: Paziente = {
  id: 'p-001',
  medicalRecordNumber: 'MRN-999',
  firstName: 'Mario',
  lastName: 'Rossi',
  dateOfBirth: '1950-03-15',
  sex: 'M',
  email: null,
  phone: null,
};

function makeCartella(overrides: Partial<CartellaPaziente> = {}): CartellaPaziente {
  return {
    pazienteId: PAZIENTE.id,
    statoRicovero: 'ricoverato',
    cameraNumero: '12',
    lettoNumero: 'A',
    anamnesi: {
      fisiologica: '',
      patologicaRemota: '',
      patologicaProssima: '',
      familiare: '',
      lavorativa: '',
      abitudini: '',
      note: '',
      updatedAt: '',
      operatore: '',
    },
    diagnosi: [],
    terapie: [],
    farmaci: [],
    allergie: [],
    noteClinica: [],
    visite: [],
    parametriVitali: [],
    interventi: [],
    pianoCura: {
      obiettivi: '',
      interventiPrevisti: '',
      notePianificazione: '',
      dataAggiornamento: '',
      operatore: '',
    },
    indicatoriRischio: [],
    documentiConsegnati: [],
    diarioInfermieristico: [],
    diarioMedico: [],
    medicazioniFerite: [],
    contenzioni: [],
    valutazioniBraden: [],
    ...overrides,
  };
}

const DIMISSIONE_FIXTURE: NonNullable<CartellaPaziente['dimissione']> = {
  data: '2026-06-22',
  ora: '14:30',
  condizioni: 'buone',
  destinazione: 'domicilio',
  autonomiaResidua: 'Parziale',
  pianoCuraConsegnato: true,
  istruzioni: 'Riposo',
  controlliProgrammati: 'Visita tra 7 giorni',
  personaAccompagna: 'Figlio',
  mezzoTrasporto: 'Auto',
  materialeConsegnato: 'Piano cura',
  operatore: 'Inf. Bianchi',
  note: 'Nessuna nota',
  compilatoAt: '2026-06-22T14:30:00.000Z',
};

function makeTherapy(overrides: Partial<PatientTherapyAPI> = {}): PatientTherapyAPI {
  return {
    id: 'th-001',
    patientId: PAZIENTE.id,
    farmacoNome: 'Paracetamolo',
    dosaggio: '500mg',
    viaSomministrazione: 'orale',
    tipo: 'periodica',
    stato: 'attiva',
    dataInizio: '2026-06-01',
    dataFine: null,
    fasceMattina: true,
    fascePranzo: false,
    fascePomeriggio: false,
    fasceSera: true,
    fasceNotte: false,
    orarioSpecifico: null,
    prescrittore: null,
    operatoreInseritore: null,
    note: null,
    dataSomministrazione: null,
    orarioSomministrazione: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test('(a) populated dimissione + therapies → model has correct patient name/MRN and non-null dimissione', () => {
  const cartella = makeCartella({ dimissione: DIMISSIONE_FIXTURE });
  const therapy = makeTherapy();
  const model = buildInvioPSModel(PAZIENTE, cartella, [therapy]);

  assert.equal(model.patient.cognomeNome, 'Rossi Mario');
  assert.equal(model.patient.mrn, 'MRN-999');
  assert.ok(model.dimissione !== null, 'dimissione should not be null');
  assert.equal(model.dimissione!.destinazione, 'Domicilio');
  assert.equal(model.dimissione!.ora, '14:30');
  assert.equal(model.terapie.length, 1);
  assert.equal(model.terapie[0].farmaco, 'Paracetamolo');
});

test('(a) patient name and MRN come from input paziente (scoping check)', () => {
  const otherPaziente: Paziente = {
    id: 'p-999',
    medicalRecordNumber: 'MRN-ALTRA',
    firstName: 'Luigi',
    lastName: 'Verdi',
    dateOfBirth: '1960-01-01',
    sex: 'M',
    email: null,
    phone: null,
  };
  const cartella = makeCartella({ pazienteId: otherPaziente.id });
  const model = buildInvioPSModel(otherPaziente, cartella, []);
  assert.equal(model.patient.cognomeNome, 'Verdi Luigi');
  assert.equal(model.patient.mrn, 'MRN-ALTRA');
});

test('(b) cartella.dimissione undefined → dimissione is null, no crash', () => {
  const cartella = makeCartella(); // no dimissione
  const model = buildInvioPSModel(PAZIENTE, cartella, []);
  assert.equal(model.dimissione, null);
  assert.equal(model.terapie.length, 0);
});

test('(c) only active therapies appear in terapie', () => {
  const active = makeTherapy({ id: 'th-a', stato: 'attiva', farmacoNome: 'Attivo' });
  const sospesa = makeTherapy({ id: 'th-s', stato: 'sospesa', farmacoNome: 'Sospeso' });
  const conclusa = makeTherapy({ id: 'th-c', stato: 'conclusa', farmacoNome: 'Concluso' });
  const cartella = makeCartella();
  const model = buildInvioPSModel(PAZIENTE, cartella, [active, sospesa, conclusa]);
  assert.equal(model.terapie.length, 1);
  assert.equal(model.terapie[0].farmaco, 'Attivo');
});

test('(c) empty therapies array → terapie is empty', () => {
  const cartella = makeCartella();
  const model = buildInvioPSModel(PAZIENTE, cartella, []);
  assert.deepEqual(model.terapie, []);
});

test('(c) fasce labels built correctly for active therapy', () => {
  const t = makeTherapy({
    fasceMattina: true,
    fasceSera: true,
    fasceNotte: false,
    fascePranzo: false,
    fascePomeriggio: false,
  });
  const model = buildInvioPSModel(PAZIENTE, makeCartella(), [t]);
  assert.equal(model.terapie[0].fasce, 'Mattina, Sera');
});

test('(c) orarioSpecifico takes priority over fasce labels', () => {
  const t = makeTherapy({ fasceMattina: true, orarioSpecifico: '08:00,20:00' });
  const model = buildInvioPSModel(PAZIENTE, makeCartella(), [t]);
  assert.equal(model.terapie[0].fasce, '08:00,20:00');
});

test('(d) allergie mapped with testo and grave flag', () => {
  const cartella = makeCartella({
    allergie: [
      {
        id: 'a1',
        allergene: 'Penicillina',
        reazione: 'Shock anafilattico',
        gravita: 'grave',
        documentato: '',
        documentatoDa: '',
      },
      {
        id: 'a2',
        allergene: 'Lattosio',
        reazione: '',
        gravita: 'lieve',
        documentato: '',
        documentatoDa: '',
      },
    ],
  });
  const model = buildInvioPSModel(PAZIENTE, cartella, []);
  assert.equal(model.patient.allergie.length, 2);
  assert.equal(model.patient.allergie[0].testo, 'Penicillina (Shock anafilattico)');
  assert.equal(model.patient.allergie[0].grave, true);
  assert.equal(model.patient.allergie[1].testo, 'Lattosio');
  assert.equal(model.patient.allergie[1].grave, false);
});

test('(d) no allergie → empty array with separately explicit verification status', () => {
  const model = buildInvioPSModel(PAZIENTE, makeCartella(), []);
  assert.deepEqual(model.patient.allergie, []);
});

test('(d) only attive/monitoraggio diagnosi appear', () => {
  const cartella = makeCartella({
    diagnosi: [
      { descrizione: 'Scompenso cardiaco', stato: 'attiva' },
      { descrizione: 'Frattura femore', stato: 'monitoraggio' },
      { descrizione: 'Polmonite risolta', stato: 'risolta' },
    ] as Diagnosi[],
  });
  const model = buildInvioPSModel(PAZIENTE, cartella, []);
  assert.deepEqual(model.patient.diagnosi, ['Scompenso cardiaco', 'Frattura femore']);
});

test('(d) condizioni croniche from boolean flags', () => {
  const cartella = makeCartella({ diabetico: true, ipertensione: true, terapiaTriturata: false });
  const model = buildInvioPSModel(PAZIENTE, cartella, []);
  assert.deepEqual(model.patient.condizioniCroniche, ['Diabete', 'Ipertensione']);
});

test('(d) no camera field on model anymore', () => {
  const model = buildInvioPSModel(
    PAZIENTE,
    makeCartella({ cameraNumero: '5', lettoNumero: 'B' }),
    [],
  );
  assert.equal('camera' in model.patient, false);
});

test('PS separates current/discharge diagnoses, explicit comorbidities and saved prior history', () => {
  const cartella = makeCartella();
  cartella.anamnesi.patologicaRemota = 'Pregressa colecistectomia. Nega diabete.';
  cartella.anamnesi.patologicaProssima = 'Storia generica non classificata';
  cartella.diagnosi = [
    { descrizione: 'Trauma recente', stato: 'attiva', tipo: 'principale' },
    { descrizione: 'Ipertensione', stato: 'attiva', tipo: 'comorbidita' },
  ] as Diagnosi[];
  cartella.ipertensione = true;
  cartella.terapiaTriturata = true;
  cartella.anamnesi.note = 'Nota manuale di assistenza';
  const before = structuredClone(cartella);
  const patient = buildInvioPSModel(PAZIENTE, cartella, []).patient;
  assert.deepEqual(patient.diagnosi, ['Trauma recente']);
  assert.deepEqual(patient.patologiePregresse, [
    'Pregressa colecistectomia. Nega diabete.',
    'Ipertensione',
  ]);
  assert.deepEqual(patient.condizioniCroniche, []);
  assert.deepEqual(patient.noteAssistenziali, ['Nota manuale di assistenza', 'Terapia triturata']);
  assert.equal(JSON.stringify(patient).includes('Storia generica'), false);
  assert.deepEqual(cartella, before, 'projection never mutates stored/manual/source content');
});

test('PS exact deduplication preserves distinct admission findings and negations', () => {
  const cartella = makeCartella({
    patologiaIngresso: '  TRAUMA RECENTE ',
    diagnosi: [
      {
        descrizione: '## Diagnosi di dimissione:\nTrauma recente',
        stato: 'attiva',
        tipo: 'principale',
      },
      { descrizione: 'Trauma recente', stato: 'attiva', tipo: 'secondaria' },
      { descrizione: 'Nega dispnea', stato: 'monitoraggio', tipo: 'secondaria' },
      { descrizione: 'Dispnea da valutare', stato: 'attiva', tipo: 'secondaria' },
    ] as Diagnosi[],
  });
  const patient = buildInvioPSModel(PAZIENTE, cartella, []).patient;
  assert.equal(patient.patologiaIngresso, '');
  assert.equal(patient.diagnosi.length, 3);
  assert.ok(patient.diagnosi.includes('Nega dispnea'));
  assert.ok(patient.diagnosi.includes('Dispnea da valutare'));
  cartella.patologiaIngresso = 'Trauma recente con nuova cefalea';
  assert.equal(
    buildInvioPSModel(PAZIENTE, cartella, []).patient.patologiaIngresso,
    'Trauma recente con nuova cefalea',
  );
});

// #457 read-only emergency context: source identity and actual timestamps are the oracle.
import { buildEmergencyContext } from '../invioPSModel';
import {
  loadEmergencyAdministrationHistory,
  type EmergencyTransferSources,
} from '../../../lib/emergencyTransferContext';
import { facilityLocalMinute } from '../../../lib/facilityTime';
const PS_NOW = new Date('2026-10-17T10:00:00Z');
function emergencySources(
  overrides: Partial<EmergencyTransferSources> = {},
): EmergencyTransferSources {
  return {
    patientId: PAZIENTE.id,
    loadedAt: PS_NOW.toISOString(),
    therapies: [],
    readings: [],
    diary: [],
    scheduled: [],
    prn: [],
    ...overrides,
  };
}
function psReading(id: string, measuredAt: string, values = { temperatura: '36.8', spo2: '97' }) {
  return {
    id,
    patientId: PAZIENTE.id,
    measuredAt,
    values,
    requestId: `request-${id}`,
    authorOperatorId: 'synthetic-actor',
    authorName: 'Autore sintetico',
    createdAt: measuredAt,
  };
}
function psDiary(id: string, entryDateTime: string) {
  return {
    id,
    patientId: PAZIENTE.id,
    authorType: 'medico' as const,
    authorName: 'Autore sintetico',
    title: 'Motivo sintetico',
    content: 'Sintomo urgente sintetico',
    priority: 'urgente' as const,
    status: 'aperta' as const,
    entryDateTime,
    category: null,
    createdAt: PS_NOW.toISOString(),
    updatedAt: PS_NOW.toISOString(),
  };
}
function psScheduled(
  id: string,
  stato = 'erogata',
  confirmedAt: string | null = '2026-10-17T09:30:00Z',
) {
  return {
    id,
    patientId: PAZIENTE.id,
    therapyId: 'synthetic-therapy',
    farmacoNome: `Farmaco ${id}`,
    farmacoDose: '1 compressa',
    farmacoVia: 'orale',
    date: '2026-10-17',
    ora: '08:00',
    stato,
    confirmedAt,
  };
}

test('457 unknown allergy status never becomes a verified negative finding', () => {
  for (const status of [undefined, 'presenti'] as const) {
    const model = buildInvioPSModel(PAZIENTE, makeCartella({ allergieStatus: status }), []);
    assert.equal(model.patient.allergieStato, 'Stato allergie da verificare');
  }
  assert.equal(
    buildInvioPSModel(PAZIENTE, makeCartella({ allergieStatus: 'assenti' }), []).patient
      .allergieStato,
    'Assenza di allergie documentata',
  );
  assert.equal(
    buildInvioPSModel(PAZIENTE, makeCartella({ allergieStatus: 'paziente_nega' }), []).patient
      .allergieStato,
    'Il paziente nega allergie',
  );
});

test('457 reason uses actual recent urgent diary and critical reading, remains separate from source data', () => {
  const sources = emergencySources({
    diary: [psDiary('urgent', '2026-10-17T11:00')],
    readings: [psReading('low-spo2', '2026-10-17T09:00:00Z', { temperatura: '36.8', spo2: '88' })],
  });
  const before = structuredClone(sources);
  const context = buildEmergencyContext(PAZIENTE.id, makeCartella(), sources, PS_NOW);
  assert.match(context.reason, /Sintomo urgente sintetico/);
  assert.match(context.reason, /17\/10\/2026 11:00/);
  assert.match(context.reason, /SpO₂ 88 %/);
  assert.deepEqual(sources, before);
});

test('457 stale, future, wrong-patient and nonurgent notes never prefill a reason', () => {
  const rows = [
    psDiary('old', '2026-10-16T11:59'),
    psDiary('future', '2026-10-17T12:01'),
    { ...psDiary('other', '2026-10-17T11:00'), patientId: 'another-patient' },
    { ...psDiary('normal', '2026-10-17T11:00'), priority: 'normale' as const },
  ];
  const context = buildEmergencyContext(
    PAZIENTE.id,
    makeCartella(),
    emergencySources({ diary: rows }),
    PS_NOW,
  );
  assert.equal(context.reason, '');
  assert.equal(context.urgentNote, null);
});

test('457 24-hour boundary follows actual Rome instants including the spring DST transition', () => {
  const now = new Date('2026-03-29T10:00:00Z');
  const sources = emergencySources({
    diary: [psDiary('boundary', '2026-03-28T11:00'), psDiary('too-old', '2026-03-28T10:59')],
  });
  const context = buildEmergencyContext(PAZIENTE.id, makeCartella(), sources, now);
  assert.equal(context.urgentNote?.at, '2026-03-28T11:00');
  const repeated = buildEmergencyContext(
    PAZIENTE.id,
    makeCartella(),
    emergencySources({ diary: [psDiary('ambiguous', '2026-10-25T02:30')] }),
    new Date('2026-10-25T05:00:00Z'),
  );
  assert.equal(repeated.reason, '', 'an ambiguous civil time must not guess a clinical instant');
});

test('457 latest available value retains its own observation timestamp and missing fields stay unknown', () => {
  const sources = emergencySources({
    readings: [
      psReading('older', '2026-10-17T07:00:00Z', { temperatura: '36.8', spo2: '95' }),
      psReading('newer', '2026-10-17T09:00:00Z', { temperatura: '37.2', spo2: '' }),
      psReading('future', '2026-10-17T11:00:00Z', { temperatura: '44', spo2: '50' }),
    ],
  });
  const context = buildEmergencyContext(PAZIENTE.id, makeCartella(), sources, PS_NOW);
  assert.deepEqual(
    context.vitals.find((row) => row.key === 'temperatura'),
    {
      key: 'temperatura',
      label: 'TC',
      unit: '°C',
      value: '37.2',
      measuredAt: '2026-10-17T09:00:00Z',
    },
  );
  assert.equal(
    context.vitals.find((row) => row.key === 'spo2')?.measuredAt,
    '2026-10-17T07:00:00Z',
  );
  assert.equal(context.vitals.find((row) => row.key === 'fr')?.value, null);
});

test('457 only actual given doses appear; prescribed time is never used as administration time', () => {
  const sources = emergencySources({
    scheduled: [
      psScheduled('given'),
      psScheduled('refused', 'non_erogata'),
      psScheduled('pending', 'da_erogare'),
      psScheduled('future', 'erogata', '2026-10-17T11:00:00Z'),
      psScheduled('old', 'erogata', '2026-10-16T09:59:00Z'),
      psScheduled('legacy', 'erogata', null),
    ],
    prn: [
      {
        id: 'prn',
        therapyId: 'prn-therapy',
        patientId: PAZIENTE.id,
        drugName: 'Farmaco PRN',
        dosage: '2 mg',
        route: 'orale',
        date: '2026-10-17',
        administeredAt: '2026-10-17T09:45:00Z',
        administeredBy: 'Autore sintetico',
        indication: 'Indicazione sintetica',
        note: null,
      },
    ],
  });
  const context = buildEmergencyContext(PAZIENTE.id, makeCartella(), sources, PS_NOW);
  assert.deepEqual(
    context.given.map((row) => row.id),
    ['prn:prn', 'scheduled:given', 'scheduled:legacy'],
  );
  assert.equal(context.given[1].at, '2026-10-17T09:30:00Z');
  assert.equal(context.given[2].at, null);
  assert.notEqual(context.given[1].at, sources.scheduled[0].ora);
  assert.deepEqual(
    buildInvioPSModel(PAZIENTE, makeCartella(), [makeTherapy()]).emergency.given,
    [],
    'a prescription alone is not a given dose',
  );
});

test('457 sources, clinical chart and prescriptions remain scoped to exactly one patient', () => {
  assert.throws(
    () => buildInvioPSModel(PAZIENTE, makeCartella({ pazienteId: 'other' }), []),
    /non coerente/,
  );
  assert.throws(
    () =>
      buildEmergencyContext(
        PAZIENTE.id,
        makeCartella(),
        emergencySources({ patientId: 'other' }),
        PS_NOW,
      ),
    /non coerente/,
  );
  const model = buildInvioPSModel(PAZIENTE, makeCartella(), [makeTherapy({ patientId: 'other' })]);
  assert.equal(model.terapie.length, 0);
  const context = buildEmergencyContext(
    PAZIENTE.id,
    makeCartella(),
    emergencySources({ scheduled: [{ ...psScheduled('other'), patientId: 'other' }] }),
    PS_NOW,
  );
  assert.deepEqual(context.given, []);
});

test('457 full medication keyset pagination includes later-page actual given doses and authentic patient ID', async () => {
  const calls: Array<string | null> = [];
  const signal = new AbortController().signal;
  const rows = await loadEmergencyAdministrationHistory(
    PAZIENTE.id,
    signal,
    async (patientId, cursor) => {
      assert.equal(patientId, PAZIENTE.id);
      calls.push(cursor);
      return cursor === null
        ? { items: [psScheduled('first')], pageInfo: { hasMore: true, nextCursor: 'next-page' } }
        : { items: [psScheduled('second')], pageInfo: { hasMore: false, nextCursor: null } };
    },
  );
  assert.deepEqual(calls, [null, 'next-page']);
  assert.deepEqual(
    rows.map((row) => row.id),
    ['first', 'second'],
  );
});

test('457 repeated cursor, duplicate records, mixed patient and aborted late page cannot produce printable sources', async () => {
  const controller = new AbortController();
  await assert.rejects(
    loadEmergencyAdministrationHistory(PAZIENTE.id, controller.signal, async () => ({
      items: [{ ...psScheduled('wrong'), patientId: 'other' }],
      pageInfo: { hasMore: false, nextCursor: null },
    })),
    /non valido/,
  );
  await assert.rejects(
    loadEmergencyAdministrationHistory(PAZIENTE.id, controller.signal, async () => ({
      items: [psScheduled('repeated')],
      pageInfo: { hasMore: true, nextCursor: 'same' },
    })),
    /cambiato|incompleto/,
  );
  const late = new AbortController();
  await assert.rejects(
    loadEmergencyAdministrationHistory(PAZIENTE.id, late.signal, async () => {
      late.abort();
      return { items: [psScheduled('late')], pageInfo: { hasMore: false, nextCursor: null } };
    }),
    { name: 'AbortError' },
  );
});

test('457 known contact and risk are preserved verbatim without inventing negatives or changing the chart', () => {
  const chart = makeCartella({
    contattoEmergenzaNome: 'Referente sintetico',
    contattoEmergenzaRel: 'familiare',
    contattoEmergenzaTel: '0000000000',
    indicatoriRischio: [
      {
        id: 'risk',
        tipo: 'caduta',
        livello: 'alto',
        descrizione: 'Rischio documentato',
        dataValutazione: '2026-10-17',
        operatore: 'Autore sintetico',
      },
    ],
  });
  const before = structuredClone(chart);
  const context = buildEmergencyContext(PAZIENTE.id, chart, emergencySources(), PS_NOW);
  assert.equal(context.contact, 'Referente sintetico · familiare · 0000000000');
  assert.deepEqual(context.risks, ['caduta · alto · Rischio documentato']);
  assert.deepEqual(chart, before);
  assert.equal(facilityLocalMinute(new Date('2026-10-17T09:30:00Z')), '2026-10-17T11:30');
});

test('457 legacy observations retain their recorded date precision and never invent a midnight or urgent time', () => {
  const chart = makeCartella({
    parametriVitali: [
      {
        id: 'date-only',
        etichetta: 'PA',
        valore: '85/50',
        unita: 'mmHg',
        stato: 'critico',
        rilevato: '2026-10-17',
        rilevatoDa: 'Autore sintetico',
      },
      {
        id: 'precise',
        etichetta: 'FC',
        valore: '135',
        unita: 'bpm',
        stato: 'critico',
        rilevato: '2026-10-17T09:00:00Z',
        rilevatoDa: 'Autore sintetico',
      },
      {
        id: 'future',
        etichetta: 'TC',
        valore: '44',
        unita: '°C',
        stato: 'critico',
        rilevato: '2026-10-18T09:00:00Z',
        rilevatoDa: 'Autore sintetico',
      },
    ],
  });
  const context = buildEmergencyContext(PAZIENTE.id, chart, emergencySources(), PS_NOW);
  assert.equal(context.legacyVitals.length, 2);
  assert.equal(context.legacyVitals[0].recordedAt, '2026-10-17 · orario non registrato');
  assert.match(context.reason, /FC 135 bpm/);
  assert.doesNotMatch(context.reason, /85\/50|44/);
});
