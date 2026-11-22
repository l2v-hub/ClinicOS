// Milo fase 3 — blocchi visivi su database reale (PGlite, tutte le migrazioni): percorso classico e
// team restituiscono blocchi costruiti dalle letture, con gli stessi valori del database.
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
let assistant: typeof import('../../backend/src/ai/assistant/service.js');
const [anna] = fixturePatientIds;
const ctx = () => ({
  userId: fixtureActors.operator.id,
  tenantId: 'clinicos',
  roles: ['operatore'],
  permittedPatientIds: [anna],
  requestId: 'milo-phase3-test',
});
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000).toISOString();

before(
  async () => {
    database = await startParameterDatabase();
    await seedParameterDatabase(database.db);
    selectLocalParameterDatabase(database.url);
    process.env.AI_DEFAULT_TENANT = 'clinicos';
    await database.db.query(
      `INSERT INTO "PatientParameterReading" ("id","patientId","requestId","measuredAt","values","authorOperatorId","authorName")
       VALUES ('b-r1',$1,'44444444-4444-4444-8444-444444444444',$2,$3::jsonb,$4,'Operatrice QA')`,
      [
        anna,
        hoursAgo(5),
        JSON.stringify({
          pa: '150/90',
          fc: '115',
          spo2: '93',
          fr: '22',
          temperatura: '37,0',
          o2: 'no',
          coscienza: 'A',
        }),
        fixtureActors.operator.id,
      ],
    );
    ({ prisma } = await import('../../backend/src/lib/prisma.js'));
    assistant = await import('../../backend/src/ai/assistant/service.js');
  },
  { timeout: 120000 },
);

after(async () => {
  if (prisma) await closeParameterPrisma(prisma);
  await database?.close();
});

test('classic path: parameters question returns kpi + trend with the database values', async () => {
  const answer = await assistant.assistantQuery(
    'come sono i parametri?',
    ctx(),
    { currentPatientId: anna },
    { ...process.env },
  );
  assert.equal(answer.intent, 'parameters_overview');
  const types = (answer.blocks ?? []).map((b) => b.type);
  assert.deepEqual(types, ['kpi', 'parameter_trend']);
  const trend = answer.blocks![1] as Extract<
    NonNullable<typeof answer.blocks>[number],
    { type: 'parameter_trend' }
  >;
  assert.equal(trend.patientId, anna);
  const r = trend.readings.find((x) => x.id === 'b-r1');
  assert.equal(r?.values.pa, '150/90');
  assert.equal(r?.author, 'Operatrice QA');
});

test('classic path: NEWS2 block carries the backend score (6, medio) and its protocol source', async () => {
  const answer = await assistant.assistantQuery(
    'qual è il NEWS2 di oggi?',
    ctx(),
    { currentPatientId: anna },
    { ...process.env },
  );
  assert.equal(answer.intent, 'clinical_score');
  const kpi = answer.blocks?.[0] as Extract<
    NonNullable<typeof answer.blocks>[number],
    { type: 'kpi' }
  >;
  assert.equal(kpi.type, 'kpi');
  assert.equal(kpi.items[0].value, '6');
  assert.equal(kpi.items[0].tone, 'warning');
  assert.match(kpi.source ?? '', /RCP 2017/);
});

test('team path: blocks come from the reads the team made with its grant', async () => {
  const { teamAnswer } = await import('../../backend/src/ai/assistant/team.js');
  const { executeReadTool } = assistant;
  const { resolveAgentGrant } = await import('../../backend/src/ai/assistant/agent-grants.js');
  const { blocksFromResults } = await import('../../backend/src/ai/assistant/blocks.js');
  const cfg = (await import('../../backend/src/ai/assistant/config.js')).loadAssistantLlmConfig({
    AI_ASSISTANT_TEAM_ENABLED: 'true',
    AI_RUNTIME_URL: 'http://runtime.invalid',
  });
  const team = await teamAnswer(
    'NEWS2?',
    ctx(),
    { today: '2026-11-23', currentPatientId: anna, cfg },
    {
      callTeamRuntime: async (req) => {
        const grant = resolveAgentGrant(req.grant)!;
        const out = await executeReadTool('get_patient_news2', { days: 1 }, grant, process.env);
        return {
          answerText: 'NEWS2 6 [1].',
          citedSources: [out.sourceRefs[0]],
          members: ['sorveglianza'],
        };
      },
    },
  );
  assert.ok(team);
  assert.deepEqual(
    team!.reads.map((r) => r.tool),
    ['get_patient_news2'],
  );
  const blocks = blocksFromResults(team!.reads);
  assert.equal(blocks[0].type, 'kpi');
});
