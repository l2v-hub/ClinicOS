// REQ-093: capture the graphical fraction editor + daily administration view.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const FRONTEND = process.argv[2] ?? 'http://localhost:5173';
const outDir = process.argv[3] ?? 'requirements/evidence/REQ-093';
mkdirSync(outDir, { recursive: true });

async function navTherapy(page) {
  await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(600);
  const login = page.locator('.login-role-card--operatore');
  if ((await login.count()) > 0) {
    await login.click();
    await page.waitForTimeout(900);
  }
  const pazienti = page
    .locator('.teams-sidebar__item')
    .filter({ hasText: /Pazienti/i })
    .first();
  if ((await pazienti.count()) > 0) {
    await pazienti.click();
    await page.waitForTimeout(900);
  }
  const row = page.getByText('Forlano').first();
  if ((await row.count()) > 0) {
    await row.click();
    await page.waitForTimeout(1100);
  }
  const clinica = page.getByText(/^Clinica/).first();
  if ((await clinica.count()) > 0) {
    await clinica.click();
    await page.waitForTimeout(700);
  }
  // L3 tab: target the tab specifically (TopNav level3 segmented control)
  const tab = page.getByRole('button', { name: /Terapia Farmacologica/i }).first();
  if ((await tab.count()) > 0) {
    await tab.click();
  } else {
    await page.getByText('Terapia Farmacologica').first().click();
  }
  await page.waitForTimeout(1300);
}

const browser = await chromium.launch({ headless: true });
try {
  // ── Shot A: graphical fraction editor (edit existing Kanrenol) ──
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await navTherapy(page);
  const editBtn = page.locator('button[title="Modifica"]').first();
  if ((await editBtn.count()) > 0) {
    await editBtn.click();
    await page.waitForTimeout(900);
  }
  await page.screenshot({
    path: resolve(outDir, 'after-form-editor-desktop.png'),
    fullPage: false,
  });
  console.log('saved after-form-editor-desktop.png');
  await page.close();

  // ── Shot B: daily administration (two events) ──
  const page2 = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await navTherapy(page2);
  const giorn = page2.getByText('Somministrazioni giornaliere', { exact: false }).first();
  if ((await giorn.count()) > 0) {
    await giorn.click();
    await page2.waitForTimeout(800);
  }
  const dateInput = page2.locator('input[type="date"]').first();
  if ((await dateInput.count()) > 0) {
    await dateInput.fill('2026-06-24');
    await page2.waitForTimeout(1300);
  }
  await page2.screenshot({
    path: resolve(outDir, 'after-administration-desktop.png'),
    fullPage: false,
  });
  console.log('saved after-administration-desktop.png');
  await page2.close();
} catch (e) {
  console.error('error', e.message);
} finally {
  await browser.close();
}
