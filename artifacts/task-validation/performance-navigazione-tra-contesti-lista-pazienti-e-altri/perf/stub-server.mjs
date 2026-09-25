// Stub API server for navigation-performance measurements.
// Serves synthetic data only (no PHI) on :3001 with configurable latency, so the frontend
// exercises its real fetch/render paths without a database. CORS preflight is answered like
// the real backend (custom X-Operator-* headers force an OPTIONS round trip per request).
//
//   node stub-server.mjs            # LAT=200ms, NPAT=60 patients
//   LAT=350 NPAT=120 node stub-server.mjs
import http from 'node:http';

const PORT = Number(process.env.PORT || 3001);
const LAT = Number(process.env.LAT ?? 200);
const NPAT = Number(process.env.NPAT ?? 60);
const PREFLIGHT_MAX_AGE = process.env.PREFLIGHT_MAX_AGE; // undefined → no caching (current backend)
const VERBOSE = process.env.VERBOSE === '1';
import fs from 'node:fs';
const ASSESSMENT_VERSIONS = (() => {
  // Le versioni dei moduli vivono in piu' file di frontend/src/lib/assessments: si leggono tutti.
  const dir = new URL('../../../../frontend/src/lib/assessments/', import.meta.url);
  const src = fs
    .readdirSync(dir)
    .filter((n) => n.endsWith('.ts'))
    .map((n) => fs.readFileSync(new URL(n, dir), 'utf8'))
    .join('\n');
  const v = (name) => (src.match(new RegExp(name + "_VERSION = '([^']+)'")) || [])[1] || '1';
  return { painad: v('PAINAD'), postural_transfers: v('TRANSFERS'), tinetti: v('TINETTI'), mna: v('MNA'), gds15: v('GDS15') };
})();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const TODAY = todayISO();
const NOW = new Date().toISOString();

const FIRST = [
  'Anna',
  'Marco',
  'Giulia',
  'Luca',
  'Elena',
  'Paolo',
  'Sara',
  'Andrea',
  'Chiara',
  'Davide',
  'Laura',
  'Matteo',
];
const LAST = [
  'Rossi',
  'Bianchi',
  'Ferrari',
  'Russo',
  'Esposito',
  'Colombo',
  'Ricci',
  'Moretti',
  'Greco',
  'Conti',
  'Gallo',
  'Costa',
  'Fontana',
  'Marino',
];
const DRUGS = [
  'Tachipirina 500 mg',
  'Cardioaspirin 100 mg',
  'Lasix 25 mg',
  'Norvasc 5 mg',
  'Eutirox 50 mcg',
  'Pantorc 40 mg',
  'Coumadin 5 mg',
  'Metformina 850 mg',
];

const patients = Array.from({ length: NPAT }, (_, i) => {
  const firstName = FIRST[i % FIRST.length];
  const lastName = LAST[(i * 7) % LAST.length];
  const room = String(101 + Math.floor(i / 2));
  const bed = i % 2 ? 'B' : 'A';
  return {
    id: `p${String(i + 1).padStart(3, '0')}`,
    medicalRecordNumber: `MRN-${1000 + i}`,
    firstName,
    lastName,
    dateOfBirth: `19${40 + (i % 50)}-0${1 + (i % 9)}-1${i % 9}`,
    sex: i % 2 ? 'F' : 'M',
    codiceFiscale: `RSSMRA${40 + (i % 50)}A01H501${String.fromCharCode(65 + (i % 26))}`,
    email: `paziente${i + 1}@example.test`,
    phone: `33300000${String(i).padStart(2, '0')}`,
    address: `Via Roma ${i + 1}, Milano`,
    location: { status: 'assigned', source: 'assignment', room, bed, asOf: TODAY },
  };
});
const byId = new Map(patients.map((p) => [p.id, p]));
const sortedPatients = [...patients].sort((a, b) =>
  `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`),
);

const operators = Array.from({ length: 8 }, (_, i) => ({
  id: i === 0 ? 'op1' : `op${i + 1}`,
  nome: FIRST[(i + 3) % FIRST.length],
  cognome: LAST[(i + 5) % LAST.length],
  ruolo: i % 3 === 0 ? 'medico' : 'infermiere',
  email: `op${i + 1}@example.test`,
  telefono: `3400000${String(i).padStart(3, '0')}`,
  reparto: 'Cardiologia',
  stato: 'attivo',
  qualifica: i % 3 === 0 ? 'Dirigente medico' : 'Infermiere',
  pazientiAssegnati: 6,
  appuntamentiOggi: 2,
}));

