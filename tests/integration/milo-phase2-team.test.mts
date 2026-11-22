// Milo fase 2 — lato backend del team di agenti, su database reale (PGlite, tutte le migrazioni).
// Il servizio AI è simulato: legge i dati come farebbe il team, cioè con il codice di delega sulla
// rotta /internal/ai/tools/:tool. Si verificano delega, permessi, gate fra pazienti, controllo delle
// fonti citate e ritorno al percorso classico.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { AddressInfo } from 'node:net';
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
let grants: typeof import('../../backend/src/ai/assistant/agent-grants.js');
let server: import('node:http').Server;
let base = '';
const TOKEN = 'milo-phase2-service-token';
const [anna, , outside] = fixturePatientIds;
const ENV = {
  ...process.env,
  AI_FACILITY_QUERIES_ENABLED: 'true',
  AI_ENABLED: 'true',
  AI_ASSISTANT_LLM_ENABLED: 'true',
  AI_ASSISTANT_TEAM_ENABLED: 'true',
  AI_RUNTIME_URL: 'http://runtime.invalid',
};
const ctx = (allowed?: (tool: string) => boolean) => ({
  userId: fixtureActors.operator.id,
  tenantId: 'clinicos',
  roles: ['operatore'],
  permittedPatientIds: [anna],
  requestId: 'milo-phase2-test',
  ...(allowed ? { readToolAllowed: allowed } : {}),
});
const readTool = async (grant: string, tool: string, args: unknown = {}) => {
  const res = await fetch(`${base}/internal/ai/tools/${tool}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
      'X-AI-Grant': grant,
    },
    body: JSON.stringify({ args }),
  });
  return { status: res.status, body: (await res.json()) as Record<string, any> };
};

before(
  async () => {
    database = await startParameterDatabase();
    await seedParameterDatabase(database.db);
    selectLocalParameterDatabase(database.url);
    process.env.AI_DEFAULT_TENANT = 'clinicos';
    process.env.AI_RUNTIME_SERVICE_TOKEN = TOKEN;
    await database.db.query(
      `INSERT INTO "PatientParameterReading" ("id","patientId","requestId","measuredAt","values","authorOperatorId","authorName")
       VALUES ('team-r1',$1,'33333333-3333-4333-8333-333333333333',now() - interval '3 hours',$2::jsonb,$3,'Operatrice QA')`,
      [anna, JSON.stringify({ pa: '145/88', fc: '92' }), fixtureActors.operator.id],
    );
    ({ prisma } = await import('../../backend/src/lib/prisma.js'));
    assistant = await import('../../backend/src/ai/assistant/service.js');
    grants = await import('../../backend/src/ai/assistant/agent-grants.js');
    const { default: express } = await import('express');
    const { default: internal } = await import('../../backend/src/routes/internal-ai.ts');
    const app = express();
    app.use(express.json());
    app.use('/internal/ai', internal);
    server = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  },
  { timeout: 120000 },
);

after(async () => {
  await new Promise((r) => server?.close(r));
  if (prisma) await closeParameterPrisma(prisma);
  await database?.close();
});

test('the tool route needs the service token AND a live grant; the grant decides the operator', async () => {
  const grant = grants.createAgentGrant(ctx(), { currentPatientId: anna });
  const noToken = await fetch(`${base}/internal/ai/tools/get_patient_parameters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-AI-Grant': grant.id },
    body: '{}',
  });
  assert.equal(noToken.status, 401);
  assert.equal((await readTool('x'.repeat(43), 'get_patient_parameters')).status, 401);
  // Default patient = the open one; the reading of the parameters page is there.
  const ok = await readTool(grant.id, 'get_patient_parameters', { days: 1 });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data[0].readings[0].values.pa, '145/88');
  // A patient outside the scope is refused by the gateway, whatever the model asks.
  assert.equal(
    (await readTool(grant.id, 'get_patient_parameters', { patientId: outside })).status,
    403,
  );
  // Unknown or write tools do not exist here.
  assert.equal((await readTool(grant.id, 'create_vital_sign')).status, 404);
  // Cross-patient tools follow the same gate as Milo (clamped role: refused).
  assert.equal((await readTool(grant.id, 'search_across_patients', { query: 'x' })).status, 403);
  grants.revokeAgentGrant(grant);
  assert.equal((await readTool(grant.id, 'get_patient_parameters')).status, 401);
});

