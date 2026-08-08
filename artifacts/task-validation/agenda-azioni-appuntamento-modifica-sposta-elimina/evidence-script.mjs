import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2];
mkdirSync(`${OUT}/screenshots`, { recursive: true });
const checks = [];
const ok = (n, c, d = '') => {
  checks.push({ n, c: !!c });
  console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? ' — ' + d : ''}`);
};

const OPERATORI = [
  { id: 'op-1', nome: 'Marco', cognome: 'Ferretti', reparto: 'Medicina', stato: 'attivo', ruolo: 'medico', email: 'm@x.it', telefono: '', pazientiAssegnati: 0, appuntamentiOggi: 0 },
];
const OGGI = new Date().toISOString().slice(0, 10);
const APPT = [{
  id: 'apt-1', data: OGGI, ora: '09:00', durata: 60,
  patientId: 'p-1', patientName: 'ROSSI, Giovanni',
  operatorId: 'op-1', operatorName: 'Ferretti Marco',
  tipologia: 'controllo', stato: 'programmato', note: 'Controllo post-operatorio',
}];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
await page.route('**/operators', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(OPERATORI) }));
await page.route('**/appointments', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(APPT) }));
const patched = [];
await page.route('**/appointments/*', (r) => {
  patched.push({ method: r.request().method(), body: r.request().postData() });
  if (r.request().method() === 'DELETE') return r.fulfill({ status: 204, body: '' });
  return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...APPT[0], ora: '10:30' }) });
});

await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.getByText('Amministratore', { exact: true }).first().click({ timeout: 30000 });
await page.waitForTimeout(1500);
await page.getByText('Agenda', { exact: true }).first().click();
await page.waitForTimeout(1500);

const card = page.locator('.agt-apt-card').first();
ok('appuntamento renderizzato in griglia', await card.isVisible());
ok('nessuna azione prima della selezione', (await page.locator('.agt-apt-card__actions').count()) === 0);

await card.click();
await page.waitForTimeout(500);
const actions = page.locator('.agt-apt-card__actions');
ok('AC-B3 barra azioni sull\'appuntamento selezionato', await actions.isVisible());
ok('AC-B3 pulsante Modifica', (await actions.getByRole('button', { name: 'Modifica' }).count()) === 1);
ok('AC-B3 pulsante Elimina', (await actions.getByRole('button', { name: 'Elimina' }).count()) === 1);
const h = await actions.getByRole('button', { name: 'Modifica' }).boundingBox();
ok('AC-B3 touch target >= 44px', h && h.height >= 44, `${h && Math.round(h.height)}px`);
await page.screenshot({ path: `${OUT}/screenshots/admin-azioni-appuntamento.png` });

// AC-B4: conferma a due passi
await actions.getByRole('button', { name: 'Elimina' }).click();
await page.waitForTimeout(400);
ok('AC-B4 conferma esplicita richiesta', (await page.getByText('Eliminare l’appuntamento?').count()) > 0);
ok('AC-B4 nessuna chiamata di rete prima della conferma', patched.length === 0, `${patched.length} chiamate`);
await page.screenshot({ path: `${OUT}/screenshots/admin-conferma-eliminazione.png` });
await page.getByRole('button', { name: 'Annulla' }).click();
await page.waitForTimeout(300);
ok('AC-B4 annullando non si elimina', patched.length === 0 && (await page.locator('.agt-apt-card').count()) > 0);

// AC-B1: form in modifica precompilato
await page.locator('.agt-apt-card__actions').getByRole('button', { name: 'Modifica' }).click();
await page.waitForTimeout(700);
const modal = page.locator('.modal-box');
ok('AC-B1 titolo "Modifica Appuntamento"', (await modal.locator('.modal-title').innerText()).includes('Modifica'));
ok('AC-B1 CTA "Salva modifiche"', (await modal.getByRole('button', { name: /Salva modifiche/ }).count()) === 1);
ok('AC-B1 ora precompilata', (await modal.locator('input[type=time]').inputValue()) === '09:00');
ok('AC-B1 durata precompilata (60)', (await modal.locator('select').first().inputValue()) === '60');
ok('AC-B1 paziente in sola lettura', (await modal.locator('.apt-form-readonly').innerText()).includes('ROSSI'));
await page.screenshot({ path: `${OUT}/screenshots/admin-form-modifica.png` });

// AC-B5: spostamento orario -> PATCH
await modal.locator('input[type=time]').fill('10:30');
await modal.getByRole('button', { name: /Salva modifiche/ }).click();
await page.waitForTimeout(1200);
const patch = patched.find((p) => p.method === 'PATCH');
ok('AC-B5 PATCH inviata', !!patch, patch ? patch.method : 'nessuna');
ok('AC-B5 nuovo orario nel payload', !!patch && patch.body.includes('10:30'));
ok('AC-B5 solo campi supportati dalla route', !!patch && !patch.body.includes('patientId') && !patch.body.includes('priorita'));
ok('AC-B5 form chiuso dopo il salvataggio', (await page.locator('.modal-box').count()) === 0);
await page.screenshot({ path: `${OUT}/screenshots/admin-dopo-modifica.png` });

await browser.close();
const f = checks.filter((c) => !c.c);
console.log(`\nTOTALE: ${checks.length - f.length}/${checks.length} PASS`);
process.exit(f.length ? 1 : 0);
