import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { prisma } from '../../../../backend/src/lib/prisma.js';
import { facilityToday } from '../../../../backend/src/patients/parameter-reading-input.js';
import { findTherapiesDue } from '../../../../backend/src/therapies/due-therapy-query.js';
import { installVerifiedFonts, verifyLoadedFonts, redactSyntheticTrace } from '../../../../e2e/qa-bug-batch-432-browser.mjs';

const out = resolve(process.argv[2]);
mkdirSync(out, { recursive: true });
const backend = process.env.QA_BACKEND_URL;
const frontend = process.env.QA_FRONTEND_URL;
for (const target of [backend, frontend, process.env.DATABASE_URL]) assert.ok(target && ['127.0.0.1', 'localhost'].includes(new URL(target).hostname));
assert.equal(new URL(process.env.DATABASE_URL).pathname, '/clinicos_qa_batch432');
const marker = await prisma.$queryRaw`SELECT shobj_description(oid,'pg_database') AS owner FROM pg_database WHERE datname=current_database()`;
assert.equal(marker[0]?.owner, `clinicos-qa:${process.env.QA_RUN_OWNER}`);
// Each fresh isolated DB requires simulator identities before FK-backed synthetic fixtures.
// The canonical browser normally creates these sessions; this focused invocation owns setup.
let session;
for (const identityId of ['SIM-DOCTOR-1', 'SIM-NURSE-1']) {
  const response = await fetch(`${backend}/auth/simulator/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identityId }) });
  assert.equal(response.status, 201);
  const created = await response.json();
  if (identityId === 'SIM-NURSE-1') session = created;
}
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` };
const date = facilityToday();
const patient = await prisma.patient.create({ data: { medicalRecordNumber: `QA-CLINICAL-${randomUUID()}`, firstName: 'Ada', lastName: 'QA Clinical Followup', dateOfBirth: new Date('1970-01-01'), registeredById: 'SIM-DOCTOR-1' } });
const make = (name, time, flags = {}) => prisma.patientTherapy.create({ data: { patientId: patient.id, farmacoNome: name, dosaggio: '10 mg', viaSomministrazione: 'orale', tipo: 'una_tantum', stato: 'attiva', dataInizio: date, dataSomministrazione: date, orarioSomministrazione: time, fasceMattina: false, fascePranzo: false, fascePomeriggio: false, fasceSera: false, fasceNotte: false, ...flags } });
const correction = await make('QA explicit correction', '08:30');
const unpadded = await make('QA equivalent clock', '8:30');
const missing = await make('QA missing clock', null, { fasceMattina: true, fasceSera: true });
const invalid = await make('QA invalid clock', '99:00');
const conflict = await make('QA conflicting schedule', '11:30');
const multiple = await make('QA multiple schedules', '08:30');
await prisma.therapySchedule.createMany({ data: [
  { therapyId: conflict.id, time: '12:30', fascia: 'pranzo', quantityNumerator: 1, quantityDenominator: 1, administrationUnit: 'compressa' },
  ...[1, 2].map((quantityNumerator) => ({ therapyId: multiple.id, time: '08:30', fascia: 'mattina', quantityNumerator, quantityDenominator: 1, administrationUnit: 'compressa' })),
] });
const results = [];
const browser = await chromium.launch({ ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
let active;
async function context(name) {
  const directory = resolve(out, name);
  mkdirSync(directory, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, recordVideo: { dir: resolve(directory, 'video') } });
  await installVerifiedFonts(ctx, directory);
  await ctx.tracing.start({ screenshots: true, snapshots: true, sources: true });
  const page = await ctx.newPage();
  page.setDefaultTimeout(25000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', (response) => { if (response.url().startsWith(backend) && response.status() >= 400) errors.push(`${new URL(response.url()).pathname}:${response.status()}`); });
  return { ctx, page, errors, directory, video: page.video() };
}
async function close(run, assertClean = true) {
  await run.ctx.tracing.stop({ path: resolve(run.directory, 'trace.zip') });
  await run.ctx.close();
  await redactSyntheticTrace(resolve(run.directory, 'trace.zip'));
  copyFileSync(await run.video.path(), resolve(run.directory, 'flow.webm'));
  writeFileSync(resolve(run.directory, 'browser-errors.json'), JSON.stringify(run.errors, null, 2));
  if (assertClean) assert.deepEqual(run.errors, []);
}
async function openCalendar(page) {
  await page.goto(`${frontend}/`);
  const login = page.getByRole('button', { name: /^Infermiere 1/ });
  const loginNeeded = await Promise.race([login.waitFor().then(() => true), page.locator('.app-shell').waitFor().then(() => false)]);
  if (loginNeeded) await login.click();
  await page.locator('.app-shell').waitFor();
  await page.goto(`${frontend}/#/dettaglio-paziente/${patient.id}`);
  await page.locator('.patient-record-view').waitFor();
  await verifyLoadedFonts(page);
  await page.getByRole('tab', { name: 'Terapia', exact: true }).click();
  await page.getByRole('tab', { name: 'Calendario', exact: true }).click();
  await page.getByRole('button', { name: 'Giorno', exact: true }).click();
  return page.locator('.patient-therapy-calendar');
}
try {
  active = await context('correction');
  const { page } = active;
  let calendar = await openCalendar(page);
  await calendar.locator('button[data-time="08:30"]').click();
  let detail = calendar.locator('.patient-therapy-slot-detail');
  await detail.getByRole('button', { name: /^Non erogata:.*QA explicit correction/ }).click();
  await detail.getByRole('button', { name: /^Rifiutata dal paziente:.*QA explicit correction/ }).click();
  const refusedResponse = page.waitForResponse((response) => response.url() === `${backend}/therapy-slots/not-administered`);
  await detail.getByRole('button', { name: /^Conferma non erogata:.*QA explicit correction/ }).click();
  assert.equal((await refusedResponse).status(), 200);
  const retry = detail.getByRole('button', { name: /^Somministra ora: QA explicit correction/ });
  await retry.waitFor();
  const refused = await prisma.medicationAdministration.findFirstOrThrow({ where: { therapyId: correction.id } });
  assert.equal(refused.stato, 'non_erogata');
  const request = page.waitForRequest((request) => request.url() === `${backend}/therapy-slots/confirm`);
  const response = page.waitForResponse((response) => response.url() === `${backend}/therapy-slots/confirm`);
  await retry.click();
  const body = (await request).postDataJSON();
  assert.equal(body.expectedStato, 'non_erogata');
  assert.equal((await response).status(), 200);
  await retry.waitFor({ state: 'detached' });
  await page.reload();
  calendar = await openCalendar(page);
  await calendar.locator('button[data-time="08:30"]').click();
  detail = calendar.locator('.patient-therapy-slot-detail');
  const givenRow = detail.locator('.giro-drug').filter({ hasText: 'QA explicit correction' });
  const givenBadge = givenRow.locator('.giro-badge--ok');
  await givenBadge.waitFor();
  assert.match(await givenBadge.innerText(), /Infermiere 1/);
  assert.equal(await givenRow.getByRole('button', { name: /^Erogata:|^Somministra ora:/ }).count(), 0);
  const records = await prisma.medicationAdministration.findMany({ where: { therapyId: correction.id } });
  assert.equal(records.length, 1);
  assert.equal(records[0].id, refused.id);
  assert.equal(records[0].stato, 'erogata');
  const replay = await fetch(`${backend}/therapy-slots/confirm`, { method: 'POST', headers, body: JSON.stringify(body) });
  assert.equal(replay.status, 200);
  assert.equal(replay.headers.get('Idempotent-Replayed'), 'true');
  assert.equal(await prisma.therapyAdministrationReceipt.count({ where: { actorId: 'SIM-NURSE-1', requestId: body.requestId } }), 1);
  await page.screenshot({ path: resolve(active.directory, 'refusal-corrected-after-reload.png'), fullPage: true });
  results.push({ name: 'refusal-explicit-correction-reload-and-replay', pass: true, expectedStato: body.expectedStato, recordCount: records.length, receiptCount: 1, stato: records[0].stato });
  await close(active); active = undefined;

  active = await context('verification');
  const verifyPage = active.page;
  const verifyCalendar = await openCalendar(verifyPage);
  const programming = verifyCalendar.getByRole('region', { name: 'Programmazione da completare' });
  await programming.getByText(/4 terapie con programmazione da completare/).waitFor();
  await programming.getByText('Vedi terapie da programmare (4)').click();
  for (const therapy of [missing, invalid, conflict, multiple]) await programming.getByText(therapy.farmacoNome, { exact: true }).waitFor();
  assert.equal(await verifyCalendar.locator('button[data-time="12:30"]').count(), 0);
  assert.equal(await verifyCalendar.locator('button[data-time="08:30"]').count(), 1);
  await verifyPage.screenshot({ path: resolve(active.directory, 'calendar-verification.png'), fullPage: true });
  const due = await findTherapiesDue(date, { patientIds: [patient.id] }, new Date(), 60, 50);
  assert.equal(due.toVerifyCount, 4);
  assert.equal(due.toVerify.length, 4);
  assert.ok(due.toVerify.every((item) => item.scheduledTime === null && item.fascia === null && item.dosage === null && !item.canAdminister));
  const feedResponse = await fetch(`${backend}/therapy-slots?date=${date}`, { headers });
  assert.equal(feedResponse.status, 200);
  const feed = await feedResponse.json();
  const verification = feed.find((group) => group.kind === 'verification');
  const ownItems = verification.patients.find((row) => row.patientId === patient.id).items;
  assert.equal(ownItems.length, 4);
  assert.ok(ownItems.every((item) => item.scheduledTime === null && item.dosage === null && item.quantityLabel === null && !item.canAdminister));
  const ordinary = feed.filter((group) => group.kind !== 'verification').flatMap((group) => group.patients.flatMap((row) => row.administrations));
  assert.equal(ordinary.find((item) => item.therapyId === unpadded.id).scheduledTime, '08:30');
  for (const therapy of [missing, invalid, conflict, multiple]) for (const endpoint of ['confirm', 'not-administered']) {
    const denied = await fetch(`${backend}/therapy-slots/${endpoint}`, { method: 'POST', headers, body: JSON.stringify({ patientId: patient.id, therapyId: therapy.id, date, fascia: 'mattina', scheduledTime: '08:30', motivo: 'rifiuto', expectedStato: 'da_erogare', requestId: randomUUID() }) });
    assert.equal(denied.status, 409);
    assert.equal(await prisma.medicationAdministration.count({ where: { therapyId: therapy.id } }), 0);
  }
  await verifyPage.goto(`${frontend}/#/terapie`);
  await verifyPage.getByRole('button', { name: 'Giro', exact: true }).click();
  const panel = verifyPage.getByRole('region', { name: `Terapie da verificare ${date}` });
  for (const therapy of [missing, invalid, conflict, multiple]) await panel.getByText(therapy.farmacoNome, { exact: true }).waitFor();
  assert.equal(await panel.getByRole('button').count(), 0);
  await verifyPage.screenshot({ path: resolve(active.directory, 'giro-verification.png'), fullPage: true });
  await verifyPage.setViewportSize({ width: 360, height: 900 });
  await verifyPage.waitForTimeout(250);
  assert.equal(await verifyPage.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  await verifyPage.screenshot({ path: resolve(active.directory, 'mobile-verification.png'), fullPage: true });
  await verifyPage.setViewportSize({ width: 1280, height: 900 });
  await verifyPage.goto(`${frontend}/#/operator-dashboard`);
  await verifyPage.getByRole('region', { name: `Terapie da verificare ${date}` }).getByText(missing.farmacoNome, { exact: true }).waitFor();
  await verifyPage.getByRole('button', { name: 'Apri Milo, assistente clinico AI', exact: true }).click();
  await verifyPage.locator('.agnos-brief').getByText(/da verificare/).first().waitFor();
  await verifyPage.screenshot({ path: resolve(active.directory, 'assistant-verification.png'), fullPage: true });
  results.push({ name: 'ambiguous-one-off-read-only-calendar-giro-dashboard-assistant', pass: true, verificationCount: 4, normalizedTime: '08:30', deniedWrites: 8, unwantedRecords: 0, mobileOverflow: false });
  await close(active); active = undefined;
  writeFileSync(resolve(out, 'results.json'), JSON.stringify({ results }, null, 2));
} catch (error) {
  writeFileSync(resolve(out, 'failure.json'), JSON.stringify({ error: error.message, stack: error.stack, results }, null, 2));
  if (active) await active.page.screenshot({ path: resolve(active.directory, 'failure.png'), fullPage: true }).catch(() => {});
  throw error;
} finally {
  try { if (active) await close(active, false); } finally {
    await browser.close();
    try { await prisma.patient.delete({ where: { id: patient.id } }); } finally { await prisma.$disconnect(); }
  }
}
