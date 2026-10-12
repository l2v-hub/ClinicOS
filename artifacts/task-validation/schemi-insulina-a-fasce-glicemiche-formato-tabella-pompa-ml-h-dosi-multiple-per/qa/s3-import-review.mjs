// QA S3: revisione import. Le bozze d'ingresso sono create dal percorso reale deterministico
// (ImportJob review_ready con therapyText → POST /intake/drafts/from-import → parser) e aperte nella
// scheda d'ingresso (sessionStorage della bozza, pulsante "A mano").
//  A) testo a TABELLA: UNA riga insulina, 9 fasce, avviso "Glicemia 110 ...", da verificare.
//  B) lettera Imola: avvisi sovrapposizione + buco, conferma bloccata (UI e API), bozza ricaricata con
//     le fasce importate intatte, correzione della sovrapposizione, conferma, doseProtocol in DB.
// Dati sintetici, DB locale usa e getta.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import CodiceFiscale from 'codice-fiscale-js';
import { prisma } from '../../../../backend/src/lib/prisma.js';
import { seedImport } from './seed-import.mjs';
import { TABLE, IMOLA } from './texts.mjs';
import { FE, BE, SHOTS, TRACE, VIDEO, RESULTS, guard, noHScroll, saveVideo } from './common.mjs';

setTimeout(() => {
  console.log('GLOBAL TIMEOUT');
  process.exit(2);
}, 420000).unref();
const results = [];
const step = (name, extra = {}) => {
  results.push({ name, pass: true, ...extra });
  console.log('ok  :', name);
};
const DAY = 1 + Math.floor(Math.random() * 28);
const DOB = `1941-03-${String(DAY).padStart(2, '0')}`;
const KEY = 'clinicos:intake-draft:SIM-DOCTOR-1:operatore';
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  recordVideo: { dir: VIDEO, size: { width: 1280, height: 900 } },
});
await context.tracing.start({ screenshots: true, snapshots: true });
const page = await context.newPage();
page.setDefaultTimeout(20000);
// The API-level negative confirmation below is expected to fail with 400 (sent from node, not page).
const g = guard(page);
let failed = false;
const ids = {};

async function openDraft(draftId) {
  // Full app load each time (about:blank first); sessionStorage of the tab survives.
  await page.goto('about:blank');
  await page.goto(FE + '/');
  await page.getByRole('button', { name: /^Medico 1/ }).click();
  await page.getByRole('button', { name: /Medico 1, Medico: menu utente/ }).waitFor();
  await page.evaluate(([k, id]) => sessionStorage.setItem(k, id), [KEY, draftId]);
  await page.evaluate(() => { location.hash = '#/nuovo-ingresso'; });
  await page.getByText('A mano', { exact: true }).click();
  const section = page.locator('[data-testid="intake-section-terapia"]');
  await section.waitFor({ timeout: 30000 });
  await page.waitForTimeout(1000);
  return section;
}
const rowsOf = (section) =>
  section.locator('.discharge-therapy-review__row, [data-testid^="discharge-therapy-row"]');

