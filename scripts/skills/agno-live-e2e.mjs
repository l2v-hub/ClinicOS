#!/usr/bin/env node
// Live Phase 3 E2E with the REAL Agno runtime (Prompt 3 §22, AC12).
//
// Prerequisites: a backend started with AI_RUNTIME_URL + AI_RUNTIME_SERVICE_TOKEN pointing to a
// clinicos-ai-runtime that serves POST /v1/assistant/skill-route, AUTH_MODE=demo,
// ROLE_SIMULATOR_ENABLED=true, and synthetic patients "Mario Rossi" / "Anna Bianchi" /
// "Luca Bianchi" owned by SIM-NURSE-1 (scripts/skills/seed-demo-patients.ts).
//
//   node scripts/skills/agno-live-e2e.mjs --base http://127.0.0.1:3099 [--out report.json]
//
// Every scenario asserts `interpreter: "agno"` (the skill was chosen by Agno, not by the
// deterministic fallback) plus the workflow outcome. Exit code 1 on any failure.

import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const base = opt('--base', 'http://127.0.0.1:3099').replace(/\/$/, '');
const out = opt('--out', null);

async function http(method, path, token, body) {
  const t0 = Date.now();
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null, ms: Date.now() - t0 };
}

async function login(identityId) {
  const r = await http('POST', '/auth/simulator/session', null, { identityId });
  if (r.status !== 201) throw new Error(`login ${identityId}: ${r.status}`);
  return r.body.token;
}

async function findPatient(token, q) {
  const r = await http('POST', '/tools/patients.search/invoke', token, { input: { body: { q } } });
  return r.body?.data?.items?.[0]?.id;
}

const results = [];
function check(name, condition, detail) {
  results.push({ name, pass: Boolean(condition), detail });
  console.log(
    `${condition ? 'PASS' : 'FAIL'}  ${name}${condition ? '' : `  → ${JSON.stringify(detail).slice(0, 400)}`}`,
  );
}

const nurse = await login('SIM-NURSE-1');
const admin = await login('SIM-ADMIN');
const rossiId = await findPatient(nurse, 'Rossi');
const say = (token, body) => http('POST', '/skills/converse', token, body);
const transcript = [];
const turn = async (label, token, body) => {
  const r = await say(token, body);
  transcript.push({
    label,
    request: body.message ?? body.action,
    status: r.body?.status,
    skill: r.body?.skillId,
    interpreter: r.body?.interpreter,
    reply: r.body?.reply,
    ms: r.ms,
  });
  return r.body;
};

// A — read, natural language, page context.
const a = await turn('A read', nurse, {
  message: 'mi fai vedere gli ultimi parametri vitali di questo ospite?',
  context: { currentPatientId: rossiId, currentPatientLabel: 'Rossi Mario' },
});
check(
  'A read → vitals.recent via Agno, COMPLETED',
  a.skillId === 'vitals.recent' && a.interpreter === 'agno' && a.status === 'COMPLETED',
  a,
);

// B — write with preview + confirmation (free wording, Agno extracts patient + values).
const b1 = await turn('B write', nurse, {
  message:
    'al signor Mario Rossi ho misurato adesso la pressione: 128 su 82, saturazione 95 per cento',
});
check(
  'B write → vitals.record via Agno, NEEDS_CONFIRMATION with preview',
  b1.skillId === 'vitals.record' &&
    b1.interpreter === 'agno' &&
    b1.status === 'NEEDS_CONFIRMATION' &&
    b1.preview?.patient?.id === rossiId,
  b1,
);
const b2 = b1.workflowId
  ? await turn('B confirm', nurse, { workflowId: b1.workflowId, action: 'confirm' })
  : {};
check(
  'B confirm → COMPLETED and verified',
  b2.status === 'COMPLETED' && b2.result?.verified === true,
  b2,
);

// C — ambiguous target: no write, clarification.
const c = await turn('C ambiguous', nurse, { message: 'segna una pressione di 120/80' });
check(
  'C ambiguous → NEEDS_CLARIFICATION (patient)',
  c.status === 'NEEDS_CLARIFICATION' && c.pending === 'patient',
  c,
);
if (c.workflowId) await turn('C cancel', nurse, { workflowId: c.workflowId, action: 'cancel' });

// E — multi-turn: Agno answers each pending question.
const e1 = await turn('E1', nurse, { message: 'devo annotare una osservazione nel diario' });
const e2 = e1.workflowId
  ? await turn('E2', nurse, { workflowId: e1.workflowId, message: 'per la signora Anna Bianchi' })
  : {};
const e3 = e2.workflowId
  ? await turn('E3', nurse, {
      workflowId: e1.workflowId,
      message: 'ha passato una notte tranquilla, nessun dolore riferito',
    })
  : {};
check(
  'E multi-turn → diary.add_observation reaches NEEDS_CONFIRMATION',
  e1.skillId === 'diary.add_observation' && e3.status === 'NEEDS_CONFIRMATION',
  { e1, e2, e3 },
);
const e4 = e3.workflowId
  ? await turn('E4', nurse, { workflowId: e1.workflowId, message: 'sì' })
  : {};
check('E confirm → COMPLETED', e4.status === 'COMPLETED', e4);

// D — unauthorized: the administrator cannot record vitals (backend denial).
const d = await turn('D denied', admin, { message: 'registra pressione 120/80 per Mario Rossi' });
check('D administrator → DENIED', d.status === 'DENIED', d);

// G — cancellation.
const g1 = await turn('G', nurse, {
  message: 'lascia una consegna per Mario Rossi: controllare la glicemia prima di cena',
});
const g2 = g1.workflowId
  ? await turn('G cancel', nurse, { workflowId: g1.workflowId, message: 'annulla' })
  : {};
check(
  'G handover.create via Agno → CANCELLED',
  g1.skillId === 'handover.create' && g1.interpreter === 'agno' && g2.status === 'CANCELLED',
  { g1, g2 },
);

const passed = results.filter((r) => r.pass).length;
const report = {
  base,
  at: new Date().toISOString(),
  passed,
  failed: results.length - passed,
  results,
  transcript,
};
if (out) writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(`\n${passed}/${results.length} PASS`);
process.exit(passed === results.length ? 0 : 1);
