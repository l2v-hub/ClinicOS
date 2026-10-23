import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  buildAdminAttention,
  operatorsOnDuty,
  parseAttentionSchedules,
} from '../adminAttentionModel';
import { AdminAttentionList } from '../AdminAttentionList';
import { AdminDashboard } from '../AdminDashboard';
import type { Operatore, ScheduleOperatore } from '../../../types';
import type { UnreadDiaryEntry } from '../../../lib/diaryUnreadQueue';
import type { DashboardTherapySummary, ScadenzaTerapia } from '../../../lib/dashboardTherapies';
import { setSessionCapabilities } from '../../../lib/capabilities';

function urgency(
  sourceId: string,
  sourceType: 'diary' | 'consegna',
  entryDateTime = '2026-10-17T08:00',
): UnreadDiaryEntry {
  return {
    id: sourceType === 'consegna' ? `consegna:${sourceId}` : sourceId,
    sourceId,
    sourceType,
    patientId: 'synthetic-patient',
    identity: null,
    entryDateTime,
    authorName: 'Autore sintetico',
    title: 'Valutazione urgente',
    content: 'Nota sintetica',
    priority: 'urgente',
    status: 'attiva',
    readReceipt: { state: 'unread', canAcknowledge: true, isAuthor: false, readBy: null },
    urgency: { state: 'active', isAuthor: false, canAcknowledge: true, takenBy: null },
  } as UnreadDiaryEntry;
}
function dose(id: string, data: string, minuti: number | null): ScadenzaTerapia {
  return {
    id,
    data,
    minuti,
    patientId: 'synthetic-patient',
    nome: 'Persona Sintetica',
    camera: '',
    letto: '',
    therapyId: `therapy-${id}`,
    fascia: 'mattina',
    farmaco: 'Farmaco sintetico',
    dose: '1 compressa',
    via: 'orale',
    ora: minuti === null ? null : '08:00',
  };
}
const emptyTherapies = (): DashboardTherapySummary => ({
  totale: 0,
  daFare: 0,
  fatte: 0,
  nonErogate: 0,
  inRitardo: 0,
  ritardi: [],
  prossime: [],
  scadute: [],
  senzaOrario: [],
  data: '2026-10-17',
});
function operator(id: string, stato: 'attivo' | 'inattivo' = 'attivo'): Operatore {
  return {
    id,
    nome: 'Nome',
    cognome: 'Sintetico',
    ruolo: 'infermiere',
    email: '',
    telefono: '',
    reparto: '',
    stato,
    pazientiAssegnati: 2,
    appuntamentiOggi: 0,
    iniziali: 'NS',
    colore: '#2563eb',
  };
}
function schedule(
  operatoreId: string,
  giorno: 'venerdi' | 'sabato' | 'domenica' = 'sabato',
  oraInizio = '08:00',
  oraFine = '16:00',
): ScheduleOperatore {
  return {
    id: `schedule-${operatoreId}`,
    operatoreId,
    note: '',
    turni: [{ giorno, oraInizio, oraFine, disponibile: true }],
  };
}

test('456 unified queue includes diary and handover, excludes own and already acknowledged urgencies', () => {
  const diary = urgency('diary', 'diary');
  const handover = urgency('handover', 'consegna');
  const own = {
    ...urgency('own', 'diary'),
    urgency: { state: 'active', isAuthor: true, canAcknowledge: false, takenBy: null },
  } as UnreadDiaryEntry;
  const taken = {
    ...urgency('taken', 'consegna'),
    urgency: { state: 'taken', isAuthor: false, canAcknowledge: false, takenBy: null },
  } as UnreadDiaryEntry;
  const rows = buildAdminAttention({
    urgencies: [diary, handover, own, taken],
    therapies: null,
    clinical: null,
  });
  assert.deepEqual(
    rows.map((row) => row.id),
    ['urgency:consegna:handover', 'urgency:diary'],
  );
  assert.deepEqual(rows.find((row) => row.id === 'urgency:diary')?.target, {
    patientId: 'synthetic-patient',
    landing: { tab: 'diario', diaryEntryId: 'diary' },
  });
  assert.deepEqual(rows[0].target, {
    patientId: 'synthetic-patient',
    landing: { tab: 'consegne', consegnaId: 'handover' },
  });
});

