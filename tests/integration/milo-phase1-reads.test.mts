// Milo fase 1: le letture nuove su un database reale (tutte le migrazioni, dati sintetici).
//   - i parametri della pagina Parametri e quelli storici della cartella arrivano insieme;
//   - NEWS2 calcolato dal backend sulle rilevazioni complete;
//   - scale finalizzate, somministrazioni, turni e agenda, con i loro limiti di perimetro;
//   - `query_data` sul paziente corrente; le domande dei criteri arrivano allo strumento giusto.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import {
  closeParameterPrisma,
  fixtureActors,
  fixturePatientIds,
  seedParameterDatabase,
  selectLocalParameterDatabase,
  startParameterDatabase,
} from '../fixtures/parameter-database.mjs';

let database: Awaited<ReturnType<typeof startParameterDatabase>>;
let prisma: typeof import('../../backend/src/lib/prisma.js').prisma;
let reads: typeof import('../../backend/src/ai/gateway/clinical-reads.js');
let assistant: typeof import('../../backend/src/ai/assistant/service.js');
const [anna, bruno, outside] = fixturePatientIds;
const ENV = { ...process.env, AI_FACILITY_QUERIES_ENABLED: 'true' };
const ctx = () => ({
  userId: fixtureActors.operator.id,
  tenantId: 'clinicos',
  roles: ['operatore'],
  permittedPatientIds: [anna, bruno],
  requestId: 'milo-phase1-test',
});
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000).toISOString();
const dayOffset = (d: number) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(new Date(Date.now() + d * 86400000))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
};

before(
  async () => {
    database = await startParameterDatabase();
    await seedParameterDatabase(database.db);
    selectLocalParameterDatabase(database.url);
    process.env.AI_DEFAULT_TENANT = 'clinicos';
    ({ prisma } = await import('../../backend/src/lib/prisma.js'));
    reads = await import('../../backend/src/ai/gateway/clinical-reads.js');
    assistant = await import('../../backend/src/ai/assistant/service.js');
    const db = database.db;
    const op = fixtureActors.operator.id;
    // Pagina Parametri: una rilevazione completa (NEWS2 6 = medio: FC 2, SpO₂ 2, FR 2) e una incompleta più recente.
    await db.query(
      `INSERT INTO "PatientParameterReading" ("id","patientId","requestId","measuredAt","values","authorOperatorId","authorName")
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,'Operatrice QA'), ($7,$2,$8,$9,$10::jsonb,$6,'Operatrice QA')`,
      [
        'r-complete',
        anna,
        '11111111-1111-4111-8111-111111111111',
        hoursAgo(10),
        JSON.stringify({
          pa: '150/90',
          fc: '115',
          spo2: '93',
          fr: '22',
          temperatura: '37,0',
          o2: 'no',
          coscienza: 'A',
        }),
        op,
        'r-recent',
        '22222222-2222-4222-8222-222222222222',
        hoursAgo(2),
        JSON.stringify({ pa: '140/85', spo2: '95' }),
      ],
    );
    // JSON storico della cartella: una pressione di tre giorni fa.
    await db.query(
      `UPDATE "Cartella" SET "data" = jsonb_set("data", '{parametriVitali}', $2::jsonb) WHERE "patientId" = $1`,
      [
        anna,
        JSON.stringify([
          {
            id: 'legacy-pa',
            etichetta: 'PA',
            valore: '160/95',
            unita: 'mmHg',
            rilevato: hoursAgo(72),
          },
        ]),
      ],
    );
    // Turni: l'operatrice lavora il giorno di domani; il responsabile mai.
    const tomorrowWeekday = [
      'domenica',
      'lunedi',
      'martedi',
      'mercoledi',
      'giovedi',
      'venerdi',
      'sabato',
    ][new Date(`${dayOffset(1)}T12:00:00Z`).getUTCDay()];
    const week = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'].map(
      (giorno) => ({
        giorno,
        oraInizio: '07:00',
        oraFine: '14:00',
        disponibile: giorno === tomorrowWeekday,
      }),
    );
    await db.query(
      `INSERT INTO "OperatorSchedule" ("id","operatorId","data","updatedAt") VALUES ('sched-op',$1,$2::jsonb,now())`,
      [op, JSON.stringify({ turni: week, note: '' })],
    );
    await db.query(`UPDATE "Operator" SET "ruolo" = 'infermiere' WHERE "id" = $1`, [op]);
    await db.query(`UPDATE "Operator" SET "ruolo" = 'medico' WHERE "id" = $1`, [
      fixtureActors.manager.id,
    ]);
    // Agenda: una visita del medico domani per Anna, una per il paziente fuori perimetro.
    for (const [id, patient] of [
      ['app-anna', anna],
      ['app-outside', outside],
    ])
      await db.query(
        `INSERT INTO "Appointment" ("id","patientId","operatorId","createdByUserId","scheduledAt","reason","notes","updatedAt")
         VALUES ($1,$2,$3,$4,$5,'Motivo riservato','Nota riservata',now())`,
        [
          id,
          patient,
          fixtureActors.manager.id,
          `${fixtureActors.manager.id}-USER`,
          `${dayOffset(1)}T09:30:00.000Z`,
        ],
      );
    // Somministrazione programmata di ieri.
    await db.query(
      `INSERT INTO "MedicationAdministration" ("id","patientId","farmacoNome","farmacoDose","date","fascia","ora","stato","operatoreNome","updatedAt")
       VALUES ('adm-1',$1,'Ramipril','5 mg',$2,'mattina','08:00','erogata','Operatrice QA',now())`,
      [anna, dayOffset(-1)],
    );
  },
  { timeout: 120000 },
);

