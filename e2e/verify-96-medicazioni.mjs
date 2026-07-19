// BUG-058 (#96) E2E: a medicazione saved in the Medicazioni tab PERSISTS after reload.
// PHI-safe (seed patient). Adds a synthetic medicazione (unique sede), reloads, asserts it is
// still listed + present in the backend cartella, then deletes it (idempotent).
import { chromium } from 'playwright';

const URL = process.env.APP_URL ?? 'http://localhost:5173';
const API = process.env.API_URL ?? 'http://localhost:3001';
const PATIENT = process.argv[2] ?? 'Mancini, Roberto';
const SEDE = 'ZZ-TEST-Sacro-' + '0001';

async function nav(page) {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.getByText('Operatore', { exact: true }).click();
  await page.waitForTimeout(1500);
  for (const label of ['Pazienti', PATIENT, 'Moduli', 'Medicazioni']) {
    await page.getByText(label).first().click();
    await page.waitForTimeout(1100);
  }
}

const browser = await chromium.launch();
const report = {};
let pid = null;
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  page.on('dialog', (d) => d.accept());
  page.on('response', (r) => {
    const m = r.url().match(/\/patients\/([^/]+)\/cartella/);
    if (m) pid = m[1];
  });
  await nav(page);

  await page.getByText('+ Nuova medicazione').first().click();
  await page.waitForTimeout(500);
  // Sede lesione is the required field
  const sedeInput = page
    .locator('.form-row', { has: page.locator('.form-label', { hasText: /Sede lesione/ }) })
    .locator('input')
    .first();
  await sedeInput.fill(SEDE);
  await page
    .getByRole('button', { name: /^Salva$/ })
    .first()
    .click();
  await page.waitForTimeout(1500);
  report.listedAfterSave = ((await page.textContent('body')) ?? '').includes(SEDE);

  // reload and assert persistence
  await nav(page);
  await page.waitForTimeout(800);
  report.listedAfterReload = ((await page.textContent('body')) ?? '').includes(SEDE);

  if (pid) {
    const c = await (await fetch(`${API}/patients/${pid}/cartella`)).json();
    const meds = c?.data?.medicazioniFerite ?? [];
    report.inBackend = meds.some((m) => m.sede === SEDE);
    // cleanup
    const kept = meds.filter((m) => m.sede !== SEDE);
    if (kept.length !== meds.length) {
      await fetch(`${API}/patients/${pid}/cartella`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { ...c.data, medicazioniFerite: kept } }),
      });
    }
  }
  console.log(JSON.stringify(report, null, 2));
  await page.close();
} finally {
  await browser.close();
}
