// QA S1: "Aggiungi terapia" — schema glicemico ml/h, 3 fasce (buco) + dose aggiuntiva, overlap
// bloccante, salvataggio, persistenza dopo reload (UI + DB), larghezze 375/1280.
// Dati sintetici, DB locale usa e getta.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { prisma } from '../../../../backend/src/lib/prisma.js';
import { SHOTS, TRACE, VIDEO, RESULTS, guard, login, noHScroll, saveVideo } from './common.mjs';

const results = [];
const step = (name, extra = {}) => {
  results.push({ name, pass: true, ...extra });
  console.log('ok  :', name);
};
const patient = await prisma.patient.create({
  data: {
    medicalRecordNumber: 'QA-INS-S1-' + Date.now(),
    firstName: 'Qaschema',
    lastName: 'Pompa',
    dateOfBirth: new Date('1945-02-03'),
    sex: 'M',
    registeredById: 'SIM-DOCTOR-1',
  },
});
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
const isCreate = (r) =>
  r.request().method() === 'POST' &&
  /\/patients\/[^/]+\/therapies$/.test(new URL(r.url()).pathname);
try {
  await login(page, 'Medico 1', `#/dettaglio-paziente/${patient.id}`);
  await page.locator('.patient-record-view').waitFor();
  await page.getByRole('tab', { name: 'Terapia', exact: true }).click();
  await page.getByRole('tab', { name: 'Nuova terapia', exact: true }).click();
  await page
    .getByRole('searchbox', { name: 'Cerca il farmaco per nome commerciale' })
    .fill('Actrapid');
  await page.getByRole('button', { name: /Usa comunque «Actrapid»/ }).click();
  await page.getByLabel('Via di somministrazione').selectOption('IV');
  await page.getByRole('button', { name: 'Schema glicemico', exact: true }).click();
  const editor = page.locator('.glucose-scale-editor');
  await editor.waitFor();
  await editor.getByRole('button', { name: 'ml/h (pompa)' }).click();
  assert.equal(
    await editor.getByRole('button', { name: 'ml/h (pompa)' }).getAttribute('aria-pressed'),
    'true',
  );
  const addBand = editor.getByRole('button', { name: '+ Aggiungi fascia' });
  const bands = editor.locator('.glucose-scale-editor__band');
  while ((await bands.count()) < 3) await addBand.click();
  assert.equal(await bands.count(), 3);
  const fill = async (i, min, max, dose) => {
    const b = bands.nth(i);
    await b.getByLabel('Da (mg/dL)', { exact: true }).fill(min);
    await b.getByLabel('A (mg/dL)', { exact: true }).fill(max);
    await b.getByLabel('Velocità (ml/h)', { exact: true }).fill(dose);
  };
  await fill(0, '140', '200', '2');
  await fill(1, '250', '300', '3');
  await fill(2, '301', '', '4');
  step('pump mode: primary dose field labelled "Velocità (ml/h)"');
  await bands
    .nth(2)
    .getByRole('button', { name: 'Aggiungi dose aggiuntiva alla fascia 3' })
    .click();
  const extra = bands.nth(2).getByRole('group', { name: 'Dose aggiuntiva 1 della fascia 3' });
  await extra.getByLabel('Quantità', { exact: true }).fill('6');
  await extra.locator('select').selectOption('unità');
  await extra.getByLabel('Descrizione', { exact: true }).fill('bolo');
  const warn = editor.getByRole('status', { name: 'Avvisi sullo schema glicemico' });
  await warn
    .getByText('Glicemia 201–249 mg/dL non coperta dallo schema', { exact: true })
    .waitFor();
  step('gap warning shown: "Glicemia 201–249 mg/dL non coperta dallo schema"');
  await page.locator('input[type=time]').first().fill('08:00');

  await editor.scrollIntoViewIfNeeded();
  assert.ok(await noHScroll(page), 'no horizontal page scroll at 1280');
  await editor.screenshot({ path: resolve(SHOTS, 'qa-s1-editor-1280-gap-warning.png') });
  step('editor 1280px: no horizontal page scroll');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  const sw = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  assert.ok(await noHScroll(page), `no horizontal page scroll at 375 (${sw})`);
  await editor.scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(SHOTS, 'qa-s1-editor-375-viewport.png') });
  await editor.screenshot({ path: resolve(SHOTS, 'qa-s1-editor-375-full.png') });
  step('editor 375px: no horizontal page scroll', { scrollWidthVsInner: sw });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(300);

  // Overlap 190-200: blocking error, no save possible.
  await bands.nth(1).getByLabel('Da (mg/dL)', { exact: true }).fill('190');
  await editor.getByText('Le fasce glicemiche non possono sovrapporsi.', { exact: true }).waitFor();
  await editor
    .getByText('Fasce sovrapposte tra 190 e 200 mg/dL: due dosi per la stessa glicemia.', {
      exact: true,
    })
    .waitFor();
  let posts = 0;
  const onReq = (r) => {
    if (r.method() === 'POST' && /\/patients\/[^/]+\/therapies$/.test(new URL(r.url()).pathname))
      posts++;
  };
  page.on('request', onReq);
  const save = page.getByRole('button', { name: 'Salva terapia', exact: true });
  const saveDisabled = await save.isDisabled();
  if (!saveDisabled) await save.click().catch(() => {});
  await page.waitForTimeout(1500);
  const confirmAfterOverlap = page.getByRole('dialog').getByRole('button', { name: /^Conferma/ });
  const overlapDialog = await confirmAfterOverlap.isVisible().catch(() => false);
  assert.equal(overlapDialog, false, 'no confirmation dialog offered for an overlapping scale');
  assert.equal(posts, 0, 'no therapy POST with overlapping bands');
  assert.equal(await prisma.patientTherapy.count({ where: { patientId: patient.id } }), 0);
  await editor.screenshot({ path: resolve(SHOTS, 'qa-s1-editor-overlap-blocked.png') });
  step('overlap 190–200: blocking error shown, 0 POST, 0 rows in DB', { saveDisabled });

  await bands.nth(1).getByLabel('Da (mg/dL)', { exact: true }).fill('250');
  await editor
    .getByText('Le fasce glicemiche non possono sovrapporsi.', { exact: true })
    .waitFor({ state: 'detached' });
  const created = page.waitForResponse(isCreate, { timeout: 20000 });
  await save.click();
  const confirmBtn = page.getByRole('dialog').getByRole('button', { name: /^Conferma/ });
  if (await confirmBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
    await page.screenshot({ path: resolve(SHOTS, 'qa-s1-confirm-dialog.png') });
    await confirmBtn.click();
  }
  const res = await created;
  assert.ok([200, 201].includes(res.status()), `create status ${res.status()}`);
  page.off('request', onReq);
  const row = await prisma.patientTherapy.findFirstOrThrow({ where: { patientId: patient.id } });
  assert.equal(row.doseMode, 'glucose_scale');
  assert.deepEqual(row.doseProtocol, {
    kind: 'blood_glucose',
    measurementUnit: 'mg/dL',
    doseUnit: 'ml/h',
    rules: [
      { minMgDl: 140, maxMgDl: 200, units: 2 },
      { minMgDl: 250, maxMgDl: 300, units: 3 },
      {
        minMgDl: 301,
        maxMgDl: null,
        units: 4,
        extraDoses: [{ amount: 6, unit: 'unità', label: 'bolo' }],
      },
    ],
  });
  step('DB PatientTherapy.doseProtocol: ml/h, 3 bands, extra 6 unità (bolo)', {
    doseProtocol: row.doseProtocol,
  });

  await page.reload();
  // The simulator session lives in memory: a hard reload shows the profile picker again.
  const relogin = page.getByRole('button', { name: /^Medico 1/ });
  if (await relogin.isVisible({ timeout: 5000 }).catch(() => false)) await relogin.click();
  await page.locator('.patient-record-view').waitFor();
  await page.getByRole('tab', { name: 'Terapia', exact: true }).click();
  await page.getByRole('tab', { name: 'Piano terapeutico', exact: true }).click();
  const drug = page
    .getByRole('list', { name: 'Farmaci attivi' })
    .getByRole('button', { name: /Actrapid/i })
    .first();
  await drug.click();
  const summary = page.getByRole('list', { name: 'Schema glicemico prescritto' }).first();
  await summary.waitFor();
  const items = await summary.locator('li').allInnerTexts();
  assert.deepEqual(items, [
    '140–200 mg/dL → 2 ml/h',
    '250–300 mg/dL → 3 ml/h',
    '≥301 mg/dL → 4 ml/h + 6 unità (bolo)',
  ]);
  await summary.scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(SHOTS, 'qa-s1-after-reload-ml-h-scale.png') });
  step('after reload: saved therapy shows the ml/h scale and the extra dose', { items });
  assert.deepEqual(g.consoleErrors, []);
  assert.deepEqual(g.httpErrors, []);
  step('no console errors, no backend 4xx/5xx');
} catch (e) {
  failed = true;
  results.push({ name: 'FAILED', pass: false, error: String(e?.stack ?? e) });
  console.log('FAIL:', e?.message);
  await page
    .screenshot({ path: resolve(SHOTS, 'qa-s1-failure.png'), fullPage: true })
    .catch(() => {});
} finally {
  await context.tracing.stop({ path: resolve(TRACE, 'qa-s1-aggiungi-terapia-trace.zip') });
  await context.close();
  await saveVideo(page, 'qa-s1-aggiungi-terapia.webm');
  await browser.close();
  writeFileSync(
    resolve(RESULTS, 'qa-s1-aggiungi-terapia.json'),
    JSON.stringify(
      { patientId: patient.id, consoleErrors: g.consoleErrors, httpErrors: g.httpErrors, results },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
  process.exit(failed ? 1 : 0);
}
