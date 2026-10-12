// Real UI/network/DB regression: a lost response is uncertain; reload-safe retry replays once.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
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
};
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(25000);
  let first = true;
  await page.route(backend + '/therapy-slots/confirm', async (route) => {
    proof.requests.push(route.request().postDataJSON());
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
  proof.pass = true;
  proof.clinicalRecords = 1;
  proof.receipts = 1;
  proof.recordUnchanged = true;
  proof.noRepeatActionAfterReload = true;
  await page.screenshot({ path: resolve(out, 'after-reload-one-record.png'), fullPage: true });
} catch (error) {
  proof.pass = false;
  proof.error = error.message;
  process.exitCode = 1;
} finally {
  writeFileSync(resolve(out, 'results.json'), JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof, null, 2));
  await browser.close();
  await prisma.patient.delete({ where: { id: patient.id } });
  await prisma.$disconnect();
}
