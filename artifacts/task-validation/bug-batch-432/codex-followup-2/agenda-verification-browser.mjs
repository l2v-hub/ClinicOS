import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { prisma } from '../../../../backend/src/lib/prisma.js';
import { facilityToday } from '../../../../backend/src/patients/parameter-reading-input.js';
import { findTherapiesDue } from '../../../../backend/src/therapies/due-therapy-query.js';
import { buildTherapySlots } from '../../../../backend/src/therapies/therapy-slots.js';
import { installVerifiedFonts, verifyLoadedFonts, redactSyntheticTrace } from '../../../../e2e/qa-bug-batch-432-browser.mjs';

const out = resolve(process.argv[2]);
mkdirSync(out, { recursive: true });
const backend = process.env.QA_BACKEND_URL, frontend = process.env.QA_FRONTEND_URL;
for (const value of [backend, frontend, process.env.DATABASE_URL]) assert.ok(['localhost', '127.0.0.1'].includes(new URL(value).hostname));
assert.equal(new URL(process.env.DATABASE_URL).pathname, '/clinicos_qa_batch432');
const marker = await prisma.$queryRaw`SELECT shobj_description(oid,'pg_database') AS owner FROM pg_database WHERE datname=current_database()`;
assert.equal(marker[0]?.owner, `clinicos-qa:${process.env.QA_RUN_OWNER}`);
const date = facilityToday();
const day = (n) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const tomorrow = day(1), after = day(2), runId = randomUUID();
const sessions = {};
for (const identityId of ['SIM-DOCTOR-1', 'SIM-NURSE-1', 'SIM-SUPERVISOR-1']) {
  const response = await fetch(`${backend}/auth/simulator/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identityId }) });
  assert.equal(response.status, 201); sessions[identityId] = await response.json();
}
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${sessions['SIM-NURSE-1'].token}` };
const patient = await prisma.patient.create({ data: { medicalRecordNumber: `QA6-${runId}`, firstName: 'Ada', lastName: 'ZZZZ QA6 Verification', registeredById: 'SIM-DOCTOR-1' } });
const row = (id, name, time, selected = date) => ({ id: `qa6-${runId}-${id}`, patientId: patient.id, farmacoNome: name, dosaggio: '10 mg', viaSomministrazione: 'orale', tipo: 'una_tantum', stato: 'attiva', dataInizio: date, dataSomministrazione: selected, orarioSomministrazione: time, fasceMattina: false, fascePranzo: false, fascePomeriggio: false, fasceSera: false, fasceNotte: false });
const missing = row('aaa-verify', 'QA6 missing clock', null);
const ambiguous = [missing, row('zzz-verify-1', 'QA6 invalid clock', '99:00'), row('zzz-verify-2', 'QA6 conflicting schedule', '08:30'), row('zzz-verify-3', 'QA6 multiple schedules', '08:30'), row('zzz-verify-4', 'QA6 tab clock', '\t08:30')];
const future = row('zzz-tomorrow', 'QA6 tomorrow only', null, tomorrow), later = row('zzz-after', 'QA6 day after only', null, after);
const results = [], sql = [], phases = [];
let browser, active, phase = 'fixture';
const setPhase = (value) => { phase = value; phases.push(value); };
const barriers = [];
function deferred() {
  let resolve, timer;
  const promise = new Promise((r, reject) => { resolve = () => { clearTimeout(timer); r(); }; timer = setTimeout(() => reject(new Error('Controlled response barrier timed out')), 40000); });
  promise.catch(() => {});
  const value = { promise, resolve }; barriers.push(value); return value;
}
async function context(name, negative = false) {
  const directory = resolve(out, name); mkdirSync(directory, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, recordVideo: { dir: resolve(directory, 'video') } });
  await installVerifiedFonts(ctx, directory); await ctx.tracing.start({ screenshots: true, snapshots: true, sources: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(20000);
  const errors = [], consoleErrors = [], responses = [], writes = [], expected = [], expectations = new Map();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('response', (response) => {
    const planned = expectations.get(response.request());
    if (planned && planned.status === response.status()) planned.observed = true;
    if (response.url().startsWith(backend) && response.status() >= 400) responses.push({ url: response.url(), status: response.status() });
  });
  page.on('requestfailed', (request) => {
    const planned = expectations.get(request); if (planned) planned.transportFailure = request.failure()?.errorText;
  });
  page.on('request', (request) => { if (request.method() === 'POST' && /\/therapy-slots\/(confirm|not-administered)/.test(request.url())) writes.push(request.url()); });
  return { ctx, page, directory, errors, consoleErrors, responses, writes, expected, expectations, negative, video: page.video() };
}
async function close(run, clean = true) {
  await run.ctx.tracing.stop({ path: resolve(run.directory, 'trace.zip') }); await run.ctx.close();
  await redactSyntheticTrace(resolve(run.directory, 'trace.zip')); copyFileSync(await run.video.path(), resolve(run.directory, 'flow.webm'));
  writeFileSync(resolve(run.directory, 'browser-events.json'), JSON.stringify({ errors: run.errors, consoleErrors: run.consoleErrors, failedResponses: run.responses, expectedFailures: run.expected, administrationPosts: run.writes }, null, 2));
  if (!clean) return;
  assert.deepEqual(run.errors, []); assert.deepEqual(run.writes, []);
  if (!run.negative) { assert.deepEqual(run.consoleErrors, []); assert.deepEqual(run.responses, []); }
  else {
    for (const item of run.expected) assert.ok(item.observed || item.transportFailure, 'Undelivered injection must have a recorded aborted transport');
    const remaining = run.expected.filter((item) => item.observed);
    for (const response of run.responses) { const index = remaining.findIndex((item) => item.url === response.url && item.status === response.status); assert.ok(index >= 0, `Unexpected failed response ${response.status} ${response.url}`); remaining.splice(index, 1); }
    assert.equal(remaining.length, 0, 'Every planned negative response was observed');
    assert.ok(run.consoleErrors.every((message) => /Failed to load resource: the server responded with a status of (503|403|409)/.test(message)));
    assert.ok(run.consoleErrors.length <= run.expected.filter((item) => item.observed).length);
  }
}
async function chooseLogin(page, name) { await page.getByRole('button', { name }).click(); await page.locator('.app-shell').waitFor(); await verifyLoadedFonts(page); }
async function login(page, name = /^Infermiere 1/) { await page.goto(frontend + '/'); await chooseLogin(page, name); }
async function reloadLogin(page, name) { const target = new URL(page.url()).hash; await page.reload(); await chooseLogin(page, name); assert.equal(new URL(page.url()).hash, target, 'Actual reload preserves the Agenda destination through login'); }
const panel = (page, selected = date) => page.getByRole('region', { name: `Terapie da verificare ${selected}`, exact: true });
async function noTimedUi(page) {
  assert.equal(await page.locator('.agt-therapy-slot, .agt-week-therapy-dot, .therapy-modal-overlay').count(), 0);
  assert.equal(await page.getByRole('button', { name: /^(Somministra|Erogata:|Non erogata:)/ }).count(), 0);
}
async function complete(page, selected = date, names = ambiguous.map((t) => t.farmacoNome)) {
  await panel(page, selected).waitFor();
  let pages = 0;
  while (await page.getByRole('button', { name: 'Carica altre verifiche', exact: true }).count()) {
    const response = page.waitForResponse((r) => r.url().startsWith(backend + '/therapy-slots/page?') && new URL(r.url()).searchParams.has('cursor'));
    await page.getByRole('button', { name: 'Carica altre verifiche', exact: true }).click(); assert.equal((await response).status(), 200); pages++; assert.ok(pages <= 5);
    await page.getByText('Caricamento…', { exact: true }).waitFor({ state: 'hidden' }).catch(() => {});
  }
  for (const name of names) await panel(page, selected).getByText(name, { exact: true }).waitFor();
  assert.equal(await panel(page, selected).getByRole('button').count(), 0); await noTimedUi(page);
  return pages;
}
async function screenshot(name) { await active.page.screenshot({ path: resolve(active.directory, name + '.png'), fullPage: true }); }
try {
  await prisma.patientTherapy.createMany({ data: [...Array.from({ length: 102 }, (_, i) => row(`mmm-scheduled-${String(i).padStart(3, '0')}`, `QA6 scheduled ${i}`, '08:30')), ...ambiguous, future, later] });
  await prisma.therapySchedule.createMany({ data: [
    { therapyId: ambiguous[2].id, time: '12:30', fascia: 'pranzo', quantityNumerator: 1, quantityDenominator: 1, administrationUnit: 'compressa' },
    ...[1, 2].map((quantityNumerator) => ({ therapyId: ambiguous[3].id, time: '08:30', fascia: 'mattina', quantityNumerator, quantityDenominator: 1, administrationUnit: 'compressa' })),
  ] });
  const due = await findTherapiesDue(date, { patientIds: [patient.id] }, new Date(), 60, 10);
  assert.equal(due.toVerifyCount, 5); assert.equal(due.toVerify.length, 5);
  assert.ok(due.toVerify.every((item) => item.scheduledTime === null && item.fascia === null && item.dosage === null && item.canAdminister === false));
  assert.deepEqual(await buildTherapySlots(date, { patientIds: [] }), []);
  assert.deepEqual(await buildTherapySlots(date, { patientIds: [patient.id], registeredById: 'SIM-NURSE-1' }), []);
  for (const therapy of ambiguous) for (const endpoint of ['confirm', 'not-administered']) {
    const response = await fetch(`${backend}/therapy-slots/${endpoint}`, { method: 'POST', headers, body: JSON.stringify({ patientId: patient.id, therapyId: therapy.id, date, fascia: 'mattina', scheduledTime: '08:30', expectedStato: 'da_erogare', motivo: 'rifiuto', requestId: randomUUID() }) });
    assert.equal(response.status, 409);
  }
  assert.equal(await prisma.medicationAdministration.count({ where: { patientId: patient.id } }), 0);
  const first = await fetch(`${backend}/therapy-slots/page?date=${date}&limit=100`, { headers }); assert.equal(first.status, 200);
  const firstPage = await first.json(), firstGroup = firstPage.slots.find((g) => g.kind === 'verification');
  assert.equal(firstGroup.summary.total, 5); assert.equal(firstPage.pageInfo.hasMore, true);
  const firstOwn = firstGroup.patients.find((p) => p.patientId === patient.id)?.items ?? [];
  assert.equal(firstOwn.length, 1, 'One verification precedes 102 scheduled candidates; four follow page1');
  sql.push({ name: 'real-sql-five-readonly-items-and-acl', verification: 5, deniedWrites: 10, administrations: 0, firstPageVerificationDetails: 1, hasMore: true });
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });

  for (const [role, identity, route] of [['operator', /^Infermiere 1/, 'agenda-operatore'], ['admin', /^Supervisore 1/, 'agenda-admin']]) {
    setPhase(role + '-cold-entry'); active = await context(role + '-positive'); const page = active.page;
    await login(page, identity); await page.goto(`${frontend}/#/${route}`);
    await panel(page).getByText(missing.farmacoNome, { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Carica altre verifiche', exact: true }).waitFor(); await screenshot('partial-before-continuation');
    assert.ok(await complete(page) >= 1); await screenshot('complete-readonly');
    await reloadLogin(page, identity); await complete(page); await screenshot('actual-route-reload');
    await page.getByRole('button', { name: 'Intervallo successivo', exact: true }).click();
    await complete(page, tomorrow, [future.farmacoNome]); assert.equal(await page.getByText(missing.farmacoNome, { exact: true }).count(), 0);
    for (const view of ['Settimana', 'Mese']) { await page.getByRole('button', { name: view, exact: true }).click(); assert.equal(await page.getByRole('region', { name: /^Terapie da verificare / }).count(), 0); assert.equal(await page.getByRole('button', { name: 'Carica altre verifiche', exact: true }).count(), 0); }
    await page.getByRole('button', { name: 'Giorno', exact: true }).click(); await complete(page, tomorrow, [future.farmacoNome]);
    await page.getByRole('button', { name: 'Vai a oggi', exact: true }).click(); await complete(page);
    await page.goto(frontend + '/#/terapie'); await page.getByRole('button', { name: 'Giro', exact: true }).click();
    const moreTherapies = page.getByRole('button', { name: 'Carica altre terapie', exact: true });
    await moreTherapies.waitFor();
    const giroContinuation = page.waitForResponse((response) => response.url().startsWith(backend + '/therapy-slots/page?') && new URL(response.url()).searchParams.has('cursor'));
    await moreTherapies.click(); assert.equal((await giroContinuation).status(), 200); await moreTherapies.waitFor({ state: 'hidden' });
    await page.getByLabel('Data terapia', { exact: true }).fill(tomorrow);
    await panel(page, tomorrow).getByText(future.farmacoNome, { exact: true }).waitFor();
    await page.goto(`${frontend}/#/${route}`); await complete(page); assert.equal(await page.getByText(future.farmacoNome, { exact: true }).count(), 0);
    await page.setViewportSize({ width: 360, height: 900 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false); await screenshot('mobile-readonly');
    results.push({ name: role + '-actual-App-cold-reload-selected-day-view-return-paginated-readonly', pass: true, verification: 5, timedCards: 0, administrationPosts: 0, terapiaContinuationRealClick: true });
    await close(active); active = undefined;
  }

  setPhase('negative-errors-races-roster-session'); active = await context('lifecycle-negatives', true); const page = active.page;
  let failInitial = 503, failAppend = false, holdDate = null, holdAppend = false, hold = null;
  const held = [];
  await page.route(backend + '/therapy-slots/page?**', async (route) => {
    const request = route.request(); if (request.method() !== 'GET') return route.continue();
    const url = new URL(request.url()), append = url.searchParams.has('cursor');
    const status = !append && failInitial ? failInitial : append && failAppend ? 503 : null;
    if (status) { const planned = { url: request.url(), status, cause: 'controlled lifecycle error', observed: false }; active.expected.push(planned); active.expectations.set(request, planned); return route.fulfill({ status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': frontend }, body: JSON.stringify({ error: 'Synthetic lifecycle failure', code: status === 403 ? 'capability_denied' : 'synthetic_failure' }) }); }
    if ((!append && holdDate === url.searchParams.get('date')) || (append && holdAppend)) {
      holdDate = null; holdAppend = false;
      const barrier = hold, response = await route.fetch(); held.push(barrier); barrier.captured.resolve(); await barrier.release.promise;
      try { await route.fulfill({ response }); } catch (error) { barrier.aborted = String(error.message); }
      barrier.finished.resolve(); return;
    }
    await route.continue();
  });
  await login(page); await page.goto(frontend + '/#/agenda-operatore'); await page.getByRole('button', { name: 'Riprova verifiche', exact: true }).waitFor();
  assert.equal(await page.getByText(missing.farmacoNome, { exact: true }).count(), 0); assert.ok(await page.getByRole('button', { name: 'Nuovo appuntamento', exact: true }).count()); await screenshot('initial-error-no-stale-data');
  failInitial = 0; await page.getByRole('button', { name: 'Riprova verifiche', exact: true }).click(); await panel(page).getByText(missing.farmacoNome, { exact: true }).waitFor();
  failAppend = true; await page.getByRole('button', { name: 'Carica altre verifiche', exact: true }).click(); await page.getByText('Altre terapie non disponibili: i dati già caricati restano visibili', { exact: true }).first().waitFor();
  await panel(page).getByText(missing.farmacoNome, { exact: true }).waitFor(); assert.match(await panel(page).innerText(), /Da verificare · 5/); await screenshot('append-error-retains-exact-count'); failAppend = false; await complete(page);
  failInitial = 403; await page.getByRole('button', { name: 'Intervallo successivo', exact: true }).click(); await page.getByRole('button', { name: 'Riprova verifiche', exact: true }).waitFor();
  assert.equal(await page.getByText(missing.farmacoNome, { exact: true }).count(), 0); assert.equal(await page.getByText(future.farmacoNome, { exact: true }).count(), 0); await screenshot('denied-read-no-old-names');
  failInitial = 0; await page.getByRole('button', { name: 'Riprova verifiche', exact: true }).click(); await complete(page, tomorrow, [future.farmacoNome]);
  await page.getByRole('button', { name: 'Vai a oggi', exact: true }).click(); await complete(page);

  hold = { captured: deferred(), release: deferred(), finished: deferred() }; holdDate = tomorrow;
  await page.getByRole('button', { name: 'Intervallo successivo', exact: true }).click(); await hold.captured.promise;
  assert.equal(await page.getByText(missing.farmacoNome, { exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Intervallo successivo', exact: true }).click(); await complete(page, after, [later.farmacoNome]); hold.release.resolve(); await hold.finished.promise;
  await page.waitForTimeout(200); await complete(page, after, [later.farmacoNome]); assert.equal(await page.getByText(future.farmacoNome, { exact: true }).count(), 0); await screenshot('old-day-response-cannot-replace-new-day');

  await page.getByRole('button', { name: 'Vai a oggi', exact: true }).click(); await panel(page).getByText(missing.farmacoNome, { exact: true }).waitFor();
  hold = { captured: deferred(), release: deferred(), finished: deferred() }; holdAppend = true;
  await page.getByRole('button', { name: 'Carica altre verifiche', exact: true }).click(); await hold.captured.promise;
  await page.getByRole('button', { name: 'Intervallo successivo', exact: true }).click(); await complete(page, tomorrow, [future.farmacoNome]); hold.release.resolve(); await hold.finished.promise;
  await page.waitForTimeout(200); await complete(page, tomorrow, [future.farmacoNome]); assert.equal(await page.getByText(missing.farmacoNome, { exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Vai a oggi', exact: true }).click(); await panel(page).getByText(missing.farmacoNome, { exact: true }).waitFor(); await complete(page);
  results.push({ name: 'real-App-initial-503-append-503-403-retry-and-out-of-order-day-append', pass: true, interceptionsDisclosed: true, oldNamesAbsent: true });

  await page.getByRole('button', { name: 'Intervallo successivo', exact: true }).click(); await complete(page, tomorrow, [future.farmacoNome]);
  await page.getByRole('button', { name: 'Vai a oggi', exact: true }).click(); await panel(page).getByText(missing.farmacoNome, { exact: true }).waitFor();
  await prisma.patientTherapy.create({ data: row('mmm-roster-change', 'QA6 scheduled roster mutation', '08:30') });
  const oldCursorResponse = page.waitForResponse((response) => response.url().startsWith(backend + '/therapy-slots/page?') && response.status() === 409);
  const recoveredFirstPage = page.waitForResponse((response) => response.url().startsWith(backend + '/therapy-slots/page?') && !new URL(response.url()).searchParams.has('cursor') && new URL(response.url()).searchParams.get('date') === date && response.status() === 200);
  const mark409 = (response) => { if (response.url().startsWith(backend + '/therapy-slots/page?') && response.status() === 409) active.expected.push({ url: response.url(), status: 409, observed: true, cause: 'real owned SQL roster epoch mutation' }); };
  page.on('response', mark409); await page.getByRole('button', { name: 'Carica altre verifiche', exact: true }).click(); const conflict = await oldCursorResponse; assert.equal((await conflict.json()).code, 'roster_changed');
  await recoveredFirstPage; await page.getByRole('button', { name: 'Carica altre verifiche', exact: true }).waitFor(); await panel(page).getByText(missing.farmacoNome, { exact: true }).waitFor(); await complete(page); page.off('response', mark409); await screenshot('real-roster-epoch-recovery');
  results.push({ name: 'real-roster-epoch-409-recovery-retains-selected-day', pass: true });

  await page.getByRole('button', { name: 'Intervallo successivo', exact: true }).click(); await complete(page, tomorrow, [future.farmacoNome]);
  hold = { captured: deferred(), release: deferred(), finished: deferred() }; holdDate = date;
  await page.getByRole('button', { name: 'Vai a oggi', exact: true }).click(); await hold.captured.promise;
  await prisma.patientTherapy.delete({ where: { id: missing.id } });
  await page.getByRole('button', { name: /menu utente$/ }).click(); await page.getByRole('button', { name: 'Cambia profilo', exact: true }).click();
  await chooseLogin(page, /^Supervisore 1/); await page.goto(frontend + '/#/agenda-admin'); await complete(page, date, ambiguous.slice(1).map((t) => t.farmacoNome));
  hold.release.resolve(); await hold.finished.promise; await page.waitForTimeout(200);
  assert.equal(await page.getByText(missing.farmacoNome, { exact: true }).count(), 0); assert.match(await panel(page).innerText(), /Da verificare · 4/); await noTimedUi(page); await screenshot('old-session-response-cannot-repopulate');
  results.push({ name: 'real-logout-new-role-during-held-old-session-read', pass: true, oldSnapshotItemDeletedInOwnedFixture: true, newCount: 4 });
  await close(active); active = undefined;
  assert.equal(await prisma.medicationAdministration.count({ where: { patientId: patient.id } }), 0);
  sql.push({ name: 'actual-Agenda-readonly-after-all-browser-cases', administrations: 0, receiptCount: await prisma.therapyAdministrationReceipt.count({ where: { patientId: patient.id } }) });
  assert.equal(sql.at(-1).receiptCount, 0);
  writeFileSync(resolve(out, 'results.json'), JSON.stringify({ results, sql, phases, syntheticOnly: true, timedAgendaUiIntroduced: false }, null, 2));
} catch (error) {
  writeFileSync(resolve(out, 'failure.json'), JSON.stringify({ phase, error: error.message, stack: error.stack, results, sql, phases }, null, 2));
  if (active) { await active.page.screenshot({ path: resolve(active.directory, 'failure.png'), fullPage: true }).catch(() => {}); writeFileSync(resolve(active.directory, 'failure-dom.txt'), await active.page.locator('body').innerText().catch(() => '')); }
  throw error;
} finally {
  for (const barrier of barriers) barrier.resolve();
  try { if (active) await close(active, false); } finally {
    if (browser) await browser.close();
    try { await prisma.patient.delete({ where: { id: patient.id } }); } finally { await prisma.$disconnect(); }
  }
}
