// Live PostgreSQL/HTTP/browser regression for full inventory and distinct prescribed doses.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { prisma } from '../backend/src/lib/prisma.js';
import { facilityToday } from '../backend/src/patients/parameter-reading-input.js';

const frontend = process.env.QA_FRONTEND_URL ?? 'http://127.0.0.1:5185';
const backend = process.env.QA_BACKEND_URL ?? 'http://127.0.0.1:3201';
for (const value of [frontend, backend, process.env.DATABASE_URL]) {
  assert.ok(value && ['localhost', '127.0.0.1'].includes(new URL(value).hostname));
}
assert.match(new URL(process.env.DATABASE_URL).pathname, /^\/clinicos_qa_/);
const out = resolve(process.argv[2] ?? '/tmp/clinicos-therapy-completeness-browser');
mkdirSync(out, { recursive: true });
const today = facilityToday();
const tomorrow = new Date(`${today}T12:00:00Z`);
tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
const patient = await prisma.patient.create({
  data: {
    medicalRecordNumber: 'QA-INVENTORY-' + randomUUID(),
    firstName: 'Test',
    lastName: 'Synthetic Inventory',
    dateOfBirth: new Date('1970-01-01'),
    registeredById: 'SIM-DOCTOR-1',
  },
});
await prisma.patientTherapy.createMany({
  data: Array.from({ length: 105 }, (_, i) => ({
    id: `QA-${patient.id}-${i}`,
    patientId: patient.id,
    farmacoNome: `QA inventory ${String(i).padStart(3, '0')}`,
    dosaggio: '1 compressa',
    viaSomministrazione: 'orale',
    tipo: i === 102 ? 'al_bisogno' : i === 104 ? 'una_tantum' : 'periodica',
    stato: i === 103 ? 'sospesa' : 'attiva',
    dataInizio: today,
    fasceMattina: i < 101,
    orarioSpecifico: i === 101 ? '10:00' : i < 101 ? '08:00' : null,
    dataSomministrazione: i === 104 ? tomorrow.toISOString().slice(0, 10) : null,
    orarioSomministrazione: i === 104 ? '08:00' : null,
  })),
});
await prisma.therapySchedule.createMany({
  data: [
    {
      therapyId: `QA-${patient.id}-0`,
      fascia: 'mattina',
      time: '08:00',
      quantityNumerator: 1,
      quantityDenominator: 1,
      administrationUnit: 'compressa',
    },
    {
      therapyId: `QA-${patient.id}-0`,
      fascia: 'mattina',
      time: '10:00',
      quantityNumerator: 2,
      quantityDenominator: 1,
      administrationUnit: 'compressa',
    },
  ],
});
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {}),
});
const results = [];
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const pages = [];
  page.on('request', (request) => {
    if (request.url().includes(`/patients/${patient.id}/therapies/page`))
      pages.push(new URL(request.url()).search);
  });
  await page.goto(`${frontend}/#/dettaglio-paziente/${patient.id}`);
  await page.getByRole('button', { name: /^Infermiere 1/ }).click();
  await page.locator('.patient-record-view').waitFor();
  await page.getByRole('tab', { name: 'Terapia', exact: true }).click();
  await page.getByRole('tab', { name: 'Piano terapeutico', exact: true }).click();
  const active = page.getByRole('list', { name: 'Farmaci attivi' });
  await active.getByRole('button', { name: /^QA inventory 104 / }).waitFor();
  assert.equal(await active.locator(':scope > li').count(), 104);
  assert.ok(
    pages.some((query) => query.includes('cursor=')),
    'Live inventory must request later pages',
  );
  results.push({ name: '105-prescription-inventory', pass: true, active: 104, requests: pages });
  await page.getByRole('tab', { name: 'Storico', exact: true }).click();
  await page.getByRole('button', { name: 'Prescrizioni sospese/concluse', exact: true }).click();
  await page.getByRole('button', { name: /^QA inventory 103 / }).waitFor();
  results.push({ name: 'suspended-prescription-visible', pass: true });
  await page.getByRole('tab', { name: 'Calendario', exact: true }).click();
  const calendar = page.locator('.patient-therapy-calendar');
  await calendar.getByRole('region', { name: 'Al bisogno', exact: true }).waitFor();
  await calendar.getByText('QA inventory 102', { exact: true }).waitFor();
  await calendar.getByRole('button', { name: 'Settimana', exact: true }).click();
  await calendar.getByText('QA inventory 102', { exact: true }).waitFor();
  results.push({ name: 'PRN-visible-day-and-week', pass: true });
  await calendar.getByRole('button', { name: 'Giorno', exact: true }).click();
  await calendar.locator('button[data-time="10:00"]').click();
  const detail = calendar.locator('.patient-therapy-slot-detail');
  const missing = detail.getByRole('list', { name: 'Prescrizioni dell’orario' });
  await missing.getByText('QA inventory 101', { exact: true }).waitFor();
  assert.equal(await missing.getByRole('button').count(), 0);
  await detail
    .getByText('Nessuna somministrazione registrabile da questa riga.', { exact: false })
    .waitFor();
  results.push({ name: 'missing-feed-prescription-read-only', pass: true });
  const responseReceived = page.waitForResponse(
    (response) => response.url() === backend + '/therapy-slots/confirm',
  );
  const write = page.waitForRequest(
    (request) => request.url() === backend + '/therapy-slots/confirm',
  );
  await detail.getByRole('button', { name: /^Erogata:.*QA inventory 000/ }).click();
  const request = await write;
  assert.equal(request.postDataJSON().scheduledTime, '10:00');
  assert.equal((await responseReceived).status(), 200);
  await detail
    .getByRole('button', { name: /^Erogata:.*QA inventory 000/ })
    .waitFor({ state: 'detached' });
  const records = await prisma.medicationAdministration.findMany({
    where: { therapyId: `QA-${patient.id}-0` },
  });
  assert.equal(records.length, 1);
  assert.equal(records[0].ora, '10:00');
  assert.equal(records[0].farmacoDose, '2 compressa');
  await page.getByRole('dialog').getByRole('button', { name: 'Chiudi', exact: true }).click();
  await calendar.locator('button[data-time="08:00"]').click();
  await calendar.getByRole('button', { name: /^Erogata:.*QA inventory 000/ }).waitFor();
  results.push({ name: 'later-dose-confirmed-first-dose-still-pending', pass: true });
  await page.screenshot({ path: resolve(out, 'desktop-distinct-doses.png'), fullPage: true });
  await page.setViewportSize({ width: 360, height: 900 });
  await page.waitForTimeout(250);
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
    false,
  );
  await page.screenshot({ path: resolve(out, 'mobile-distinct-doses.png'), fullPage: true });
  assert.deepEqual(errors, []);
  results.push({ name: 'mobile-and-javascript', pass: true });
} catch (error) {
  results.push({ name: 'browser-flow', pass: false, error: error.message });
  process.exitCode = 1;
} finally {
  writeFileSync(
    resolve(out, 'results.json'),
    JSON.stringify({ patientId: patient.id, results }, null, 2),
  );
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
  await prisma.patient.delete({ where: { id: patient.id } });
  await prisma.$disconnect();
}
