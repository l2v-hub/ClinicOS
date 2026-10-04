import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { mockApi } from './mock-api.mjs';

const out = path.resolve(process.env.UX_EVIDENCE_DIR || 'artifacts/task-validation/ux-discovery-loop');
for (const dir of ['screenshots', 'trace', 'video', 'test-results', 'playwright-report']) mkdirSync(path.join(out, dir), { recursive: true });
const baselineMode = process.env.UX_DENSITY_BASELINE === '1';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1150, height: 1004 },
  recordVideo: { dir: path.join(out, 'video'), size: { width: 1150, height: 1004 } } });
await context.tracing.start({ screenshots: true, snapshots: true });
const state = { dashboardDensity: true, done: false, failMore: false, badFeed: false, requests: [], slotReads: 0, clinicalWrites: 0 };
await mockApi(context, state);
const page = await context.newPage();
const errors = [], httpErrors = [], measurements = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('response', response => { if (response.status() >= 400) httpErrors.push(response.status()); });
try {
  await page.goto('http://127.0.0.1:5187/tests/ux-turno/app.html#/operator-dashboard');
  await page.getByRole('button', { name: /Medico Test/ }).click();
  await page.locator('.adesso-queue__row--terapia-ritardo').nth(2).waitFor();
  for (const width of baselineMode ? [1150] : [1150, 390, 768, 1074, 1395]) {
    await page.setViewportSize({ width, height: 1004 });
    await page.locator('.teams-sidebar').evaluate(async el => {
      await new Promise(requestAnimationFrame);
      await Promise.all(el.getAnimations().map(animation => animation.finished));
    });
    const measured = await page.evaluate(() => {
      const rect = el => ({ height: el.getBoundingClientRect().height, width: el.getBoundingClientRect().width });
      return { width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth,
        kpis: [...document.querySelectorAll('.turno .dashboard-kpi-card')].map(rect),
        rows: [...document.querySelectorAll('.adesso-queue__row--terapia-ritardo')].map(rect),
        actions: [...document.querySelectorAll('.adesso-queue__row--terapia-ritardo .ds-btn')].map(rect),
        clipped: [...document.querySelectorAll('.turno .dashboard-kpi-card__label, .turno .dashboard-kpi-card__status, .adesso-queue__main span, .adesso-queue__who')]
          .filter(el => el.getClientRects().length && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)).length };
    });
    measurements.push(measured);
    assert.equal(measured.overflow, false, 'no document overflow at ' + width);
    assert.equal(measured.rows.length, 3);
    if (!baselineMode) {
      assert.equal(measured.clipped, 0, 'full text retained at ' + width);
      assert.ok(measured.kpis.every(k => k.height <= 84), 'compact KPI height at ' + width);
      const rowLimit = width === 390 ? 210 : width === 1150 ? 164 : 190;
      assert.ok(measured.rows.every(r => r.height <= rowLimit), 'compact row height at ' + width);
      assert.ok(measured.actions.every(a => a.height >= 48 && a.width >= 48), 'touch targets preserved');
    }
    for (const row of await page.locator('.adesso-queue__row--terapia-ritardo').all()) {
      assert.match(await row.textContent(), /Paziente Test|Test Paziente/);
      assert.match(await row.textContent(), /1 compressa.*10 mg.*orale/s);
      assert.match(await row.textContent(), /In ritardo/);
      assert.equal(await row.getByRole('button', { name: /Apri/ }).count(), 1);
    }
    await page.screenshot({ path: path.join(out, 'screenshots', (baselineMode ? 'baseline-' : '') + 'dashboard-' + width + '.png'), fullPage: true });
  }
  if (!baselineMode) {
    const baseline = JSON.parse(readFileSync(path.resolve('tests/ux-discovery/density-baseline.json')));
    const before = baseline.measurements[0], after = measurements[0];
    assert.ok(after.rows[0].height <= before.rows[0].height * 0.7, 'row height reduced by at least 30% at 1150');
    assert.ok(after.kpis[0].height <= before.kpis[0].height * 0.75, 'KPI height reduced by at least 25% at 1150');
    await page.setViewportSize({ width: 1150, height: 1004 });
    await page.locator('.adesso-queue__row--terapia-ritardo').first().getByRole('button', { name: /Apri/ }).click();
    await page.getByRole('tab', { name: 'Piano terapeutico', exact: true }).waitFor();
    assert.match(page.url(), /terapia-farmacologica/);
    await page.getByTestId('therapy-prescription-detail').waitFor();
    assert.match(await page.getByTestId('therapy-prescription-detail').textContent(), /Farmaco sintetico 0.*07:00.*1 compressa.*10 mg/s);
    assert.equal(await page.getByRole('button', { name: /Prescrizioni e programmazione/ }).getAttribute('aria-expanded'), 'true');
  }
  assert.equal(state.clinicalWrites, 0);
  assert.deepEqual(errors, []);
  assert.deepEqual(httpErrors, []);
  console.log(baselineMode ? 'PASS source-bound dashboard baseline at 1150' : 'PASS dashboard density: five widths, full content, actions and no clinical writes');
} catch (error) {
  errors.push(error.stack);
  await page.screenshot({ path: path.join(out, 'screenshots', 'density-failure.png'), fullPage: true });
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  const name = baselineMode ? 'density-baseline' : 'density-runtime';
  await context.tracing.stop({ path: path.join(out, 'trace', name + '.zip') });
  writeFileSync(path.join(out, 'test-results', name + '.json'), JSON.stringify({ source: process.env.UX_SOURCE_REF || 'working tree', measurements, errors, httpErrors, clinicalWrites: state.clinicalWrites }, null, 2));
  writeFileSync(path.join(out, 'playwright-report', name + '.html'), '<!doctype html><meta charset="UTF-8"><title>Dashboard density</title><pre>' + JSON.stringify({ measurements, errors, httpErrors }, null, 2).replaceAll('&', '&amp;').replaceAll('<', '&lt;') + '</pre>');
  await context.close();
  await page.video().saveAs(path.join(out, 'video', name + '.webm'));
  await browser.close();
}
