// REQ-040 live integration check for the assistant endpoint against the running backend (:3001).
const BASE = 'http://localhost:3001/internal/ai';
const TOKEN = 'req040-local-token';
const H = (extra = {}) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}`, 'X-AI-User-Id': 'u-test', 'X-AI-Roles': 'operator', 'X-AI-Request-Id': 'req-040', ...extra });
const ask = (question, body = {}, h) => fetch(`${BASE}/assistant/query`, { method: 'POST', headers: H(h), body: JSON.stringify({ question, ...body }) }).then(async (r) => ({ status: r.status, body: await r.json() }));

const run = async () => {
  let pass = 0, fail = 0;
  const ok = (c, m) => { c ? (pass++, console.log('  PASS', m)) : (fail++, console.log('  FAIL', m)); };

  const pats = await (await fetch('http://localhost:3001/patients')).json();
  const pid = pats[0]?.id;
  console.log('patient', pid);

  // 1. allergies (current patient) → sourced answer envelope
  const a = await ask('Quali allergie sono documentate?', { currentPatientId: pid });
  ok(a.status === 200 && a.body.intent === 'allergies' && Array.isArray(a.body.sources), 'allergies → sourced answer');

  // 2. therapy
  const t = await ask('Mostrami la terapia', { currentPatientId: pid });
  ok(t.status === 200 && t.body.intent === 'therapies', 'therapy intent');

  // 3. narrative search in anamnesi
  const an = await ask('Cerca in anamnesi il dolore', { currentPatientId: pid });
  ok(an.status === 200 && an.body.intent === 'narrative_search', 'narrative search intent');

  // 4. recent vitals → envelope with sources array
  const v = await ask('Quali parametri negli ultimi sette giorni?', { currentPatientId: pid });
  ok(v.status === 200 && v.body.intent === 'vitals_recent' && Array.isArray(v.body.navigation), 'recent vitals envelope');

  // 5. timeline
  const tl = await ask('Mostrami la sequenza temporale', { currentPatientId: pid });
  ok(tl.status === 200 && tl.body.intent === 'timeline', 'timeline intent');

  // 6. appointments
  const ap = await ask('Mostra gli appuntamenti del paziente', { currentPatientId: pid });
  ok(ap.status === 200 && ap.body.intent === 'appointments', 'appointments intent');

  // 7. authorized cross-patient (manager + env enabled)
  const cross = await ask('Trova i pazienti con valori pressori superiori a 150', {}, { 'X-AI-Roles': 'manager' });
  ok(cross.status === 200 && cross.body.intent === 'correlate' && !cross.body.refusal, 'authorized cross-patient runs');

  // 8. unauthorized cross-patient (operator role) → refusal, no data
  const denied = await ask('Trova i pazienti con valori pressori superiori a 150', {}, { 'X-AI-Roles': 'operator' });
  ok(denied.status === 200 && denied.body.refusal && denied.body.results.length === 0, 'unauthorized cross-patient → refusal');

  // 9. no-answer question (unknown) → notFound, nothing invented
  const none = await ask('Buongiorno come stai', { currentPatientId: pid });
  ok(none.status === 200 && none.body.notFound === true && none.body.results.length === 0, 'unknown → not found, no invented data');

  // 10. diagnosis request refused
  const diag = await ask('Che diagnosi ha questo paziente?', { currentPatientId: pid });
  ok(diag.status === 200 && diag.body.intent === 'refuse_clinical' && diag.body.refusal, 'diagnosis request refused');

  // 11. therapy suggestion refused
  const sug = await ask('Suggerisci una terapia', { currentPatientId: pid });
  ok(sug.status === 200 && sug.body.intent === 'refuse_clinical', 'therapy suggestion refused');

  // 12. every result item is reachable via a source (SOURCE_ONLY): sources cover results when present
  const al = await ask('Quali allergie?', { currentPatientId: pid });
  ok(al.body.results.length === 0 || al.body.sources.length > 0, 'results carry sources (SOURCE_ONLY)');

  console.log(`\nREQ-040 assistant check: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
};
run().catch((e) => { console.error('FAIL', e); process.exit(1); });
