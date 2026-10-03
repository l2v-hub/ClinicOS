// Invocability + GUI parity: assistant.query reaches ai/assistant/service#assistantQuery with the
// SAME gateway context as POST /ai/assistant/query (ctxFromOperator reused). Deterministic planner
// only: LLM planner/composer flags and AI_RUNTIME_URL are cleared for the whole file.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../lib/prisma.js';
import { setAuditPersistence } from '../../ai/audit-store.js';
import assistantPublicRouter from '../../routes/ai-assistant-public.js';
import { createToolRegistry } from '../registry.js';
import { assistantTools } from '../capabilities/assistant.js';
import {
  captureAudit,
  cleanup,
  createOperator,
  createPatient,
  ctxOf,
  demoHeaders,
  restoreAudit,
  runId,
  serve,
  type TestOperator,
} from './support.js';

// #389: the default resident scope is facility-wide. This suite exercises the scope-enforcement
// plumbing (out-of-scope residents denied), so it pins the restricted, still-supported mode.
process.env.RESIDENT_SCOPE_CONFIG ??= JSON.stringify({ fallback: 'registered_by_me' });

const LLM_ENV = [
  'AI_RUNTIME_URL',
  'AI_ASSISTANT_LLM_ENABLED',
  'AI_ASSISTANT_PLAN_ENABLED',
  'AI_ASSISTANT_COMPOSE_ENABLED',
];
const savedEnv: Record<string, string | undefined> = {};

const registry = createToolRegistry(assistantTools);
let owner: TestOperator;
let stranger: TestOperator;
let patientId = '';
let strangerPatientId = '';
let toolAudit: ReturnType<typeof captureAudit>;

interface Answer {
  intent: string;
  results: Array<Record<string, unknown>>;
  sources: Array<{ patientId?: string; recordId?: string }>;
  notFound: boolean;
  refusal?: string;
  mode?: string;
}

before(async () => {
  for (const key of LLM_ENV) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  setAuditPersistence(async () => {}); // gateway reads must not write AiAuditEvent rows
  toolAudit = captureAudit();
  owner = await createOperator('assistant-owner');
  stranger = await createOperator('assistant-stranger');
  patientId = (await createPatient('assistant-own', owner)).id;
  strangerPatientId = (await createPatient('assistant-foreign', stranger)).id;
  await prisma.cartella.create({
    data: {
      patientId,
      data: {
        allergie: [{ id: `${runId}-al`, allergene: 'Penicillina', reazione: 'orticaria' }],
        parametriVitali: [
          {
            id: `${runId}-pv`,
            etichetta: 'PA',
            valore: '130/80',
            rilevato: new Date().toISOString(),
          },
        ],
      },
    },
  });
  for (const [id, pid, drug] of [
    [`${runId}-th-own`, patientId, 'Farmaco Tool Own'],
    [`${runId}-th-foreign`, strangerPatientId, 'Farmaco Tool Foreign'],
  ]) {
    await prisma.patientTherapy.create({
      data: {
        id,
        patientId: pid,
        farmacoNome: drug,
        dosaggio: '1 cp',
        dataInizio: '2026-01-01',
        fasceMattina: true,
      },
    });
  }
  await prisma.appointment.create({
    data: {
      id: `${runId}-appt`,
      patientId,
      operatorId: owner.operatorId,
      createdByUserId: owner.userId,
      scheduledAt: new Date('2026-10-01T09:00:00.000Z'),
      reason: 'Visita tool',
    },
  });
});

after(async () => {
  restoreAudit();
  setAuditPersistence(null);
  for (const key of LLM_ENV) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  await cleanup([owner, stranger], [patientId, strangerPatientId]);
});

async function ask(question: string, currentPatientId?: string, op = owner) {
  return registry.invoke<Answer>(
    'assistant.query',
    { body: { question, ...(currentPatientId ? { currentPatientId } : {}) } },
    ctxOf(op),
  );
}

test('assistant.query: therapies of the own patient come from the gateway (deterministic)', async () => {
  const result = await ask('quali terapie assume?', patientId);
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) return;
  assert.equal(result.data.intent, 'therapies');
  assert.equal(result.data.mode, 'deterministic');
  assert.deepEqual(
    result.data.results.map((r) => r.farmacoNome),
    ['Farmaco Tool Own'],
  );
  assert.ok(result.data.sources.every((s) => s.patientId === patientId));
});

