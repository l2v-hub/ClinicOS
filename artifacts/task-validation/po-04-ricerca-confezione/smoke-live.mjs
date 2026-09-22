import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const base = 'https://clinicos-backend-demo.up.railway.app';
const results = [];
for (const [query, ingredient] of [
  ['Tachipirina 1000 compresse', false],
  ['Tachipirina1000 compresse', false],
]) {
  const start = performance.now();
  const params = new URLSearchParams({ q: query, limite: '25', ...(ingredient ? { pa: '1' } : {}) });
  const response = await fetch(`${base}/farmaci/cerca?${params}`, { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200);
  const data = await response.json();
  const aics = data.esiti.map(item => item.aic);
  for (const aic of ['012745170', '012745182']) assert.ok(aics.includes(aic));
  assert.equal(new Set(aics).size, aics.length);
  assert.ok(data.esiti.every(item => /1000/i.test(item.descrizione) && !/effervesc|500\s*mg/i.test(item.descrizione)));
  results.push({ query, elapsedMs: Math.round(performance.now() - start), packages: data.esiti.map(({ aic, descrizione, forma }) => ({ aic, descrizione, forma })), pageInfo: data.pageInfo });
}
const health = await fetch(`${base}/health`, { signal: AbortSignal.timeout(20000) });
assert.equal(health.status, 200);
await writeFile(new URL('./production-smoke.json', import.meta.url), JSON.stringify({ verifiedAt: new Date().toISOString(), health: health.status, readOnly: true, results }, null, 2));
console.log('PASS: public catalog finds ordinary 1000 mg packages, including both original examples; backend health 200');
