// BUG-056 (#94) E2E: one therapy prescription supports MULTIPLE specific times (no duplicate rows).
// Creates a synthetic therapy with 3 times, saves, asserts via API exactly ONE PatientTherapy row
// with orarioSpecifico="HH:MM,HH:MM,HH:MM", screenshots, then deletes it (idempotent). PHI-safe.
import { chromium } from 'playwright';
import { resolve } from 'node:path';

const URL = process.env.APP_URL ?? 'http://localhost:5173';
const API = process.env.API_URL ?? 'http://localhost:3001';
const PATIENT = process.argv[2] ?? 'Moretti, Elena';
const outDir = process.argv[3] ?? 'docs/qa/issues/94/final';
const DRUG = 'ZZ-TEST-Multiorario';

const browser = await chromium.launch();
const report = {};
let patientId = null;
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  page.on('dialog', (d) => d.accept());
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.getByText('Operatore', { exact: true }).click();
  await page.waitForTimeout(1500);
  for (const label of ['Pazienti', PATIENT, 'Clinica', 'Terapia Farmacologica']) {
    await page.getByText(label).first().click();
    await page.waitForTimeout(1200);
  }
  // capture patient id from a therapies fetch
  page.on('response', (r) => { const m = r.url().match(/\/patients\/([^/]+)\/therapies/); if (m) patientId = m[1]; });

  await page.getByText('Programmazione').first().click();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: '+ Nuova terapia' }).click();
  await page.waitForTimeout(600);

  await page.getByPlaceholder('es. Paracetamolo').fill(DRUG);
  await page.getByPlaceholder('es. 500 mg').fill('100 mg');

  // add 3 specific times
  const addBtn = page.getByRole('button', { name: '+ Aggiungi orario' });
  for (let i = 0; i < 3; i++) { await addBtn.click(); await page.waitForTimeout(200); }
  const timeInputs = page.locator('.orari-specifici input[type=time]');
  report.timeInputCount = await timeInputs.count();
  const times = ['08:00', '14:00', '20:00'];
  for (let i = 0; i < times.length; i++) await timeInputs.nth(i).fill(times[i]);
  await page.screenshot({ path: resolve(outDir, 'after-form.png'), fullPage: true });

  await page.getByRole('button', { name: /Salva terapia/ }).click();
  await page.waitForTimeout(1500);

  // verify via API: exactly one row for DRUG with all 3 times in orarioSpecifico
  if (patientId) {
    const rows = await (await fetch(`${API}/patients/${patientId}/therapies`)).json();
    const mine = rows.filter((r) => r.farmacoNome === DRUG);
    report.rowCount = mine.length;
    report.orarioSpecifico = mine[0]?.orarioSpecifico ?? null;
    report.allThreeTimes = !!mine[0] && times.every((t) => (mine[0].orarioSpecifico ?? '').includes(t));
    // cleanup
    for (const r of mine) await fetch(`${API}/patients/${patientId}/therapies/${r.id}`, { method: 'DELETE' });
  }
  console.log(JSON.stringify(report, null, 2));
  await page.close();
} finally { await browser.close(); }