test('assistant.query dispatches the patient read tools (allergies, vitals, appointments, timeline)', async () => {
  const allergies = await ask('ha allergie?', patientId);
  assert.equal(allergies.ok, true);
  if (allergies.ok) {
    assert.equal(allergies.data.intent, 'allergies');
    assert.deepEqual(
      allergies.data.results.map((r) => r.allergene),
      ['Penicillina'],
    );
  }
  const vitals = await ask('ultimi parametri', patientId);
  assert.equal(vitals.ok, true);
  if (vitals.ok) {
    assert.equal(vitals.data.intent, 'vitals_recent');
    assert.ok(
      vitals.data.results.some((r) => r.valore === '130/80'),
      JSON.stringify(vitals.data),
    );
  }
  const appointments = await ask('quali appuntamenti ha?', patientId);
  assert.equal(appointments.ok, true);
  if (appointments.ok) {
    assert.equal(appointments.data.intent, 'appointments');
    assert.deepEqual(
      appointments.data.results.map((r) => r.id),
      [`${runId}-appt`],
    );
  }
  const timeline = await ask('mostra la cronologia', patientId);
  assert.equal(timeline.ok, true);
  if (timeline.ok) {
    assert.equal(timeline.data.intent, 'timeline');
    assert.ok(timeline.data.results.length >= 1);
  }
});

test('assistant.query keeps the ownership scope: foreign patient → refusal, no data', async () => {
  const result = await ask('quali terapie assume?', strangerPatientId);
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) return;
  assert.equal(result.data.results.length, 0);
  assert.equal(result.data.notFound, false);
  assert.match(result.data.refusal ?? '', /non autorizzato/i);
  assert.ok(!JSON.stringify(result.data).includes('Farmaco Tool Foreign'));
});

test('assistant.query refuses clinical advice and never unlocks cross-patient search', async () => {
  const advice = await ask('suggerisci una terapia', patientId);
  assert.equal(advice.ok, true);
  if (advice.ok) {
    assert.equal(advice.data.intent, 'refuse_clinical');
    assert.equal(advice.data.results.length, 0);
  }
  // Even a self-declared admin is clamped to the non-privileged gateway role (route parity).
  const asAdmin = { ...owner, role: 'admin' };
  const cross = await ask('quali pazienti con allergia a penicillina', undefined, asAdmin);
  assert.equal(cross.ok, true);
  if (cross.ok) {
    assert.equal(cross.data.results.length, 0);
    assert.match(cross.data.refusal ?? '', /non autorizzat/i);
  }
});

test('GUI == Tool: POST /ai/assistant/query and assistant.query return the same answer', async () => {
  const gui = await serve('/ai/assistant', assistantPublicRouter);
  try {
    for (const [question, current] of [
      ['quali terapie assume?', patientId],
      ['quali terapie assume?', strangerPatientId],
      ['ha allergie?', patientId],
    ] as const) {
      const http = (await (
        await fetch(`${gui.base}/ai/assistant/query`, {
          method: 'POST',
          headers: demoHeaders(owner),
          body: JSON.stringify({ question, currentPatientId: current }),
        })
      ).json()) as Answer;
      const tool = await ask(question, current);
      assert.equal(tool.ok, true);
      if (!tool.ok) continue;
      const data = JSON.parse(JSON.stringify(tool.data)) as Answer;
      assert.equal(data.intent, http.intent);
      assert.deepEqual(data.results, http.results);
      assert.deepEqual(data.sources, http.sources);
      assert.equal(data.notFound, http.notFound);
      assert.equal(data.refusal, http.refusal);
    }
  } finally {
    await gui.close();
  }
});

test('assistant.query: schema envelope enforced; audit carries field names only', async () => {
  const bad = await registry.invoke('assistant.query', { body: {} }, ctxOf(owner));
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.equal(bad.error.code, 'invalid_input');
  const last = toolAudit.at(-1)!;
  assert.equal(last.tool, 'assistant.query');
  const ok = toolAudit.find((e) => e.outcome === 'ok')!;
  assert.deepEqual(ok.fields.sort(), ['body.currentPatientId', 'body.question']);
  assert.ok(!JSON.stringify(toolAudit).includes('terapie'));
});
