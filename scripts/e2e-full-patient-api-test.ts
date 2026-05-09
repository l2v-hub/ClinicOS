/**
 * E2E Full Patient API Test
 *
 * Creates a complete patient (Fabio Forlano) through real API calls,
 * then verifies all data persists correctly.
 *
 * Usage:
 *   npm run test:e2e:full-patient:api
 *   BASE_URL=https://clinicos-backend-production-df88.up.railway.app npm run test:e2e:full-patient:api
 */

const BASE_URL = process.env.BASE_URL?.replace(/\/$/, '') || 'http://localhost:3001';

// ── Helpers ──────────────────────────────────────────────────────────────────

interface TestResult {
  section: string;
  status: 'created' | 'verified' | 'missing_api' | 'failed';
  detail?: string;
}

const results: TestResult[] = [];
let patientId = '';

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowISO(): string {
  return new Date().toISOString();
}

async function api(method: string, path: string, body?: unknown): Promise<{ status: number; data: unknown }> {
  const url = `${BASE_URL}${path}`;
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

function pass(section: string, detail?: string) {
  results.push({ section, status: 'created', detail });
  console.log(`  ✓ ${section}${detail ? ` — ${detail}` : ''}`);
}

function verified(section: string, detail?: string) {
  results.push({ section, status: 'verified', detail });
  console.log(`  ✓ ${section} VERIFIED${detail ? ` — ${detail}` : ''}`);
}

function fail(section: string, detail: string) {
  results.push({ section, status: 'failed', detail });
  console.error(`  ✗ ${section} FAILED — ${detail}`);
}

function missing(section: string, detail: string) {
  results.push({ section, status: 'missing_api', detail });
  console.log(`  ⚠ ${section} — MISSING API: ${detail}`);
}

// ── Test Data ────────────────────────────────────────────────────────────────

const PATIENT_DATA = {
  firstName: 'Fabio',
  lastName: 'Forlano',
  dateOfBirth: '1948-05-12',
  sex: 'M',
  phone: '+39 333 0000001',
  email: 'fabio.forlano@example.local',
  emergencyContactName: 'Maria Forlano',
  emergencyContactPhone: '+39 333 0000002',
};

function buildCartella(pazienteId: string) {
  const today = todayStr();
  const now = nowISO();

  return {
    pazienteId,
    statoRicovero: 'ricoverato' as const,
    cameraNumero: '12',
    lettoNumero: 'A',
    codiceFiscale: 'FRLFBA48E12H501X',
    contattoEmergenzaNome: 'Maria Forlano',
    contattoEmergenzaTel: '+39 333 0000002',
    contattoEmergenzaRel: 'Figlia',
    patologiaIngresso: 'Riabilitazione e monitoraggio clinico',
    diabetico: true,
    ipertensione: true,
    terapiaTriturata: false,
    dataRicovero: today,
    noteGenerali: 'Paziente collaborante, deambulazione assistita',

    // ── Anamnesi
    anamnesi: {
      fisiologica: 'Sesso maschile, 77 anni',
      patologicaRemota: 'Pregresso intervento chirurgico addominale',
      patologicaProssima: 'Ridotta autonomia nella deambulazione. Rischio caduta moderato.',
      familiare: '',
      lavorativa: 'Pensionato',
      abitudini: '',
      note: '',
      updatedAt: now,
      operatore: 'Test E2E',
    },

    // ── Diagnosi
    diagnosi: [
      {
        id: uid(), codiceICD: 'J44.1', descrizione: 'BPCO lieve',
        tipo: 'principale', stato: 'attiva', dataInsorgenza: '2020-01-15',
        operatore: 'Test E2E', note: '', createdAt: now,
      },
      {
        id: uid(), codiceICD: 'I10', descrizione: 'Ipertensione arteriosa',
        tipo: 'comorbidita', stato: 'attiva', dataInsorgenza: '2015-06-01',
        operatore: 'Test E2E', note: '', createdAt: now,
      },
      {
        id: uid(), codiceICD: 'E11', descrizione: 'Diabete mellito tipo 2',
        tipo: 'comorbidita', stato: 'attiva', dataInsorgenza: '2018-03-10',
        operatore: 'Test E2E', note: '', createdAt: now,
      },
    ],

    // ── Allergie
    allergie: [
      {
        id: uid(), allergene: 'Penicillina', reazione: 'Rash cutaneo',
        gravita: 'grave', documentato: today, documentatoDa: 'Test E2E', note: '',
      },
    ],

    // ── Farmaci / Terapie
    farmaci: [
      {
        id: uid(), nome: 'Claritromicina', dose: '500 mg', frequenza: 'mattina e sera',
        via: 'orale', inizio: today, stato: 'attivo', prescrittoDA: 'Test E2E',
        h08: '✓', h20: '✓',
      },
      {
        id: uid(), nome: 'Ramipril', dose: '5 mg', frequenza: '1x/die mattina',
        via: 'orale', inizio: today, stato: 'attivo', prescrittoDA: 'Test E2E',
        h08: '✓',
      },
      {
        id: uid(), nome: 'Metformina', dose: '500 mg', frequenza: 'pranzo e cena',
        via: 'orale', inizio: today, stato: 'attivo', prescrittoDA: 'Test E2E',
        h12: '✓', h20: '✓',
      },
      {
        id: uid(), nome: 'Paracetamolo', dose: '1000 mg', frequenza: 'al bisogno',
        via: 'orale', inizio: today, stato: 'attivo', prescrittoDA: 'Test E2E',
        indicazione: 'Dolore o febbre > 38°C',
      },
    ],

    terapie: [
      {
        id: uid(), tipo: 'farmacologica', descrizione: 'Schema insulinico: 100-150→3U, 151-200→5U, 201-250→7U, >250→avvisare medico',
        dataInizio: today, stato: 'attiva', operatore: 'Test E2E', note: 'Insulina rapida SC', createdAt: now,
      },
    ],

    // ── Parametri vitali (5 rilevazioni su primi 5 giorni del mese)
    parametriVitali: [
      { id: uid(), etichetta: 'PA', valore: '130/85', unita: 'mmHg', stato: 'normale', rilevato: today, rilevatoDa: 'Test E2E' },
      { id: uid(), etichetta: 'FC', valore: '78', unita: 'bpm', stato: 'normale', rilevato: today, rilevatoDa: 'Test E2E' },
      { id: uid(), etichetta: 'SpO2', valore: '96', unita: '%', stato: 'normale', rilevato: today, rilevatoDa: 'Test E2E' },
      { id: uid(), etichetta: 'TC', valore: '36.5', unita: '°C', stato: 'normale', rilevato: today, rilevatoDa: 'Test E2E' },
      { id: uid(), etichetta: 'DTX', valore: '145', unita: 'mg/dL', stato: 'attenzione', rilevato: today, rilevatoDa: 'Test E2E' },
    ],

    parametriMensili: [
      {
        id: uid(),
        mese: new Date().getMonth() + 1,
        anno: new Date().getFullYear(),
        createdAt: now,
        giorni: [
          { giorno: 1, pa: '130/85', fc: '78', spo2: '96', temperatura: '36.5', dtx08: '145', evacuazione: 'Sì', note: 'Stabile' },
          { giorno: 2, pa: '125/80', fc: '82', spo2: '97', temperatura: '36.4', dtx08: '138', dtx12: '155', evacuazione: 'No' },
          { giorno: 3, pa: '140/90', fc: '75', spo2: '95', temperatura: '36.8', dtx08: '160', evacuazione: 'Sì', note: 'PA leggermente alta' },
          { giorno: 4, pa: '135/85', fc: '80', spo2: '96', temperatura: '36.6', dtx08: '142', dtx18: '150', evacuazione: 'Sì' },
          { giorno: 5, pa: '128/82', fc: '76', spo2: '97', temperatura: '36.3', dtx08: '135', evacuazione: 'No', note: 'Valori ottimali' },
        ],
      },
    ],

    // ── Diario infermieristico (4 note)
    diarioInfermieristico: [
      {
        id: uid(), data: today, ora: '08:00', turno: 'mattina', tipo: 'ordinario',
        testo: 'Paziente collaborante, ha assunto terapia regolarmente. Parametri nella norma.',
        operatore: 'Test E2E', createdAt: now, priorita: 'normale', stato: 'completata',
      },
      {
        id: uid(), data: today, ora: '10:30', turno: 'mattina', tipo: 'urgente',
        testo: 'PA 160/95 dopo sforzo. Monitoraggio ravvicinato. Avvisato medico.',
        operatore: 'Test E2E', createdAt: now, priorita: 'urgente', stato: 'completata',
      },
      {
        id: uid(), data: today, ora: '14:00', turno: 'pomeriggio', tipo: 'ordinario',
        testo: 'Deambulazione assistita con fisioterapista. Buona tolleranza allo sforzo.',
        operatore: 'Test E2E', createdAt: now, priorita: 'normale', stato: 'completata',
      },
      {
        id: uid(), data: today, ora: '20:00', turno: 'notte', tipo: 'segnalazione',
        testo: 'Paziente riferisce leggero dolore toracico. Monitorare durante la notte.',
        operatore: 'Test E2E', createdAt: now, priorita: 'alta', stato: 'aperta',
      },
    ],

    // ── Diario medico (2 note)
    diarioMedico: [
      {
        id: uid(), data: today, ora: '09:00', turno: 'mattina', tipo: 'ordinario',
        testo: 'Tosse produttiva persistente. Si prescrive Claritromicina 500 mg x 2/die per 7 giorni.',
        operatore: 'Dr. Test E2E', createdAt: now,
        prescrizione: 'Claritromicina 500 mg 1 cp mattina + 1 cp sera x 7 gg',
        firmaMedico: 'Dr. Test',
      },
      {
        id: uid(), data: today, ora: '15:00', turno: 'pomeriggio', tipo: 'ordinario',
        testo: 'Rivalutazione parametri. PA rientrata nei limiti dopo riposo. DTX da monitorare.',
        operatore: 'Dr. Test E2E', createdAt: now,
        evoluzione: 'Condizioni stabili, proseguire monitoraggio',
        firmaMedico: 'Dr. Test',
      },
    ],

    // ── Medicazioni
    medicazioniFerite: [
      {
        id: uid(), data: today, sede: 'Tallone destro', tipoLesione: 'LDP',
        grado: '1', tipoMedicazione: 'Medicazione protettiva',
        materiale: 'Film in poliuretano', aspettoLesione: 'Eritema non sbiancabile',
        dimensioni: '2x2 cm', odore: false, essudato: 'assente',
        cutePerilisionale: 'Integra', prossimaMedicazione: 'Controllo programmato fra 3 giorni',
        operatore: 'Test E2E', note: 'Primo rilevamento', createdAt: now,
        followUps: [
          {
            id: uid(), data: today, siglaOperatore: 'TE',
            motivoSostituzione: 'termine', note: 'Controllo programmato', createdAt: now,
          },
        ],
      },
    ],

    // ── Documenti consegnati
    documentiConsegnati: [
      { id: uid(), tipo: 'documento_identita', descrizione: 'Carta d\'identità', dataConsegna: today, firmatoDA: 'Fabio Forlano', operatore: 'Test E2E', note: '', stato: 'ricevuto' },
      { id: uid(), tipo: 'tessera_sanitaria', descrizione: 'Tessera sanitaria', dataConsegna: today, firmatoDA: 'Fabio Forlano', operatore: 'Test E2E', note: '', stato: 'ricevuto' },
      { id: uid(), tipo: 'consenso_privacy', descrizione: 'Consenso privacy firmato', dataConsegna: today, firmatoDA: 'Fabio Forlano', operatore: 'Test E2E', note: '', stato: 'firmato' },
      { id: uid(), tipo: 'lettera_dimissione', descrizione: 'Lettera dimissione ospedaliera', dataConsegna: today, firmatoDA: 'Ospedale Demo', operatore: 'Test E2E', note: 'Dal ricovero precedente', stato: 'ricevuto' },
      { id: uid(), tipo: 'prescrizione', descrizione: 'Piano terapeutico', dataConsegna: today, firmatoDA: 'Dr. Test', operatore: 'Test E2E', note: '', stato: 'ricevuto' },
    ],

    // ── Scale di valutazione — Braden
    valutazioniBraden: [
      {
        id: uid(), data: today,
        percezioneSensoriale: 3, umidita: 3, attivita: 3,
        mobilita: 2, nutrizione: 3, frizione: 2,
        operatore: 'Test E2E', note: 'Valutazione iniziale', createdAt: now,
      },
    ],

    // ── Contenzioni
    contenzioni: [
      {
        id: uid(), dataInizio: today, oraInizio: '22:00',
        tipo: 'spondina', motivoClinico: 'Rischio caduta notturno',
        autorizzazioneMedico: true, autorizzazioneTutore: true,
        intervalloRivalutazione: 24, dataFine: '', oraFine: '',
        attiva: false, operatore: 'Test E2E',
        note: 'Dato demo per test funzionale', createdAt: now,
        spondineAttive: true, spondineFrequenza: 'notturna',
        motivCadute: true,
        firmaPazienteReferente: 'Maria Forlano',
      },
    ],

    // ── Indicatori di rischio
    indicatoriRischio: [
      {
        id: uid(), tipo: 'caduta', livello: 'medio',
        descrizione: 'Rischio caduta moderato per deambulazione assistita',
        dataValutazione: today, operatore: 'Test E2E',
      },
    ],

    // ── Piano di cura
    pianoCura: {
      obiettivi: 'Ripristino autonomia deambulatoria. Stabilizzazione parametri vitali.',
      interventiPrevisti: 'Fisioterapia quotidiana, monitoraggio PA e DTX, terapia farmacologica',
      notePianificazione: 'Rivalutazione settimanale',
      dataAggiornamento: today,
      operatore: 'Test E2E',
    },

    // ── Note cliniche
    noteClinica: [],

    // ── Visite
    visite: [],

    // ── Interventi
    interventi: [],

    // ── Presa in carico
    presaInCarico: {
      dataIngresso: today,
      oraIngresso: '08:00',
      provenienza: 'dimissione_ospedaliera' as const,
      centroInviante: 'Ospedale Demo',
      modalitaIngresso: 'ambulante' as const,
      accompagnatoDa: 'Maria Forlano (figlia)',
      motivoIngresso: 'Riabilitazione e monitoraggio clinico',
      operatoreResponsabile: 'Test E2E',
      condizioniGenerali: 'discrete' as const,
      condizioniIniziali: 'Paziente collaborante, deambulazione assistita',
      noteIniziali: 'Proveniente da Ospedale Demo dopo intervento chirurgico addominale',
      camera: '12',
      letto: 'A',
      statoCoscienza: 'vigile' as const,
      orientamento: 'orientato' as const,
      autonomia: 'parzialmente_autonomo' as const,
      comunicazione: 'Buona',
      udito: 'Nella norma',
      vista: 'Nella norma con correzione',
      dentizione: 'Protesi parziale',
      alimentazione: 'Autonomo, dieta diabetica',
      eliminazioneUrinaria: 'Autonoma',
      eliminazioneIntestinale: 'Regolare',
      mobilita: 'Deambulazione assistita',
      cuteIntegrita: 'Eritema non sbiancabile tallone destro',
      dolore: 'assente' as const,
      doloreLivello: 0,
      materialeConsegnato: true,
      operatore: 'Test E2E',
      note: '',
      compilatoAt: now,
    },
  };
}

// ── Test Steps ───────────────────────────────────────────────────────────────

async function step1_createPatient() {
  console.log('\n── Step 1: POST /patients ──');
  const { status, data } = await api('POST', '/patients', PATIENT_DATA);
  const d = data as Record<string, unknown>;
  if (status === 201 && d.id) {
    patientId = d.id as string;
    pass('Paziente creato', `id=${patientId} MRN=${d.medicalRecordNumber}`);
  } else {
    fail('Paziente creato', `status=${status} data=${JSON.stringify(data)}`);
    throw new Error('Cannot continue without patient ID');
  }
}

async function step2_verifyPatient() {
  console.log('\n── Step 2: GET /patients/:id ──');
  const { status, data } = await api('GET', `/patients/${patientId}`);
  const d = data as Record<string, unknown>;
  if (status === 200 && d.firstName === 'Fabio' && d.lastName === 'Forlano') {
    verified('Paziente GET', `${d.firstName} ${d.lastName}, sex=${d.sex}`);
  } else if (status === 404 && typeof data === 'string' && data.includes('Cannot GET')) {
    fail('Paziente GET', 'Route not deployed. Backend needs redeployment with latest routes.');
  } else {
    fail('Paziente GET', `status=${status} data=${JSON.stringify(data)?.slice(0, 200)}`);
  }
}

async function step3_putCartella() {
  console.log('\n── Step 3: PUT /patients/:id/cartella ──');
  const cartella = buildCartella(patientId);
  const { status, data } = await api('PUT', `/patients/${patientId}/cartella`, { data: cartella });
  if (status === 200) {
    pass('Cartella clinica salvata', 'PUT 200 OK');
  } else if (status === 404 && typeof data === 'string' && data.includes('Cannot PUT')) {
    fail('Cartella clinica PUT', 'Route not deployed. Backend needs redeployment with latest routes.');
    throw new Error('Cannot continue — deploy latest backend first');
  } else {
    fail('Cartella clinica PUT', `status=${status} data=${JSON.stringify(data)?.slice(0, 200)}`);
    throw new Error('Cannot continue without cartella');
  }
}

async function step4_verifyCartella() {
  console.log('\n── Step 4: GET /patients/:id/cartella — verify all sections ──');
  const { status, data } = await api('GET', `/patients/${patientId}/cartella`);
  if (status !== 200) {
    fail('Cartella GET', `status=${status}`);
    return;
  }

  const cartella = (data as Record<string, unknown>).data as Record<string, unknown>;
  if (!cartella) {
    fail('Cartella GET', 'data is null');
    return;
  }

  // Verify each section
  const checks: [string, string, (v: unknown) => boolean][] = [
    ['Diagnosi', 'diagnosi', v => Array.isArray(v) && v.length === 3],
    ['Anamnesi', 'anamnesi', v => !!(v as Record<string, unknown>)?.patologicaRemota],
    ['Allergie', 'allergie', v => Array.isArray(v) && v.length === 1],
    ['Farmaci', 'farmaci', v => Array.isArray(v) && v.length === 4],
    ['Terapie (schema insulinico)', 'terapie', v => Array.isArray(v) && v.length === 1],
    ['Parametri vitali', 'parametriVitali', v => Array.isArray(v) && v.length === 5],
    ['Parametri mensili', 'parametriMensili', v => Array.isArray(v) && v.length === 1 && (v[0] as Record<string, unknown>).giorni && ((v[0] as Record<string, unknown>).giorni as unknown[]).length === 5],
    ['Diario infermieristico', 'diarioInfermieristico', v => Array.isArray(v) && v.length === 4],
    ['Diario medico', 'diarioMedico', v => Array.isArray(v) && v.length === 2],
    ['Medicazioni', 'medicazioniFerite', v => Array.isArray(v) && v.length === 1],
    ['Documenti', 'documentiConsegnati', v => Array.isArray(v) && v.length === 5],
    ['Scala Braden', 'valutazioniBraden', v => Array.isArray(v) && v.length === 1],
    ['Contenzioni', 'contenzioni', v => Array.isArray(v) && v.length === 1],
    ['Indicatori rischio', 'indicatoriRischio', v => Array.isArray(v) && v.length === 1],
    ['Piano cura', 'pianoCura', v => !!(v as Record<string, unknown>)?.obiettivi],
    ['Presa in carico', 'presaInCarico', v => !!(v as Record<string, unknown>)?.dataIngresso],
    ['Camera/Letto', 'cameraNumero', v => v === '12'],
    ['Stato ricovero', 'statoRicovero', v => v === 'ricoverato'],
    ['Codice fiscale', 'codiceFiscale', v => v === 'FRLFBA48E12H501X'],
    ['Diabetico flag', 'diabetico', v => v === true],
    ['Ipertensione flag', 'ipertensione', v => v === true],
  ];

  for (const [label, key, check] of checks) {
    const val = cartella[key];
    if (check(val)) {
      verified(label);
    } else {
      fail(label, `unexpected value for ${key}: ${JSON.stringify(val)?.slice(0, 100)}`);
    }
  }

  // Sections not available as separate REST endpoints
  missing('Agenda appuntamenti', 'No POST /appointments endpoint. Appointments require User/Operator IDs (auth needed). Suggest: POST /appointments');
  missing('Scale Tinetti', 'No Tinetti model in schema or cartella type. Suggest: add to CartellaPaziente');
  missing('Scale NRS', 'No NRS model in schema or cartella type. Suggest: add to CartellaPaziente');
}

async function step5_verifyRefresh() {
  console.log('\n── Step 5: Re-read patient + cartella (simulates page refresh) ──');
  const [patRes, carRes] = await Promise.all([
    api('GET', `/patients/${patientId}`),
    api('GET', `/patients/${patientId}/cartella`),
  ]);

  if (patRes.status === 200) {
    const p = patRes.data as Record<string, unknown>;
    if (p.firstName === 'Fabio' && p.lastName === 'Forlano') {
      verified('Paziente after refresh');
    } else {
      fail('Paziente after refresh', `name mismatch: ${p.firstName} ${p.lastName}`);
    }
  } else {
    fail('Paziente after refresh', `status=${patRes.status}`);
  }

  if (carRes.status === 200) {
    const c = (carRes.data as Record<string, unknown>).data as Record<string, unknown>;
    if (c && Array.isArray(c.diagnosi) && c.diagnosi.length === 3) {
      verified('Cartella after refresh', `${Object.keys(c).length} keys persisted`);
    } else {
      fail('Cartella after refresh', 'data missing or incomplete');
    }
  } else {
    fail('Cartella after refresh', `status=${carRes.status}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  ClinicOS E2E Full Patient API Test                     ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  Target: ${BASE_URL}`);
  console.log(`  Date:   ${new Date().toISOString()}`);

  // Health check
  try {
    const { status } = await api('GET', '/health');
    if (status !== 200) throw new Error(`Health check failed: ${status}`);
    console.log(`  Health: OK`);
  } catch (e) {
    console.error(`\n  ✗ Cannot reach ${BASE_URL}/health — is the backend running?`);
    console.error(`    ${e}`);
    process.exit(1);
  }

  try {
    await step1_createPatient();
    await step2_verifyPatient();
    await step3_putCartella();
    await step4_verifyCartella();
    await step5_verifyRefresh();
  } catch (e) {
    console.error(`\n  FATAL: ${e}`);
  }

  // ── Report ──
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  REPORT                                                 ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  const created = results.filter(r => r.status === 'created');
  const verifiedList = results.filter(r => r.status === 'verified');
  const missingList = results.filter(r => r.status === 'missing_api');
  const failedList = results.filter(r => r.status === 'failed');

  console.log(`\n  CREATED (${created.length}):`);
  created.forEach(r => console.log(`    ✓ ${r.section}${r.detail ? ` — ${r.detail}` : ''}`));

  console.log(`\n  VERIFIED (${verifiedList.length}):`);
  verifiedList.forEach(r => console.log(`    ✓ ${r.section}${r.detail ? ` — ${r.detail}` : ''}`));

  console.log(`\n  MISSING API (${missingList.length}):`);
  missingList.forEach(r => console.log(`    ⚠ ${r.section} — ${r.detail}`));

  console.log(`\n  FAILED (${failedList.length}):`);
  if (failedList.length === 0) console.log('    (none)');
  failedList.forEach(r => console.log(`    ✗ ${r.section} — ${r.detail}`));

  console.log(`\n  Patient ID: ${patientId || '(not created)'}`);
  console.log(`  Total checks: ${results.length}`);
  console.log(`  Pass rate: ${created.length + verifiedList.length}/${results.length}`);

  if (failedList.length > 0) process.exit(1);
}

main();