const summaryOf = (p, i) => ({
  patientId: p.id,
  statoRicovero: i % 5 === 0 ? 'dimesso' : i % 3 === 0 ? 'day_hospital' : 'ricoverato',
  hasCriticalVitals: i % 7 === 0,
  hasHighRisk: i % 4 === 0,
  allergieCount: i % 3,
  hasSevereAllergy: i % 6 === 0,
  terapieTotali: 3,
  terapieCompletate: i % 4,
  consegneAperte: i % 3,
});
const summaryById = new Map(sortedPatients.map((p, i) => [p.id, summaryOf(p, i)]));

const consegne = Array.from({ length: 40 }, (_, i) => {
  const p = sortedPatients[i % sortedPatients.length];
  return {
    id: `c${i + 1}`,
    pazienteId: p.id,
    pazienteNome: `${p.lastName}, ${p.firstName}`,
    priorita: i % 5 === 0 ? 'urgente' : i % 2 ? 'alta' : 'normale',
    stato: i % 4 === 0 ? 'completata' : i % 3 === 0 ? 'in_corso' : 'aperta',
    tipo: ['Monitoraggio', 'Terapia', 'Medicazione', 'Controllo'][i % 4],
    note: `Consegna sintetica n. ${i + 1}: controllare parametri e riferire al medico di turno.`,
    scadenza: TODAY,
    oraScadenza: `${String(8 + (i % 12)).padStart(2, '0')}:00`,
    operatoreAssegnato: `${operators[i % operators.length].nome} ${operators[i % operators.length].cognome}`,
    operatoreAssegnatoId: operators[i % operators.length].id,
    creatoDA: 'Dr. Marco Ferretti',
    creatoDaId: 'op1',
    createdAt: NOW,
  };
});
const consegnaSummary = (items) => ({
  total: items.length,
  open: items.filter((c) => c.stato === 'aperta').length,
  inProgress: items.filter((c) => c.stato === 'in_corso').length,
  completed: items.filter((c) => c.stato === 'completata').length,
  urgentOpen: items.filter((c) => c.stato !== 'completata' && c.priorita === 'urgente').length,
});

const notes = Array.from({ length: 30 }, (_, i) => ({
  id: `n${i + 1}`,
  autoreId: operators[i % operators.length].id,
  autoreNome: `${operators[i % operators.length].nome} ${operators[i % operators.length].cognome}`,
  destinatarioId: i % 3 === 0 ? 'tutti' : 'op1',
  destinatarioNome: i % 3 === 0 ? 'Tutti' : 'Dr. Marco Ferretti',
  pazienteId: sortedPatients[i % sortedPatients.length].id,
  pazienteNome: `${sortedPatients[i % sortedPatients.length].lastName}, ${sortedPatients[i % sortedPatients.length].firstName}`,
  priorita: i % 4 === 0 ? 'urgente' : 'normale',
  messaggio: `Messaggio sintetico ${i + 1} per il passaggio di consegne del turno.`,
  stato: i % 2 ? 'letta' : 'non_letta',
  createdAt: NOW,
}));

const appointments = Array.from({ length: 24 }, (_, i) => {
  const p = sortedPatients[i % sortedPatients.length];
  const op = operators[i % 2];
  return {
    id: `a${i + 1}`,
    data: TODAY,
    ora: `${String(8 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`,
    durata: 30,
    patientId: p.id,
    patientName: `${p.lastName}, ${p.firstName}`,
    operatorId: op.id,
    operatorName: `${op.nome} ${op.cognome}`,
    tipologia: ['visita', 'controllo', 'procedura', 'consulto'][i % 4],
    note: '',
    stato: i < 4 ? 'completato' : 'programmato',
  };
});

