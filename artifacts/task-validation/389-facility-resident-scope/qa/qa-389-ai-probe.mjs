// QA #389 — AI channel probe (local stack :3104): is the Agnos/assistant patient scope the same as the API roster?
import { writeFileSync } from 'node:fs';
const API = 'http://127.0.0.1:3104';
const OUT = 'artifacts/task-validation/389-facility-resident-scope/qa/ai-probe-r2.json';
const NERI = 'cmus84hs90005fslpncyb6vuq'; // registered by SIM-DOCTOR-1
const GALLI = 'cmus84hsj0006fslp0a8lnhgu'; // registered by SIM-NURSE-1
async function login(identityId) {
  const r = await fetch(`${API}/auth/simulator/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identityId }) });
  return (await r.json()).token;
}
async function call(token, method, path, body) {
  const r = await fetch(`${API}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch {}
  return { status: r.status, body: j };
}
const nurse = await login('SIM-NURSE-1');
const out = {};
out.apiDetailNeri = (await call(nurse, 'GET', `/patients/${NERI}`)).status;
for (const [label, id] of [['neri_doctorRegistered', NERI], ['galli_nurseRegistered', GALLI]]) {
  const r = await call(nurse, 'POST', '/ai/assistant/query', { question: 'ultimi parametri vitali', currentPatientId: id });
  out[`assistantQuery_${label}`] = { status: r.status, body: JSON.stringify(r.body).slice(0, 400) };
}
const plan = await call(nurse, 'POST', '/ai/actions/plan', { text: 'parametri di Neri Dario', currentPatientId: NERI });
out.actionsPlan_neri = { status: plan.status, body: JSON.stringify(plan.body).slice(0, 600) };
const planG = await call(nurse, 'POST', '/ai/actions/plan', { text: 'parametri di Galli Nora', currentPatientId: GALLI });
out.actionsPlan_galli = { status: planG.status, body: JSON.stringify(planG.body).slice(0, 600) };
const skills = await call(nurse, 'GET', `/skills/residents?q=Neri`);
out.skillsResidents_neri = { status: skills.status, body: JSON.stringify(skills.body).slice(0, 300) };
writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
