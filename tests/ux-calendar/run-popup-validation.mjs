import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { mockApi, therapy } from '../ux-discovery/mock-api.mjs';

const out = path.resolve(process.env.POPUP_QA_OUT ?? 'artifacts/task-validation/therapy-popup-compact');
for (const dir of ['screenshots', 'trace', 'video', 'test-results']) mkdirSync(path.join(out, dir), { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1150, height: 1004 }, recordVideo: { dir: path.join(out, 'video') } });
await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
const state = { dashboardDensity: true, requests: [], slotReads: 0, clinicalWrites: 0 };
await mockApi(context, state);
const note = 'Nota sintetica: verificare la deglutizione prima della somministrazione e riportare eventuali difficoltà.\nSeconda riga della nota conservata integralmente.';
await context.route('http://localhost:3001/patients/patient-test/therapies/page?**', route => route.fulfill({
  contentType: 'application/json', body: JSON.stringify({
    items: [0, 1, 2].map(index => therapy('density-' + index, {
      farmacoNome: 'Farmaco sintetico ' + index, note: index === 1 ? note : 'Nota sintetica breve',
      schedules: [{ id: 'schedule-' + index, therapyId: 'density-' + index,
        time: index === 0 ? '07:00' : '08:00', fascia: 'mattina', quantityNumerator: 1,
        quantityDenominator: 1, administrationUnit: 'compressa' }],
    })),
    summary: { total: 3, active: 3, inactive: 0 }, pageInfo: { hasMore: false, nextCursor: null },
  }),
}));
let failSlots = false, missed = false;
await context.route('http://localhost:3001/therapy-slots?**', route => {
  if (failSlots) return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Synthetic outage"}' });
  if (!missed) return route.fallback();
  return route.fulfill({ contentType: 'application/json', body: JSON.stringify([0, 1, 2].map(index => ({
    id: 'slot-' + index, fascia: 'mattina', label: 'Mattina', ora: index === 0 ? '07:00' : '08:00',
    summary: { total: 1, administered: 0, pending: index === 1 ? 0 : 1, notAdministered: index === 1 ? 1 : 0 },
    patients: [{ patientId: 'patient-test', firstName: 'Paziente', lastName: 'Test', location: { status: 'unassigned' },
      administrations: [{ administrationId: null, therapyId: 'density-' + index, drugName: 'Farmaco sintetico ' + index,
        dosage: '1 compressa — 10 mg', quantityLabel: '1 compressa — 10 mg', route: 'orale',
        scheduledTime: index === 0 ? '07:00' : '08:00', status: index === 1 ? 'not_administered' : 'pending',
        administeredAt: null, administeredBy: null, notAdministeredReason: index === 1 ? 'altro' : null }],
    }],
  }))) });
});
const page = await context.newPage(), errors = [], httpFailures = [], results = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error' && !(failSlots && /503/.test(message.text()))) errors.push(message.text());
});
page.on('response', response => {
  if (response.url().startsWith('http://localhost:3001') && response.status() >= 400 &&
      !(failSlots && response.status() === 503 && response.url().includes('/therapy-slots?')))
    httpFailures.push(`${response.status()} ${response.url()}`);
});
async function openPopup() {
  await page.goto('http://127.0.0.1:5189/tests/ux-discovery/index.html');
  const eight = page.getByTestId('therapy-calendar-cell').filter({ hasText: 'Farmaco sintetico 1' });
  await eight.waitFor(); await eight.click();
  const dialog = page.getByRole('dialog'); await dialog.waitFor(); return { dialog, eight };
}
async function setPermissions(allowed, confirmation = false) {
  await page.evaluate(async ({ allowed, confirmation }) => {
    const { setSessionCapabilities } = await import('/frontend/src/lib/capabilities.ts');
    setSessionCapabilities(Object.fromEntries(['administration.confirm', 'administration.record_not_administered',
      'administration.list_slots'].map(id => [id, { allowed,
      effect: allowed ? 'ALLOWED' : 'DENIED', requiresConfirmation: confirmation }])));
  }, { allowed, confirmation });
}
try {
  for (const width of [1150, 1024, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1004 });
    const { dialog, eight } = await openPopup();
    await dialog.locator('.giro-drug').first().waitFor();
    assert.deepEqual(await dialog.locator('.giro-drug__name').allTextContents(), ['Farmaco sintetico 1', 'Farmaco sintetico 2']);
    assert.equal(await dialog.locator('.therapy-calendar-dialog__patient').count(), 0);
    assert.equal(await dialog.locator('.patient-therapy-slot-detail__note').first().innerText(), note);
    for (const row of await dialog.locator('.giro-drug').all()) {
      assert.match(await row.textContent(), /1 compressa — 10 mg.*orale.*Prescrittore: Medico Test/s);
      assert.equal(await row.getByRole('button', { name: /^Erogata:/ }).count(), 1);
      assert.equal(await row.getByRole('button', { name: /^Non erogata:/ }).count(), 1);
    }
    assert.equal(await dialog.evaluate(el => el.scrollWidth > el.clientWidth), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const bounds = await dialog.boundingBox();
    if (width > 720) assert.ok(bounds.height < 400, `compact popup height ${bounds.height}`);
    for (const button of await dialog.locator('.giro-row__act .ds-btn').all()) {
      const box = await button.boundingBox();
      assert.ok(box.height <= (width > 720 ? 36 : 44));
      assert.ok(box.x >= bounds.x && box.x + box.width <= bounds.x + bounds.width);
    }
    for (const badge of await dialog.locator('.giro-badge').all()) assert.ok((await badge.boundingBox()).height <= 24);
    await page.screenshot({ path: path.join(out, 'screenshots', `popup-${width}.png`) });
    await page.keyboard.press('Escape'); assert.equal(await page.getByRole('dialog').count(), 0);
    assert.equal(await eight.evaluate(el => el === document.activeElement), true);
    results.push(`PASS ${width}: unique rows, dose/route/prescriber, full multiline notes, compact actions/chips, no overflow and focus restore`);
  }
  await page.setViewportSize({ width: 1150, height: 1004 });
  const { dialog } = await openPopup();
  await dialog.getByRole('button', { name: /^Non erogata:/ }).first().click();
  const reasons = dialog.getByRole('group', { name: /^Motivo della mancata/ });
  await reasons.waitFor(); await reasons.getByRole('button', { name: /^Altro:/ }).click();
  const confirm = reasons.getByRole('button', { name: /^Conferma non erogata:/ });
  assert.equal(await confirm.isDisabled(), true);
  await reasons.getByRole('textbox').fill('Motivo sintetico di test');
  assert.equal(await confirm.isEnabled(), true);
  await reasons.getByRole('button', { name: 'Annulla', exact: true }).click();
  await setPermissions(true, true);
  await dialog.getByRole('button', { name: /^Erogata:/ }).first().click();
  await page.getByRole('alertdialog').waitFor();
  assert.match(await page.getByRole('alertdialog').textContent(), /Farmaco sintetico 1/);
  assert.equal(state.clinicalWrites, 0);
  await page.keyboard.press('Escape'); assert.equal(await page.getByRole('alertdialog').count(), 0);
  await setPermissions(false);
  await dialog.getByText(/Il tuo ruolo consulta/).waitFor();
  assert.equal(await dialog.getByRole('button', { name: /^Erogata:|^Non erogata:/ }).count(), 0);
  assert.equal(await dialog.locator('.giro-drug__name').count(), 2);
  results.push('PASS reasons require Altro note; supervisor confirmation cancels without writing; read-only keeps full details and hides signing');
  missed = true;
  const recovery = await openPopup();
  const retry = recovery.dialog.getByRole('button', { name: /^Somministra ora:/ });
  await retry.waitFor();
  assert.equal(await recovery.dialog.locator('.giro-drug__name').count(), 2);
  assert.equal(await recovery.dialog.locator('.patient-therapy-slot-detail__again').count(), 0);
  assert.equal(await recovery.dialog.locator('.giro-drug').first().getByRole('button', { name: /^Somministra ora:/ }).count(), 1);
  await setPermissions(true, true); await retry.click(); await page.getByRole('alertdialog').waitFor();
  assert.equal(state.clinicalWrites, 0); await page.keyboard.press('Escape');
  results.push('PASS a missed dose keeps its retry action in the same unique medication row and still requires supervisor confirmation');
  missed = false;
  failSlots = true;
  const failed = await openPopup();
  await failed.dialog.getByRole('alert').waitFor();
  assert.equal(await failed.dialog.locator('.patient-therapy-slot-detail__prescriptions .giro-drug__name').count(), 2);
  assert.equal(await failed.dialog.getByRole('button', { name: /^Erogata:|^Non erogata:/ }).count(), 0);
  assert.equal(await failed.dialog.locator('.patient-therapy-slot-detail__note').first().innerText(), note);
  await page.screenshot({ path: path.join(out, 'screenshots', 'popup-state-unavailable.png') });
  failSlots = false;
  await failed.dialog.getByRole('button', { name: 'Riprova', exact: true }).click();
  await failed.dialog.locator('.giro-drug').first().waitFor();
  assert.equal(await failed.dialog.locator('.giro-drug__name').count(), 2);
  results.push('PASS unavailable state retains prescriptions, hides signing, and retry recovers without duplicates');
  assert.deepEqual(errors, []); assert.deepEqual(httpFailures, []); assert.equal(state.clinicalWrites, 0);
} catch (error) {
  results.push('FAIL ' + error.stack); process.exitCode = 1;
  await page.screenshot({ path: path.join(out, 'screenshots', 'failure.png') });
} finally {
  writeFileSync(path.join(out, 'test-results', 'popup-runtime.json'), JSON.stringify({ results, errors, httpFailures, clinicalWrites: state.clinicalWrites }, null, 2));
  console.log(results.join('\n'));
  await context.tracing.stop({ path: path.join(out, 'trace', 'popup-runtime.zip') });
  await context.close(); await browser.close();
}
