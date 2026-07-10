// Agnos KB (Task 5): planner LLM per i nuovi intent read — validazione allowlist + patientId
// autoritativo server-side, con l'LLM sempre MOCKATO (nessuna chiamata rete/modello nei test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planQueryLLM } from '../assistant/llm-planner.js';

const deps = (plan: unknown) => ({ callPlanRuntime: async () => ({ plan }), roles: ['operatore'] });

test('LLM propone vitals_compare valido → accettato, patientId iniettato server-side', async () => {
  const r = await planQueryLLM('pressione vs ieri', { currentPatientId: 'p-1' },
    deps({ intent: 'vitals_compare', scope: 'current_patient', requiresCrossPatientAccess: false,
      tools: [{ tool: 'compare_patient_vitals', args: { patientId: 'ALTRO-PAZIENTE', label: 'PA' } }] }));
  assert.equal(r.mode, 'llm');
  assert.equal(r.plan.tools[0].args.patientId, 'p-1'); // MAI quello proposto dall'LLM
});

test('LLM propone tool fuori allowlist → fallback deterministico', async () => {
  const r = await planQueryLLM('quante camere sono occupate oggi', {},
    deps({ intent: 'rooms_occupancy', scope: 'cross_patient', requiresCrossPatientAccess: false,
      tools: [{ tool: 'delete_patient', args: {} }] }));
  assert.equal(r.mode, 'deterministic');
  assert.equal(r.plan.intent, 'rooms_occupancy'); // il fallback regex lo copre comunque
});
