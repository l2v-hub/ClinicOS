// QA Round 2 / F1: scale written in mixed units (U and ml/h). The parser must import NO bands, warn,
// keep the row da_verificare and block confirmation (UI and API) until the operator transcribes the
// scale; after transcription, confirmation persists exactly what the operator entered.
// Real deterministic import path (ImportJob therapyText -> /intake/drafts/from-import). Synthetic data.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import CodiceFiscale from 'codice-fiscale-js';
import { prisma } from '../../../../backend/src/lib/prisma.js';
import { seedImport } from './seed-import.mjs';
import { FE, BE, SHOTS, TRACE, VIDEO, RESULTS, guard, saveVideo } from './common.mjs';

setTimeout(() => {
  console.log('GLOBAL TIMEOUT');
  process.exit(2);
}, 360000).unref();
const MIXED = 'Terapia\nInsulina rapida secondo schema:\n150-200 2 U\n201-250 3 ml/h\n>250 4 ml/h';
const WARNING =
  'Fasce scritte in unità diverse (unità e ml/h): schema non importato, trascrivilo dal documento';
const DAY = 1 + Math.floor(Math.random() * 28);
const DOB = `1938-07-${String(DAY).padStart(2, '0')}`;
const KEY = 'clinicos:intake-draft:SIM-DOCTOR-1:operatore';
const results = [];
const step = (name, extra = {}) => {
  results.push({ name, pass: true, ...extra });
  console.log('ok  :', name);
};
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
const ids = {};

async function openDraft(draftId) {
  await page.goto('about:blank');
  await page.goto(FE + '/');
  await page.getByRole('button', { name: /^Medico 1/ }).click();
  await page.getByRole('button', { name: /Medico 1, Medico: menu utente/ }).waitFor();
  await page.evaluate(([k, id]) => sessionStorage.setItem(k, id), [KEY, draftId]);
  await page.evaluate(() => {
    location.hash = '#/nuovo-ingresso';
  });
  await page.getByText('A mano', { exact: true }).click();
  const section = page.locator('[data-testid="intake-section-terapia"]');
  await section.waitFor({ timeout: 30000 });
  await page.waitForTimeout(1000);
  return section;
}

