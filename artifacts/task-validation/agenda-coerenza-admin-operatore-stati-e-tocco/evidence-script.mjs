import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const OUT = process.argv[2];
mkdirSync(`${OUT}/screenshots`, { recursive: true });
const checks = [];
const ok = (n, c, d = '') => { checks.push(!!c); console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? ' — ' + d : ''}`); };

const OPERATORI = [{ id: 'op-1', nome: 'Marco', cognome: 'Ferretti', reparto: 'Medicina', stato: 'attivo', ruolo: 'medico', email: 'm@x.it', telefono: '', pazientiAssegnati: 0, appuntamentiOggi: 0 }];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
await page.route('**/operators', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(OPERATORI) }));
// GET /appointments lentissima: e' la finestra in cui prima si mostravano dati di occupazione falsi.
await page.route('**/appointments', async (r) => {
  await new Promise((res) => setTimeout(res, 6000));
  return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
});

await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.getByText('Amministratore', { exact: true }).first().click({ timeout: 30000 });
await page.waitForTimeout(1200);
await page.getByText('Agenda', { exact: true }).first().click();
await page.waitForTimeout(1000);

const loading = page.locator('.empty-state-card', { hasText: 'Caricamento agenda' });
ok('AC-C4 stato di caricamento mostrato mentre la fetch e\' in corso', await loading.isVisible());
ok('AC-C4 nessuna griglia con slot "Disponibile" durante il caricamento', (await page.locator('.agt-admin-grid').count()) === 0);
ok('AC-C4 nessuna percentuale di occupazione durante il caricamento', (await page.locator('.agt-occ-track').count()) === 0);
await page.screenshot({ path: `${OUT}/screenshots/admin-caricamento.png` });

await page.waitForTimeout(6500);
ok('dopo la risposta la griglia compare', (await page.locator('.agt-admin-grid').count()) === 1);
await browser.close();
const f = checks.filter((c) => !c).length;
console.log(`\nTOTALE: ${checks.length - f}/${checks.length} PASS`);
process.exit(f ? 1 : 0);
