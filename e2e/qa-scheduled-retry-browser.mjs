// Real UI/network/DB regression: a lost response is uncertain; reload-safe retry replays once.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { installVerifiedFonts, verifyLoadedFonts } from './qa-bug-batch-432-browser.mjs';
import { prisma } from '../backend/src/lib/prisma.js';
import { facilityToday } from '../backend/src/patients/parameter-reading-input.js';

const backend = process.env.QA_BACKEND_URL,
  frontend = process.env.QA_FRONTEND_URL;
for (const value of [backend, frontend, process.env.DATABASE_URL])
  assert.ok(value && ['localhost', '127.0.0.1'].includes(new URL(value).hostname));
assert.match(new URL(process.env.DATABASE_URL).pathname, /^\/clinicos_qa_/);
const out = resolve(process.argv[2] ?? '/tmp/clinicos-scheduled-retry');
mkdirSync(out, { recursive: true });
const date = facilityToday();
const patient = await prisma.patient.create({
  data: {
    medicalRecordNumber: 'QA-RETRY-' + randomUUID(),
    firstName: 'Test',
    lastName: 'Synthetic Network',
    registeredById: 'SIM-DOCTOR-1',
  },
});
const therapy = await prisma.patientTherapy.create({
  data: {
    patientId: patient.id,
    farmacoNome: 'QA retry dose',
    dosaggio: '1 compressa',
    dataInizio: date,
    orarioSpecifico: '08:00',
    fasceMattina: true,
  },
});
const visibleTherapy = await prisma.patientTherapy.create({
  data: {
    patientId: patient.id,
    farmacoNome: 'QA visible retry dose',
    dosaggio: '1 compressa',
    dataInizio: date,
    orarioSpecifico: '10:00',
    fasceMattina: true,
  },
});
// Explicit schedule is authoritative for10:00. A legacy morning flag alone maps the
// writable feed to08:00 and its10:00 inventory row correctly remains read-only.
await prisma.therapySchedule.create({
  data: {
    therapyId: visibleTherapy.id,
    fascia: 'mattina',
    time: '10:00',
    quantityNumerator: 1,
    quantityDenominator: 1,
    administrationUnit: 'compressa',
  },
});
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {}),
});
const proof = {
  patientId: patient.id,
  therapyId: therapy.id,
  requests: [],
  intentionalNetworkFailures: 0,
  visibleRequests: [],
};
let context;
let recordedVideo;
const errors = [];
const failedResponses = [];
try {
  context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    recordVideo: { dir: resolve(out, 'video') },
  });
  await installVerifiedFonts(context, out);
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  const page = await context.newPage();
  recordedVideo = page.video();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.url().startsWith(backend) && response.status() >= 400)
      failedResponses.push({ path: new URL(response.url()).pathname, status: response.status() });
  });
  page.setDefaultTimeout(25000);
  let first = true;
  let firstVisible = true;
  await page.route(backend + '/therapy-slots/confirm', async (route) => {
    const request = route.request().postDataJSON();
    if (request.therapyId === visibleTherapy.id) {
      proof.visibleRequests.push(request);
      if (firstVisible) {
        firstVisible = false;
        proof.intentionalNetworkFailures++;
        return route.abort('failed'); // This request never reaches the clinical server.
      }
      const response = await route.fetch();
      assert.equal(response.status(), 200);
      return route.fulfill({ response });
    }
    proof.requests.push(request);
    if (first) {
      first = false;
      const response = await route.fetch();
      assert.equal(response.status(), 200);
      proof.firstServerResponse = await response.json();
      proof.intentionalNetworkFailures++;
      return route.abort('failed');
    }
    const response = await route.fetch();
    proof.replayHeader = response.headers()['idempotent-replayed'];
    await route.fulfill({ response });
  });
  const signIn = async () => {
    const button = page.getByRole('button', { name: /^Infermiere 1/ });
    const showLogin = await Promise.race([
      button.waitFor({ state: 'visible' }).then(() => true),
      page
        .locator('.patient-record-view')
        .waitFor()
        .then(() => false),
    ]);
    if (showLogin) await button.click();
    await page.locator('.patient-record-view').waitFor();
  };
  await page.goto(`${frontend}/#/dettaglio-paziente/${patient.id}`);
  await verifyLoadedFonts(page);
  await signIn();
  await page.getByRole('tab', { name: 'Terapia', exact: true }).click();
  await page.getByRole('tab', { name: 'Calendario', exact: true }).click();
  await page.getByRole('button', { name: 'Giorno', exact: true }).click();
  await page.locator('button[data-time="08:00"]').click();
  await page.getByRole('button', { name: /^Erogata:.*QA retry dose/ }).click();
  await page.getByRole('alert').filter({ hasText: 'Esito non verificabile' }).waitFor();
  const before = await prisma.medicationAdministration.findMany({
    where: { therapyId: therapy.id },
  });
  assert.equal(before.length, 1);
  assert.equal(before[0].stato, 'erogata');
  await page.screenshot({ path: resolve(out, 'lost-response-uncertain.png'), fullPage: true });
  await page.reload();
  await signIn();
  const retried = await page.evaluate(
    async (info) => {
      const writes = await import('/src/lib/therapyAdministrationWrite.ts');
      return writes.recordAdministration(info, { kind: 'administered' });
    },
    {
      patientId: patient.id,
      therapyId: therapy.id,
      date,
      fascia: 'mattina',
      scheduledTime: '08:00',
    },
  );
  assert.equal(retried.ok, true, JSON.stringify(retried));
  assert.equal(proof.requests.length, 2);
  assert.equal(proof.requests[0].requestId, proof.requests[1].requestId);
  assert.equal(proof.requests[1].expectedStato, 'da_erogare');
  assert.equal(proof.replayHeader, 'true');
  const after = await prisma.medicationAdministration.findMany({
    where: { therapyId: therapy.id },
  });
  assert.deepEqual(after, before);
  assert.equal(
    await prisma.therapyAdministrationReceipt.count({ where: { patientId: patient.id } }),
    1,
  );
  await page.getByRole('tab', { name: 'Terapia', exact: true }).click();
  await page.getByRole('tab', { name: 'Calendario', exact: true }).click();
  await page.getByRole('button', { name: 'Giorno', exact: true }).click();
  await page.locator('button[data-time="08:00"]').click();
  assert.equal(await page.getByRole('button', { name: /^Erogata:.*QA retry dose/ }).count(), 0);
  await page.screenshot({ path: resolve(out, 'after-reload-one-record.png'), fullPage: true });

  // A failure before the server write leaves the dose pending: reload and retry using
  // the actual visible action, proving persisted nonce recovery without module invocation.
  await page.getByRole('dialog').getByRole('button', { name: 'Chiudi', exact: true }).click();
  await page.locator('button[data-time="10:00"]').click();
  await page.getByRole('button', { name: /^Erogata:.*QA visible retry dose/ }).click();
  await page.getByRole('alert').filter({ hasText: 'Esito non verificabile' }).waitFor();
  assert.equal(
    await prisma.medicationAdministration.count({ where: { therapyId: visibleTherapy.id } }),
    0,
  );
  await page.reload();
  await signIn();
  await page.getByRole('tab', { name: 'Terapia', exact: true }).click();
  await page.getByRole('tab', { name: 'Calendario', exact: true }).click();
  await page.getByRole('button', { name: 'Giorno', exact: true }).click();
  await page.locator('button[data-time="10:00"]').click();
  const visibleRetry = page.getByRole('button', { name: /^Erogata:.*QA visible retry dose/ });
  await visibleRetry.waitFor();
  const confirmed = page.waitForResponse(
    (response) =>
      response.url() === backend + '/therapy-slots/confirm' &&
      response.request().method() === 'POST' &&
      response.request().postDataJSON().therapyId === visibleTherapy.id,
  );
  await visibleRetry.click();
  assert.equal((await confirmed).status(), 200);
  await visibleRetry.waitFor({ state: 'detached' });
  assert.equal(proof.visibleRequests.length, 2);
  assert.equal(proof.visibleRequests[0].requestId, proof.visibleRequests[1].requestId);
  assert.equal(proof.visibleRequests[1].expectedStato, 'da_erogare');
  assert.equal(
    await prisma.medicationAdministration.count({ where: { therapyId: visibleTherapy.id } }),
    1,
  );
  assert.equal(
    await prisma.therapyAdministrationReceipt.count({ where: { patientId: patient.id } }),
    2,
  );
  proof.visibleRetryAfterReload = {
    pass: true,
    sameRequestId: true,
    clinicalRecords: 1,
    receipts: 1,
  };
  await page.screenshot({ path: resolve(out, 'visible-retry-after-reload.png'), fullPage: true });
  // Chromium logs exactly the two deliberate transport aborts; every other error fails.
  assert.equal(
    errors.filter((message) => /Failed to load resource: net::ERR_FAILED/.test(message)).length,
    2,
  );
  assert.deepEqual(
    errors.filter((message) => !/Failed to load resource: net::ERR_FAILED/.test(message)),
    [],
  );
  assert.deepEqual(failedResponses, []);
  proof.expectedConsoleNetworkAbort = 2;
  proof.browserRetryBoundary =
    'Committed response-loss replays through the real shared client module because UI correctly removes its action; a separate pre-write transport loss retries through the visible UI after reload with the same persisted requestId.';
  proof.pass = true;
  proof.clinicalRecords = 1;
  proof.receipts = 1;
  proof.recordUnchanged = true;
  proof.noRepeatActionAfterReload = true;
} catch (error) {
  proof.pass = false;
  proof.error = error.message;
  process.exitCode = 1;
} finally {
  writeFileSync(resolve(out, 'results.json'), JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof, null, 2));
  if (context) {
    await context.tracing.stop({ path: resolve(out, 'trace.zip') });
    await context.close();
    if (recordedVideo) copyFileSync(await recordedVideo.path(), resolve(out, 'flow.webm'));
  }
  await browser.close();
  await prisma.patient.delete({ where: { id: patient.id } });
  await prisma.$disconnect();
}
