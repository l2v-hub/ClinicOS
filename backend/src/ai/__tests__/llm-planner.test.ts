import { test } from 'node:test';
import assert from 'node:assert/strict';
import { READ_TOOLS, isReadTool } from '../assistant/read-tools.js';
import { planQueryLLM } from '../assistant/llm-planner.js';

// ── read-tools allowlist ──────────────────────────────────────────────────────
test('016 F1: READ_TOOLS contiene solo tool di lettura del gateway', () => {
  for (const t of ['get_patient_allergies', 'get_patient_therapies', 'get_patient_vital_signs', 'search_patients', 'correlate_structured_data']) {
    assert.ok(READ_TOOLS.includes(t), `manca ${t}`);
  }
});
test('016 F1: nessun tool di scrittura/cancellazione è nell allowlist', () => {
  for (const t of ['create_vital_sign', 'add_diary_note', 'update_patient_demographics', 'create_appointment', 'delete_patient', 'create_consegna']) {
    assert.equal(isReadTool(t), false, `${t} NON deve essere read`);
  }
});

// ── planner LLM: validazione + fallback (client iniettabile, no HTTP/modello) ──
const CTX = { userId: 'op', tenantId: 'clinicos', roles: ['operatore'], permittedPatientIds: null, requestId: 'r' };

test('016 F1: piano LLM valido (solo read tools) è accettato', async () => {
  const runtime = async () => ({ plan: { intent: 'allergies', scope: 'current_patient', tools: [{ tool: 'get_patient_allergies', args: { patientId: 'p1' } }], requiresCrossPatientAccess: false }, confidence: 0.9 });
  const r = await planQueryLLM('allergie di Rossi', { currentPatientId: 'p1' }, { callPlanRuntime: runtime });
  assert.equal(r.mode, 'llm');
  assert.equal(r.plan.tools[0].tool, 'get_patient_allergies');
});

test('016 F1: piano LLM con tool FUORI allowlist → fallback deterministico', async () => {
  const runtime = async () => ({ plan: { intent: 'unknown', scope: 'current_patient', tools: [{ tool: 'delete_patient', args: { patientId: 'p1' } }], requiresCrossPatientAccess: false }, confidence: 0.9 });
  const r = await planQueryLLM('mostra le allergie', { currentPatientId: 'p1' }, { callPlanRuntime: runtime });
  assert.equal(r.mode, 'deterministic'); // scartato → fallback
  assert.ok(r.plan.tools.every((t) => t.tool !== 'delete_patient'));
});

test('016 F1: runtime che lancia/timeout → fallback deterministico (nessun errore)', async () => {
  const runtime = async () => { throw new Error('timeout'); };
  const r = await planQueryLLM('quali terapie assume', { currentPatientId: 'p1' }, { callPlanRuntime: runtime });
  assert.equal(r.mode, 'deterministic');
  assert.equal(r.plan.intent, 'therapies');
});

test('016 F1: requiresCrossPatientAccess è RICALCOLATO server-side, non fidato dall LLM', async () => {
  // l'LLM dichiara false, ma la domanda è cross-patient → il server deve imporre true
  const runtime = async () => ({ plan: { intent: 'correlate', scope: 'cross_patient', tools: [{ tool: 'correlate_structured_data', args: {} }], requiresCrossPatientAccess: false }, confidence: 0.9 });
  const r = await planQueryLLM('quali pazienti hanno allergia alla penicillina', {}, { callPlanRuntime: runtime });
  assert.equal(r.plan.requiresCrossPatientAccess, true);
});

test('016 F1: piano LLM VUOTO ma deterministico non-vuoto → preferisci deterministico (F1 >= F0)', async () => {
  const runtime = async () => ({ plan: { intent: 'unknown', scope: 'current_patient', tools: [], requiresCrossPatientAccess: false }, confidence: 0.3 });
  const r = await planQueryLLM('quali terapie assume', { currentPatientId: 'p1' }, { callPlanRuntime: runtime });
  assert.equal(r.mode, 'deterministic');
  assert.equal(r.plan.intent, 'therapies');
});

test('016 F1: piano LLM vuoto E deterministico vuoto → resta vuoto (nessuna invenzione)', async () => {
  const runtime = async () => ({ plan: { intent: 'unknown', scope: 'current_patient', tools: [], requiresCrossPatientAccess: false }, confidence: 0.3 });
  const r = await planQueryLLM('buongiorno', { currentPatientId: 'p1' }, { callPlanRuntime: runtime });
  assert.equal(r.plan.tools.length, 0);
  assert.equal(r.plan.intent, 'unknown');
});
