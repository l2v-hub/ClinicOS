import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { stubOperators } from './stub.mjs';

const OUT = process.argv[2];
mkdirSync(`${OUT}/screenshots`, { recursive: true });
const checks = [];
const ok = (name, cond, detail = '') => {
  checks.push({ name, pass: !!cond, detail });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

async function enterAs(role) {
  await stubOperators(page);
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.getByText(role, { exact: true }).first().click({ timeout: 30000 });
  await page.waitForTimeout(1500);
}
async function nav(label) {
  await page.getByText(label, { exact: true }).first().click();
  await page.waitForTimeout(1200);
}

// ── ADMIN ──
await enterAs('Amministratore');
await nav('Agenda');
await page.waitForTimeout(1200);

ok('AC-C1 legenda stati presente in AdminAgenda', await page.locator('.agt-legend').isVisible());
const cards = page.locator('.agt-admin-therapy-row .agt-therapy-slot');
const nCards = await cards.count();
ok('AC-A1 card terapia full-width nella griglia giorno admin', nCards > 0, `${nCards} card`);
await page.screenshot({ path: `${OUT}/screenshots/admin-giorno-terapie.png`, fullPage: true });

if (nCards > 0) {
  await cards.first().click();
  await page.waitForTimeout(600);
  const modal = page.locator('.therapy-modal');
  const modalVisible = await modal.isVisible();
  const nErogata = await modal.getByRole('button', { name: 'Erogata' }).count();
  const nNonErogata = await modal.getByRole('button', { name: 'Non erogata' }).count();
  const nDaErogare = await modal.getByText('Da erogare').count();
  ok('AC-A4 modale admin aperta', modalVisible);
  ok('AC-A4/AC-A7 nessun pulsante "Erogata" per admin', nErogata === 0, `trovati ${nErogata}`);
  ok('AC-A4/AC-A7 nessun pulsante "Non erogata" per admin', nNonErogata === 0, `trovati ${nNonErogata}`);
  ok('AC-A4 badge "Da erogare" mostrato in sola lettura', nDaErogare > 0, `${nDaErogare} righe`);
  await page.screenshot({ path: `${OUT}/screenshots/admin-modale-readonly.png` });
  await modal.locator('.therapy-modal__close').click();
  await page.waitForTimeout(400);
}

await page.getByRole('button', { name: 'Settimana' }).click();
await page.waitForTimeout(900);
const nDots = await page.locator('.agt-week-therapy-dot').count();
ok('AC-A3 pallino terapia nella vista settimana admin', nDots > 0, `${nDots} pallini`);
ok('AC-C3 nota "nessun appuntamento" in settimana', await page.locator('.agt-empty-note').count() > 0);
await page.screenshot({ path: `${OUT}/screenshots/admin-settimana-terapie.png`, fullPage: true });

await page.getByRole('button', { name: 'Mese' }).click();
await page.waitForTimeout(700);
ok('AC-C3 nota "nessun appuntamento" nel mese', await page.locator('.agt-empty-note').count() > 0);
await page.screenshot({ path: `${OUT}/screenshots/admin-mese.png`, fullPage: true });

// ── OPERATORE ──
await enterAs('Operatore');
await nav('Agenda');
await page.waitForTimeout(1200);
const opCard = page.locator('.agt-therapy-slot').first();
ok('AC-A5 card terapia ancora presente in agenda operatore', await opCard.isVisible());
await opCard.click();
await page.waitForTimeout(600);
const opModal = page.locator('.therapy-modal');
const opErogata = await opModal.getByRole('button', { name: 'Erogata' }).count();
const opNon = await opModal.getByRole('button', { name: 'Non erogata' }).count();
ok('AC-A5 pulsante "Erogata" ancora presente per l\'operatore', opErogata > 0, `${opErogata}`);
ok('AC-A5 pulsante "Non erogata" ancora presente per l\'operatore', opNon > 0, `${opNon}`);
await page.screenshot({ path: `${OUT}/screenshots/operatore-modale-interattiva.png` });

await browser.close();
const failed = checks.filter((c) => !c.pass);
console.log(`\nTOTALE: ${checks.length - failed.length}/${checks.length} PASS`);
process.exit(failed.length ? 1 : 0);
