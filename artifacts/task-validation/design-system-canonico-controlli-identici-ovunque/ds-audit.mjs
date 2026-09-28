// Audit "paranoico" del design system: misura lo stile calcolato di ogni controllo su ogni pagina,
// a più larghezze, e fallisce se due controlli dello stesso tipo differiscono, se un pulsante è fuori
// dal design system o se una pagina scorre in orizzontale.
//   BASE=http://localhost:4173 node <questo file>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR = 'artifacts/task-validation/design-system-canonico-controlli-identici-ovunque';
mkdirSync(`${DIR}/screenshots`, { recursive: true });
mkdirSync(`${DIR}/logs`, { recursive: true });
const BASE = process.env.BASE ?? 'http://localhost:4173';
const WIDTHS = (process.env.WIDTHS ?? '390,768,1180').split(',').map(Number);
const log = [];
const check = (n, ok, d = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);

// Componenti con forma propria (non sono chip né pulsanti d'azione): dichiarati qui, con motivo.
const COMPONENTS = [
  '.teams-sidebar', // navigazione L1
  '.compact-topbar', // intestazione
  '.top-nav', // schede di sezione (componente unico TopNav)
  '.par-pad', // tastierino numerico
  '.par-plist', // righe-paziente selezionabili
  '.handover-rounds__roster', // righe-paziente selezionabili
  '.patient-roster', // righe della tabella pazienti
  '.agt-col-hdr', // intestazioni di colonna dell'agenda admin (scelgono l'operatore)
  '.agt-slot', // fasce orarie dell'agenda (cella cliccabile)
  '.agt-week-grid',
  '.agt-month-grid',
  '.giro-rows', // righe del giro terapia (contengono solo pulsanti canonici)
  '.turno-pcard', // card paziente del turno
  '.adesso-queue__row',
  '.nm-list',
  '.ricerca-farmaco__lista',
  '.inline-edit', // campi modificabili in linea
  '.inline-edit-block__value',
  '.dashboard-kpi-card', // card KPI
  '.dashboard-notification-compact',
  '.cr-alert-strip', // strisce d'allarme della cartella
  '.cdt__sort-btn', // intestazioni ordinabili delle tabelle
  '.table-filters__toggle', // apertura del pannello filtri tabella
  '.ai-fab', // pulsante dell'assistente (da sostituire col pannello)
  '.news2-chip', // chip di stato NEWS2
  '.exp-card__head',
  '.modal-overlay .icon-btn',
  '.new-patient-chooser__option', // grandi card di scelta (Da documenti / A mano)
  '.app-toast', // notifiche temporanee
  '.clinical-card__toggle', // apertura/chiusura delle card cliniche espandibili
  '.inline-edit-row', // righe modificabili in linea
  '.farmaco-non-trovato', // stato "non in anagrafica" che apre la ricerca farmaco
  '.patient-archive-tree', // albero delle cartelle documenti
  '.tcal__table', // celle del calendario terapia (componente di griglia)
  '.nps-option', // card di scelta della pagina Nuovo ingresso
].join(', ');
const CANONICAL =
  '.ds-chip, .ds-btn, .ds-link, .ds-icon-btn, .filter-chip, .agt-filter-chip, .agt-view-btn, .btn-primary, .btn-success, .btn-secondary, .btn-ghost, .btn-ghost-outline, .btn-sm, .btn-danger, .icon-btn, .link-btn, .btn-link, .search-clear-btn, .dashboard-notification-chip';

const browser = await chromium.launch();

