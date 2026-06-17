// REQ-039 live integration check for the AI Data Gateway against the running backend (:3001).
// Verifies the security contract (token, tenant isolation, patient allow-list, no SQL tool) and
// that every result carries SourceReferences.
const BASE = 'http://localhost:3001/internal/ai';
const TOKEN = 'req039-local-token';
const H = (extra = {}) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}`, 'X-AI-User-Id': 'u-test', 'X-AI-Roles': 'operator', 'X-AI-Request-Id': 'req-test', ...extra });
const post = (p, body, h) => fetch(`${BASE}${p}`, { method: 'POST', headers: H(h), body: JSON.stringify(body) });

const run = async () => {
  let pass = 0, fail = 0;
  const ok = (c, m) => { c ? (pass++, console.log('  PASS', m)) : (fail++, console.log('  FAIL', m)); };

  // 0. discover a patient id from the public API
  const pats = await (await fetch('http://localhost:3001/patients')).json();
  const pid = pats[0]?.id;
  const name = pats[0]?.lastName || '';
  console.log('using patient', pid, name);

  // 1. no service token → 401
  const noTok = await fetch(`${BASE}/search/patients`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-AI-User-Id': 'u' }, body: '{}' });
  ok(noTok.status === 401, 'no service token → 401');

  // 2. missing user context → 401
  const noUser = await fetch(`${BASE}/search/patients`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` }, body: '{}' });
  ok(noUser.status === 401, 'missing user context → 401');

  // 3. search patients by name → results, each with sourceRefs
  const sr = await post('/search/patients', { query: name, limit: 5 });
  const srBody = await sr.json();
  ok(sr.status === 200 && Array.isArray(srBody), 'search/patients → 200 array');
  ok(srBody.length > 0 && srBody.every((r) => Array.isArray(r.sourceRefs) && r.sourceRefs.length > 0), 'every patient result has SourceReferences');

  // 4. tenant isolation: a different tenant is rejected
  const otherTenant = await post('/search/patients', { query: name }, { 'X-AI-Tenant-Id': 'other-clinic' });
  ok(otherTenant.status === 403, 'different tenant → 403 (isolation)');

  // 5. patient allow-list: caller restricted to a different patient is forbidden
  const forbidden = await post('/patient/demographics', { patientId: pid }, { 'X-AI-Permitted-Patients': 'some-other-id' });
  ok(forbidden.status === 403, 'patient outside allow-list → 403');

  // 6. allowed patient getter works and is sourced
  const demo = await post('/patient/demographics', { patientId: pid }, { 'X-AI-Permitted-Patients': pid });
  const demoBody = await demo.json();
  ok(demo.status === 200 && demoBody?.sourceRefs?.length > 0, 'demographics within allow-list → 200 + source');

  // 7. vital-signs query: deterministic filter, always returns a sourced envelope
  const vit = await post('/query/vital-signs', { patientId: pid, label: 'PA', systolicMin: 151 });
  const vitBody = await vit.json();
  ok(vit.status === 200 && Array.isArray(vitBody.data) && Array.isArray(vitBody.sourceRefs), 'vital-signs → sourced envelope');

  // 8. timeline returns time-ordered sourced events
  const tl = await post('/query/timeline', { patientId: pid });
  const tlBody = await tl.json();
  ok(tl.status === 200 && Array.isArray(tlBody.data) && Array.isArray(tlBody.sourceRefs), 'timeline → sourced envelope');

  // 9. correlate runs (operator scope)
  const corr = await post('/query/correlate', { allergy: 'penicillina' });
  ok(corr.status === 200, 'correlate → 200');

  // 10. cross-patient broad search is DISABLED by default → 403
  const across = await post('/search/across-patients', { query: 'x' });
  ok(across.status === 403, 'across-patients disabled by default → 403');

  // 11. NO generic SQL tool: such an endpoint does not exist → 404
  const sql = await post('/query/sql', { sql: 'SELECT * FROM "Patient"' });
  ok(sql.status === 404, 'no SQL endpoint → 404');

  // 12. a malicious "query" string is treated as a literal filter, never executed
  const inj = await post('/search/patients', { query: "'; DROP TABLE \"Patient\"; --" });
  ok(inj.status === 200, 'SQL-injection-looking query is a harmless literal filter (200, no error)');
  // the table still exists:
  const still = await (await fetch('http://localhost:3001/patients')).json();
  ok(Array.isArray(still) && still.length === pats.length, 'patients table intact after injection attempt');

  console.log(`\nREQ-039 gateway check: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
};
run().catch((e) => { console.error('FAIL', e); process.exit(1); });
