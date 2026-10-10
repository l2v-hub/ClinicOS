// Broad role/navigation audit against an isolated, seeded local app.
// Read-only navigation; module editors are opened without saving.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const base = process.env.QA_FRONTEND_URL ?? 'http://127.0.0.1:5175';
const backend = process.env.QA_BACKEND_URL ?? 'http://127.0.0.1:3101';
if (!['localhost', '127.0.0.1'].includes(new URL(backend).hostname))
  throw new Error('This audit requires an isolated local backend');
const out = resolve(process.argv[2] ?? '/tmp/clinicos-functional-browser');
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname))
  throw new Error('This audit requires an isolated local frontend');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {}),
});
const results = [];
const telemetry = [];
async function settle(page) {
  await page.waitForFunction(() => !document.body.innerText.includes('Caricamento modulo…'));
  await page.waitForTimeout(650);
}
async function snapshot(page, role, name) {
  await settle(page);
  const state = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    alerts: [...document.querySelectorAll('[role="alert"]')]
      .filter((n) => n.getClientRects().length)
      .map((n) => n.textContent.trim()),
    headings: [...document.querySelectorAll('h1,h2,h3')]
      .filter((n) => n.getClientRects().length)
      .map((n) => n.textContent.trim()),
    controls: [...document.querySelectorAll('main button,main input,main select')].filter(
      (n) => n.getClientRects().length,
    ).length,
  }));
  results.push({ role, name, ...state });
  if (state.overflow > 1 || state.alerts.length)
    await page.screenshot({ path: resolve(out, `${role}-${results.length}.png`), fullPage: true });
  console.log(JSON.stringify({ role, name, overflow: state.overflow, alerts: state.alerts }));
}
try {
  for (const [role, login] of [
    ['admin', 'Amministratore'],
    ['supervisor', 'Supervisore 1'],
    ['doctor', 'Medico 1'],
    ['nurse', 'Infermiere 1'],
    ['oss', 'OSS 1'],
  ]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    page.on('pageerror', (e) => telemetry.push({ role, type: 'javascript', message: e.message }));
    page.on('response', (r) => {
      if (new URL(r.url()).origin === new URL(backend).origin && r.status() >= 400)
        telemetry.push({ role, type: 'http', status: r.status(), path: new URL(r.url()).pathname });
    });
    await page.goto(base);
    await page.getByRole('button', { name: new RegExp(`^${login}`) }).click();
    const nav = page.getByRole('navigation', { name: 'Navigazione principale' });
    await nav.waitFor();
    const destinations = await nav
      .locator('.teams-sidebar__nav button')
      .evaluateAll((ns) => ns.map((n) => n.title));
    for (const name of destinations) {
      await nav.locator(`button[title="${name}"]`).click();
      await snapshot(page, role, `navigation:${name}`);
    }
    const patients = nav.locator('button[title="Pazienti"]');
    if (await patients.count()) {
      await patients.click();
      const first = page.getByRole('button', { name: /Apri cartella/ }).first();
      await first.waitFor();
      {
        await first.click();
        await page.locator('.patient-record-view').waitFor();
        const tabs = await page.getByRole('tab').allTextContents();
        for (const tab of tabs) {
          await page.getByRole('tab', { name: tab.trim(), exact: true }).click();
          await snapshot(page, role, `chart:${tab.trim()}`);
        }
        if (role === 'nurse') {
          await page.getByRole('tab', { name: 'Moduli', exact: true }).click();
          await page.locator('.assessment-catalog').waitFor();
          const names = await page
            .locator('.assessment-catalog button[aria-label^="Compila "]')
            .evaluateAll((ns) => ns.map((n) => n.getAttribute('aria-label')));
          for (const name of names) {
            await page.getByRole('button', { name, exact: true }).click();
            await snapshot(page, role, `module:${name}`);
            await page.getByRole('tab', { name: 'Moduli', exact: true }).click();
            await page.locator('.assessment-catalog').waitFor();
          }
        }
        await page.setViewportSize({ width: 390, height: 844 });
        for (const tab of tabs) {
          await page.getByRole('tab', { name: tab.trim(), exact: true }).click();
          await snapshot(page, role, `mobile-chart:${tab.trim()}`);
        }
      }
    }
    if (role !== 'admin') {
      await page.getByTestId('assistant-entry').click();
      await page.getByRole('dialog').waitFor();
      await snapshot(page, role, 'assistant:open');
      await page.keyboard.press('Escape');
    }
    await context.close();
  }
} finally {
  writeFileSync(resolve(out, 'results.json'), JSON.stringify({ results, telemetry }, null, 2));
  await browser.close();
}

// Navigation completion is not a passing audit when the UI reports errors.
const failedViews = results.filter((r) => r.overflow > 1 || r.alerts.length);
console.log(
  JSON.stringify(
    {
      screens: results.length,
      failedViews: failedViews.map((r) => ({ role: r.role, name: r.name })),
      telemetry,
    },
    null,
    2,
  ),
);
process.exitCode = failedViews.length || telemetry.length ? 1 : 0;