test('the role policy and the call budget apply to every read of the team', async () => {
  const grant = grants.createAgentGrant(
    ctx((tool) => tool !== 'get_patient_news2'),
    {
      currentPatientId: anna,
      maxCalls: 2,
    },
  );
  assert.equal((await readTool(grant.id, 'get_patient_news2')).status, 403);
  assert.equal((await readTool(grant.id, 'get_patient_parameters')).status, 200);
  assert.equal((await readTool(grant.id, 'get_patient_vital_signs')).status, 200);
  assert.equal((await readTool(grant.id, 'get_patient_parameters')).status, 429);
  grants.revokeAgentGrant(grant);
});

test('a grounded team answer is returned with the sources the backend gave out', async () => {
  let seenSchema: string[] = [];
  const { teamAnswer } = await import('../../backend/src/ai/assistant/team.js');
  const cfg = (await import('../../backend/src/ai/assistant/config.js')).loadAssistantLlmConfig(
    ENV,
  );
  const answer = await teamAnswer(
    'come va la pressione?',
    ctx((tool) => tool !== 'query_staff_shifts'),
    { today: '2026-11-23', currentPatientId: anna, cfg },
    {
      callTeamRuntime: async (req) => {
        seenSchema = req.toolSchema.map((t) => t.name);
        const read = await readTool(req.grant, 'get_patient_parameters', { days: 1 });
        return {
          answerText: 'La pressione delle ultime ore è 145/88 mmHg [1].',
          citedSources: [read.body.sourceRefs[0]],
          members: ['clinico'],
        };
      },
    },
  );
  assert.ok(answer);
  assert.equal(answer!.answerText, 'La pressione delle ultime ore è 145/88 mmHg [1].');
  assert.equal(answer!.citedSources[0].recordId, 'team-r1');
  assert.deepEqual(answer!.tools, ['get_patient_parameters']);
  // The tools the role may not use are never offered to the team.
  assert.ok(!seenSchema.includes('query_staff_shifts'));
  assert.ok(seenSchema.includes('get_patient_news2'));
  assert.equal(grants.activeGrantCount(), 0); // the grant ends with the question
});

test('invented sources, action claims or no reads are rejected; the classic path answers', async () => {
  const { teamAnswer } = await import('../../backend/src/ai/assistant/team.js');
  const cfg = (await import('../../backend/src/ai/assistant/config.js')).loadAssistantLlmConfig(
    ENV,
  );
  const run = (fake: (req: { grant: string }) => Promise<Record<string, unknown>>) =>
    teamAnswer(
      'pressione?',
      ctx(),
      { today: '2026-11-23', currentPatientId: anna, cfg },
      {
        callTeamRuntime: fake as never,
      },
    );
  const invented = await run(async (req) => {
    await readTool(req.grant, 'get_patient_parameters');
    return {
      answerText: 'Pressione 200/120 [1].',
      citedSources: [
        { sourceType: 'VITAL_SIGN', patientId: anna, recordId: 'inventata', label: 'x' },
      ],
    };
  });
  assert.equal(invented, null);
  const claim = await run(async (req) => {
    const read = await readTool(req.grant, 'get_patient_parameters');
    return {
      answerText: 'Ho registrato la pressione [1].',
      citedSources: [read.body.sourceRefs[0]],
    };
  });
  assert.equal(claim, null);
  const noRead = await run(async () => ({
    answerText: 'Tutto bene.',
    citedSources: [{ sourceType: 'VITAL_SIGN', patientId: anna, recordId: 'team-r1', label: 'x' }],
  }));
  assert.equal(noRead, null);
  const failing = await run(async () => {
    throw new Error('runtime down');
  });
  assert.equal(failing, null);
  // End to end: with the runtime unreachable the deterministic path still answers.
  const answer = await assistant.assistantQuery(
    'ultimi parametri',
    ctx(),
    { currentPatientId: anna },
    ENV,
  );
  assert.equal(answer.mode, 'deterministic');
  assert.ok(answer.results.length > 0);
});

test('clinical judgement is refused before the team is ever called', async () => {
  const answer = await assistant.assistantQuery(
    'la pressione è grave?',
    ctx(),
    { currentPatientId: anna },
    ENV,
  );
  assert.equal(answer.intent, 'refuse_clinical');
  assert.ok(answer.refusal);
});
