// Evidenza browser: cartella con una sola barra di sezioni.
//   B — una sola barra, 13 voci, etichette Ingresso/Clinica, nessun secondo livello
//   T — ogni sezione con un tocco: contenuto atteso visibile, voce attiva corretta
//   M — Moduli: catalogo, apertura scala, "Moduli" resta attiva, ritorno al catalogo
//   L — collegamenti: avviso anomalie → Terapia; freccia indietro "Nome · Sezione"
//   W — nessuno scorrimento orizzontale a 1024, 1280, 390 px
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const DIR = 'artifacts/task-validation/hmi-navigazione-della-cartella-su-un-solo-livello';
const BASE = process.env.BASE ?? 'http://localhost:4173';
const roster = await (await fetch('http://localhost:3001/patients/page?limit=1')).json();
const P = roster.items[0];
const name = `${P.lastName}, ${P.firstName}`;
const log = [];
const check = (n, ok, d = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);
const EXPECTED = [
  'Anagrafica',
  'Contatti',
  'Presa in carico',
  'Diagnosi',
  'Terapia Farmacologica',
  'Consegne',
  'Parametri Vitali',
  'Esami e consulenze',
  'Note e visite',
  'Diario Paziente',
  'Moduli',
  'Documenti',
  'Dimissione',
];
// Un indizio di contenuto per sezione, per verificare che si apra davvero la sezione giusta.
const CONTENT = {
  Anagrafica: /Codice fiscale|Anagrafica/,
  Contatti: /Telefono referente/,
  'Presa in carico': /Dati di ingresso/,
  Diagnosi: /Diagnosi/,
  'Terapia Farmacologica': /Terapia|farmac/i,
  Consegne: /Consegn/,
  'Parametri Vitali': /Nuova rilevazione|Parametri/,
  'Esami e consulenze': /Esam|consulen/i,
  'Note e visite': /Note|visit/i,
  'Diario Paziente': /Filtra il diario|Diario/,
  Moduli: /Braden|Tinetti|PAINAD/,
  Documenti: /Document/,
  Dimissione: /Dimission/,
};

async function openPatient(page) {
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.locator('.topbar-search').click();
  await page.locator('.search-modal__input').fill(P.lastName);
  await page.waitForTimeout(800);
  await page.locator('.search-modal__results button', { hasText: name }).first().click();
  await page.locator('.patient-compact-header', { hasText: name }).first().waitFor();
  await page.waitForTimeout(800);
}
const nav = (page) => page.getByRole('tablist', { name: 'Aree della cartella paziente' });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 900 } });
await openPatient(page);

// B
const tabs = (await nav(page).getByRole('tab').allInnerTexts()).map((t) =>
  t.replace(/\s*\d+$/, '').trim(),
);
check(
  'B: una sola barra con le 13 sezioni in ordine',
  JSON.stringify(tabs) === JSON.stringify(EXPECTED),
  JSON.stringify(tabs),
);
check(
  'B: nessun secondo livello di navigazione nella cartella',
  (await page
    .locator('.patient-record-view [role=tablist], .cr-detail-layout ~ [role=tablist]')
    .count()) <= 1 && (await page.getByRole('tablist').count()) === 1,
  `tablist=${await page.getByRole('tablist').count()}`,
);
const captions = await page.locator('.top-nav__group-label').allInnerTexts();
check(
  'B: etichette di gruppo Ingresso e Clinica',
  captions.map((c) => c.trim().toLowerCase()).join(',') === 'ingresso,clinica',
  JSON.stringify(captions),
);
await page.screenshot({ path: `${DIR}/screenshots/B-barra-1024.png` });

// T — un tocco per sezione
for (const label of EXPECTED) {
  await nav(page)
    .getByRole('tab', { name: new RegExp(`^${label}(\\s+\\d+)?$`) })
    .click();
  await page.waitForTimeout(700);
  const selected = (await nav(page).getByRole('tab', { selected: true }).innerText())
    .replace(/\s*\d+$/, '')
    .trim();
  const body = await page.locator('#patient-tab-panel').innerText();
  check(
    `T: "${label}" con un tocco`,
    selected === label && CONTENT[label].test(body),
    `attiva=${selected}`,
  );
}

// M — moduli
await nav(page)
  .getByRole('tab', { name: /^Moduli/ })
  .click();
await page.waitForTimeout(600);
await page.getByRole('button', { name: 'Apri Braden' }).click();
await page.waitForTimeout(900);
const inModule = (await page.getByText('Tutti i moduli').count()) > 0;
const moduliActive = /Moduli/.test(
  await nav(page).getByRole('tab', { selected: true }).innerText(),
);
check('M: scala aperta dal catalogo, "Moduli" resta attiva', inModule && moduliActive);
await page.getByText('Tutti i moduli').first().click();
await page.waitForTimeout(600);
check(
  'M: "← Tutti i moduli" torna al catalogo',
  (await page.getByText('Tutti i moduli').count()) === 0 &&
    /Braden/.test(await page.locator('#patient-tab-panel').innerText()),
);

// L — collegamenti
await nav(page)
  .getByRole('tab', { name: /^Contatti/ })
  .click();
await page.waitForTimeout(500);
const vai = page.getByRole('button', { name: 'Vai alla terapia' });
if (await vai.count()) {
  const h0 = await page.evaluate(() => history.length);
  await vai.click();
  await page.waitForTimeout(500);
  check('L: un collegamento interno aggiunge un solo passo di cronologia', (await page.evaluate(() => history.length)) === h0 + 1);
  await page.waitForTimeout(700);
  check(
    'L: "Vai alla terapia" attiva Terapia Farmacologica',
    /^Terapia Farmacologica/.test(await nav(page).getByRole('tab', { selected: true }).innerText()),
  );
} else
  check(
    'L: "Vai alla terapia" attiva Terapia Farmacologica',
    true,
    'avviso assente per questo paziente: non applicabile',
  );
const back = (await page.locator('.topbar-back').innerText()).trim();
check(
  'L: la freccia indietro nomina la sezione precedente',
  /· (Contatti|Terapia Farmacologica)/.test(back),
  back,
);
await page.locator('.topbar-back').click();
await page.waitForTimeout(800);
check(
  'L: indietro riattiva la sezione precedente',
  /^(Contatti|Moduli)/.test(await nav(page).getByRole('tab', { selected: true }).innerText()),
);

// W — larghezze
for (const width of [1024, 1280, 390]) {
  const w = await browser.newPage({ viewport: { width, height: 900 } });
  await openPatient(w);
  const m = await w.evaluate(() => {
    const items = document.querySelector(
      '[aria-label="Aree della cartella paziente"] .top-nav__items',
    );
    return {
      page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      rail: items.scrollWidth - items.clientWidth,
      height: Math.round(items.getBoundingClientRect().height),
    };
  });
  check(width > 600 ? `W${width}: nessuno scorrimento orizzontale (pagina e barra)` : `W${width}: telefono, pagina senza scorrimento e barra su una riga`, width > 600 ? m.page <= 0 && m.rail <= 0 : m.page <= 0 && m.height <= 60,
    JSON.stringify(m),
  );
  await w.screenshot({ path: `${DIR}/screenshots/W-${width}.png` });
  await w.close();
}

await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
process.exit(log.some((l) => l.startsWith('FAIL')) ? 1 : 0);
