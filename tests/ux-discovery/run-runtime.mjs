import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { mockApi, today } from './mock-api.mjs';
import { assertAllergyBand } from '../ux-diary/assert-allergies.mjs';
const out = path.resolve(process.env.UX_EVIDENCE_DIR || 'artifacts/task-validation/ux-discovery-loop');
for (const dir of ['screenshots', 'trace', 'video', 'test-results', 'playwright-report']) mkdirSync(path.join(out, dir), { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1074, height: 1004 },
  recordVideo: { dir: path.join(out, 'video'), size: { width: 1074, height: 1004 } } });
await context.tracing.start({ screenshots: true, snapshots: true });
const state = { done: false, failMore: false, badFeed: false, slotReads: 0, requests: [], clinicalWrites: 0 };
await mockApi(context, state);
const page = await context.newPage();
const errors = [], unexpectedHttp = [], failedRequests = [], results = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', msg => { if (msg.type() === 'error' && !/503/.test(msg.text())) errors.push(msg.text()); });
page.on('response', response => {
  if (response.status() >= 400 && !(response.status() === 503 && response.url().includes('/therapies/page')))
    unexpectedHttp.push({ status: response.status(), path: new URL(response.url()).pathname });
});
page.on('requestfailed', request => {
  if (!/ERR_ABORTED/.test(request.failure()?.errorText || '')) failedRequests.push({ path: new URL(request.url()).pathname, error: request.failure()?.errorText });
});
const preview = 'http://127.0.0.1:5187';
const app = preview + '/tests/ux-turno/app.html';
const wait = async locator => locator.waitFor({ timeout: 15000 });
const shot = name => page.screenshot({ path: path.join(out, 'screenshots', name + '.png'), fullPage: true });
try {
  await page.goto(preview + '/tests/ux-discovery/index.html');
  await wait(page.getByTestId('therapy-calendar-cell'));
  const programming = page.getByRole('tab', { name: 'Piano terapeutico', exact: true });
  assert.equal(await page.getByTestId('therapy-drug-line').count(), 0);
  assert.equal(await page.getByRole('tab', { name: 'Calendario', exact: true }).count(), 1);
  assert.equal(await page.getByRole('tab', { name: 'Programmazione', exact: true }).count(), 0);
  await programming.click();
  await page.getByTestId('therapy-drug-line').first().click();
  const detail = page.getByTestId('therapy-prescription-detail');
  assert.match(await detail.textContent(), /08:00.*1\/2 compressa.*5 mg/s);
  for (const field of ['Tipo', 'Inizio', 'Fine', 'Stato', 'Note']) assert.match(await detail.textContent(), new RegExp(field));
  assert.equal(await detail.getByRole('button', { name: /Modifica/ }).count(), 1);
  await shot('therapy-programming');
  results.push('PASS separate active-drug tab retains prescription fields and actions without occupying calendar');

  await detail.getByRole('button', { name: /Modifica/ }).click();
  const qty = page.getByPlaceholder('Altro: es. 1/3').first();
  await qty.fill('1/0');
  await page.getByRole('button', { name: 'Aggiorna', exact: true }).click();
  await wait(page.getByTestId('therapy-save-error'));
  assert.match(await page.getByTestId('therapy-save-error').textContent(), /quantità|Quantità/);
  assert.equal(state.clinicalWrites, 0, 'invalid quantity must not submit a clinical mutation');
  assert.equal(await qty.getAttribute('aria-invalid'), 'true');
  await shot('invalid-quantity');
  await qty.fill('1/3');
  assert.equal(await qty.getAttribute('aria-invalid'), null);
  await page.getByLabel('Unità orario 1', { exact: true }).selectOption('ml');
  const numberQty = page.getByLabel('Quantità orario 1', { exact: true });
  assert.ok(Number(await numberQty.inputValue()) > 0, 'fraction draft must not blank the numeric quantity');
  await page.getByLabel('Unità orario 1', { exact: true }).selectOption('compressa');
  await page.getByRole('button', { name: '1 compressa, orario 1', exact: true }).click();
  await page.getByLabel('Unità orario 1', { exact: true }).selectOption('ml');
  assert.equal(await numberQty.inputValue(), '1', 'preset remains visible after unit change');
  await page.getByRole('button', { name: 'Ruolo: prescrittore', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Aggiorna', exact: true }).count(), 0, 'prescription editor removed after edit permission revocation');
  assert.equal(await page.getByPlaceholder('Altro: es. 1/3').count(), 0);
  assert.equal(state.clinicalWrites, 0);
  await page.getByRole('button', { name: 'Ruolo: sola lettura', exact: true }).click();
  if (await page.getByTestId('therapy-prescription-detail').count() === 0)
    await page.getByTestId('therapy-drug-line').first().click();
  await page.getByTestId('therapy-prescription-detail').getByRole('button', { name: /Modifica/ }).click();
  await page.getByRole('button', { name: 'Annulla', exact: true }).click();
  await page.getByRole('tab', { name: 'Calendario', exact: true }).click();
  await wait(page.getByTestId('therapy-calendar-cell'));
  results.push('PASS cycle2: invalid quantity blocks save/HTTP write; correction clears feedback');

  const readCount = state.slotReads;
  state.done = true;
  await page.getByRole('region', { name: 'Calendario terapie del paziente', exact: true }).getByRole('button', { name: 'Aggiorna', exact: true }).click();
  await wait(page.getByTestId('therapy-calendar-cell'));
  await page.getByTestId('therapy-calendar-cell').click();
  await wait(page.getByTestId('patient-therapy-slot-detail').getByText(/Collega Test/).first());
  await page.getByRole('dialog').getByRole('button', { name: 'Chiudi', exact: true }).click();
  assert.ok(state.slotReads > readCount, 'refresh reads server again within cache TTL');
  await page.getByRole('button', { name: /Somministra al bisogno · dosi di oggi/ }).click();
  await wait(page.getByTestId('drug-dose-panel'));
  await page.getByRole('button', { name: 'Giorno precedente', exact: true }).click();
  await wait(page.getByTestId('therapy-calendar-cell'));
  assert.equal(await page.getByTestId('drug-dose-panel').count(), 0);
  await page.getByRole('button', { name: 'Oggi', exact: true }).click();
  assert.equal(await page.getByTestId('drug-dose-panel').count(), 0);
  await page.getByRole('button', { name: 'Settimana', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.therapy-calendar-grid thead th').length === 8);
  await page.getByTestId('therapy-calendar-cell').first().click();
  await wait(page.getByRole('dialog'));
  await page.getByRole('dialog').getByRole('button', { name: 'Chiudi', exact: true }).click();
  results.push('PASS cycle3: fresh refresh, PRN date isolation and week/day interactions');

  await page.getByRole('button', { name: 'Ruolo: prescrittore', exact: true }).click();
  assert.equal(await page.getByRole('tab', { name: 'Nuova terapia', exact: true }).count(), 0);
  assert.equal(await page.getByRole('button', { name: /^Modifica Farmaco/ }).count(), 0);
  results.push('PASS role gates preserved for prescribing and administration');

  state.failMore = true;
  await page.reload();
  await wait(page.getByTestId('therapy-calendar-cell'));
  await page.getByRole('tab', { name: 'Piano terapeutico', exact: true }).click();
  await page.getByRole('button', { name: 'Carica altre terapie', exact: true }).click();
  await wait(page.locator('.tf-pager__error'));
  assert.equal(await page.getByTestId('therapy-drug-line').count(), 2);
  assert.equal(await page.getByRole('button', { name: 'Carica altre terapie', exact: true }).isEnabled(), true);
  results.push('PASS pagination failure visible; existing prescriptions and retry retained');
  state.failMore = false;

  await page.goto(app + '#/dettaglio-paziente/patient-test');
  await page.getByRole('button', { name: /Medico Test/ }).click();
  await wait(page.locator('.patient-record-view'));
  await wait(page.locator('.cr-alert-strip--allergie'));
  assert.equal(await page.locator('.cr-alert-strip--allergie').count(), 1);
  assert.equal(await page.locator('.patient-allergy-strip, .patient-topbar-title__allergy').count(), 0);
  assert.match(await page.locator('.cr-alert-strip--allergie').textContent(), /Allergene sintetico.*Secondo allergene \(lieve\)/);
  await assertAllergyBand(page, true, out);
  assert.equal(await page.getByRole('tab', { name: 'Moduli 2', exact: true }).count(), 1);
  const legacy = page.locator('[data-entry-id="legacy-urgent"]');
  await wait(legacy);
  assert.match(await legacy.textContent(), /Priorità originale: urgente/);
  assert.doesNotMatch(await legacy.textContent(), /Urgenza storica|Letta e compresa/);
  results.push('PASS one red severe allergy band with management action, 24px gap and no overflow at 390/1150; modules count2, honest legacy priority');

  await page.getByRole('tab', { name: 'Clinica 12', exact: true }).click();
  const consegneSection = page.locator('.cts').filter({ has: page.locator('.cts__title').filter({ hasText: /^Consegne$/ }) });
  await wait(consegneSection);
  assert.match(await consegneSection.locator('.cts__badge').textContent(), /^12 consegne urgenti/);
  assert.equal(await page.locator('[data-consegna-id]').count(), 1, 'one row with aggregate12');
  results.push('PASS section urgency count uses exact summary rather than one loaded row');

  // Same-document URLs reproduce external pasted/hash navigation; no page reload to hide the bug.
  await page.goto(app + '#/dettaglio-paziente/patient-test/terapia-farmacologica?sv=programmazione&t=t1&d=' + today());
  await wait(page.getByRole('tab', { name: 'Piano terapeutico', exact: true }));
  await wait(page.getByTestId('therapy-prescription-detail'));
  assert.equal(await page.getByRole('tab', { name: 'Piano terapeutico', exact: true }).getAttribute('aria-selected'), 'true');
  for (const width of [390, 768, 1074, 1395]) {
    await page.setViewportSize({ width, height: 1004 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'document overflow ' + width);
    const band = await page.locator('.cr-alert-strip--allergie').boundingBox();
    assert.ok(band.width <= width, 'allergy band fit ' + width);
    await shot('actual-therapy-' + width);
  }
  await page.setViewportSize({ width: 1074, height: 1004 });
  await page.goto(app + '#/consegne');
  await wait(page.getByRole('heading', { name: 'Consegne', exact: true }));
  await page.goBack();
  await wait(page.getByRole('tab', { name: 'Calendario', exact: true }));
  await page.goForward();
  await wait(page.getByRole('heading', { name: 'Consegne', exact: true }));
  await page.reload();
  await page.getByRole('button', { name: /Medico Test/ }).click();
  await wait(page.getByRole('heading', { name: 'Consegne', exact: true }));
  results.push('PASS cycle7: pasted hash routes, target reveal, back/forward/reload and four responsive widths');

  state.badFeed = true;
  await page.reload();
  await page.getByRole('button', { name: /Medico Test/ }).click();
  assert.equal(await page.getByRole('button', { name: 'Feed consegne', exact: true }).count(), 0);
  assert.equal(await page.locator('.topbar-handovers').count(), 0);
  assert.equal(await page.getByText('Il modulo non è stato caricato', { exact: false }).count(), 0);
  results.push('PASS redundant feed and topbar handover shortcuts are absent; removed feed cannot crash workspace');
  state.badFeed = false;
  await page.goto(app + '#/admin-dashboard');
  await wait(page.getByRole('heading', { name: 'Il mio turno', exact: true }));
  assert.match(page.url(), /#\/operator-dashboard$/);
  results.push('PASS shell-incompatible hash falls back to the authorized dashboard');
  state.mildAllergy = true;
  await page.goto(app + '#/dettaglio-paziente/patient-test');
  await page.reload();
  await page.getByRole('button', { name: /Medico Test/ }).click();
  await assertAllergyBand(page, false, out);
  results.push('PASS nonsevere allergy remains amber; single actionable band at 390/1150px');
  assert.equal(state.clinicalWrites, 0);
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpectedHttp, []);
  assert.deepEqual(failedRequests, []);
  results.push('PASS zero clinical writes, unexpected HTTP, console or transport errors');
} catch (error) {
  results.push('FAIL ' + error.stack);
  await shot('failure');
  process.exitCode = 1;
} finally {
  await context.tracing.stop({ path: path.join(out, 'trace', 'ux-discovery.zip') });
  writeFileSync(path.join(out, 'test-results', 'discovery-runtime.json'), JSON.stringify({ results, errors, unexpectedHttp, failedRequests,
    slotReads: state.slotReads, clinicalWrites: state.clinicalWrites, requests: state.requests }, null, 2));
  writeFileSync(path.join(out, 'playwright-report', 'discovery.html'), '<!doctype html><meta charset="UTF-8"><title>UX discovery assertions</title><pre>' +
    results.join('\n').replaceAll('&', '&amp;').replaceAll('<', '&lt;') + '</pre>');
  console.log(results.join('\n'));
  await context.close();
  await page.video().saveAs(path.join(out, 'video', 'ux-discovery.webm'));
  await browser.close();
}
