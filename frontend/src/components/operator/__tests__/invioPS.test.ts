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

test('(d) no allergie → empty array (renders "Nessuna allergia nota")', () => {
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
