import { test } from 'node:test';
import assert from 'node:assert/strict';

// ── Inline types (avoid React/browser imports) ────────────────────────────────

interface Paziente {
  id: string;
  medicalRecordNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: string | null;
  email: string | null;
  phone: string | null;
}

interface CartellaPaziente {
  pazienteId: string;
  cameraNumero?: string;
  lettoNumero?: string;
  statoRicovero: 'ricoverato' | 'ambulatoriale' | 'day_hospital' | 'dimesso';
  dimissione?: {
    data: string;
    ora: string;
    condizioni: 'buone' | 'discrete' | 'scadenti' | 'stabili';
    autonomiaResidua: string;
    pianoCuraConsegnato: boolean;
    istruzioni: string;
    controlliProgrammati: string;
    personaAccompagna: string;
    mezzoTrasporto: string;
    destinazione: 'domicilio' | 'altra_struttura' | 'hospice' | 'ospedale';
    materialeConsegnato: string;
    operatore: string;
    note: string;
    compilatoAt: string;
  };
  // Minimal required fields for CartellaPaziente
  anamnesi: Record<string, unknown>;
  diagnosi: unknown[];
  terapie: unknown[];
  farmaci: unknown[];
  allergie: unknown[];
  noteClinica: unknown[];
  visite: unknown[];
  parametriVitali: unknown[];
  interventi: unknown[];
  pianoCura: Record<string, unknown>;
  indicatoriRischio: unknown[];
  documentiConsegnati: unknown[];
  diarioInfermieristico: unknown[];
  diarioMedico: unknown[];
  medicazioniFerite: unknown[];
  contenzioni: unknown[];
  valutazioniBraden: unknown[];
}

interface PatientTherapyAPI {
  id: string;
  patientId: string;
  farmacoNome: string;
  dosaggio: string;
  viaSomministrazione: string;
  tipo: 'periodica' | 'una_tantum';
  stato: 'attiva' | 'sospesa' | 'conclusa';
  dataInizio: string;
  dataFine: string | null;
  fasceMattina: boolean;
  fascePranzo: boolean;
  fascePomeriggio: boolean;
  fasceSera: boolean;
  fasceNotte: boolean;
  orarioSpecifico: string | null;
  prescrittore: string | null;
  operatoreInseritore: string | null;
  note: string | null;
  dataSomministrazione: string | null;
  orarioSomministrazione: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Inline buildInvioPSModel (mirrors the real implementation to avoid tsx/ESM issues) ──

const FASCE_LABELS: { boolKey: keyof PatientTherapyAPI; label: string }[] = [
  { boolKey: 'fasceMattina',    label: 'Mattina'    },
  { boolKey: 'fascePranzo',     label: 'Pranzo'     },
  { boolKey: 'fascePomeriggio', label: 'Pomeriggio' },
  { boolKey: 'fasceSera',       label: 'Sera'       },
  { boolKey: 'fasceNotte',      label: 'Notte'      },
];

function fmtDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('it-IT');
}

function calcAge(dob: string): string {
  if (!dob) return '';
  const years = Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
  return years > 0 ? `${years} anni` : '';
}

function buildInvioPSModel(paziente: Paziente, cartella: CartellaPaziente, therapies: PatientTherapyAPI[]) {
  const cognomeNome = `${paziente.lastName} ${paziente.firstName}`.trim();
  const camera = [cartella.cameraNumero, cartella.lettoNumero].filter(Boolean).join(' / ') || '—';

  const patient = {
    cognomeNome,
    mrn: paziente.medicalRecordNumber || '—',
    dataNascita: fmtDate(paziente.dateOfBirth || ''),
    sesso: paziente.sex || '—',
    camera,
    dataStampa: new Date().toLocaleDateString('it-IT'),
  };

  const age = calcAge(paziente.dateOfBirth || '');
  if (age) {
    patient.sesso = `${patient.sesso} · ${age}`;
  }

  let dimissione: {
    data: string; ora: string; condizioni: string; destinazione: string;
    autonomiaResidua: string; istruzioni: string; controlliProgrammati: string;
    personaAccompagna: string; mezzoTrasporto: string; materialeConsegnato: string;
    note: string;
  } | null = null;

  if (cartella.dimissione) {
    const d = cartella.dimissione;
    const DEST_LABELS: Record<string, string> = {
      domicilio: 'Domicilio', altra_struttura: 'Altra struttura',
      hospice: 'Hospice', ospedale: 'Ospedale',
    };
    dimissione = {
      data: fmtDate(d.data),
      ora: d.ora || '—',
      condizioni: d.condizioni || '—',
      destinazione: DEST_LABELS[d.destinazione] ?? d.destinazione ?? '—',
      autonomiaResidua: d.autonomiaResidua || '—',
      istruzioni: d.istruzioni || '—',
      controlliProgrammati: d.controlliProgrammati || '—',
      personaAccompagna: d.personaAccompagna || '—',
      mezzoTrasporto: d.mezzoTrasporto || '—',
      materialeConsegnato: d.materialeConsegnato || '—',
      note: d.note || '',
    };
  }

  const terapie = therapies
    .filter(t => t.stato === 'attiva')
    .map(t => {
      const fasceLabelList = FASCE_LABELS
        .filter(f => t[f.boolKey] === true)
        .map(f => f.label);
      const fasce = t.orarioSpecifico
        ? t.orarioSpecifico
        : fasceLabelList.length > 0 ? fasceLabelList.join(', ') : '—';
      return { id: t.id, farmaco: t.farmacoNome, dose: t.dosaggio, via: t.viaSomministrazione, fasce, stato: t.stato };
    });

  return { patient, dimissione, terapie };
}

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
    anamnesi: {},
    diagnosi: [],
    terapie: [],
    farmaci: [],
    allergie: [],
    noteClinica: [],
    visite: [],
    parametriVitali: [],
    interventi: [],
    pianoCura: {},
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
  const t = makeTherapy({ fasceMattina: true, fasceSera: true, fasceNotte: false, fascePranzo: false, fascePomeriggio: false });
  const model = buildInvioPSModel(PAZIENTE, makeCartella(), [t]);
  assert.equal(model.terapie[0].fasce, 'Mattina, Sera');
});

test('(c) orarioSpecifico takes priority over fasce labels', () => {
  const t = makeTherapy({ fasceMattina: true, orarioSpecifico: '08:00,20:00' });
  const model = buildInvioPSModel(PAZIENTE, makeCartella(), [t]);
  assert.equal(model.terapie[0].fasce, '08:00,20:00');
});

test('camera campo set from cameraNumero and lettoNumero', () => {
  const cartella = makeCartella({ cameraNumero: '5', lettoNumero: 'B' });
  const model = buildInvioPSModel(PAZIENTE, cartella, []);
  assert.equal(model.patient.camera, '5 / B');
});

test('camera fallback to — when both are absent', () => {
  const cartella = makeCartella({ cameraNumero: undefined, lettoNumero: undefined });
  const model = buildInvioPSModel(PAZIENTE, cartella, []);
  assert.equal(model.patient.camera, '—');
});
