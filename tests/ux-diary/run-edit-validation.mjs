import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { mockApi } from '../ux-discovery/mock-api.mjs';

const out = path.resolve('artifacts/task-validation/diary-edit-in-card');
for (const dir of ['screenshots', 'trace', 'test-results']) mkdirSync(path.join(out, dir), { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1150, height: 1004 } });
await context.tracing.start({ screenshots: true, snapshots: true });
const state = { requests: [], slotReads: 0, clinicalWrites: 0 };
await mockApi(context, state);
const entries = Array.from({ length: 50 }, (_, index) => ({
  id: `entry-${index}`, patientId: 'patient-test', authorType: 'infermiere', authorName: 'Autore Test',
  title: `Segnalazione sintetica ${index}`, content: `Testo sintetico ${index}\nSeconda riga da conservare.`,
  priority: 'importante', status: 'da_rivedere',
  entryDateTime: new Date(Date.UTC(2026, 8, 30, 16, 59 - index)).toISOString(),
  createdAt: '2026-09-30T15:00:00Z', updatedAt: '2026-09-30T15:00:00Z',
}));
const writes = [], errors = [], results = [];
let failSave = true, releaseSave;
await context.route('http://localhost:3001/patients/patient-test/diary**', async route => {
  const request = route.request(), url = new URL(request.url());
  if (request.method() === 'GET') return route.fulfill({ json: { entries, hasMore: false, nextCursor: null } });
  assert.equal(request.method(), 'PUT');
  const body = request.postDataJSON();
  writes.push({ path: url.pathname, body });
  if (failSave) return route.fulfill({ status: 400, json: { error: 'Conflitto sintetico: modifica non salvata' } });
  await new Promise(resolve => { releaseSave = resolve; });
  Object.assign(entries[49], body);
  return route.fulfill({ json: { entry: entries[49] } });
});
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error' && !/400/.test(message.text())) errors.push(message.text());
});
page.on('response', response => {
  if (response.status() >= 400 && !(response.status() === 400 && response.url().endsWith('/diary/entry-49')))
    errors.push(`HTTP ${response.status()} ${new URL(response.url()).pathname}`);
});
const permissions = async allowed => page.evaluate(async allowed => {
  const { setSessionCapabilities } = await import('/frontend/src/lib/capabilities.ts');
  setSessionCapabilities({
    'administration.list_slots': { allowed: true }, 'patients.list_page': { allowed: true },
    'diary.create_entry': { allowed }, 'diary.update_entry': { allowed }, 'diary.delete_entry': { allowed: false },
  });
}, allowed);
const card = page.locator('[data-diary-entry-id="entry-49"]');
const pencil = card.getByRole('button', { name: 'Modifica', exact: true });
const editor = card.getByRole('group', { name: 'Modifica voce del diario', exact: true });
const content = editor.getByRole('textbox', { name: 'Segnalazione', exact: true });
const original = { ...entries[49] };
try {
  await page.goto('http://127.0.0.1:5189/tests/ux-turno/index.html');
  await permissions(true);
  await page.getByRole('button', { name: 'Pazienti', exact: true }).click();
  await pencil.waitFor({ state: 'visible' });
  for (const [width, height] of [[1150, 1004], [1024, 1004], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await pencil.scrollIntoViewIfNeeded();
    await pencil.focus();
    await pencil.press('Enter');
    await editor.waitFor({ state: 'visible' });
    assert.equal(await content.inputValue(), original.content);
    assert.equal(await editor.getByLabel('Titolo (opzionale)').inputValue(), original.title);
    assert.equal(await editor.getByLabel('Gravità', { exact: true }).inputValue(), original.priority);
    assert.equal(await content.evaluate(element => document.activeElement === element), true);
    const bounds = await editor.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
    assert.equal(await page.getByRole('group', { name: 'Modifica voce del diario', exact: true }).count(), 1);
    await content.fill('Modifica sintetica da annullare');
    await pencil.click();
    assert.equal(await content.inputValue(), 'Modifica sintetica da annullare');
    assert.equal(await content.evaluate(element => document.activeElement === element), true);
    await page.screenshot({ path: path.join(out, 'screenshots', `editor-${width}.png`) });
    await editor.getByRole('button', { name: 'Annulla', exact: true }).click();
    await editor.waitFor({ state: 'hidden' });
    assert.equal(await pencil.evaluate(element => document.activeElement === element), true);
    assert.equal(writes.length, 0);
    assert.equal(entries[49].content, original.content);
    results.push(`PASS ${width}: oldest card opens its own prefilled editor, focuses text, fits viewport and cancels without writes`);
  }
  await page.setViewportSize({ width: 1150, height: 1004 });
  await pencil.click();
  await content.fill('Contenuto sintetico aggiornato\nCon seconda riga.');
  await editor.getByRole('button', { name: 'Salva', exact: true }).click();
  await editor.getByRole('alert').waitFor({ state: 'visible' });
  assert.match(await editor.getByRole('alert').textContent(), /Conflitto sintetico/);
  assert.equal(await content.inputValue(), 'Contenuto sintetico aggiornato\nCon seconda riga.');
  assert.equal(entries[49].content, original.content);
  results.push('PASS failed save retains text and exposes the server error in the same card');
  failSave = false;
  await editor.getByRole('button', { name: 'Salva', exact: true }).click();
  await editor.getByRole('button', { name: 'Salvataggio…', exact: true }).waitFor({ state: 'visible' });
  assert.equal(await page.getByRole('button', { name: 'Aggiungi voce', exact: true }).isDisabled(), true);
  assert.equal(await pencil.isDisabled(), true);
  releaseSave();
  await editor.waitFor({ state: 'hidden' });
  assert.equal(writes.length, 2);
  for (const write of writes) {
    assert.equal(write.path, '/patients/patient-test/diary/entry-49');
    assert.deepEqual(Object.keys(write.body).sort(), ['content', 'priority', 'title']);
    assert.equal(write.body.priority, original.priority);
  }
  assert.equal(entries[49].entryDateTime, original.entryDateTime);
  assert.equal(entries[49].authorName, original.authorName);
  assert.equal(entries[49].status, original.status);
  assert.equal(entries[0].content, 'Testo sintetico 0\nSeconda riga da conservare.');
  assert.match(await card.textContent(), /Contenuto sintetico aggiornato/);
  assert.equal(await pencil.evaluate(element => document.activeElement === element), true);
  results.push('PASS retry updates only the selected entry, preserves historical fields, blocks competing actions and returns focus');
  await pencil.click();
  await permissions(false);
  await editor.waitFor({ state: 'hidden' });
  assert.equal(await page.locator('.diario-card__actions .icon-btn--edit').count(), 0);
  assert.equal(writes.length, 2);
  assert.equal(state.clinicalWrites, 0);
  assert.deepEqual(errors, []);
  results.push('PASS permission revocation removes editing controls without submitting a write');
  writeFileSync(path.join(out, 'test-results', 'runtime.json'), JSON.stringify({ results, mockedWrites: writes.length,
    unmockedClinicalWrites: state.clinicalWrites, errors,
    sourceHash: createHash('sha256').update(readFileSync('frontend/src/components/operator/cartella/DiarioPazienteTab.tsx')).digest('hex'),
  }, null, 2));
  console.log(results.join('\n'));
} finally {
  releaseSave?.();
  await context.tracing.stop({ path: path.join(out, 'trace', 'edit.zip') });
  await context.close();
  await browser.close();
}
