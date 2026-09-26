// Evidenza browser del tab "Presa in carico".
//   A — cartella confermata col formato vecchio (campi di ingresso alla radice)
//   B — cartella senza presa in carico (un secondo paziente, verificato dal nome in testata)
//   C — su B: "Modifica" della card "Dati di ingresso" → il PUT inviato contiene solo i campi
//       di quella card, nessuna valutazione clinica inventata
//   D — su B: menu inline vuoto mostra "— Seleziona —" e non una scelta finta
// Richiede: stub API su :3001 (perf/stub-server.mjs) e preview su :4173 buildata con
// VITE_API_URL=http://localhost:3001. Esegui dalla root del repo:
//   node artifacts/task-validation/intake-dati-di-ingresso-visibili-in-presa-in-carico/evidence.mjs
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const DIR = 'artifacts/task-validation/intake-dati-di-ingresso-visibili-in-presa-in-carico';
const BASE = process.env.BASE ?? 'http://localhost:4173';
const LEGACY = {
  dataPresa: '2026-09-20',
  oraPresa: '10:15',
  provenienza: 'ospedale',
  centroInviante: 'Ospedale San Carlo',
  modalitaIngresso: 'trasferimento',
  motivoIngresso: 'Prosecuzione cure dopo ricovero',
};
const CLINICAL = [
  'statoCoscienza',
  'orientamento',
  'autonomia',
  'condizioniGenerali',
  'dolore',
  'cuteIntegrita',
  'materialeConsegnato',
];
const log = [];
const check = (name, ok, detail = '') =>
  log.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);

const browser = await chromium.launch();
// Viewport alta: la cartella scorre in un contenitore interno, così tutte le card entrano nello screenshot.
const page = await browser.newPage({ viewport: { width: 1280, height: 2600 } });
let legacyId = null;
const puts = [];
await page.route(/\/patients\/[^/]+\/cartella$/, async (route) => {
  const req = route.request();
  if (req.method() === 'PUT') {
    puts.push(JSON.parse(req.postData() ?? '{}'));
    return route.fulfill({ status: 200, json: { ok: true } });
  }
  if (req.method() !== 'GET') return route.continue();
  const res = await route.fetch();
  const body = await res.json();
  delete body.data.presaInCarico;
  if (body.patientId === legacyId) Object.assign(body.data, LEGACY);
  await route.fulfill({ response: res, json: body });
});

async function openPresaInCarico(p) {
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Pazienti' }).first().click();
  const search = page.getByPlaceholder(/Cerca/).first();
  await search.fill(p.lastName);
  await page.waitForTimeout(600);
  await page
    .getByText(`${p.lastName}, ${p.firstName}`)
    .first()
    .click()
    .catch(async () => {
      await page.getByText(p.lastName).nth(1).click();
    });
  await page.locator('.patient-compact-header', { hasText: `${p.lastName}, ${p.firstName}` }).first().waitFor();
  await page
    .getByRole('tab', { name: /Raccolta dati ingresso/ })
    .first()
    .click();
  await page
    .getByRole('tab', { name: /^Presa in carico$/ })
    .first()
    .click();
  await page.getByText('Dati di ingresso').first().waitFor();
  await page.waitForTimeout(400);
}
const header = async () => (await page.locator('.patient-compact-header').first().innerText()).trim();
const tabText = async () =>
  page
    .locator('.cr-form-section, .pic-edit-form')
    .evaluateAll((els) => els.map((e) => e.innerText).join('\n'));

const roster = await (await fetch('http://localhost:3001/patients/page?limit=5')).json();
const [a, b] = roster.items;
legacyId = a.id;

// A
await openPresaInCarico(a);
check('A: aperto il paziente A', (await header()).includes(`${a.lastName}, ${a.firstName}`));
const textA = await tabText();
check(
  'A: data e ora di ingresso visibili',
  textA.includes('20/09/2026') && textA.includes('10:15'),
);
check(
  'A: provenienza tradotta (ospedale → Dimissione ospedaliera)',
  textA.includes('Dimissione ospedaliera'),
);
check('A: struttura inviante visibile', textA.includes('Ospedale San Carlo'));
check(
  'A: tipo di ingresso visibile',
  textA.includes('Tipo di ingresso') && textA.includes('Trasferimento'),
);
check('A: motivo visibile', textA.includes('Prosecuzione cure dopo ricovero'));
check(
  'A: nessuna valutazione inventata in vista',
  !/\b(Vigile|Autonomo|Orientato|Buone)\b/.test(textA),
);
await page.screenshot({ path: `${DIR}/screenshots/A-cartella-legacy-presa-in-carico.png` });

