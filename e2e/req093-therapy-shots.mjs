// REQ-093 (BUG-055): graphical fractional therapy — live screenshots against the real app.
// Usage: node e2e/req093-therapy-shots.mjs [frontendUrl] [outDir]
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const FRONTEND = process.argv[2] ?? 'http://localhost:5173';
const outDir = process.argv[3] ?? 'requirements/evidence/REQ-093';
mkdirSync(outDir, { recursive: true });

const shot = async (page, name) => {
  await page.screenshot({ path: resolve(outDir, name), fullPage: false });
  console.log('saved', name);
};

async function gotoTherapy(page) {
  await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(600);
  const loginCard = page.locator('.login-role-card--operatore');
  if ((await loginCard.count()) > 0) {
    await loginCard.click();
    await page.waitForTimeout(1000);
  }

  // Pazienti
  const pazienti = page
    .locator('.teams-sidebar__item')
    .filter({ hasText: /Pazienti/i })
    .first();
  if ((await pazienti.count()) > 0) {
    await pazienti.click();
    await page.waitForTimeout(1000);
  } else {
    await page.getByText('Pazienti').first().click();
    await page.waitForTimeout(1000);
  }

  // open patient Forlano
  const row = page.getByText('Forlano').first();
  if ((await row.count()) > 0) {
    await row.click();
    await page.waitForTimeout(1200);
  }

  // Clinica L2 tab (label shows "Clinica 7")
  const clinica = page.getByText(/^Clinica/).first();
  if ((await clinica.count()) > 0) {
    await clinica.click().catch(() => {});
    await page.waitForTimeout(800);
  }
  // Terapia Farmacologica L3 tab
  const tab = page.getByText('Terapia Farmacologica', { exact: false }).first();
  if ((await tab.count()) > 0) {
    await tab.click().catch(() => {});
    await page.waitForTimeout(1400);
  }
}

const run = async (viewport, suffix) => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport });
    await gotoTherapy(page);

    // 1) Active therapies list — schedule summary with fractions + mg
    await shot(page, `after-therapy-list-${suffix}.png`);

    if (suffix === 'desktop') {
      // 2) Graphical add form with fraction quick-buttons
      const add = page.getByRole('button', { name: /Aggiungi farmaco/i }).first();
      if ((await add.count()) > 0) {
        await add.click();
        await page.waitForTimeout(700);
        // enable 1/2 and 1/4 fractions so the quick chips render
        for (const k of ['1/2', '1/4']) {
          const t = page.locator('.frac-toggle').filter({ hasText: k }).first();
          if ((await t.count()) > 0) await t.click().catch(() => {});
        }
        await page.waitForTimeout(400);
        await shot(page, `after-add-form-${suffix}.png`);
      }
      // 3) Daily administrations — two events 08:00 / 18:00
      const giorn = page.getByText('Somministrazioni giornaliere', { exact: false }).first();
      if ((await giorn.count()) > 0) {
        await giorn.click().catch(() => {});
        await page.waitForTimeout(900);
        const dateInput = page.locator('input[type="date"]').first();
        if ((await dateInput.count()) > 0) {
          await dateInput.fill('2026-06-24');
          await page.waitForTimeout(1200);
        }
        await shot(page, `after-administration-${suffix}.png`);
      }
    }
    await page.close();
  } catch (e) {
    console.error('shot error', suffix, e.message);
  } finally {
    await browser.close();
  }
};

await run({ width: 1366, height: 768 }, 'desktop');
await run({ width: 1024, height: 768 }, 'tablet');
console.log('done');
