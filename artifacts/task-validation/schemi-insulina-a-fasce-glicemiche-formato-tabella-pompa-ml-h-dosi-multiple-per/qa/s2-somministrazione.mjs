// QA S2: somministrazione di uno schema in pompa (ml/h) con dose aggiuntiva: anteprima "Dose prevista"
// nell'unità giusta + bolo, conferma, MedicationAdministration.farmacoDose/doseContext in DB.
// Terapia creata via API reale (POST /patients/:id/therapies) dal Medico simulato. Dati sintetici.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { prisma } from '../../../../backend/src/lib/prisma.js';
import { facilityToday } from '../../../../backend/src/patients/parameter-reading-input.js';
import { SHOTS, TRACE, VIDEO, RESULTS, BE, guard, login, saveVideo, simToken } from './common.mjs';

setTimeout(() => {
  console.log('GLOBAL TIMEOUT');
  process.exit(2);
}, 240000).unref();
const results = [];
const step = (name, extra = {}) => {
  results.push({ name, pass: true, ...extra });
  console.log('ok  :', name);
};
const today = facilityToday();
const hh = String(new Date().getHours()).padStart(2, '0');
const slot = `${hh}:00`;
const patient = await prisma.patient.create({
  data: {
    medicalRecordNumber: 'QA-INS-S2-' + Date.now(),
    firstName: 'Qasomm',
    lastName: 'Pompa',
    dateOfBirth: new Date('1944-05-06'),
    sex: 'F',
    registeredById: 'SIM-NURSE-1',
  },
});
const protocol = {
  kind: 'blood_glucose',
  doseUnit: 'ml/h',
  rules: [
    { minMgDl: 140, maxMgDl: 200, units: 2 },
    { minMgDl: 201, maxMgDl: 350, units: 4 },
    {
      minMgDl: 351,
      maxMgDl: null,
      units: 6,
      extraDoses: [{ amount: 6, unit: 'unità', label: 'bolo' }],
    },
  ],
};
const doctor = await simToken('SIM-DOCTOR-1');
const createRes = await fetch(`${BE}/patients/${patient.id}/therapies`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${doctor}` },
  body: JSON.stringify({
    farmacoNome: 'QA Insulina pompa',
    viaSomministrazione: 'IV',
    tipo: 'periodica',
    stato: 'attiva',
    dataInizio: today,
    doseMode: 'glucose_scale',
    doseProtocol: protocol,
    schedules: [{ time: slot, quantityNumerator: 1, quantityDenominator: 1 }],
  }),
});
const createBody = await createRes.text();
console.log('create therapy', createRes.status, createBody.slice(0, 200));
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  recordVideo: { dir: VIDEO, size: { width: 1280, height: 900 } },
});
await context.tracing.start({ screenshots: true, snapshots: true });
const page = await context.newPage();
page.setDefaultTimeout(20000);
const g = guard(page);
let failed = false;
let therapyId = null;
try {
  assert.equal(createRes.status, 201, createBody);
  therapyId = JSON.parse(createBody).id;
  step('therapy created via API (201)', { therapyId, slot, today });
  await login(page, 'Infermiere 1', `#/dettaglio-paziente/${patient.id}`);
  await page.locator('.patient-record-view').waitFor();
  await page.getByRole('tab', { name: 'Terapia', exact: true }).click();
  await page.getByRole('tab', { name: 'Calendario', exact: true }).click();
  const calendar = page.locator('.patient-therapy-calendar');
  await calendar.locator(`button[data-time="${slot}"]`).first().click();
  const control = page.locator('.therapy-glucose-confirm').first();
  await control.waitFor();
  const input = control.locator('input');
  // Uncovered value (gap below 140): no dose, confirm disabled.
  await input.fill('120');
  const confirm = control.getByRole('button', {
    name: /Conferma somministrazione secondo glicemia/,
  });
  assert.equal(await confirm.isDisabled(), true, 'uncovered glucose cannot be administered');
  await control.screenshot({ path: resolve(SHOTS, 'qa-s2-uncovered-120-blocked.png') });
  step('glucose 120 (not covered): confirm disabled');
  await input.fill('420');
  const dose = control.getByRole('status').filter({ hasText: 'Dose prevista' });
  await dose.waitFor();
  const doseText = (await dose.innerText()).replace(/\s+/g, ' ').trim();
  assert.equal(doseText, 'Dose prevista: 6 ml/h + 6 unità (bolo)');
  await control.getByText('Visualizza schema prescritto').click();
  await control.screenshot({ path: resolve(SHOTS, 'qa-s2-dose-prevista-ml-h-plus-bolo.png') });
  step('glucose 420: "Dose prevista: 6 ml/h + 6 unità (bolo)"', { doseText });
  const writes = [];
  page.on('response', (r) => {
    if (r.request().method() === 'POST' && r.url().includes('/therapy-slots/'))
      writes.push({ url: r.url(), status: r.status(), body: r.request().postDataJSON() });
  });
  await confirm.click();
  // The slot detail is itself the dialog; this flow registers without a second confirmation.
  const confirmLabel = null;
  await page
    .getByText('Somministrazione di QA Insulina pompa registrata.', { exact: true })
    .waitFor();
  for (let i = 0; i < 40 && !writes.length; i++) await page.waitForTimeout(250);
  assert.equal(writes.length, 1, JSON.stringify(writes));
  assert.equal(writes[0].status, 200);
  assert.equal(writes[0].body.measuredGlucose, 420);
  const record = await prisma.medicationAdministration.findFirstOrThrow({
    where: { therapyId },
  });
  assert.equal(record.farmacoDose, '6 ml/h + 6 unità (bolo) (glicemia 420 mg/dL)');
  assert.deepEqual(record.doseContext, {
    kind: 'blood_glucose',
    glucoseMgDl: 420,
    doseUnits: 6,
    doseUnit: 'ml/h',
    extraDoses: [{ amount: 6, unit: 'unità', label: 'bolo' }],
  });
  step('DB MedicationAdministration farmacoDose + doseContext (ml/h + extra dose)', {
    farmacoDose: record.farmacoDose,
    doseContext: record.doseContext,
    confirmLabel,
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: resolve(SHOTS, 'qa-s2-after-confirm.png') });
  assert.deepEqual(g.consoleErrors, []);
  assert.deepEqual(g.httpErrors, []);
  step('no console errors, no backend 4xx/5xx');
} catch (e) {
  failed = true;
  results.push({ name: 'FAILED', pass: false, error: String(e?.stack ?? e) });
  console.log('FAIL:', e?.message);
  await page
    .screenshot({ path: resolve(SHOTS, 'qa-s2-failure.png'), fullPage: true })
    .catch(() => {});
} finally {
  await context.tracing.stop({ path: resolve(TRACE, 'qa-s2-somministrazione-trace.zip') });
  await context.close();
  await saveVideo(page, 'qa-s2-somministrazione.webm');
  await browser.close();
  writeFileSync(
    resolve(RESULTS, 'qa-s2-somministrazione.json'),
    JSON.stringify(
      {
        patientId: patient.id,
        therapyId,
        consoleErrors: g.consoleErrors,
        httpErrors: g.httpErrors,
        results,
      },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
  process.exit(failed ? 1 : 0);
}