// B
await openPresaInCarico(b);
check('B: aperto il paziente B (diverso da A)',
  (await header()).includes(`${b.lastName}, ${b.firstName}`) && !(await header()).includes(`${a.lastName}, ${a.firstName}`));
const textB = await tabText();
check('B: nessun dato di A trapelato', !textB.includes('Ospedale San Carlo'));
check(
  'B: nessuna valutazione inventata in vista',
  !/\b(Vigile|Autonomo|Orientato|Buone)\b/.test(textB),
);
await page.screenshot({ path: `${DIR}/screenshots/B-cartella-senza-presa-in-carico.png` });

// C — Modifica della sola card "Dati di ingresso"
await page.getByRole('button', { name: 'Modifica', exact: true }).first().click();
await page.waitForTimeout(300);
const editSelects = await page
  .locator('.pic-edit-form select')
  .evaluateAll((els) => els.map((e) => e.value));
check(
  'C: menu del modulo partono da "— Seleziona —"',
  editSelects.length > 0 && editSelects.every((v) => v === ''),
  JSON.stringify(editSelects),
);
await page.screenshot({ path: `${DIR}/screenshots/C-modifica-dati-di-ingresso.png` });
await page.locator('.pic-edit-form textarea').first().fill('Riabilitazione dopo frattura');
await page.getByRole('button', { name: /Salva/ }).first().click();
await page.waitForTimeout(600);
const sent = puts.at(-1)?.data?.presaInCarico;
check('C: PUT inviato con presaInCarico', !!sent);
check(
  'C: il motivo scritto è nel payload',
  sent?.motivoIngresso === 'Riabilitazione dopo frattura',
);
const leaked = CLINICAL.filter((k) => sent && k in sent && sent[k] !== '' && sent[k] !== undefined);
check(
  'C: nessuna valutazione clinica inventata nel payload',
  sent && leaked.length === 0,
  `campi clinici valorizzati: ${JSON.stringify(leaked)}`,
);
check(
  'C: il payload contiene solo campi della card + compilatoAt',
  sent &&
    Object.keys(sent).every((k) =>
      [
        'dataIngresso',
        'oraIngresso',
        'provenienza',
        'centroInviante',
        'modalitaIngresso',
        'accompagnatoDa',
        'motivoIngresso',
        'operatoreResponsabile',
        'camera',
        'letto',
        'compilatoAt',
      ].includes(k),
    ),
  JSON.stringify(Object.keys(sent ?? {})),
);

// D — menu inline vuoto (Orientamento) su B, dopo una nuova apertura
await openPresaInCarico(b);
await page.getByText('Orientamento').first().click();
await page.waitForTimeout(300);
const inline = await page
  .locator('select.inline-edit__input')
  .first()
  .evaluate((el) => ({ value: el.value, shown: el.options[el.selectedIndex]?.text }));
check(
  'D: menu inline vuoto mostra "— Seleziona —"',
  inline.value === '' && /Seleziona/.test(inline.shown ?? ''),
  JSON.stringify(inline),
);
await page.screenshot({ path: `${DIR}/screenshots/D-menu-inline-vuoto.png` });

// E — salvare un menu inline vuoto non scrive nulla; una scelta esplicita sì (paziente B)
await page.keyboard.press('Escape');
for (const label of ['Dolore', 'Orientamento']) {
  const before = puts.length;
  await page.locator('.inline-edit, .inline-edit-block, .cr-form-section > *').filter({ hasText: label }).first().click();
  await page.waitForTimeout(200);
  await page.locator('select.inline-edit__input').first().press('Enter');
  await page.waitForTimeout(500);
  check(`E: ${label} salvato senza scelta non invia nulla`, puts.length === before, `PUT inviati: ${puts.length - before}`);
}
{
  const before = puts.length;
  await page.getByText('Orientamento').first().click();
  await page.waitForTimeout(200);
  const sel = page.locator('select.inline-edit__input').first();
  await sel.selectOption('orientato');
  await sel.press('Enter');
  await page.waitForTimeout(600);
  const sentE = puts.at(-1)?.data?.presaInCarico;
  check('E: scelta esplicita (Orientato) salvata', puts.length === before + 1 && sentE?.orientamento === 'orientato');
  check('E: la scelta esplicita non trascina altre valutazioni', sentE && !sentE.dolore && !sentE.statoCoscienza && !sentE.autonomia, JSON.stringify(Object.keys(sentE ?? {})));
}

await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
process.exit(log.some((l) => l.startsWith('FAIL')) ? 1 : 0);