async function collect(page, where) {
  return page.evaluate(
    ({ where, COMPONENTS, CANONICAL }) => {
      const vis = (el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
      };
      const sig = (el, active) => {
        const cs = getComputedStyle(el);
        const base = [
          cs.height,
          cs.borderTopLeftRadius,
          cs.borderTopWidth,
          cs.fontSize,
          cs.fontFamily.split(',')[0],
        ];
        return (
          active
            ? [...base, cs.backgroundColor, cs.color, cs.borderTopColor, cs.fontWeight]
            : [...base, cs.backgroundColor, cs.color, cs.fontWeight]
        ).join(' | ');
      };
      const out = [];
      const add = (cat, el, active) =>
        out.push({
          where,
          cat,
          sig: sig(el, active),
          text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30),
        });
      const isActive = (el) =>
        ['aria-pressed', 'aria-selected'].some((a) => el.getAttribute(a) === 'true') ||
        el.classList.contains('active') ||
        el.classList.contains('is-active') ||
        el.classList.contains('is-on');
      for (const el of [
        ...document.querySelectorAll(
          '.ds-chip, .filter-chip, .agt-filter-chip, .agt-view-btn, .dashboard-notification-chip',
        ),
      ].filter(vis)) {
        const active = isActive(el);
        const open = el.getAttribute('aria-expanded') === 'true';
        add(active ? 'chip-attiva' : open ? 'chip-aperta' : 'chip', el, active || open);
      }
      const enabled = (sel) =>
        [...document.querySelectorAll(sel)].filter(vis).filter((el) => !el.disabled);
      for (const el of enabled('.ds-btn--primary, .btn-primary, .btn-success'))
        add('primario', el, false);
      for (const el of enabled(
        '.ds-btn--secondary, .btn-secondary, .btn-ghost, .btn-ghost-outline, .btn-sm:not(.btn-primary):not(.btn-success):not(.btn-danger):not(.btn-secondary)',
      ))
        add('secondario', el, false);
      for (const el of enabled('.ds-btn--danger, .btn-danger')) add('distruttivo', el, false);
      for (const el of enabled('.ds-icon-btn, .icon-btn').filter(
        (e) => !e.matches('.icon-btn--danger, .ds-icon-btn--danger'),
      ))
        add('icona', el, false);
      for (const el of enabled('.ds-link, .btn-link')) add('link-azione', el, false);
      // campi: altezza (non per textarea), bordo, raggio, carattere
      for (const el of [
        ...document.querySelectorAll(
          'input.form-input, select.form-input, select.form-select, .ds-date-nav__input',
        ),
      ].filter(vis))
        out.push({
          where,
          cat: 'campo',
          sig: (() => {
            const cs = getComputedStyle(el);
            return [cs.height, cs.borderTopWidth, cs.borderTopLeftRadius, cs.fontSize].join(' | ');
          })(),
          text: el.getAttribute('aria-label') || el.type,
        });
      // link nel testo: colore e peso
      for (const el of [...document.querySelectorAll('.link-btn')].filter(vis))
        out.push({
          where,
          cat: 'link-testo',
          sig: (() => {
            const cs = getComputedStyle(el);
            return [cs.color, cs.fontWeight, cs.textDecorationLine].join(' | ');
          })(),
          text: el.textContent.trim().slice(0, 30),
        });
      // chip senza stato dichiarato
      const stateless = [
        ...document.querySelectorAll('.ds-chip, .filter-chip, .agt-filter-chip, .agt-view-btn'),
      ]
        .filter(vis)
        .filter(
          (el) =>
            ![
              'aria-pressed',
              'aria-selected',
              'aria-expanded',
              'aria-haspopup',
              'aria-current',
            ].some((a) => el.hasAttribute(a)),
        )
        .map((el) => `«${el.textContent.trim().slice(0, 20)}»`);
      // pulsanti fuori dal design system e dai componenti dichiarati
      const other = [...document.querySelectorAll('button, a[role="button"]')]
        .filter(vis)
        .filter((el) => !el.matches(CANONICAL) && !el.closest(COMPONENTS))
        .map(
          (el) =>
            `${el.className || '(nessuna classe)'} «${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 22)}»`,
        );
      const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      // controlli tagliati: fuori dallo schermo e non dentro un contenitore che scorre (tabelle)
      const scrolls = (el) => {
        for (let p = el.parentElement; p; p = p.parentElement) {
          const o = getComputedStyle(p).overflowX;
          if ((o === 'auto' || o === 'scroll') && p.scrollWidth > p.clientWidth) return true;
        }
        return false;
      };
      const clipped = [...document.querySelectorAll(CANONICAL)]
        .filter(vis)
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return (r.left < -1 || r.right > innerWidth + 1) && !scrolls(el);
        })
        .map((el) => `«${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 20)}» ${Math.round(el.getBoundingClientRect().left)}→${Math.round(el.getBoundingClientRect().right)}`);
      return { controls: out, stateless, other, overflow, clipped };
    },
    { where, COMPONENTS, CANONICAL },
  );
}