try {
  const d = await seedImport(MIXED, {
    firstName: 'Qamisto',
    lastName: 'Sintetico',
    dateOfBirth: DOB,
  });
  assert.equal(d.status, 201);
  ids.draft = d.draft.id;
  const rows = d.draft.data.terapiaImport;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].doseMode, 'glucose_scale');
  assert.deepEqual(rows[0].glucoseScale, []);
  assert.equal(rows[0].glucoseDoseUnit, undefined);
  assert.deepEqual(rows[0].glucoseScaleWarnings, [WARNING]);
  assert.equal(rows[0].stato, 'da_verificare');
  step('API: mixed-unit scale → 0 bands, no glucoseDoseUnit, single warning, da_verificare', {
    row: { glucoseScale: rows[0].glucoseScale, warnings: rows[0].glucoseScaleWarnings },
  });

  let section = await openDraft(d.draft.id);
  const warn = section.getByTestId('discharge-glucose-warnings');
  await warn.getByText(WARNING, { exact: true }).waitFor();
  await section.getByText('da verificare', { exact: true }).first().waitFor();
  const editor = section.locator('.glucose-scale-editor').first();
  assert.equal(await editor.locator('.glucose-scale-editor__band').count(), 0, 'no band prefilled');
  await section.getByLabel('Via di somministrazione', { exact: true }).first().selectOption('SC');
  await section.getByLabel('Rilevazione 1', { exact: true }).fill('08:00');
  await page.waitForTimeout(800);
  const verify = section.getByRole('button', { name: 'Ho verificato questa terapia' });
  assert.equal(await verify.isDisabled(), true, '"Ho verificato" disabled with no bands');
  const create = page.getByRole('button', { name: 'Crea paziente', exact: true });
  assert.equal(await create.isDisabled(), true, 'Crea paziente disabled');
  await warn.scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(SHOTS, 'qa-r2-s4-mixed-units-warning-blocked.png') });
  await editor.screenshot({ path: resolve(SHOTS, 'qa-r2-s4-mixed-units-empty-editor.png') });
  step('UI: warning visible, editor has 0 bands, "Ho verificato" and "Crea paziente" disabled');

  // Forged API confirmation (row marked ok, scale invented by the client) must be rejected.
  await page
    .getByText(/Bozza salvata/)
    .first()
    .waitFor({ timeout: 15000 })
    .catch(() => {});
  await page.waitForTimeout(2500);
  const saved = await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: d.draft.id } });
  const savedRows = saved.data.terapiaImport;
  const form = savedRows[0].reviewedTherapy ?? {};
  const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${d.token}` };
  const forgedRows = structuredClone(savedRows);
  forgedRows[0] = { ...forgedRows[0], stato: 'ok', reviewedTherapy: form };
  const patch = await fetch(`${BE}/intake/drafts/${d.draft.id}`, {
    method: 'PATCH',
    headers: auth,
    body: JSON.stringify({ terapiaImport: forgedRows }),
  });
  const cf = CodiceFiscale.compute({
    name: 'Qamisto',
    surname: 'Sintetico',
    gender: 'M',
    day: DAY,
    month: 7,
    year: 1938,
    birthplace: 'Roma',
    birthplaceProvincia: 'RM',
  });
  const confirmWith = (doseProtocol) =>
    fetch(`${BE}/intake/drafts/${d.draft.id}/confirm`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        patient: {
          firstName: 'Qamisto',
          lastName: 'Sintetico',
          dateOfBirth: DOB,
          sex: 'M',
          codiceFiscale: cf,
        },
        cartella: { statoRicovero: 'ricoverato' },
        therapies: [
          {
            intakeSource: { type: 'import', index: 0 },
            farmacoNome: form.farmacoNome ?? 'INSULINA',
            dataInizio: form.dataInizio,
            viaSomministrazione: form.viaSomministrazione ?? 'SC',
            tipo: 'periodica',
            stato: 'attiva',
            doseMode: 'glucose_scale',
            doseProtocol,
            schedules: [{ time: '08:00', quantityNumerator: 1, quantityDenominator: 1 }],
          },
        ],
      }),
    });
  const forgedBands = await confirmWith({
    kind: 'blood_glucose',
    doseUnit: 'ml/h',
    rules: [
      { minMgDl: 150, maxMgDl: 200, units: 2 },
      { minMgDl: 201, maxMgDl: 250, units: 3 },
      { minMgDl: 251, maxMgDl: null, units: 4 },
    ],
  });
  const forgedBandsBody = await forgedBands.text();
  const emptyRules = await confirmWith({ kind: 'blood_glucose', doseUnit: 'ml/h', rules: [] });
  const emptyBody = await emptyRules.text();
  assert.ok(
    forgedBands.status >= 400 && forgedBands.status < 500,
    `forged bands ${forgedBands.status}`,
  );
  assert.ok(
    emptyRules.status >= 400 && emptyRules.status < 500,
    `empty rules ${emptyRules.status}`,
  );
  assert.equal(await prisma.patient.count({ where: { codiceFiscale: cf } }), 0);
  step('API: forged confirmations (invented bands / empty scale) rejected, no patient created', {
    patchStatus: patch.status,
    forgedBands: [forgedBands.status, forgedBandsBody.slice(0, 250)],
    emptyRules: [emptyRules.status, emptyBody.slice(0, 250)],
  });
  await fetch(`${BE}/intake/drafts/${d.draft.id}`, {
    method: 'PATCH',
    headers: auth,
    body: JSON.stringify({ terapiaImport: savedRows }),
  });

  // Operator transcribes the scale from the document (ml/h) and confirms.
  section = await openDraft(d.draft.id);
  const ed = section.locator('.glucose-scale-editor').first();
  await ed.getByRole('button', { name: 'ml/h (pompa)' }).click();
  const bands = ed.locator('.glucose-scale-editor__band');
  while ((await bands.count()) < 3)
    await ed.getByRole('button', { name: '+ Aggiungi fascia' }).click();
  const fill = async (i, min, max, dose) => {
    await bands.nth(i).getByLabel('Da (mg/dL)', { exact: true }).fill(min);
    await bands.nth(i).getByLabel('A (mg/dL)', { exact: true }).fill(max);
    await bands.nth(i).getByLabel('Velocità (ml/h)', { exact: true }).fill(dose);
  };
  await fill(0, '150', '200', '2');
  await fill(1, '201', '250', '3');
  await fill(2, '251', '', '4');
  const verify2 = section.getByRole('button', { name: 'Ho verificato questa terapia' });
  for (let i = 0; i < 20 && (await verify2.isDisabled()); i++) await page.waitForTimeout(250);
  assert.equal(await verify2.isDisabled(), false, '"Ho verificato" enabled after transcription');
  await ed.screenshot({ path: resolve(SHOTS, 'qa-r2-s4-mixed-units-transcribed.png') });
  await verify2.click();
  await page.getByLabel('Nome *', { exact: true }).fill('Qamisto');
  await page.getByLabel('Cognome *', { exact: true }).fill('Sintetico');
  await page.getByLabel('Data di nascita *', { exact: true }).fill(DOB);
  await page.getByLabel('Codice fiscale *', { exact: true }).fill(cf);
  await page.getByTestId('allergy-status-paziente_nega').click();
  const accept = page.getByTestId('accept-therapy');
  if (await accept.isVisible().catch(() => false)) await accept.click();
  for (let i = 0; i < 40 && (await create.isDisabled()); i++) await page.waitForTimeout(250);
  assert.equal(await create.isDisabled(), false, 'Crea paziente enabled');
  step(
    'UI: operator transcribes 3 ml/h bands → "Ho verificato" enabled, clicked; Crea paziente enabled',
  );
  await create.click();
  let patient = null;
  for (let i = 0; i < 60 && !patient; i++) {
    patient = await prisma.patient.findFirst({ where: { codiceFiscale: cf } });
    if (!patient) await page.waitForTimeout(500);
  }
  assert.ok(patient, 'patient created');
  ids.patient = patient.id;
  const therapy = await prisma.patientTherapy.findFirstOrThrow({
    where: { patientId: patient.id },
  });
  assert.equal(therapy.doseMode, 'glucose_scale');
  assert.deepEqual(therapy.doseProtocol, {
    kind: 'blood_glucose',
    measurementUnit: 'mg/dL',
    doseUnit: 'ml/h',
    rules: [
      { minMgDl: 150, maxMgDl: 200, units: 2 },
      { minMgDl: 201, maxMgDl: 250, units: 3 },
      { minMgDl: 251, maxMgDl: null, units: 4 },
    ],
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: resolve(SHOTS, 'qa-r2-s4-mixed-units-confirmed.png') });
  step('DB: PatientTherapy.doseProtocol = operator transcription (ml/h, 3 bands)', {
    doseProtocol: therapy.doseProtocol,
  });
  assert.deepEqual(g.consoleErrors, []);
  assert.deepEqual(g.httpErrors, []);
  step('no console errors, no backend 4xx/5xx in the browser');
} catch (e) {
  failed = true;
  results.push({ name: 'FAILED', pass: false, error: String(e?.stack ?? e) });
  console.log('FAIL:', e?.message);
  await page
    .screenshot({ path: resolve(SHOTS, 'qa-r2-s4-failure.png'), fullPage: true })
    .catch(() => {});
} finally {
  await context.tracing.stop({ path: resolve(TRACE, 'qa-r2-s4-mixed-units-trace.zip') });
  await context.close();
  await saveVideo(page, 'qa-r2-s4-mixed-units.webm');
  await browser.close();
  writeFileSync(
    resolve(RESULTS, 'qa-r2-s4-mixed-units.json'),
    JSON.stringify(
      { ids, consoleErrors: g.consoleErrors, httpErrors: g.httpErrors, results },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
  process.exit(failed ? 1 : 0);
}