test('456 attention orders severity then oldest source time without mutating source queue', () => {
  const queue = [
    urgency('new', 'diary', '2026-10-17T09:00'),
    urgency('old', 'consegna', '2026-10-16T09:00'),
  ];
  const therapies = {
    ...emptyTherapies(),
    scadute: [dose('late', '2026-10-17', -60)],
    prossime: [dose('later', '2026-10-17', 60)],
  };
  const rows = buildAdminAttention({ urgencies: queue, therapies, clinical: null });
  assert.deepEqual(
    rows.map((row) => row.id),
    ['urgency:consegna:old', 'urgency:new', 'dose:late', 'dose:later'],
  );
  assert.equal(queue[0].sourceId, 'new');
});

test('456 tomorrow doses are absent even when mixed into every summary partition; today target is exact', () => {
  const therapies = {
    ...emptyTherapies(),
    scadute: [dose('today', '2026-10-17', -60), dose('bad-next-late', '2026-10-18', -60)],
    prossime: [dose('tomorrow', '2026-10-18', 1440)],
    senzaOrario: [dose('tomorrow-untimed', '2026-10-18', null)],
  };
  const rows = buildAdminAttention({ urgencies: [], therapies, clinical: null });
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].target, {
    patientId: 'synthetic-patient',
    landing: {
      tab: 'terapia-farmacologica',
      therapy: {
        subView: 'calendario',
        therapyId: 'therapy-today',
        date: '2026-10-17',
        fascia: 'mattina',
      },
    },
  });
  assert.match(rows[0].detail, /in ritardo/);
  assert.doesNotMatch(rows[0].detail, /Non disponibile|Camera|Letto/);
});

test('456 clinical overview uses truthful filtered-list actions and never invents patients or observation times', () => {
  const clinical = {
    totalPatients: 8,
    critici: 2,
    rischiAlti: 3,
    ricoverati: 8,
    dimessi: 0,
    allergieGravi: 0,
    terapieTotali: 0,
    terapieCompletate: 0,
  };
  const rows = buildAdminAttention({
    urgencies: [],
    therapies: null,
    clinical,
    anomalies: [
      {
        patientId: 'synthetic-patient',
        nome: 'Persona Sintetica',
        farmacoNome: 'Farmaco sintetico',
        therapyId: 'therapy-anomaly',
      },
    ],
  });
  assert.deepEqual(rows[0].target, { list: { signal: 'critici' } });
  assert.equal(rows[0].openedAt, null);
  assert.match(rows[0].title, /^2 pazienti/);
  assert.deepEqual(rows.find((row) => row.id === 'clinical:risk')?.target, {
    list: { signal: 'rischi' },
  });
  assert.deepEqual(rows.find((row) => row.id.startsWith('anomaly:'))?.target, {
    patientId: 'synthetic-patient',
    landing: {
      tab: 'terapia-farmacologica',
      therapy: { subView: 'calendario', therapyId: 'therapy-anomaly' },
    },
  });
});

test('456 every anomalous drug remains visible with its exact prescription target', () => {
  const rows = buildAdminAttention({
    urgencies: [],
    therapies: null,
    clinical: null,
    anomalies: ['one', 'two'].map((id) => ({
      patientId: 'synthetic-patient',
      nome: 'Persona Sintetica',
      farmacoNome: `Farmaco ${id}`,
      therapyId: `therapy-${id}`,
    })),
  });
  assert.equal(rows.length, 2);
  assert.equal(new Set(rows.map((row) => row.id)).size, 2);
  assert.deepEqual(
    rows.map((row) => row.title),
    ['Farmaco one', 'Farmaco two'],
  );
  assert.deepEqual(rows[1].target, {
    patientId: 'synthetic-patient',
    landing: {
      tab: 'terapia-farmacologica',
      therapy: { subView: 'calendario', therapyId: 'therapy-two' },
    },
  });
});

test('456 configured day shifts use Rome civil time and exclude inactive/unscheduled accounts', () => {
  const operators = [
    operator('day'),
    operator('inactive', 'inattivo'),
    operator('technical-admin'),
  ];
  const schedules = [schedule('day'), schedule('inactive')];
  assert.deepEqual(
    operatorsOnDuty(operators, schedules, new Date('2026-10-17T06:00:00Z')).map((row) => row.id),
    ['day'],
  );
  assert.deepEqual(operatorsOnDuty(operators, schedules, new Date('2026-10-17T14:00:00Z')), []);
});

