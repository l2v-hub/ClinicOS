// #448 — the patient-chart tab bar must not move between tabs. For every chart tab, at two
// viewports, measure the bar's viewport top and whether anything sits above it that comes and goes.
// LOCAL synthetic stack only (backend AUTH_MODE=demo + simulator, DB seeded with Nanni Miriam).
// Usage (repo root): DATABASE_URL=<local DB> [TRACE=1] node scripts/e2e/issue-448-tabbar.mjs <outDir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import pg from 'pg';

const FRONT = process.env.FRONT ?? 'http://127.0.0.1:5211';
const OUT =
  process.argv[2] ?? 'artifacts/task-validation/448-barra-schede-cartella-a-posizione-fissa';
const DB = process.env.DATABASE_URL;
if (!DB || !/127\.0\.0\.1|localhost/.test(DB)) throw new Error('DATABASE_URL must be a LOCAL DB');
mkdirSync(`${OUT}/screenshots`, { recursive: true });
mkdirSync(`${OUT}/trace`, { recursive: true });

const db = new pg.Client({ connectionString: DB });
await db.connect();
const NANNI = (
  await db.query(`SELECT id FROM "Patient" WHERE "medicalRecordNumber"='DEMO-P10-Miriam-Nanni'`)
).rows[0]?.id;
await db.end();
if (!NANNI) throw new Error('seed Nanni Miriam first');

const browser = await chromium.launch();
const results = [];
const consoleErrors = [];
const outside = {};

const BAR = '.patient-record-view .top-nav--level2';
const measure = (page) =>
  page.evaluate((sel) => {
    window.scrollTo(0, 0);
    document.querySelectorAll('*').forEach((el) => {
      if (el.scrollTop) el.scrollTop = 0;
    });
    const bar = document.querySelector(sel);
    const top = bar ? Math.round(bar.getBoundingClientRect().top) : null;
    const controls = [...document.querySelectorAll('.widget-group-controls')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.height > 0 && bar && r.bottom <= bar.getBoundingClientRect().top + 1;
    }).length;
    const active = document.querySelector(`${sel} [role=tab][aria-selected=true]`)?.textContent;
    return { top, controlsAbove: controls, active: active?.trim() ?? null };
  }, BAR);

for (const viewport of [
  { width: 1180, height: 820 },
  { width: 768, height: 1024 },
]) {
  const vp = `${viewport.width}x${viewport.height}`;
  const context = await browser.newContext({ viewport, hasTouch: true });
  if (process.env.TRACE) await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text()))
      consoleErrors.push(`${vp}: ${m.text().slice(0, 240)}`);
  });
  await page.goto(FRONT);
  await page
    .getByRole('button', { name: /Infermiere 1/ })
    .first()
    .click();
  await page.waitForSelector('.teams-sidebar', { timeout: 30000 });
  await page.goto(`${FRONT}/#/dettaglio-paziente/${NANNI}`);
  await page.waitForSelector(BAR, { timeout: 30000 });
  await page.waitForTimeout(1200);
  const tabs = await page.locator(`${BAR} [role=tab]`).allTextContents();
  const rows = [{ tab: '(apertura)', ...(await measure(page)) }];
  for (const [i, name] of tabs.entries()) {
    await page.locator(`${BAR} [role=tab]`).nth(i).click();
    await page.waitForTimeout(Number(process.env.WAIT ?? 2500));
    const m = await measure(page);
    rows.push({ tab: name.trim(), ...m });
    await page.screenshot({ path: `${OUT}/screenshots/${vp}-${String(i).padStart(2, '0')}.png` });
  }
  const tops = rows.map((r) => r.top).filter((t) => t !== null);
  const spread = Math.max(...tops) - Math.min(...tops);
  const above = rows.reduce((n, r) => n + r.controlsAbove, 0);
  results.push({ viewport: vp, tabs: rows.length - 1, spread, controlsAbove: above, rows });
  console.log(
    `${vp}: ${rows.length - 1} tabs, bar top spread ${spread}px, controls above bar ${above}`,
  );
  for (const r of rows) console.log(`  ${String(r.top).padStart(4)}  ${r.controlsAbove}  ${r.tab}`);
  // AC3: outside the chart the bulk toggle is untouched — count it on every sidebar page.
  if (viewport.width === 1180) {
    for (const name of [
      'Turno',
      'Pazienti',
      'Terapia',
      'Parametri',
      'Consegne',
      'Agenda',
      'Farmaci',
    ]) {
      await page.locator('.teams-sidebar').getByRole('button', { name }).first().click();
      await page.waitForTimeout(Number(process.env.WAIT ?? 2500));
      outside[name] = await page.locator('.widget-group-controls').count();
    }
    console.log('bulk toggle outside the chart:', JSON.stringify(outside));
  }
  if (process.env.TRACE) await context.tracing.stop({ path: `${OUT}/trace/${vp}.zip` });
  await context.close();
}
await browser.close();

const pass = results.every((r) => r.spread <= 1 && r.controlsAbove === 0 && r.tabs >= 8);
writeFileSync(
  `${OUT}/test-results/tabbar-${process.env.LABEL ?? 'run'}.json`,
  JSON.stringify({ pass, results, outside, consoleErrors }, null, 2),
);
console.log(pass ? 'PASS #448 AC1+AC2' : 'FAIL #448', '| console errors:', consoleErrors.length);
process.exit(pass ? 0 : 1);
