// Evidenza browser della freccia "indietro" globale.
// Percorso: Dashboard → Pazienti → A → A·Contatti → A·Clinica(Diagnosi) → Pazienti → B,
// poi indietro passo per passo con la freccia della barra superiore (e una volta col tasto del
// browser), verificando etichetta, paziente, sezione e che l'URL non contenga nomi.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const DIR = 'artifacts/task-validation/navigazione-freccia-indietro-globale-che-ripristina-contesto-paziente-e-sezione';
const BASE = process.env.BASE ?? 'http://localhost:4173';
const roster = await (await fetch('http://localhost:3001/patients/page?limit=12')).json();
const A = roster.items[0];
const B = roster.items.find((p) => p.lastName !== A.lastName) ?? roster.items[1];
const nameA = `${A.lastName}, ${A.firstName}`;
const nameB = `${B.lastName}, ${B.firstName}`;
const log = [];
const check = (name, ok, detail = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const back = () => page.locator('.topbar-back');
const backLabel = async () => ((await back().count()) ? (await back().innerText()).trim() : null);
const header = async () => ((await page.locator('.patient-compact-header').count()) ? (await page.locator('.patient-compact-header').first().innerText()) : '');
const selectedTabs = async () => (await page.getByRole('tab', { selected: true }).allInnerTexts()).map((t) => t.trim().replace(/\d+$/, '').trim());
const settle = () => page.waitForTimeout(700);
async function openPatient(p) {
  await page.getByRole('button', { name: 'Pazienti' }).first().click();
  await page.getByPlaceholder(/Cerca per nome/).first().fill(p.lastName);
  await page.waitForTimeout(600);
  await page.getByText(`${p.lastName}, ${p.firstName}`).first().click();
  await page.locator('.patient-compact-header', { hasText: `${p.lastName}, ${p.firstName}` }).first().waitFor();
  await settle();
}

await page.goto(BASE);
await page.getByText('Operatore', { exact: true }).first().click();
await settle();
check('0: sulla prima pagina non c\'è nulla a cui tornare', (await backLabel()) === null);

await openPatient(A);
check('1: aperto A, la freccia porta a Pazienti', (await backLabel()) === 'Pazienti', String(await backLabel()));
await page.getByRole('tab', { name: /^Contatti$/ }).first().click();
await settle();
check('2: su A·Contatti la freccia porta ad A (Anagrafica)', (await backLabel()) === nameA, String(await backLabel()));
await page.getByRole('tab', { name: /^Clinica/ }).first().click();
await settle();
check('3: su A·Clinica la freccia porta ad A·Contatti', (await backLabel()) === `${nameA} · Contatti`, String(await backLabel()));
await page.screenshot({ path: `${DIR}/screenshots/1-freccia-su-sezione.png` });
await openPatient(B);
check('4: aperto B, la freccia porta a Pazienti', (await backLabel()) === 'Pazienti', String(await backLabel()));
const urlB = page.url();
check('privacy: l\'URL contiene solo l\'id, non il nome', urlB.includes(B.id) && !urlB.includes(B.lastName) && !urlB.includes(encodeURIComponent(B.lastName)), urlB.replace(/^https?:\/\/[^/]+/, ''));
await page.screenshot({ path: `${DIR}/screenshots/2-paziente-B.png` });

await back().click(); await settle();
check('5: indietro → lista Pazienti', (await header()) === '' && (await page.getByPlaceholder(/Cerca per nome/).count()) > 0);
check('5: la freccia ora porta ad A·Clinica', (await backLabel())?.startsWith(`${nameA} · `), String(await backLabel()));
await back().click(); await settle();
check('6: indietro → paziente A (non B)', (await header()).includes(nameA) && !(await header()).includes(nameB));
check('6: sezione ripristinata (Clinica)', (await selectedTabs()).some((t) => t.startsWith('Clinica')), JSON.stringify(await selectedTabs()));
await page.screenshot({ path: `${DIR}/screenshots/3-tornato-su-A-clinica.png` });
await page.goBack(); await settle();
check('7: tasto indietro del browser → A·Contatti', (await header()).includes(nameA) && (await selectedTabs()).includes('Contatti'), JSON.stringify(await selectedTabs()));
await back().click(); await settle();
check('8: indietro → A·Anagrafica', (await header()).includes(nameA) && (await selectedTabs()).includes('Anagrafica'), JSON.stringify(await selectedTabs()));
await back().click(); await settle();
check('9: indietro → Pazienti', (await header()) === '' && (await page.getByPlaceholder(/Cerca per nome/).count()) > 0);
await back().click(); await settle();
check('10: indietro → Dashboard, niente più freccia', (await backLabel()) === null, String(await backLabel()));

// ── R: corsa. Letture paziente lente (1500 ms); cronologia A, B, A, B; due "indietro" a 150 ms.
// Il secondo porta a B (già a schermo): la lettura di A partita col primo non deve sovrascriverlo.
{
  const p2 = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await p2.route(/\/patients\/[^/?]+$/, async (route) => {
    if (route.request().method() === 'GET' && !/\/patients\/(page|settings)$/.test(route.request().url()))
      await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  // Ricerca globale della barra superiore: A↔B diretti, senza la lista in mezzo (come in reparto).
  const open2 = async (p) => {
    await p2.locator('.topbar-search').click();
    await p2.locator('.search-modal__input').fill(p.lastName);
    await p2.waitForTimeout(800);
    await p2.locator('.search-modal__results button', { hasText: `${p.lastName}, ${p.firstName}` }).first().click()
      .catch(async () => p2.locator('.search-modal__results button', { hasText: p.firstName }).first().click());
    await p2.locator('.patient-compact-header', { hasText: `${p.lastName}, ${p.firstName}` }).first().waitFor({ timeout: 15000 });
    await p2.waitForTimeout(500);
  };

  await p2.goto(BASE);
  await p2.getByText('Operatore', { exact: true }).first().click();
  for (const p of [A, B, A, B]) await open2(p);
  const hist = await p2.evaluate(() => history.state);
  check('R: cronologia diretta A↔B (voce precedente = paziente, non la lista)', (hist?.prevLabel ?? '').includes(','), String(hist?.prevLabel));
  await p2.locator('.topbar-back').click();
  await p2.waitForTimeout(150);
  await p2.locator('.topbar-back').click();
  await p2.waitForTimeout(4000);
  const url = p2.url();
  const shown = await p2.locator('.patient-compact-header').first().innerText().catch(() => '');
  const urlId = (url.match(/dettaglio-paziente\/([^/?#]+)/) ?? [])[1];
  const expected = urlId === A.id ? nameA : urlId === B.id ? nameB : '';
  const other = expected === nameA ? nameB : nameA;
  check(
    'R: dopo due "indietro" rapidi la cartella mostra il paziente dell URL',
    !!expected && shown.includes(expected) && !shown.includes(other),
    `url=${urlId} atteso=${expected}`,
  );
  await p2.screenshot({ path: `${DIR}/screenshots/4-corsa-due-indietro.png` });
  await p2.close();
}

// ── L: ricarica su A·Diagnosi → sezione, freccia e passi di sezione restano.
{
  const p3 = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await p3.goto(BASE);
  await p3.getByText('Operatore', { exact: true }).first().click();
  await p3.getByRole('button', { name: 'Pazienti' }).first().click();
  await p3.getByPlaceholder(/Cerca per nome/).first().fill(A.lastName);
  await p3.waitForTimeout(600);
  await p3.getByText(nameA).first().click();
  await p3.locator('.patient-compact-header', { hasText: nameA }).first().waitFor();
  await p3.getByRole('tab', { name: /^Clinica/ }).first().click();
  await p3.waitForTimeout(700);
  await p3.reload();
  await p3.getByText('Operatore', { exact: true }).first().click().catch(() => {});
  await p3.locator('.patient-compact-header', { hasText: nameA }).first().waitFor({ timeout: 15000 });
  await p3.waitForTimeout(1200);
  const tabs = (await p3.getByRole('tab', { selected: true }).allInnerTexts()).map((t) => t.trim().replace(/\d+$/, '').trim());
  check('L: dopo la ricarica la sezione è ripristinata (Diagnosi)', tabs.includes('Diagnosi'), JSON.stringify(tabs));
  const lbl = (await p3.locator('.topbar-back').count()) ? (await p3.locator('.topbar-back').innerText()).trim() : null;
  check('L: dopo la ricarica la freccia resta', !!lbl, String(lbl));
  const before = await p3.evaluate(() => history.length);
  await p3.getByRole('tab', { name: /^Documenti/ }).first().click();
  await p3.waitForTimeout(700);
  check('L: dopo la ricarica un cambio di sezione è ancora un passo', (await p3.evaluate(() => history.length)) === before + 1);
  await p3.close();
}

// ── D: "indietro" mentre la cartella sta ancora arrivando (2 s). Non deve restare vuota.
{
  const p4 = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await p4.goto(BASE);
  await p4.getByText('Operatore', { exact: true }).first().click();
  await p4.route(/\/patients\/[^/]+\/cartella$/, async (route) => {
    if (route.request().method() === 'GET') await new Promise((r) => setTimeout(r, 2000));
    await route.continue();
  });
  await p4.locator('.topbar-search').click();
  await p4.locator('.search-modal__input').fill(A.lastName);
  await p4.waitForTimeout(800);
  await p4.locator('.search-modal__results button', { hasText: nameA }).first().click();
  await p4.locator('.patient-compact-header', { hasText: nameA }).first().waitFor();
  await p4.getByRole('tab', { name: /^Contatti$/ }).first().click().catch(() => {});
  await p4.waitForTimeout(150);
  await p4.locator('.topbar-back').click();
  await p4.waitForTimeout(5000);
  await p4.getByRole('tab', { name: /^Clinica/ }).first().click();
  await p4.waitForTimeout(1500);
  const body = await p4.locator('main, .main-area-clean').first().innerText();
  check('D: "indietro" durante il caricamento non lascia la cartella vuota', !/Nessuna diagnosi registrata/i.test(body) && /Ipertensione arteriosa/i.test(body));
  await p4.screenshot({ path: `${DIR}/screenshots/5-indietro-durante-caricamento.png` });
  await p4.close();
}

// ── H: ricarica su B, lettura di B lenta (2500 ms), "indietro" subito → deve restare A.
{
  const p5 = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await p5.goto(BASE);
  await p5.getByText('Operatore', { exact: true }).first().click();
  for (const p of [A, B]) {
    await p5.locator('.topbar-search').click();
    await p5.locator('.search-modal__input').fill(p.lastName);
    await p5.waitForTimeout(800);
    await p5.locator('.search-modal__results button', { hasText: `${p.lastName}, ${p.firstName}` }).first().click();
    await p5.locator('.patient-compact-header', { hasText: `${p.lastName}, ${p.firstName}` }).first().waitFor();
    await p5.waitForTimeout(500);
  }
  await p5.route(new RegExp(`/patients/${B.id}$`), async (route) => {
    await new Promise((r) => setTimeout(r, 2500));
    await route.continue();
  });
  await p5.reload();
  await p5.getByText('Operatore', { exact: true }).first().click().catch(() => {});
  await p5.waitForTimeout(400);
  await p5.goBack();
  await p5.waitForTimeout(5000);
  const urlId = (p5.url().match(/dettaglio-paziente\/([^/?#]+)/) ?? [])[1];
  const shown = await p5.locator('.patient-compact-header').first().innerText().catch(() => '');
  check('H: "indietro" durante la ricarica lenta mostra il paziente dell URL', urlId === A.id && shown.includes(nameA) && !shown.includes(nameB), `url=${urlId}`);
  await p5.screenshot({ path: `${DIR}/screenshots/6-indietro-durante-ricarica.png` });
  await p5.close();
}

await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
process.exit(log.some((l) => l.startsWith('FAIL')) ? 1 : 0);