test('456 overnight shifts include previous day tail and preserve DST repeated-hour attendance', () => {
  const operators = [operator('night')];
  const schedules = [schedule('night', 'sabato', '22:00', '06:00')];
  for (const instant of ['2026-10-24T20:00:00Z', '2026-10-25T00:30:00Z', '2026-10-25T01:30:00Z'])
    assert.deepEqual(
      operatorsOnDuty(operators, schedules, new Date(instant)).map((row) => row.id),
      ['night'],
    );
  assert.deepEqual(operatorsOnDuty(operators, schedules, new Date('2026-10-25T05:00:00Z')), []);
  assert.deepEqual(
    operatorsOnDuty(
      operators,
      [schedule('night', 'sabato', '08:00', '08:00')],
      new Date('2026-10-17T06:00:00Z'),
    ),
    [],
  );
});

test('456 malformed schedule responses fail closed instead of claiming on-duty staff', () => {
  const good = schedule('day');
  assert.deepEqual(parseAttentionSchedules([good]), [good]);
  for (const invalid of [
    null,
    {},
    [good, good],
    [{ ...good, turni: [...good.turni, ...good.turni] }],
    [{ ...good, turni: [{ ...good.turni[0], oraInizio: '99:00' }] }],
    [{ ...good, turni: [{ ...good.turni[0], disponibile: 'true' }] }],
  ])
    assert.throws(() => parseAttentionSchedules(invalid), /Orari non disponibili/);
});

test('456 attention renders actual source timestamp, source identity, single actionable count and escaped content', () => {
  const source = { ...urgency('source', 'diary'), title: '<script>alert(1)</script>' };
  const rows = buildAdminAttention({ urgencies: [source], therapies: null, clinical: null });
  const html = renderToStaticMarkup(
    createElement(AdminAttentionList, {
      rows,
      loading: false,
      uncertain: false,
      urgencyCount: 1,
      atLeast: false,
      onOpen: () => {},
    }),
  );
  assert.match(html, /data-admin-urgency-count="1"/);
  assert.match(html, /17\/10\/2026 08:00/);
  assert.match(html, /data-attention-id="urgency:source"/);
  assert.match(html, /Prendi in carico/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test('456 incomplete queue and unavailable queue never render definitive zero or false reassurance', () => {
  const common = { rows: [], loading: false, uncertain: true, onOpen: () => {} };
  const partial = renderToStaticMarkup(
    createElement(AdminAttentionList, { ...common, urgencyCount: 1, atLeast: true }),
  );
  const unavailable = renderToStaticMarkup(
    createElement(AdminAttentionList, { ...common, urgencyCount: null, atLeast: false }),
  );
  assert.match(partial, /1\+/);
  assert.match(partial, /alcune verifiche non sono complete/);
  assert.match(unavailable, /dato non disponibile/);
  assert.doesNotMatch(unavailable, /carico: 0|Nessuna attenzione rilevata/);
});

test('456 dashboard first screen omits passive KPI/alarm tiles, preserves clinical/room recovery and role-negative status', () => {
  setSessionCapabilities({});
  try {
    const html = renderToStaticMarkup(
      createElement(AdminDashboard, {
        operatori: [],
        consegneOverview: null,
        consegneOverviewState: 'error',
        camere: [],
        camereLoadState: 'error',
        camereLoadError: 'Lettura non riuscita',
        onRetryCamere: () => {},
        totalePazienti: 8,
        loadingPazienti: false,
        onNavigate: () => {},
        clinicalOverview: null,
        clinicalOverviewState: 'error',
        onRetryClinicalOverview: () => {},
      }),
    );
    assert.match(html, /Reparto adesso/);
    assert.match(html, /Richiede attenzione/);
    assert.match(html, /Riprova dati clinici/);
    assert.match(html, /Gli orari non sono disponibili per il tuo ruolo/);
    assert.doesNotMatch(
      html,
      /dashboard-kpi|DashboardNotificationCenter|Allarmi|Dimessi in archivio|Operatori attivi/,
    );
    assert.doesNotMatch(html, /Configura turni|Configura camere/);
  } finally {
    setSessionCapabilities(null);
  }
});
