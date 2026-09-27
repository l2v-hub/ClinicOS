// Evidenza browser: nuovi campi NEWS2 (FR, O₂, coscienza ACVPU) nelle rilevazioni.
//   S — rilevazione singola dalla cartella: payload POST e storico.
//   M — rilevazione multipaziente: colonne e menu a scelta, niente scorrimento orizzontale a 1024 px.
// Le rilevazioni sono simulate in memoria con page.route (lo stub :3001 non le implementa).
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const DIR = 'artifacts/task-validation/parametri-vitali-frequenza-respiratoria-ossigeno-e-coscienza-acvpu-per-il-news2';
const BASE = process.env.BASE ?? 'http://localhost:4173';
const roster = await (await fetch('http://localhost:3001/patients/page?limit=1')).json();
const P = roster.items[0];
const name = `${P.lastName}, ${P.firstName}`;
const log = [];
const check = (n, ok, d = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
const readings = [];
let posted = null;
await page.route(/\/patients\/[^/]+\/parameter-readings(\?.*)?$/, async (route) => {
  const req = route.request();
  const patientId = decodeURIComponent(new URL(req.url()).pathname.split('/')[2]);
  if (req.method() === 'POST') {
    const body = JSON.parse(req.postData());
    posted = body;
    const reading = { id: `r${readings.length + 1}`, patientId, requestId: body.requestId, measuredAt: body.measuredAt, values: body.values, authorOperatorId: 'op1', authorName: 'Dr. Marco Ferretti', createdAt: body.measuredAt };
    readings.unshift(reading);
    return route.fulfill({ status: 201, json: { reading, summary: { date: body.measuredAt.slice(0, 10), count: readings.length, noteCount: 0, lastReadingAt: body.measuredAt } } });
  }
  return route.fulfill({ json: { readings: readings.filter((r) => r.patientId === patientId), hasMore: false, nextCursor: null } });
});

await page.goto(BASE);
await page.getByText('Operatore', { exact: true }).first().click();
await page.locator('.topbar-search').click();
await page.locator('.search-modal__input').fill(P.lastName);
await page.waitForTimeout(800);
await page.locator('.search-modal__results button', { hasText: name }).first().click();
await page.locator('.patient-compact-header', { hasText: name }).first().waitFor();
await page.getByRole('tab', { name: /^Clinica/ }).first().click();
await page.getByRole('tab', { name: /^Parametri Vitali/ }).first().click();
await page.getByLabel('Nuova rilevazione FR').waitFor({ timeout: 15000 });
check('S: il modulo ha FR, O₂ e Coscienza', (await page.getByLabel('Nuova rilevazione FR').count()) === 1 && (await page.getByLabel('Nuova rilevazione O₂').evaluate((e) => e.tagName)) === 'SELECT' && (await page.getByLabel('Nuova rilevazione Coscienza').evaluate((e) => e.tagName)) === 'SELECT');
await page.getByLabel('Nuova rilevazione PA').fill('140/85');
await page.getByLabel('Nuova rilevazione FR').fill('22');
await page.getByLabel('Nuova rilevazione O₂').selectOption('si');
await page.getByLabel('Nuova rilevazione Coscienza').selectOption('V');
await page.screenshot({ path: `${DIR}/screenshots/S1-modulo-compilato.png` });
await page.getByRole('button', { name: 'Salva rilevazione' }).click();
await page.waitForTimeout(1500);
check('S: payload con le chiavi NEWS2', posted?.values?.fr === '22' && posted?.values?.o2 === 'si' && posted?.values?.coscienza === 'V' && posted?.values?.pa === '140/85', JSON.stringify(posted?.values));
const hist = await page.locator('main, .main-area-clean').first().innerText();
check('S: lo storico mostra FR, O₂ "Sì" e coscienza leggibile', /FR\s*\n?\s*22/.test(hist) && /Sì/.test(hist) && /V · Risponde alla voce/.test(hist));
await page.screenshot({ path: `${DIR}/screenshots/S2-storico.png` });
// valore non valido: FR 90 bloccato dal modulo
await page.getByLabel('Nuova rilevazione FR').fill('90');
const before = readings.length;
await page.getByRole('button', { name: /Salva rilevazione/ }).click();
await page.waitForTimeout(800);
check('S: FR 90 non viene inviato', readings.length === before);

// M — multipaziente, tablet
const tab = await browser.newPage({ viewport: { width: 1024, height: 900 } });
await tab.goto(BASE);
await tab.getByText('Operatore', { exact: true }).first().click();
await tab.getByRole('button', { name: 'Parametri' }).first().click();
await tab.locator('.qe-row--header').first().waitFor({ timeout: 15000 });
const header = await tab.locator('.qe-row--header').first().innerText();
check('M: intestazione con FR, O₂ e Coscienza', /FR/.test(header) && /O₂/.test(header) && /ACVPU/.test(header), header.replace(/\n/g, ' | '));
check('M: O₂ e coscienza sono menu a scelta nella riga', (await tab.locator('select.qe-row__input').count()) >= 2);
const overflow = await tab.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('M: nessuno scorrimento orizzontale della pagina a 1024 px', overflow <= 0, `overflow=${overflow}`);
const cols = await tab.evaluate(() => {
  const x = (e) => [...e.children].map((c) => Math.round(c.getBoundingClientRect().left));
  const h = document.querySelector('.qe-row--header');
  const r = document.querySelector('.qe-row:not(.qe-row--header)');
  return { h: x(h), r: x(r), tableOverflow: (() => { const s = document.querySelector('.qe-table-surface'); return s.scrollWidth - s.clientWidth; })() };
});
check('M: intestazioni allineate alle colonne dei campi a 1024 px', JSON.stringify(cols.h) === JSON.stringify(cols.r), JSON.stringify(cols.h));
check('M: la tabella entra senza scorrimento interno a 1024 px', cols.tableOverflow <= 0, `overflow=${cols.tableOverflow}`);
await tab.screenshot({ path: `${DIR}/screenshots/M-multipaziente-1024.png` });

// W — tutte le larghezze: nessun taglio della tabella (Salva visibile) e colonne allineate.
for (const width of [1024, 1100, 1180, 1181, 1200, 1280, 1320, 1321, 1366, 1440, 1920]) {
  const w = await browser.newPage({ viewport: { width, height: 800 } });
  await w.goto(BASE);
  await w.getByText('Operatore', { exact: true }).first().click();
  await w.getByRole('button', { name: 'Parametri' }).first().click();
  await w.locator('.qe-row--header').first().waitFor({ timeout: 15000 });
  const m = await w.evaluate(() => {
    const s = document.querySelector('.qe-table-surface');
    const x = (e) => [...e.children].map((c) => Math.round(c.getBoundingClientRect().left));
    const save = document.querySelector('.qe-row__save').getBoundingClientRect();
    const box = s.getBoundingClientRect();
    return { overflow: s.scrollWidth - s.clientWidth, aligned: JSON.stringify(x(document.querySelector('.qe-row--header'))) === JSON.stringify(x(document.querySelector('.qe-row:not(.qe-row--header)'))), saveVisible: save.right <= box.right + 0.5 };
  });
  check(`W${width}: tabella intera, Salva visibile, colonne allineate`, m.overflow <= 0 && m.saveVisible && m.aligned, JSON.stringify(m));
  if (width === 1280) await w.screenshot({ path: `${DIR}/screenshots/W-multipaziente-1280.png` });
  await w.close();
}

await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
process.exit(log.some((l) => l.startsWith('FAIL')) ? 1 : 0);
