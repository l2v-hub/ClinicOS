import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';

const folder = new URL('./', import.meta.url);
const json = async name => JSON.parse((await readFile(new URL(name, folder), 'utf8')).replace(/^\uFEFF/, ''));
const single = await json('baseline-browser-state.json');
const singleFeed = await json('baseline-therapy-feed.json');
const multi = await json('multi-browser-state.json');
const multiFeed = await json('multi-therapy-feed.json');
const findings = [];
for (const [state, feed, name, expected] of [
  [single, singleFeed, 'Sintetica', ['20:00']],
  [multi, multiFeed, 'Orario sintetico', ['08:00', '20:00']],
]) {
  const patients = state.patients.filter(p => p.lastName === name);
  assert.equal(patients.length, 1);
  const p = patients[0];
  assert.equal(p.therapies.length, 1);
  const t = p.therapies[0];
  const times = t.schedules.map(s => s.time).sort();
  assert.deepEqual(times, expected);
  assert.equal(t.viaSomministrazione, 'orale');
  assert.equal(Number(t.commercialStrengthValue), 25);
  assert.equal(t.commercialStrengthUnit, 'mg');
  assert.equal(t.dataInizio.slice(0, 10), '2026-09-23');
  assert.ok(t.schedules.every(s => s.quantityNumerator === 1 && s.quantityDenominator === 1 && s.administrationUnit === 'compressa'));
  const draft = state.drafts.find(d => d.confirmedPatientId === p.id);
  assert.ok(draft);
  assert.deepEqual(draft.data.terapiaImport[0].reviewedTherapy.schedules.map(s => s.time).sort(), expected);
  assert.equal(draft.data.terapiaImport[0].stato, 'ok');
  assert.match(draft.data.terapiaImport[0].originalText, /16:00/);
  const confirm = state.requests.find(r => r.path === `/${draft.id}/confirm`);
  assert.ok(confirm);
  assert.deepEqual(confirm.body.therapies[0].schedules.map(s => s.time).sort(), expected);
  const slots = (Array.isArray(feed) ? feed : [feed]).flatMap(slot => slot.patients).filter(item => item.patientId === p.id).flatMap(item => item.administrations);
  assert.deepEqual(slots.map(s => s.scheduledTime).sort(), expected);
  assert.ok(slots.every(s => s.status === 'pending'));
  assert.equal(t.fascePomeriggio, false);
  assert.equal(t.fasceSera, true);
  if (confirm.started) {
    const saves = state.requests.filter(r => r.method === 'PATCH' && r.path === `/${draft.id}`);
    assert.ok(saves.length > 0);
    assert.ok(saves.every(r => r.finished && r.finished <= confirm.started));
    assert.ok(saves.some(r => r.finished - r.started >= 1400));
  }
  findings.push({ scenario: name, patientCount: 1, therapyCount: 1, draftPayloadDatabaseAndFeedTimes: expected, oldTimeRemoved: true, originalSourcePreserved: true });
}
await writeFile(new URL('browser-assertions.json', folder), JSON.stringify({ checkedAt: new Date().toISOString(), findings }, null, 2));
console.log('PASS: actual browser corrections agree across draft, request, database and therapy feed.');
