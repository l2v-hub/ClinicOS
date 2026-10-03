// QA #389 r2 — OSS via AI on a resident registered by another operator: therapy reads still capability-gated.
import { writeFileSync } from 'node:fs';
const API = 'http://127.0.0.1:3104';
const NERI = 'cmus84hs90005fslpncyb6vuq';
const NANNI = 'cmus84q430000bwlpdn2a6dit'; // has therapies, registered by SIM-NURSE-1
const r0 = await fetch(`${API}/auth/simulator/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identityId: 'SIM-OSS-1' }) });
const token = (await r0.json()).token;
const out = {};
for (const [label, id] of [['neri', NERI], ['nanni', NANNI]]) {
  const r = await fetch(`${API}/ai/assistant/query`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ question: 'quali terapie attive ha', currentPatientId: id }) });
  const b = await r.json().catch(() => null);
  out[`oss_therapy_${label}`] = { status: r.status, results: b?.results?.length ?? null, refusal: b?.refusal ?? null, tools: b?.plan?.tools?.map((t) => t.tool) };
}
writeFileSync('artifacts/task-validation/389-facility-resident-scope/qa/ai-oss-probe-r2.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
