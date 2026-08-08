import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const OUT = process.argv[2];
mkdirSync(`${OUT}/screenshots`, { recursive: true });
const checks = [];
const ok = (n, c, d = '') => { checks.push(!!c); console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? ' — ' + d : ''}`); };

const OPERATORI = [{ id: 'op-1', nome: 'Marco', cognome: 'Ferretti', reparto: 'Medicina', stato: 'attivo', ruolo: 'medico', email: 'm@x.it', telefono: '', pazientiAssegnati: 0, appuntamentiOggi: 0 }];
const OGGI = new Date().toISOString().slice(0, 10);
const APPT = [{ id: 'apt-1', data: OGGI, ora: '09:00', durata: 60, patientId: 'p-1', patientName: 'ROSSI, Giovanni', operatorId: 'op-1', operatorName: 'Ferretti Marco', tipologia: 'controllo', stato: 'programmato', note: '' }];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
await page.route('**/operators', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(OPERATORI) }));
await page.route('**/appointments', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(APPT) }));
// PATCH -> 409 slot occupato ; DELETE -> 500
await page.route('**/appointments/*', (r) => {
  if (r.request().method() === 'DELETE') return r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { kind: 'internal', message: 'boom' } }) });
  return r.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: { kind: 'slot_conflict', message: 'Slot già occupato da un altro appuntamento.' } }) });
});

await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.getByText('Amministratore', { exact: true }).first().click({ timeout: 30000 });
await page.waitForTimeout(1200);
await page.getByText('Agenda', { exact: true }).first().click();
await page.waitForTimeout(1500);

// AC6: 409 in modifica -> errore nel form, form NON chiuso
await page.locator('.agt-apt-card').first().click();
await page.waitForTimeout(400);
await page.locator('.agt-apt-card__actions').getByRole('button', { name: 'Modifica' }).click();
await page.waitForTimeout(700);
await page.locator('.modal-box input[type=time]').fill('11:00');
await page.locator('.modal-box').getByRole('button', { name: /Salva modifiche/ }).click();
await page.waitForTimeout(1200);
ok('AC-B6 form ancora aperto dopo il 409', (await page.locator('.modal-box').count()) === 1);
ok('AC-B6 messaggio di conflitto mostrato nel form', (await page.locator('.modal-box .form-error').innerText()).includes('occupato'));
await page.screenshot({ path: `${OUT}/screenshots/admin-conflitto-409.png` });
await page.locator('.modal-box').getByRole('button', { name: 'Annulla' }).click();
await page.waitForTimeout(500);

// AC7: DELETE 500 -> rollback, l'appuntamento ricompare
const before = await page.locator('.agt-apt-card').count();
await page.locator('.agt-apt-card').first().click();
await page.waitForTimeout(400);
await page.locator('.agt-apt-card__actions').getByRole('button', { name: 'Elimina' }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Sì, elimina' }).click();
await page.waitForTimeout(1500);
ok('AC-B7 rollback: l\'appuntamento ricompare dopo il fallimento', (await page.locator('.agt-apt-card').count()) === before, `prima ${before}, dopo ${await page.locator('.agt-apt-card').count()}`);
ok('AC-B7 toast di errore mostrato', (await page.getByText(/Impossibile eliminare/).count()) > 0);
await page.screenshot({ path: `${OUT}/screenshots/admin-rollback-eliminazione.png` });

await browser.close();
const f = checks.filter((c) => !c).length;
console.log(`\nTOTALE: ${checks.length - f}/${checks.length} PASS`);
process.exit(f ? 1 : 0);