const FASCE = [
  ['mattina', 'Mattina', '08:00'],
  ['pranzo', 'Pranzo', '12:00'],
  ['pomeriggio', 'Pomeriggio', '16:00'],
  ['sera', 'Sera', '20:00'],
];
function therapySlots(date) {
  return FASCE.map(([fascia, label, ora], fi) => {
    const slotPatients = sortedPatients
      .slice(0, Math.min(40, sortedPatients.length))
      .map((p, i) => ({
        patientId: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        codiceFiscale: p.codiceFiscale,
        dateOfBirth: p.dateOfBirth,
        location: p.location,
        room: p.location.room,
        bed: p.location.bed,
        administrations: [0, 1, 2].map((k) => {
          const status = fi === 0 ? (k === 0 ? 'administered' : 'pending') : 'pending';
          return {
            administrationId: status === 'administered' ? `adm-${p.id}-${fi}-${k}` : null,
            therapyId: `th-${p.id}-${k}`,
            drugName: DRUGS[(i + k) % DRUGS.length].split(' ')[0],
            dosage: DRUGS[(i + k) % DRUGS.length].split(' ').slice(1).join(' '),
            quantityLabel: null,
            route: 'orale',
            scheduledTime: ora,
            status,
            administeredAt: status === 'administered' ? `${date}T08:05:00` : null,
            administeredBy: status === 'administered' ? 'Dr. Marco Ferretti' : null,
            notAdministeredReason: null,
          };
        }),
      }));
    const total = slotPatients.reduce((s, p) => s + p.administrations.length, 0);
    const administered = slotPatients.reduce(
      (s, p) => s + p.administrations.filter((a) => a.status === 'administered').length,
      0,
    );
    return {
      id: `${date}-${fascia}`,
      fascia,
      label,
      ora,
      summary: { total, administered, notAdministered: 0, pending: total - administered },
      patients: slotPatients,
    };
  });
}

function cartella(p) {
  const id = (k) => `${p.id}-${k}`;
  return {
    pazienteId: p.id,
    indirizzo: p.address,
    contattoEmergenzaNome: 'Familiare di riferimento',
    contattoEmergenzaTel: '3331112223',
    contattoEmergenzaRel: 'figlio/a',
    medicoCurante: 'Dr. Curante',
    codiceFiscale: p.codiceFiscale,
    operatoreId: 'op1',
    cameraNumero: p.location.room,
    lettoNumero: p.location.bed,
    repartoRicovero: 'Cardiologia',
    statoRicovero: 'ricoverato',
    dataRicovero: TODAY,
    noteGenerali: 'Paziente sintetico per misure di performance.',
    anamnesi: {
      fisiologica: 'Nella norma.',
      patologicaRemota: 'Ipertensione arteriosa dal 2010.',
      patologicaProssima: 'Scompenso cardiaco lieve.',
      familiare: 'Cardiopatia ischemica (padre).',
      lavorativa: 'Pensionato.',
      abitudini: 'Ex fumatore.',
      note: '',
      updatedAt: NOW,
      operatore: 'Dr. Marco Ferretti',
    },
    diagnosi: [0, 1, 2].map((k) => ({
      id: id(`dx${k}`),
      codiceICD: `I${10 + k}`,
      descrizione: ['Ipertensione arteriosa', 'Scompenso cardiaco', 'Diabete mellito tipo 2'][k],
      tipo: k === 0 ? 'principale' : 'secondaria',
      stato: 'attiva',
      dataInsorgenza: '2024-01-10',
      operatore: 'Dr. Marco Ferretti',
      note: '',
      createdAt: NOW,
    })),
    terapie: [],
    farmaci: DRUGS.slice(0, 5).map((d, k) => ({
      id: id(`f${k}`),
      nome: d.split(' ')[0],
      dose: d.split(' ').slice(1).join(' '),
      frequenza: '1 cp x 2/die',
      via: 'orale',
      inizio: TODAY,
      stato: 'attivo',
      prescrittoDA: 'Dr. Marco Ferretti',
    })),
    allergie: [
      {
        id: id('al0'),
        allergene: 'Penicillina',
        reazione: 'Orticaria',
        gravita: 'grave',
        documentato: TODAY,
        documentatoDa: 'Dr. Marco Ferretti',
      },
    ],
    allergieStatus: 'presenti',
    noteClinica: [0, 1, 2, 3].map((k) => ({
      id: id(`nc${k}`),
      tipo: 'clinica',
      contenuto: `Nota clinica sintetica ${k + 1}: paziente stabile, prosegue terapia.`,
      operatore: 'Dr. Marco Ferretti',
      createdAt: NOW,
    })),
    visite: [0, 1].map((k) => ({
      id: id(`v${k}`),
      tipo: 'Visita cardiologica',
      data: TODAY,
      ora: '09:00',
      operatore: 'Dr. Marco Ferretti',
      descrizione: 'Controllo periodico.',
      esito: 'Stabile.',
      createdAt: NOW,
    })),
    parametriVitali: Array.from({ length: 12 }, (_, k) => ({
      id: id(`pv${k}`),
      etichetta: ['PA', 'FC', 'SpO2', 'Temperatura'][k % 4],
      valore: ['130/80', '72', '97', '36.6'][k % 4],
      unita: ['mmHg', 'bpm', '%', '°C'][k % 4],
      stato: 'normale',
      rilevato: `${TODAY}T0${k % 9}:00`,
      rilevatoDa: 'Inf. Rossi',
    })),
    interventi: [],
    pianoCura: {
      obiettivi: 'Stabilizzazione emodinamica.',
      interventiPrevisti: 'Monitoraggio PA.',
      notePianificazione: '',
      dataAggiornamento: TODAY,
      operatore: 'Dr. Marco Ferretti',
    },
    indicatoriRischio: [
      {
        id: id('r0'),
        tipo: 'caduta',
        livello: 'alto',
        descrizione: 'Deambulazione instabile',
        dataValutazione: TODAY,
        operatore: 'Inf. Rossi',
      },
      {
        id: id('r1'),
        tipo: 'lesioni_pressione',
        livello: 'medio',
        descrizione: 'Allettamento parziale',
        dataValutazione: TODAY,
        operatore: 'Inf. Rossi',
      },
    ],
    presaInCarico: undefined,
    documentiConsegnati: [],
    diarioInfermieristico: [],
    diarioMedico: [],
    medicazioniFerite: [],
    contenzioni: [],
    valutazioniBraden: [],
    dimissione: undefined,
    liberatoria: undefined,
  };
}

