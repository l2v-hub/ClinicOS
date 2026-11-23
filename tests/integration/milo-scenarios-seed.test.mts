// Dati di prova di Milo: il seed sintetico crea gli scenari dei casi d'uso, ripetibile senza duplicati.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import {
  closeParameterPrisma,
  selectLocalParameterDatabase,
  startParameterDatabase,
} from '../fixtures/parameter-database.mjs';

let database: Awaited<ReturnType<typeof startParameterDatabase>>;
let prisma: typeof import('../../backend/src/lib/prisma.js').prisma;

before(
  async () => {
    database = await startParameterDatabase();
    selectLocalParameterDatabase(database.url);
    ({ prisma } = await import('../../backend/src/lib/prisma.js'));
  },
  { timeout: 180000 },
);

after(async () => {
  if (prisma) await closeParameterPrisma(prisma);
  await database?.close();
});

const day = (offset: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

test(
  'seed twice: Milo scenarios exist once, with the data each use case needs',
  { timeout: 300000 },
  async () => {
    const { seedSyntheticData } = await import('../../backend/src/synthetic/index.js');
    await seedSyntheticData(prisma);
    const readingsAfterFirst = await prisma.patientParameterReading.count();
    await seedSyntheticData(prisma);
    assert.equal(await prisma.patientParameterReading.count(), readingsAfterFirst, 'no duplicates');

    // 1. Una settimana di parametri per Bassi, Ferrioli, Martini (mattina e sera).
    for (const patientId of ['SEED-PAZ-003', 'SEED-PAZ-001', 'SEED-PAZ-002']) {
      const rows = await prisma.patientParameterReading.findMany({
        where: { patientId, measuredAt: { gte: new Date(`${day(-7)}T00:00:00.000Z`) } },
      });
      assert.ok(rows.length >= 14, `${patientId}: ${rows.length}`);
    }
    const bassi = await prisma.patientParameterReading.findMany({
      where: { patientId: 'SEED-PAZ-003', requestId: { not: '' } },
      orderBy: { measuredAt: 'asc' },
    });
    const temps = bassi.map((r) =>
      Number(String((r.values as Record<string, string>).temperatura ?? '0')),
    );
    assert.ok(Math.max(...temps) >= 38, 'Bassi peggiora (febbre)');

    // 2. Chi ha registrato (infermiera e OSS con orari) e chi ha visitato (medico con orario).
    const authors = new Set(bassi.map((r) => r.authorOperatorId));
    assert.ok(authors.has('SEED-OP-001') && authors.has('SEED-OP-002'));
    for (const id of ['SEED-OP-001', 'SEED-OP-002', 'SEED-OP-005'])
      assert.ok(await prisma.operatorSchedule.findUnique({ where: { operatorId: id } }), id);
    const visit = await prisma.appointment.findUnique({ where: { id: 'SEED-MILO-APP-001' } });
    assert.equal(visit?.status, 'COMPLETED');
    assert.equal(visit?.operatorId, 'SEED-OP-005');
    assert.equal(
      (await prisma.operator.findUnique({ where: { id: 'SEED-OP-005' } }))?.ruolo,
      'medico',
    );

    // 3. Singole e doppie con dimissioni previste nel futuro.
    const singles = await prisma.room.count({ where: { tipo: 'singola' } });
    assert.ok(singles >= 2);
    const planned = await prisma.patientRoomAssignment.findMany({
      where: { endDate: { gte: day(0) } },
      include: { bed: { include: { room: true } } },
    });
    assert.ok(planned.some((a) => a.bed.room.tipo === 'singola'));
    assert.ok(planned.some((a) => a.bed.room.tipo === 'doppia'));

    // 5. Terapia conclusa ieri, prescritta dal medico.
    const therapy = await prisma.patientTherapy.findUnique({ where: { id: 'SEED-MILO-THER-001' } });
    assert.equal(therapy?.dataFine, day(-1));
    // Inserita dal profilo «Medico 1» della demo: riceve lui l'avviso di terapia completata.
    assert.equal(therapy?.operatoreInseritore, 'Medico 1');
  },
);

const ENV = { ...process.env, AI_FACILITY_QUERIES_ENABLED: 'true' };
const ctx = () => ({
  userId: 'SEED-OP-001',
  tenantId: 'clinicos',
  roles: ['operatore'],
  permittedPatientIds: null,
  requestId: 'milo-use-cases',
});

test(
  'use case 1: «come va il paziente Bassi… cosa devo controllare» → week values + protocol points',
  { timeout: 120000 },
  async () => {
    process.env.AI_DEFAULT_TENANT = 'clinicos';
    const { assistantQuery } = await import('../../backend/src/ai/assistant/service.js');
    const answer = await assistantQuery(
      "Come va il paziente Bassi mi dai i valori dell'ultima settimana. Cosa devo controllare che come dati è fondamentale indagare",
      ctx() as never,
      {},
      ENV,
    );
    assert.equal(answer.intent, 'patient_status');
    const overview = answer.results[0] as {
      patientId: string;
      readings: unknown[];
      attention: { points: Array<{ key: string; value: string }>; source: string };
    };
    assert.equal(overview.patientId, 'SEED-PAZ-003'); // risolto dal nome
    // Finestra mobile di 7 giorni: le rilevazioni di 7 giorni fa possono restarne fuori.
    assert.ok(overview.readings.length >= 12, String(overview.readings.length));
    const keys = overview.attention.points.map((p) => p.key);
    assert.ok(keys.includes('news2'), keys.join(','));
    assert.ok(keys.includes('news2_trend'));
    assert.ok(keys.some((k) => k.startsWith('param_')));
    assert.match(overview.attention.source, /NEWS2/);
    const titles = (answer.blocks ?? []).map((b) => b.title);
    assert.ok(titles.includes('Da controllare (promemoria da protocollo)'), titles.join(' | '));
    assert.ok(titles.includes('Andamento dei parametri'));
    assert.ok(titles.includes('Punteggio di allerta'));
  },
);

test(
  'use case 2: «chi ha fatto l’ultima visita e registrazione… i suoi turni» → people with shifts',
  { timeout: 120000 },
  async () => {
    const { assistantQuery } = await import('../../backend/src/ai/assistant/service.js');
    const answer = await assistantQuery(
      'Chi ha fatto ultimo visita e registrazione parametri del paziente Bassi, quali sono stati i suoi turni.',
      ctx() as never,
      {},
      ENV,
    );
    assert.equal(answer.intent, 'care_contacts');
    const c = answer.results[0] as {
      lastReading: { author: string; ruolo: string | null };
      lastVisit: { operator: string; ruolo: string | null; status: string };
      lastDoctorNote: { author: string };
      people: Array<{ name: string; turni: Array<{ oraInizio: string }> | null }>;
    };
    assert.equal(c.lastReading.author, 'Marco Rinaldi'); // rilevazione serale di ieri (OSS)
    assert.equal(c.lastReading.ruolo, 'oss');
    assert.deepEqual(
      [c.lastVisit.operator, c.lastVisit.ruolo, c.lastVisit.status],
      ['Stefano Galli', 'medico', 'COMPLETED'],
    );
    assert.equal(c.lastDoctorNote.author, 'Stefano Galli');
    const shiftsOf = (name: string) => c.people.find((p) => p.name === name)?.turni;
    assert.equal(shiftsOf('Marco Rinaldi')?.[0].oraInizio, '14:00');
    assert.equal(shiftsOf('Stefano Galli')?.[0].oraInizio, '08:00');
    // Il motivo della visita e il testo della nota non escono.
    assert.doesNotMatch(JSON.stringify(answer.results), /febbricola|saturazione in calo/);
    assert.ok(answer.sources.some((s) => s.sourceType === 'SHIFT'));
    assert.deepEqual(
      (answer.blocks ?? []).map((b) => b.title),
      ['Chi ha seguito il paziente', 'Turni settimanali'],
    );
  },
);

test(
  'use case 3: «quante camere sono occupate e quando si libera una singola e una doppia»',
  { timeout: 120000 },
  async () => {
    const { assistantQuery } = await import('../../backend/src/ai/assistant/service.js');
    const answer = await assistantQuery(
      'Quante camere sono occupate e quando si libererà una singola e una doppia',
      ctx() as never,
      {},
      ENV,
    );
    assert.equal(answer.intent, 'rooms_occupancy');
    const o = answer.results[0] as {
      perTipo: Array<{
        tipo: string;
        camere: number;
        camereOccupate: number;
        prossimoLettoLibero: { camera: string; data: string } | null;
        prossimaCameraLibera: { camera: string; data: string } | null;
      }>;
    };
    const singola = o.perTipo.find((t) => t.tipo === 'singola')!;
    const doppia = o.perTipo.find((t) => t.tipo === 'doppia')!;
    assert.deepEqual([singola.camere, singola.camereOccupate], [2, 2]);
    assert.deepEqual(
      singola.prossimoLettoLibero && [
        singola.prossimoLettoLibero.camera,
        singola.prossimoLettoLibero.data,
      ],
      ['103', day(3)],
    );
    assert.deepEqual([doppia.camere, doppia.camereOccupate], [5, 5]);
    assert.deepEqual(
      doppia.prossimoLettoLibero && [
        doppia.prossimoLettoLibero.camera,
        doppia.prossimoLettoLibero.data,
      ],
      ['202', day(2)],
    );
    assert.deepEqual(
      doppia.prossimaCameraLibera && [
        doppia.prossimaCameraLibera.camera,
        doppia.prossimaCameraLibera.data,
      ],
      ['202', day(5)],
    );
    // Nessun nome di paziente nei dati di occupazione.
    assert.doesNotMatch(JSON.stringify(answer.results), /Colombo|Esposito|Ricci|Greco|Bassi/);
    assert.deepEqual(
      (answer.blocks ?? []).map((b) => b.title),
      ['Camere per tipo', 'Dimissioni previste'],
    );
  },
);

test(
  'use case 4: one confirmed command writes one reading in the Parametri page',
  { timeout: 120000 },
  async () => {
    const { planCommand, executeCommand } =
      await import('../../backend/src/ai/actions/orchestrate.js');
    const { listParameterReadings } =
      await import('../../backend/src/patients/parameter-readings.js');
    const operatorCtx = {
      operatorId: 'SEED-OP-001',
      operatorName: 'Laura Bianchi',
      gatewayCtx: {
        userId: 'SEED-OP-001',
        tenantId: 'default',
        roles: ['manager'],
        permittedPatientIds: null,
        requestId: 'milo-case-4',
      },
    };
    const text =
      'Registra del paziente Bassi pressione 128 su 76, ha evacuato, stato vigile, battito 81';
    const planned = await planCommand({ text, channel: 'testo', operatorCtx });
    assert.equal(planned.plan.actionType, 'create_parameter_reading');
    assert.equal(planned.plan.patientId, 'SEED-PAZ-003');
    assert.equal(planned.preview?.canExecute, true);

    const before = await prisma.patientParameterReading.count({
      where: { patientId: 'SEED-PAZ-003' },
    });
    const input = {
      text,
      channel: 'testo' as const,
      idempotencyKey: '5b0c7f0e-3a53-4b62-9d0f-0c9a6a1d4e11',
      confirmed: true,
      operatorCtx,
    };
    const env = { AI_VOICE_ENABLED: 'true', AI_WRITE_ACTIONS_ENABLED: 'true' } as NodeJS.ProcessEnv;
    const { loadVoiceConfig } = await import('../../backend/src/ai/voice/config.js');
    const deps = { env, cfg: loadVoiceConfig(env) };
    const first = await executeCommand(input, deps);
    assert.equal(first.ok, true);
    assert.equal(first.deduped, false);
    const again = await executeCommand(input, deps);
    assert.equal(again.deduped, true);
    assert.equal(again.recordId, first.recordId);
    assert.equal(
      await prisma.patientParameterReading.count({ where: { patientId: 'SEED-PAZ-003' } }),
      before + 1,
      'one reading, no duplicate on a repeated confirmation',
    );

    // Lo storico della pagina Parametri mostra la rilevazione, con l'autore che ha confermato.
    const page = await listParameterReadings(
      'SEED-PAZ-003',
      {},
      { id: 'SEED-OP-001', role: 'manager' },
    );
    const row = page.readings.find((r: { id: string }) => r.id === first.recordId);
    assert.ok(row, 'reading listed by the Parametri page service');
    assert.deepEqual(row.values, { pa: '128/76', fc: '81', coscienza: 'A', evacuazione: 'Sì' });
    assert.equal(row.authorName, 'Laura Bianchi');
  },
);