async function login(width, role = 'Operatore') {
  const page = await browser.newPage({ viewport: { width, height: 820 } });
  page.on('dialog', (d) => d.dismiss());
  await page.goto(BASE);
  await page.getByText(role, { exact: true }).first().click();
  await page.waitForTimeout(1200);
  return page;
}
async function go(page, title, width) {
  if (width < 1024) await page.getByRole('button', { name: 'Apri menu' }).click();
  await page.locator(`.teams-sidebar__item[title="${title}"]`).click();
  await page.waitForTimeout(2000);
}

const all = [];
const others = [];
const stateless = [];
const overflows = [];
const clippedAll = [];
let pages = 0;
async function snap(page, name, width) {
  // Il puntatore fuori dalla pagina: nessuno stato :hover residuo altera la misura.
  await page.mouse.move(0, 0);
  await page.waitForTimeout(150);
  const r = await collect(page, `${name}@${width}`);
  pages++;
  all.push(...r.controls);
  if (r.other.length) others.push(`${name}@${width} (${r.other.length}): ${r.other.join(', ')}`);
  if (r.stateless.length) stateless.push(`${name}@${width}: ${r.stateless.join(', ')}`);
  if (r.overflow > 0) overflows.push(`${name}@${width}: ${r.overflow}px`);
  if (r.clipped.length) clippedAll.push(`${name}@${width}: ${r.clipped.join(', ')}`);
  await page.screenshot({ path: `${DIR}/screenshots/${name}-${width}.png` });
}