after(async () => {
  if (prisma) await closeParameterPrisma(prisma);
  await database?.close();
});

test('parameters page readings and the legacy chart vitals come back together', async () => {
  const items = await reads.getTableVitalItems({ patientId: anna, label: 'PA' }, ctx());
  assert.deepEqual(
    items.data.map((i) => i.valore),
    ['140/85', '150/90'],
  );
  const overview = await reads.getPatientParameters({ patientId: anna, days: 7 }, ctx());
  const o = overview.data[0];
  assert.deepEqual(
    o.readings.map((r) => [r.source, r.values.pa]),
    [
      ['parametri', '140/85'],
      ['parametri', '150/90'],
      ['cartella', '160/95'],
    ],
  );
  const sys = o.series.find((s) => s.key === 'pa_sistolica')!;
  assert.equal(sys.count, 3);
  assert.equal(sys.min, 140);
  assert.equal(sys.max, 160);
  assert.equal(sys.change, -20);
  assert.ok(overview.sourceRefs.length === 3);
  // The assistant's existing vitals question now sees the parameters page as well.
  const answer = await assistant.assistantQuery(
    'ultimi parametri',
    ctx(),
    { currentPatientId: anna },
    ENV,
  );
  assert.equal(answer.intent, 'vitals_recent');
  const values = (answer.results as Array<{ valore?: string }>).map((r) => r.valore);
  assert.ok(values.includes('140/85') && values.includes('160/95'), JSON.stringify(values));
});

test('NEWS2 is computed by the backend on the latest complete reading, with its source', async () => {
  const r = await reads.getPatientNews2({ patientId: anna }, ctx());
  const o = r.data[0];
  assert.equal(o.latest?.readingId, 'r-complete');
  assert.equal(o.latest?.result.total, 6);
  assert.equal(o.latest?.result.risk, 'medio');
  assert.deepEqual(o.latestIncomplete?.missing.sort(), [
    'coscienza',
    'fc',
    'fr',
    'o2',
    'temperatura',
  ]);
  assert.match(o.source.reference, /Royal College of Physicians/);
  assert.equal(r.sourceRefs[0].sourceType, 'CLINICAL_SCORE');
});

test('administrations, diary and assessments stay inside the patient scope', async () => {
  const adm = await reads.getPatientAdministrations({ patientId: anna, days: 3 }, ctx());
  assert.deepEqual(
    adm.data.map((a) => [a.drug, a.status]),
    [['Ramipril', 'erogata']],
  );
  for (const read of [
    () => reads.getPatientAdministrations({ patientId: outside }, ctx()),
    () => reads.getPatientParameters({ patientId: outside }, ctx()),
    () => reads.getPatientNews2({ patientId: outside }, ctx()),
    () => reads.getPatientAssessments({ patientId: outside }, ctx()),
  ])
    await assert.rejects(read(), /Patient not accessible/);
  const assessments = await reads.getPatientAssessments({ patientId: anna }, ctx());
  assert.deepEqual(assessments.data, []); // only FINAL assessments count; none here
});

