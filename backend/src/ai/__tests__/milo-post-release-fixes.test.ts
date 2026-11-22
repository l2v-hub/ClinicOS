// Milo — correzioni trovate sulla demo dopo il rilascio delle fasi 1–5.
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ??= 'postgresql://unit:unit@127.0.0.1:1/unit_no_db';

const { planQueryLLM } = await import('../assistant/llm-planner.js');
const { coerceDateValue } = await import('../gateway/query/engine.js');

test('a precise deterministic intent wins over a generic LLM plan (shifts, agenda)', async () => {
  const generic = async () => ({
    plan: {
      intent: 'facility_snapshot',
      scope: 'facility',
      tools: [{ tool: 'get_facility_snapshot', args: {} }],
    },
  });
  const shifts = await planQueryLLM(
    'chi è di turno domani?',
    { today: '2026-11-22' },
    { callPlanRuntime: generic },
  );
  assert.equal(shifts.plan.intent, 'staff_shifts');
  assert.deepEqual(shifts.plan.tools, [
    { tool: 'query_staff_shifts', args: { date: '2026-11-23' } },
  ]);
  const queryData = async () => ({
    plan: {
      intent: 'query_data',
      scope: 'facility',
      tools: [{ tool: 'query_data', args: { plan: { steps: [] } } }],
    },
  });
  const agenda = await planQueryLLM(
    "com'è l'agenda della settimana?",
    { today: '2026-11-22' },
    { callPlanRuntime: queryData },
  );
  assert.equal(agenda.plan.intent, 'agenda');
  assert.equal(agenda.plan.tools[0].tool, 'query_agenda');
  // Domande che il deterministico non riconosce con certezza: resta il piano del modello.
  const allergies = async () => ({
    plan: {
      intent: 'allergies',
      scope: 'current_patient',
      tools: [{ tool: 'get_patient_allergies', args: { patientId: 'p1' } }],
    },
  });
  const r = await planQueryLLM(
    'allergie di Rossi',
    { currentPatientId: 'p1' },
    { callPlanRuntime: allergies },
  );
  assert.equal(r.mode, 'llm');
});

test('date filter values become instants in facility time; garbage is a bad request', () => {
  // Mezzanotte a Roma il 23/11 (CET, +1) = 22/11 23:00 UTC.
  assert.equal(coerceDateValue('2026-11-23T00:00:00').toISOString(), '2026-11-22T23:00:00.000Z');
  assert.equal(coerceDateValue('2026-11-23').toISOString(), '2026-11-22T23:00:00.000Z');
  assert.equal(coerceDateValue('2026-07-15 08:30').toISOString(), '2026-07-15T06:30:00.000Z'); // CEST
  assert.equal(coerceDateValue('2026-11-23T08:00:00Z').toISOString(), '2026-11-23T08:00:00.000Z');
  assert.equal(
    coerceDateValue('2026-11-23T08:00:00+02:00').toISOString(),
    '2026-11-23T06:00:00.000Z',
  );
  for (const bad of ['domani', '', '2026-13-45T99:00', 12, null]) {
    assert.throws(
      () => coerceDateValue(bad),
      (e: Error & { kind?: string }) => e.kind === 'bad_request',
    );
  }
});