try {
  // ── A) Tabella ────────────────────────────────────────────────────────────
  const a = await seedImport(TABLE, {
    firstName: 'Qatabella',
    lastName: 'Sintetico',
    dateOfBirth: '1940-01-02',
  });
  assert.equal(a.status, 201);
  ids.tableDraft = a.draft.id;
  const imported = a.draft.data.terapiaImport;
  assert.equal(imported.length, 1, 'ONE therapy row for the whole table');
  assert.equal(imported[0].doseMode, 'glucose_scale');
  assert.equal(imported[0].glucoseScale.length, 9);
  assert.deepEqual(imported[0].glucoseScale[8], {
    minMgDl: 351,
    maxMgDl: null,
    units: 15,
    extraDoses: [{ amount: 5, unit: 'unità', route: 'EV', label: 'bolo' }],
  });
  assert.equal(imported[0].stato, 'da_verificare');
  step(
    'A/API: draft has ONE glucose_scale row, 9 bands, >350 = 15 U + 5 U EV bolo, da_verificare',
    {
      glucoseScale: imported[0].glucoseScale,
      warnings: imported[0].glucoseScaleWarnings,
    },
  );
  let section = await openDraft(a.draft.id);
  const sectionText = await section.innerText();
  assert.match(sectionText, /1\. INSULINA/);
  assert.doesNotMatch(sectionText, /\n2\. /, 'no second therapy row');
  const warnBox = section.getByTestId('discharge-glucose-warnings');
  await warnBox.getByText('Glicemia 110 mg/dL non coperta dallo schema', { exact: true }).waitFor();
  const warnBg = await warnBox.evaluate((el) => getComputedStyle(el).backgroundColor);
  await section.getByText('da verificare', { exact: true }).first().waitFor();
  const editor = section.locator('.glucose-scale-editor').first();
  const bands = editor.locator('.glucose-scale-editor__band');
  assert.equal(await bands.count(), 9);
  const values = [];
  for (let i = 0; i < 9; i++) {
    const b = bands.nth(i);
    values.push([
      await b.getByLabel('Da (mg/dL)', { exact: true }).inputValue(),
      await b.getByLabel('A (mg/dL)', { exact: true }).inputValue(),
      await b.getByLabel('Dose (unità)', { exact: true }).inputValue(),
    ]);
  }
  assert.deepEqual(values, [
    ['10', '109', '0'],
    ['111', '120', '2'],
    ['121', '140', '4'],
    ['141', '180', '6'],
    ['181', '200', '7'],
    ['201', '250', '8'],
    ['251', '300', '12'],
    ['301', '350', '14'],
    ['351', '', '15'],
  ]);
  const extra = bands.nth(8).getByRole('group', { name: 'Dose aggiuntiva 1 della fascia 9' });
  assert.equal(await extra.getByLabel('Quantità', { exact: true }).inputValue(), '5');
  assert.equal(await extra.locator('select').inputValue(), 'unità');
  assert.equal(await extra.getByLabel('Via', { exact: true }).inputValue(), 'EV');
  assert.equal(await extra.getByLabel('Descrizione', { exact: true }).inputValue(), 'bolo');
  await warnBox.scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(SHOTS, 'qa-s3a-table-one-row-warning.png') });
  await editor.screenshot({ path: resolve(SHOTS, 'qa-s3a-table-9-bands-editor.png') });
  step(
    'A/UI: one row "1. INSULINA" da verificare, 9 bands as written, extra 5 unità EV bolo, warning 110 highlighted',
    {
      values,
      warningBackground: warnBg,
    },
  );
  assert.ok(await noHScroll(page));
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  assert.ok(await noHScroll(page), 'import review: no horizontal page scroll at 375');
  await warnBox.scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(SHOTS, 'qa-s3a-table-review-375.png') });
  await page.setViewportSize({ width: 1280, height: 900 });
  step('A/UI: import review no horizontal page scroll at 1280 and 375');

  // ── B) Lettera Imola ──────────────────────────────────────────────────────
  const b = await seedImport(IMOLA, {
    firstName: 'Qaimola',
    lastName: 'Sintetico',
    dateOfBirth: DOB,
  });
  assert.equal(b.status, 201);
  ids.imolaDraft = b.draft.id;
  const humIndex = b.draft.data.terapiaImport.findIndex((r) => r.farmacoNome === 'HUMALOG');
  const lanIndex = b.draft.data.terapiaImport.findIndex((r) => r.farmacoNome === 'LANTUS');
  assert.ok(humIndex >= 0 && lanIndex >= 0);
  assert.deepEqual(b.draft.data.terapiaImport[humIndex].glucoseScale, [
    { minMgDl: 200, maxMgDl: 250, units: 4 },
    { minMgDl: 250, maxMgDl: 300, units: 6 },
    { minMgDl: 350, maxMgDl: 450, units: 8 },
  ]);
  section = await openDraft(b.draft.id);
  const humRow = section
    .locator('li, article, section, div')
    .filter({ has: page.getByRole('button', { name: 'Lascia in bozza HUMALOG' }) })
    .last();
  const humWarn = section.getByTestId('discharge-glucose-warnings');
  await humWarn
    .getByText('Fasce sovrapposte a 250 mg/dL: due dosi per la stessa glicemia', { exact: true })
    .waitFor();
  await humWarn
    .getByText('Glicemia 301–349 mg/dL non coperta dallo schema', { exact: true })
    .waitFor();
  const humEditor = section.locator('.glucose-scale-editor').first();
  await section.getByLabel('Via di somministrazione', { exact: true }).nth(1).selectOption('SC');
  await section.getByLabel('Rilevazione 1', { exact: true }).fill('08:00');
  const verify = section.getByRole('button', { name: 'Ho verificato questa terapia' });
  await page.waitForTimeout(800);
  assert.equal(await verify.isDisabled(), true, '"Ho verificato" disabled while bands overlap');
  await humWarn.scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(SHOTS, 'qa-s3b-imola-overlap-gap-warnings.png') });
  await humEditor.screenshot({ path: resolve(SHOTS, 'qa-s3b-imola-overlap-blocking-editor.png') });
  step('B/UI: overlap + gap warnings shown, editor blocking error, "Ho verificato" disabled');

  // Draft round-trip while the edited form still overlaps: reload and reopen the draft.
  await page
    .getByText(/Bozza salvata/)
    .first()
    .waitFor({ timeout: 15000 })
    .catch(() => {});
  await page.waitForTimeout(2500);
  const dbDraft = await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: b.draft.id } });
  const savedRow = dbDraft.data.terapiaImport[humIndex];
  section = await openDraft(b.draft.id);
  const reEditor = section.locator('.glucose-scale-editor').first();
  const reBands = reEditor.locator('.glucose-scale-editor__band');
  assert.equal(await reBands.count(), 3, 'bands not lost after reload of an overlapping draft');
  const reValues = [];
  for (let i = 0; i < 3; i++)
    reValues.push([
      await reBands.nth(i).getByLabel('Da (mg/dL)', { exact: true }).inputValue(),
      await reBands.nth(i).getByLabel('A (mg/dL)', { exact: true }).inputValue(),
      await reBands.nth(i).getByLabel('Dose (unità)', { exact: true }).inputValue(),
    ]);
  assert.deepEqual(reValues, [
    ['200', '250', '4'],
    ['250', '300', '6'],
    ['350', '450', '8'],
  ]);
  await reEditor.screenshot({ path: resolve(SHOTS, 'qa-s3b-imola-after-reload-bands-intact.png') });
  step('B/UI: after reload the overlapping draft still shows the 3 imported bands', {
    reValues,
    savedRowGlucoseScale: savedRow.glucoseScale ?? null,
    savedReviewedTherapyScale: savedRow.reviewedTherapy?.glucoseScale ?? null,
  });

  // API: the server refuses to confirm an overlapping scale even if a client marks it verified.
  const forged = structuredClone(dbDraft.data.terapiaImport);
  forged[lanIndex] = { ...forged[lanIndex], excludedFromConfirm: true };
  const forgedForm = {
    ...(forged[humIndex].reviewedTherapy ?? {}),
    glucoseScale: [
      { minMgDl: '200', maxMgDl: '250', units: '4' },
      { minMgDl: '250', maxMgDl: '300', units: '6' },
      { minMgDl: '350', maxMgDl: '450', units: '8' },
    ],
  };
  forged[humIndex] = { ...forged[humIndex], stato: 'ok', reviewedTherapy: forgedForm };
  const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${b.token}` };
  const patchRes = await fetch(`${BE}/intake/drafts/${b.draft.id}`, {
    method: 'PATCH',
    headers: auth,
    body: JSON.stringify({ terapiaImport: forged }),
  });
  const cf = CodiceFiscale.compute({
    name: 'Qaimola',
    surname: 'Sintetico',
    gender: 'F',
    day: DAY,
    month: 3,
    year: 1941,
    birthplace: 'Roma',
    birthplaceProvincia: 'RM',
  });
  const confirmRes = await fetch(`${BE}/intake/drafts/${b.draft.id}/confirm`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      patient: {
        firstName: 'Qaimola',
        lastName: 'Sintetico',
        dateOfBirth: DOB,
        sex: 'F',
        codiceFiscale: cf,
      },
      cartella: { statoRicovero: 'ricoverato' },
      therapies: [
        {
          intakeSource: { type: 'import', index: humIndex },
          farmacoNome: 'HUMALOG',
          dataInizio: forgedForm.dataInizio,
          viaSomministrazione: forgedForm.viaSomministrazione ?? '',
          tipo: 'periodica',
          stato: 'attiva',
          doseMode: 'glucose_scale',
          doseProtocol: {
            kind: 'blood_glucose',
            rules: [
              { minMgDl: 200, maxMgDl: 250, units: 4 },
              { minMgDl: 250, maxMgDl: 300, units: 6 },
              { minMgDl: 350, maxMgDl: 450, units: 8 },
            ],
          },
          schedules: [{ time: '08:00', quantityNumerator: 1, quantityDenominator: 1 }],
        },
      ],
    }),
  });
  const confirmText = await confirmRes.text();
  assert.ok(
    confirmRes.status >= 400 && confirmRes.status < 500,
    `confirm refused (${confirmRes.status})`,
  );
  assert.equal(await prisma.patient.count({ where: { codiceFiscale: cf } }), 0);
  step('B/API: confirmation of an overlapping scale refused, no patient created', {
    patchStatus: patchRes.status,
    confirmStatus: confirmRes.status,
    confirmBody: confirmText.slice(0, 300),
  });
  // Restore the draft as the UI left it (the forged review must not leak into the UI flow).
  await fetch(`${BE}/intake/drafts/${b.draft.id}`, {
    method: 'PATCH',
    headers: auth,
    body: JSON.stringify({ terapiaImport: dbDraft.data.terapiaImport }),
  });

  // Fix the overlap in the UI and confirm.
  section = await openDraft(b.draft.id);
  const fixEditor = section.locator('.glucose-scale-editor').first();
  await fixEditor
    .locator('.glucose-scale-editor__band')
    .nth(1)
    .getByLabel('Da (mg/dL)', { exact: true })
    .fill('251');
  await fixEditor
    .getByText('Le fasce glicemiche non possono sovrapporsi.', { exact: true })
    .waitFor({ state: 'detached' });
  const verify2 = section.getByRole('button', { name: 'Ho verificato questa terapia' });
  for (let i = 0; i < 20 && (await verify2.isDisabled()); i++) await page.waitForTimeout(250);
  assert.equal(
    await verify2.isDisabled(),
    false,
    '"Ho verificato" enabled once the overlap is fixed',
  );
  await verify2.click();
  await section.getByRole('button', { name: 'Lascia in bozza LANTUS' }).click();
  step('B/UI: overlap fixed (251–300) → "Ho verificato" enabled and clicked; LANTUS left in draft');
  const anag = page.locator('body');
  await anag.getByLabel('Nome *', { exact: true }).fill('Qaimola');
  await anag.getByLabel('Cognome *', { exact: true }).fill('Sintetico');
  await anag.getByLabel('Data di nascita *', { exact: true }).fill(DOB);
  await anag.getByLabel('Codice fiscale *', { exact: true }).fill(cf);
  await page.getByTestId('allergy-status-paziente_nega').click();
  const accept = page.getByTestId('accept-therapy');
  if (await accept.isVisible().catch(() => false)) await accept.click().catch(() => {});
  const create = page.getByRole('button', { name: 'Crea paziente', exact: true });
  for (let i = 0; i < 40 && (await create.isDisabled()); i++) await page.waitForTimeout(250);
  if (await create.isDisabled()) {
    const riepilogo = await page.locator('body').innerText();
    writeFileSync(resolve(RESULTS, 'qa-s3-create-disabled-page.txt'), riepilogo);
    await page.screenshot({ path: resolve(SHOTS, 'qa-s3b-create-disabled.png'), fullPage: true });
    throw new Error('Crea paziente still disabled — see qa-s3-create-disabled-page.txt');
  }
  await create.click();
  // The intake is itself a dialog: "Crea paziente" confirms directly (no second step).
  let patient = null;
  for (let i = 0; i < 60 && !patient; i++) {
    patient = await prisma.patient.findFirst({ where: { codiceFiscale: cf } });
    if (!patient) await page.waitForTimeout(500);
  }
  assert.ok(patient, 'patient created');
  ids.patient = patient.id;
  const therapies = await prisma.patientTherapy.findMany({ where: { patientId: patient.id } });
  const hum = therapies.find((t) => /HUMALOG/i.test(t.farmacoNome));
  assert.ok(hum, 'HUMALOG prescribed');
  assert.equal(hum.doseMode, 'glucose_scale');
  assert.deepEqual(hum.doseProtocol, {
    kind: 'blood_glucose',
    measurementUnit: 'mg/dL',
    doseUnit: 'unità',
    rules: [
      { minMgDl: 200, maxMgDl: 250, units: 4 },
      { minMgDl: 251, maxMgDl: 300, units: 6 },
      { minMgDl: 350, maxMgDl: 450, units: 8 },
    ],
  });
  assert.equal(
    therapies.some((t) => /LANTUS/i.test(t.farmacoNome)),
    false,
  );
  await page.waitForTimeout(1500);
  await page.screenshot({ path: resolve(SHOTS, 'qa-s3b-imola-confirmed.png') });
  step(
    'B/DB: confirmed → PatientTherapy HUMALOG doseProtocol = operator-fixed scale (gap 301–349 kept)',
    {
      doseProtocol: hum.doseProtocol,
    },
  );
  assert.deepEqual(g.consoleErrors, []);
  assert.deepEqual(g.httpErrors, []);
  step('no console errors, no backend 4xx/5xx in the browser');
} catch (e) {
  failed = true;
  results.push({ name: 'FAILED', pass: false, error: String(e?.stack ?? e) });
  console.log('FAIL:', e?.message);
  await page
    .screenshot({ path: resolve(SHOTS, 'qa-s3-failure.png'), fullPage: true })
    .catch(() => {});
} finally {
  await context.tracing.stop({ path: resolve(TRACE, 'qa-s3-import-review-trace.zip') });
  await context.close();
  await saveVideo(page, 'qa-s3-import-review.webm');
  await browser.close();
  writeFileSync(
    resolve(RESULTS, 'qa-s3-import-review.json'),
    JSON.stringify(
      { ids, consoleErrors: g.consoleErrors, httpErrors: g.httpErrors, results },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
  process.exit(failed ? 1 : 0);
}