test('shifts: who works tomorrow, organisational fields only', async () => {
  const r = await reads.queryStaffShifts({ date: dayOffset(1) }, ctx(), ENV);
  assert.deepEqual(
    r.data.map((s) => [s.operator, s.oraInizio, s.oraFine, s.ruolo]),
    [['Operatrice QA', '07:00', '14:00', 'infermiere']],
  );
  assert.deepEqual(Object.keys(r.data[0]).sort(), [
    'data',
    'giorno',
    'operator',
    'oraFine',
    'oraInizio',
    'qualifica',
    'reparto',
    'ruolo',
  ]);
  const today = await reads.queryStaffShifts({ date: dayOffset(0) }, ctx(), ENV);
  assert.equal(today.data.length, 0);
  await assert.rejects(
    reads.queryStaffShifts({}, ctx(), { ...ENV, AI_FACILITY_QUERIES_ENABLED: 'false' }),
    /non abilitate/,
  );
});

test('agenda: tomorrow doctor visits in scope, never reason or notes', async () => {
  const r = await reads.queryAgenda({ from: dayOffset(1), ruolo: 'medico' }, ctx(), ENV);
  assert.deepEqual(
    r.data.map((a) => [a.patientId, a.operator]),
    [[anna, 'Responsabile QA']],
  );
  assert.ok(!JSON.stringify(r.data).includes('riservat'));
});

test('questions from the acceptance criteria reach the right tool end to end', async () => {
  const cases: Array<[string, string, Record<string, unknown>]> = [
    ['chi è di turno domani?', 'staff_shifts', {}],
    ['quando passa il medico domani?', 'agenda', {}],
    ['NEWS2 di questo paziente', 'clinical_score', { currentPatientId: anna }],
    ['somministrazioni degli ultimi 3 giorni', 'administrations', { currentPatientId: anna }],
    [
      'andamento di pressione e frequenza cardiaca nell ultimo mese',
      'parameters_overview',
      {
        currentPatientId: anna,
      },
    ],
  ];
  for (const [question, intent, planCtx] of cases) {
    const answer = await assistant.assistantQuery(question, ctx(), planCtx, ENV);
    assert.equal(answer.intent, intent, question);
    assert.equal(answer.refusal, undefined, question);
    assert.ok(answer.results.length > 0, question);
  }
});

test('query_data with patient "current" returns the open patient rows', async () => {
  const rows = await assistant.dispatchQueryData(
    {
      steps: [
        {
          id: 's1',
          from: 'vitalSign',
          filter: [{ field: 'patient', op: 'eq', value: 'current' }],
          select: ['etichetta', 'valore'],
        },
      ],
      answer: { primaryStep: 's1' },
    },
    ctx(),
    ENV,
    anna,
  );
  assert.ok(rows.data.length > 0);
});

test('query_data on appointments: a date without zone is facility time, garbage is refused before the database (no 500)', async () => {
  const plan = (value: unknown) => ({
    steps: [
      {
        id: 's1',
        from: 'appointment',
        filter: [{ field: 'scheduledAt', op: 'lt', value }],
        select: ['id', 'scheduledAt'],
      },
    ],
    answer: { primaryStep: 's1' },
  });
  const rows = await assistant.dispatchQueryData(plan(`${dayOffset(2)}T00:00:00`), ctx(), ENV);
  assert.ok(
    (rows.data as Array<{ id: string }>).some((r) => r.id === 'app-anna'),
    JSON.stringify(rows.data),
  );
  // Valore non interpretabile: richiesta rifiutata prima del database, risposta vuota (mai 500).
  const garbage = await assistant.dispatchQueryData(plan('dopodomani'), ctx(), ENV);
  assert.deepEqual(garbage.data, []);

});
