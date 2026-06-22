// BUG-058 (#96) E2E: a contenzione saved in the Contenzioni tab PERSISTS after reload. PHI-safe.
import { chromium } from 'playwright';
const URL = process.env.APP_URL ?? 'http://localhost:5173';
const API = process.env.API_URL ?? 'http://localhost:3001';
const PATIENT = process.argv[2] ?? 'Mancini, Roberto';
const MOTIVO = 'ZZ-TEST-motivo-contenzione-0001';

async function nav(page) {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.getByText('Operatore', { exact: true }).click();
  await page.waitForTimeout(1500);
  for (const label of ['Pazienti', PATIENT, 'Moduli', 'Contenzioni']) {
    await page.getByText(label).first().click();
    await page.waitForTimeout(1100);
  }
}
const browser = await chromium.launch();
const report = {}; let pid = null;
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  page.on('dialog', (d) => d.accept());
  page.on('response', (r) => { const m = r.url().match(/\/patients\/([^/]+)\/cartella/); if (m) pid = m[1]; });
  await nav(page);
  await page.getByText('+ Aggiungi').first().click();
  await page.waitForTimeout(500);
  await page.getByPlaceholder(/Descrizione del motivo clinico/).fill(MOTIVO);
  await page.getByRole('button', { name: /^Salva$/ }).first().click();
  await page.waitForTimeout(1500);
  report.listedAfterSave = (await page.textContent('body') ?? '').includes(MOTIVO);
  await nav(page);
  await page.waitForTimeout(800);
  report.listedAfterReload = (await page.textContent('body') ?? '').includes(MOTIVO);
  if (pid) {
    const c = await (await fetch(`${API}/patients/${pid}/cartella`)).json();
    const list = c?.data?.contenzioni ?? [];
    report.inBackend = list.some((x) => x.motivoClinico === MOTIVO);
    const kept = list.filter((x) => x.motivoClinico !== MOTIVO);
    if (kept.length !== list.length) await fetch(`${API}/patients/${pid}/cartella`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { ...c.data, contenzioni: kept } }) });
  }
  console.log(JSON.stringify(report, null, 2));
  await page.close();
} finally { await browser.close(); }