function rooms(forPatientId) {
  const out = [];
  for (let r = 0; r < Math.ceil(NPAT / 2); r++) {
    const numero = String(101 + r);
    out.push({
      id: `room${numero}`,
      numero,
      tipo: 'doppia',
      piano: '1',
      reparto: 'Cardiologia',
      stato: 'attiva',
      note: '',
      beds: ['A', 'B'].map((label) => {
        const occupant = patients.find(
          (p) => p.location.room === numero && p.location.bed === label,
        );
        return {
          id: `bed${numero}${label}`,
          label,
          stato: 'libero',
          availability: occupant
            ? occupant.id === forPatientId
              ? 'current'
              : 'occupied'
            : 'available',
          assignments:
            occupant && !forPatientId
              ? [
                  {
                    patientId: occupant.id,
                    patient: { firstName: occupant.firstName, lastName: occupant.lastName },
                  },
                ]
              : [],
        };
      }),
    });
  }
  return out;
}

const rosterMetadata = {
  context: { id: 'ctx-cardio', label: 'Cardiologia', version: '1' },
  order: { criterion: 'name', direction: 'asc' },
  source: 'department',
  revision: '1',
  temporary: false,
  asOf: TODAY,
  epoch: { roster: '1', therapy: '1' },
};
const rosterPreference = {
  context: { id: 'ctx-cardio', label: 'Cardiologia', version: '1' },
  default: { criterion: 'name', direction: 'asc' },
  override: null,
  effective: { criterion: 'name', direction: 'asc' },
  source: 'department',
  revision: '1',
  canEdit: true,
  canEditDefault: false,
  temporary: false,
  reason: null,
};

