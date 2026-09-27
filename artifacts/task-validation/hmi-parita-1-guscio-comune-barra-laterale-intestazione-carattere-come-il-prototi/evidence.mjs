// Evidenza browser: guscio HMI 1 (barra laterale, intestazione, titolo pagina, carattere).
//   BASE=http://localhost:4173 node <questo file>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR =
  'artifacts/task-validation/hmi-parita-1-guscio-comune-barra-laterale-intestazione-carattere-come-il-prototi';
mkdirSync(`${DIR}/screenshots`, { recursive: true });
mkdirSync(`${DIR}/logs`, { recursive: true });
const BASE = process.env.BASE ?? 'http://localhost:4173';
const log = [];
const check = (n, ok, d = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);
const browser = await chromium.launch();

async function login(width, height = 820) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.locator('.compact-topbar').waitFor();
  await page.waitForTimeout(1500);
  return page;
}
const box = (page, sel) =>
  page
    .locator(sel)
    .first()
    .evaluate((e) => {
      const r = e.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    });

// AC1: misure e ordine a 1180 × 820
{
  const page = await login(1180);
  const labels = await page.locator('.teams-sidebar__item-label').allInnerTexts();
  check(
    'AC1 ordine voci: Turno, Pazienti, Terapia, Parametri, Consegne, Agenda, Note, Farmaci, Assistente',
    labels.join(',') === 'Turno,Pazienti,Terapia,Parametri,Consegne,Agenda,Note,Farmaci,Assistente',
    labels.join(','),
  );
  const assistenteInFondo = await page
    .locator('.teams-sidebar__footer .teams-sidebar__item-label')
    .innerText();
  check('AC1 Assistente separato in fondo', assistenteInFondo === 'Assistente');
  const m = {
    rail: await box(page, '.teams-sidebar'),
    item: await box(page, '.teams-sidebar__item'),
    logo: await box(page, '.teams-sidebar__brand-dot'),
    header: await box(page, '.compact-topbar'),
    search: await box(page, '.topbar-search'),
    avatar: await box(page, '.topbar-avatar'),
  };
  check(
    'AC1 misure: barra 96, voce 80×64, logo 48, intestazione 72, ricerca e avatar 48',
    m.rail.w === 96 &&
      m.item.w === 80 &&
      m.item.h === 64 &&
      m.logo.w === 48 &&
      m.logo.h === 48 &&
      m.header.h === 72 &&
      m.search.w === 48 &&
      m.search.h === 48 &&
      m.avatar.w === 48 &&
      m.avatar.h === 48,
    JSON.stringify(m),
  );
  const font = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  check('AC1 carattere Inter', /^"?Inter"?/.test(font), font);
  const clock = await page.locator('.topbar-clock').innerText();
  check(
    'AC1 turno e ora al centro',
    /^Turno (mattino|pomeriggio|notte)\s+\d{2}:\d{2}$/.test(clock.replace(/\n/g, ' ')),
    clock.replace(/\n/g, ' '),
  );
  await page.screenshot({ path: `${DIR}/screenshots/turno-1180.png` });

  // AC2: titolo in intestazione, niente breadcrumb nel contenuto, azioni presenti
  const pages = [
    ['Turno', 'operator-dashboard'],
    ['Pazienti', 'pazienti'],
    ['Terapia', 'terapie'],
    ['Parametri', 'parametri'],
    ['Consegne', 'consegne'],
    ['Agenda', 'agenda'],
    ['Note', 'note'],
    ['Farmaci', 'farmaci'],
  ];
  for (const [label, slug] of pages) {
    await page.locator(`.teams-sidebar__item[title="${label}"]`).click();
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => ({
      title:
        document.querySelector('.topbar-title .page-header__title')?.textContent?.trim() ?? null,
      contentTitles: document.querySelectorAll('.page-content .page-header__title').length,
      crumbs: document.querySelectorAll('.page-content .page-header__breadcrumb').length,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    check(
      `AC2 ${label}: titolo nell'intestazione, nessun breadcrumb né secondo titolo nel contenuto`,
      !!r.title && r.contentTitles === 0 && r.crumbs === 0 && r.overflow <= 0,
      JSON.stringify(r),
    );
    await page.screenshot({ path: `${DIR}/screenshots/${slug}-1180.png` });
  }
  // azione di pagina ancora presente
  await page.locator('.teams-sidebar__item[title="Pazienti"]').click();
  await page.waitForTimeout(1200);
  // Dal ciclo 4 il pulsante della lista si chiama "Nuovo ingresso" (apre la stessa scelta).
  await page.getByRole('button', { name: /^(Nuovo ingresso|Nuovo paziente)$/ }).first().click();
  const chooser = await page.getByRole('dialog', { name: 'Nuovo paziente' }).count();
  check('AC2 le azioni della pagina restano (Nuovo paziente apre la scelta)', chooser > 0);
  await page.keyboard.press('Escape');

  // AC3: indietro, ricerca, esci
  const back = page.locator('.topbar-back');
  const backLabel = await back.getAttribute('aria-label');
  const backBox = await box(page, '.topbar-back');
  check(
    'AC3 freccia indietro 48×48 con aria-label "Indietro: <destinazione>"',
    /^Indietro: .+/.test(backLabel ?? '') && backBox.w === 48 && backBox.h === 48,
    `${backLabel} ${JSON.stringify(backBox)}`,
  );
  await back.click();
  await page.waitForTimeout(1200);
  const afterBack = await page
    .locator('.topbar-title .page-header__title')
    .innerText()
    .catch(() => '');
  check(
    'AC3 la freccia torna alla pagina precedente',
    afterBack.length > 0 && afterBack !== 'Pazienti',
    afterBack,
  );
  await page.locator('.topbar-search').click();
  const searchOpen = await page.locator('.search-overlay').count();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(300);
  const searchByKey = await page.locator('.search-overlay').count();
  await page.keyboard.press('Escape');
  check('AC3 ricerca: clic e Ctrl+K aprono la ricerca globale', searchOpen > 0 && searchByKey > 0);
  await page.locator('.topbar-avatar').click();
  const menu = await page.locator('.topbar-user-menu__panel').innerText();
  await page.screenshot({ path: `${DIR}/screenshots/menu-utente.png` });
  await page.locator('.topbar-user-menu__logout').click();
  await page.waitForTimeout(800);
  const loggedOut = await page.getByText('Operatore', { exact: true }).count();
  check(
    'AC3 avatar apre il menu con nome, ruolo ed Esci; Esci torna al login',
    /Operatore/.test(menu) && /Esci/.test(menu) && loggedOut > 0,
    menu.replace(/\n/g, ' | '),
  );
  await page.close();
}

// AC4: larghezze e drawer mobile
for (const width of [390, 768, 1024, 1180, 1440]) {
  const page = await login(width);
  if (width < 1024) {
    await page.getByRole('button', { name: 'Apri menu' }).click();
    await page.waitForTimeout(300);
    await page.locator('.teams-sidebar__item[title="Pazienti"]').click();
    await page.waitForTimeout(1200);
  }
  const r = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    topbarRight: Math.round(
      document.querySelector('.compact-topbar').getBoundingClientRect().right,
    ),
    title: document.querySelector('.topbar-title .page-header__title')?.textContent?.trim() ?? null,
  }));
  check(
    `AC4 ${width}: nessuno scorrimento orizzontale${width < 1024 ? ', drawer con hamburger funzionante' : ''}`,
    r.overflow <= 0 && r.topbarRight <= width && (width >= 1024 || r.title === 'Pazienti'),
    JSON.stringify(r),
  );
  await page.screenshot({ path: `${DIR}/screenshots/larghezza-${width}.png` });
  await page.close();
}

await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
process.exit(log.some((l) => l.startsWith('FAIL')) ? 1 : 0);
