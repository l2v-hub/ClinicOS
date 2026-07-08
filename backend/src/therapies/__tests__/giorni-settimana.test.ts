import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGiorniSettimana } from '../therapy-create.js';

// #241: intermittent weekday posology.
test('#241 normalizeGiorniSettimana: dedup+sort; empty/all → null (every day)', () => {
  assert.equal(normalizeGiorniSettimana('1,2,4,7'), '1,2,4,7');
  assert.equal(normalizeGiorniSettimana('4,1,2,4,7'), '1,2,4,7'); // dedup + sort
  assert.equal(normalizeGiorniSettimana([1, 2, 4, 7]), '1,2,4,7');
  assert.equal(normalizeGiorniSettimana(''), null);              // empty = every day
  assert.equal(normalizeGiorniSettimana('1,2,3,4,5,6,7'), null); // all 7 = every day
  assert.equal(normalizeGiorniSettimana('0,8,x'), null);         // out-of-range dropped
  assert.equal(normalizeGiorniSettimana(null), null);
});

// Mirrors the therapy-slots weekday filter (routes/therapy.ts): a drug limited to
// Lun/Mar/Gio/Dom (ISO 1,2,4,7) must appear only on those weekdays; null = every day.
function appearsOn(giorni: string | null, date: string): boolean {
  if (!giorni || !giorni.trim()) return true;
  const js = new Date(`${date}T00:00:00`).getDay();
  const iso = js === 0 ? 7 : js;
  return giorni.split(',').map((s) => parseInt(s.trim(), 10)).includes(iso);
}

test('#241 weekday filter: drug on Lun/Mar/Gio/Dom absent on other days', () => {
  const g = '1,2,4,7';
  assert.equal(appearsOn(g, '2026-07-06'), true);  // Mon
  assert.equal(appearsOn(g, '2026-07-08'), false); // Wed → absent
  assert.equal(appearsOn(g, '2026-07-09'), true);  // Thu
  assert.equal(appearsOn(g, '2026-07-10'), false); // Fri → absent
  assert.equal(appearsOn(g, '2026-07-12'), true);  // Sun
  assert.equal(appearsOn(null, '2026-07-08'), true); // no list = every day
});