function pageOf(list, cursor, limit) {
  const start = cursor ? Number(cursor) : 0;
  const items = list.slice(start, start + limit);
  const hasMore = start + limit < list.length;
  return { items, hasMore, nextCursor: hasMore ? String(start + limit) : null };
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

let requestCount = 0;
const server = http.createServer(async (req, res) => {
  const started = Date.now();
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const q = url.searchParams;
  requestCount += 1;
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  };
  if (PREFLIGHT_MAX_AGE) headers['Access-Control-Max-Age'] = String(PREFLIGHT_MAX_AGE);

  await sleep(LAT);
  const send = (status, body) => {
    res.writeHead(status, { ...headers, 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
    if (VERBOSE)
      console.log(`${req.method} ${path}${url.search} -> ${status} ${Date.now() - started}ms`);
  };
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    if (VERBOSE) console.log(`OPTIONS ${path} -> 204`);
    return;
  }

  const role = (req.headers['x-operator-role'] || 'operatore').toString();
  const opId = (req.headers['x-operator-id'] || 'op1').toString();
  const m = (re) => path.match(re);
  let mm;

  if (path === '/health') return send(200, { status: 'ok' });
  // Test control: mutate a patient's fields so a revalidation can be observed (AC3 evidence).
  if (path.startsWith('/__stub/patient/') && req.method === 'POST') {
    const p = byId.get(decodeURIComponent(path.slice('/__stub/patient/'.length)));
    if (!p) return send(404, { error: 'not found' });
    Object.assign(p, await readBody(req));
    return send(200, p);
  }
  if (path === '/auth/status') return send(200, { mode: 'demo', temporaryDemo: false });
  if (path === '/auth/me')
    return send(200, {
      id: opId,
      role,
      name: role === 'admin' ? 'Admin Sistema' : 'Dr. Marco Ferretti',
      authMode: 'demo',
      temporaryDemo: false,
    });
  if (path === '/me/roster-order') return send(200, rosterPreference);

  if (path === '/patients/page' || path === '/patients/page/search') {
    const body = req.method === 'POST' ? await readBody(req) : {};
    const get = (k) => body[k] ?? q.get(k);
    const limit = Math.min(100, Number(get('limit') || 50));
    const sex = get('sex');
    const query = (get('q') || '').toString().toLowerCase();
    let list = sortedPatients;
    if (sex) list = list.filter((p) => p.sex === sex);
    if (query)
      list = list.filter((p) =>
        `${p.firstName} ${p.lastName} ${p.codiceFiscale}`.toLowerCase().includes(query),
      );
    const direction = get('direction') || 'asc';
    if (direction === 'desc') list = [...list].reverse();
    const page = pageOf(list, get('cursor'), limit);
    return send(200, {
      roster: { ...rosterMetadata, order: { criterion: get('sort') || 'name', direction } },
      ...page,
    });
  }
  if (path === '/patients/clinical-summary/overview')
    return send(200, {
      totalPatients: NPAT,
      critici: 3,
      rischiAlti: 5,
      ricoverati: Math.round(NPAT * 0.7),
      dimessi: Math.round(NPAT * 0.1),
      allergieGravi: 4,
      terapieTotali: NPAT * 3,
      terapieCompletate: NPAT,
    });
  if (path === '/patients/clinical-summary') {
    const ids = (q.get('patientIds') || '').split(',').filter(Boolean);
    return send(200, ids.map((id) => summaryById.get(id)).filter(Boolean));
  }
  if (path === '/patients/settings') return send(200, { deleteEnabled: false });
  if ((mm = m(/^\/patients\/([^/]+)$/))) {
    const p = byId.get(decodeURIComponent(mm[1]));
    return p ? send(200, p) : send(404, { error: 'not found' });
  }
  if ((mm = m(/^\/patients\/([^/]+)\/cartella$/))) {
    const p = byId.get(decodeURIComponent(mm[1]));
    return p
      ? send(200, { patientId: p.id, data: cartella(p) })
      : send(404, { error: 'not found' });
  }
  if ((mm = m(/^\/patients\/([^/]+)\/room-options$/)))
    return send(200, rooms(decodeURIComponent(mm[1])));
  if ((mm = m(/^\/patients\/([^/]+)\/intake-review$/)))
    return send(200, {
      draftId: null,
      deferredTherapies: [],
      sourceDocumentIds: [],
      legacyPainDrafts: null,
      legacyPainError: null,
    });
  if ((mm = m(/^\/patients\/([^/]+)\/therapies$/))) return send(200, []);
  if ((mm = m(new RegExp('^/patients/([^/]+)/diary$')))) {
    const pid = decodeURIComponent(mm[1]);
    const entries = Array.from({ length: 12 }, (_, k) => ({
      id: `d-${pid}-${k}`,
      patientId: pid,
      authorType: ['medico', 'infermiere', 'oss'][k % 3],
      authorName: ['Dr. Marco Ferretti', 'Inf. Laura Rossi', 'OSS Paolo Verdi'][k % 3],
      title: k % 4 === 0 ? 'Controllo parametri' : null,
      content: `Voce di diario sintetica n. ${k + 1}: paziente vigile, parametri nella norma, prosegue terapia come da prescrizione.`,
      priority: k % 5 === 0 ? 'importante' : 'normale',
      status: k % 3 === 0 ? 'completata' : 'aperta',
      entryDateTime: `${TODAY}T${String(8 + k).padStart(2, '0')}:00`,
      category: null,
      createdAt: NOW,
      updatedAt: NOW,
    }));
    return send(200, { entries, hasMore: false, nextCursor: null });
  }
  if ((mm = m(/^\/patients\/([^/]+)\/documents$/))) return send(200, []);
  if ((mm = m(new RegExp('^/patients/([^/]+)/narrative-sections$')))) {
    const keys = ['anamnesi', 'esame_obiettivo', 'diagnosi', 'terapia_in_atto', 'note_cliniche'];
    return send(200, {
      sections: keys.map((sectionKey, k) => ({
        sectionKey,
        title: sectionKey.replace('_', ' '),
        originalText: `Testo originale sintetico della sezione ${k + 1}, importato dalla lettera di dimissione.`,
        reviewedText: '',
        displayText: `Testo sintetico della sezione ${k + 1}: quadro clinico stabile, terapia confermata.`,
        annotations: [],
        sourceReferences: [],
        reviewStatus: 'da_verificare',
      })),
    });
  }
  if ((mm = m(/^\/patients\/([^/]+)\/room-assignments$/))) return send(200, []);

  if (path === '/consegne/overview') {
    const active = consegne.filter((c) => c.stato !== 'completata');
    return send(200, {
      scope: role === 'admin' ? 'facility' : 'operator',
      summary: consegnaSummary(consegne),
      urgentPreview: active.filter((c) => c.priorita === 'urgente').slice(0, 5),
      openPreview: active.slice(0, 5),
      byOperator: Object.fromEntries(operators.map((o) => [o.id, 5])),
    });
  }
  if (path === '/consegne') {
    let list = consegne;
    const status = q.get('status');
    if (status === 'attive') list = list.filter((c) => c.stato !== 'completata');
    else if (status) list = list.filter((c) => c.stato === status);
    if (q.get('patientId')) list = list.filter((c) => c.pazienteId === q.get('patientId'));
    const page = pageOf(list, q.get('cursor'), Number(q.get('limit') || 20));
    return send(200, {
      items: page.items,
      pageInfo: { hasMore: page.hasMore, nextCursor: page.nextCursor },
      summary: consegnaSummary(list),
    });
  }
  if (path === '/notes') {
    const box = q.get('box') || 'all';
    let list = notes;
    if (box === 'unread') list = list.filter((n) => n.stato === 'non_letta');
    const page = pageOf(list, q.get('cursor'), Number(q.get('limit') || 50));
    return send(200, {
      items: page.items,
      pageInfo: { hasMore: page.hasMore, nextCursor: page.nextCursor },
      summary: { unread: notes.filter((n) => n.stato === 'non_letta').length },
    });
  }
  if (path === '/operators/directory/page' || path === '/operators/page') {
    const page = pageOf(operators, q.get('cursor'), Number(q.get('limit') || 100));
    return send(200, {
      items: page.items,
      pageInfo: { hasMore: page.hasMore, nextCursor: page.nextCursor },
      summary: {
        total: operators.length,
        active: operators.length,
        matching: operators.length,
        appointmentsToday: 12,
      },
    });
  }
  if (path === '/operators') return send(200, operators);
  if (path === '/operators/schedules') return send(200, []);
  if (path === '/appointments') {
    const from = q.get('from') || TODAY;
    const to = q.get('to') || TODAY;
    const opFilter = q.get('operatorId');
    let list = appointments.filter((a) => a.data >= from && a.data <= to);
    if (opFilter) list = list.filter((a) => a.operatorId === opFilter);
    return send(200, list);
  }
  if (path === '/therapy-slots') return send(200, therapySlots(q.get('date') || TODAY));
  if (path === '/therapy-slots/page') {
    const slots = therapySlots(q.get('date') || TODAY);
    return send(200, {
      slots,
      roster: rosterMetadata,
      pageInfo: {
        hasMore: false,
        nextCursor: null,
        loadedTherapies: NPAT * 3,
        completeness: 'complete',
        summaryExact: true,
      },
    });
  }
  if (path === '/admin/rooms') return send(200, rooms());
  if (path === '/admin/rooms/occupancy') return send(200, { rooms: rooms().length });
  if (path === '/ai/extraction/status')
    return send(200, { available: false, provider: 'stub', model: 'stub', errors: [] });
  if (path === '/farmaci/cerca') return send(200, { query: q.get('q') || '', esiti: [] });
  if (path.startsWith('/admin/roster-contexts'))
    return send(200, {
      items: [
        {
          id: 'ctx-cardio',
          label: 'Cardiologia',
          default: { criterion: 'name', direction: 'asc' },
          version: '1',
        },
      ],
      hasMore: false,
      nextCursor: null,
    });

  if ((mm = m(new RegExp('^/patients/([^/]+)/therapies/page$')))) {
    const p = byId.get(decodeURIComponent(mm[1]));
    if (!p) return send(404, { error: 'not found' });
    const items = DRUGS.slice(0, 4).map((d, k) => ({
      id: `th-${p.id}-${k}`,
      patientId: p.id,
      farmacoNome: d.split(' ')[0],
      dosaggio: d.split(' ').slice(1).join(' '),
      viaSomministrazione: 'orale',
      tipo: 'periodica',
      stato: k === 3 ? 'sospesa' : 'attiva',
      dataInizio: TODAY,
      dataFine: null,
      fasceMattina: true,
      fascePranzo: k % 2 === 0,
      fascePomeriggio: false,
      fasceSera: true,
      fasceNotte: false,
      orarioSpecifico: null,
      prescrittore: 'Dr. Marco Ferretti',
      operatoreInseritore: 'Dr. Marco Ferretti',
      note: null,
      dataSomministrazione: null,
      orarioSomministrazione: null,
      giorniSettimana: null,
      schedules: [],
      createdAt: NOW,
      updatedAt: NOW,
    }));
    return send(200, { items, summary: { total: 4, active: 3, inactive: 1 }, pageInfo: { hasMore: false, nextCursor: null } });
  }
  if ((mm = m(new RegExp('^/patients/([^/]+)/assessments/catalog$')))) {
    const types = ['painad', 'postural_transfers', 'tinetti', 'mna', 'gds15'];
    return send(200, {
      items: types.map((type) => ({
        type,
        formVersion: ASSESSMENT_VERSIONS[type],
        latestFinal: null,
        ownDraftCount: 0,
        latestOwnDraft: null,
      })),
    });
  }
  if (path === '/patients/parameters/page') {
    const limit = Number(q.get('limit') || 25);
    const page = pageOf(sortedPatients, q.get('cursor'), limit);
    return send(200, {
      roster: rosterMetadata,
      items: page.items.map((p) => ({
        patient: { id: p.id, medicalRecordNumber: p.medicalRecordNumber, firstName: p.firstName, lastName: p.lastName, codiceFiscale: p.codiceFiscale, dateOfBirth: p.dateOfBirth, location: p.location },
        cartella: { pazienteId: p.id, parametriMensili: [], cameraNumero: p.location.room, lettoNumero: p.location.bed, readingCount: 2, noteCount: 0, lastReadingAt: null },
      })),
      hasMore: page.hasMore,
      nextCursor: page.nextCursor,
    });
  }
  if (path === '/consegne/patient-summary' && req.method === 'POST') {
    const body = await readBody(req);
    const ids = Array.isArray(body.patientIds) ? body.patientIds : [];
    return send(200, {
      items: ids.map((patientId) => {
        const mine = consegne.filter((c) => c.pazienteId === patientId);
        const open = mine.filter((c) => c.stato !== 'completata');
        return { patientId, total: mine.length, open: open.length, urgentOpen: open.filter((c) => c.priorita === 'urgente').length, statoRicovero: summaryById.get(patientId)?.statoRicovero ?? null };
      }),
    });
  }

  console.log(`[stub] UNHANDLED ${req.method} ${path}${url.search}`);
  return send(404, { error: `stub: ${req.method} ${path} not implemented` });
});

server.listen(PORT, () => {
  console.log(
    `[stub] listening on :${PORT} latency=${LAT}ms patients=${NPAT} preflightMaxAge=${PREFLIGHT_MAX_AGE ?? 'none'}`,
  );
});
setInterval(() => {
  if (VERBOSE) console.log(`[stub] requests so far: ${requestCount}`);
}, 30000).unref();