for (const width of WIDTHS) {
  const page = await login(width);
  await snap(page, 'turno', width);
  await go(page, 'Pazienti', width);
  await page
    .getByRole('button', { name: /^Filtri e ordine/ })
    .click()
    .catch(() => {});
  await page.waitForTimeout(500);
  await snap(page, 'pazienti', width);
  await page
    .getByRole('button', { name: 'Nuovo ingresso' })
    .first()
    .click()
    .catch(() => {});
  await page.waitForTimeout(900);
  await snap(page, 'nuovo-ingresso-scelta', width);
  await page.locator('.nps-option').last().click().catch(() => {});
  await page.waitForTimeout(1200);
  await snap(page, 'intake-manuale', width);
  await page.keyboard.press('Escape');
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.waitForTimeout(1000);
  for (const [title, name] of [
    ['Terapia', 'terapia'],
    ['Parametri', 'parametri'],
    ['Consegne', 'consegne-giro'],
  ]) {
    await go(page, title, width);
    await snap(page, name, width);
  }
  await go(page, 'Terapia', width);
  await page.getByRole('button', { name: /Calendario/ }).click();
  await page.waitForTimeout(2000);
  await snap(page, 'terapia-calendario', width);
  await go(page, 'Consegne', width);
  await page.getByRole('button', { name: 'Feed consegne' }).click();
  await page.waitForTimeout(1500);
  await snap(page, 'consegne-feed', width);
  await go(page, 'Agenda', width);
  await snap(page, 'agenda-giorno', width);
  for (const v of ['Settimana', 'Mese']) {
    await page.getByRole('button', { name: v, exact: true }).click();
    await page.waitForTimeout(900);
    await snap(page, `agenda-${v.toLowerCase()}`, width);
  }
  await go(page, 'Note', width);
  await snap(page, 'note', width);
  await go(page, 'Farmaci', width);
  await snap(page, 'farmaci', width);
  // cartella: ogni sezione della barra
  await go(page, 'Pazienti', width);
  await page.locator('.patient-roster__who:visible, .patient-roster__card:visible, .patient-card .ds-btn:visible').first().click();
  await page.waitForTimeout(2500);
  const tabs = await page.locator('.chart-sections .top-nav__item').allTextContents();
  for (let i = 0; i < tabs.length; i++) {
    await page.locator('.chart-sections .top-nav__item').nth(i).click();
    await page.waitForTimeout(1500);
    await snap(
      page,
      `cartella-${tabs[i].replace(/\d+/g, '').trim().toLowerCase().replace(/\W+/g, '-')}`,
      width,
    );
  }
  // moduli di cartella (intestazioni dense) e modale Invio PS
  const moduli = page.locator('.chart-sections .top-nav__item', { hasText: 'Moduli' });
  if (await moduli.count()) {
    for (const nome of ['Contenzioni', 'Medicazioni']) {
      await moduli.click();
      await page.waitForTimeout(1200);
      const open = page.getByRole('button', { name: new RegExp(nome) }).first();
      if (await open.count()) {
        await open.click().catch(() => {});
        await page.waitForTimeout(1500);
        await snap(page, `modulo-${nome.toLowerCase()}`, width);
      }
    }
  }
  const ps = page.getByRole('button', { name: /^Invio in (PS|Pronto Soccorso)$/ }).first();
  if (await ps.count()) {
    await ps.click().catch(() => {});
    await page.waitForTimeout(1500);
    await snap(page, 'modale-invio-ps', width);
    await page.keyboard.press('Escape');
  }
  await page.close();

  const admin = await login(width, 'Amministratore');
  await snap(admin, 'admin-home', width);
  for (const t of ['Operatori', 'Agenda', 'Terapia', 'Posti Letto', 'Orari', 'Consegne', 'Note']) {
    if (width < 1024) await admin.getByRole('button', { name: 'Apri menu' }).click();
    const item = admin.locator(`.teams-sidebar__item[title="${t}"]`);
    if ((await item.count()) === 0) {
      await admin.keyboard.press('Escape');
      continue;
    }
    await item.click();
    await admin.waitForTimeout(2000);
    await snap(admin, `admin-${t.toLowerCase().replace(/\s+/g, '-')}`, width);
  }
  await admin.close();
}

const byCat = {};
for (const c of all)
  (byCat[c.cat] ??= new Map()).set(c.sig, [
    ...(byCat[c.cat].get(c.sig) ?? []),
    `${c.where}:«${c.text}»`,
  ]);
for (const [cat, map] of Object.entries(byCat)) {
  const detail = [...map.entries()]
    .map(
      ([sig, where]) => `\n    [${where.length}] ${sig}\n      es. ${where.slice(0, 4).join(', ')}`,
    )
    .join('');
  check(
    `AC1 ${cat}: una sola firma di stile su tutte le pagine e larghezze (${[...map.values()].flat().length} controlli)`,
    map.size === 1,
    map.size === 1 ? [...map.keys()][0] : detail,
  );
}
check(
  `AC1 ogni chip dichiara il suo stato (${pages} stati pagina)`,
  stateless.length === 0,
  stateless.join(' || '),
);
check(
  'AC1 nessun pulsante fuori dal design system o dai componenti dichiarati',
  others.length === 0,
  others.join(' || '),
);
check(
  `AC4 nessuno scorrimento orizzontale (${WIDTHS.join(', ')} px)`,
  overflows.length === 0,
  overflows.join(', '),
);
check(`AC4 nessun controllo tagliato fuori dallo schermo (${WIDTHS.join(', ')} px)`, clippedAll.length === 0, clippedAll.join(' || '));

writeFileSync(`${DIR}/logs/ds-audit-altri-pulsanti.txt`, others.join('\n') + '\n');
await browser.close();
writeFileSync(`${DIR}/logs/ds-audit.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
console.log(
  `${log.filter((l) => l.startsWith('PASS')).length}/${log.length} PASS · ${pages} stati pagina`,
);
