// Evidenza browser: controlli con forma propria portati ai canonici del design system.
// Stub :3001; rilevazioni NEWS2 simulate con page.route per avere tutti i toni clinici.
//   BASE=http://localhost:4184 node <questo file>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR =
  'artifacts/task-validation/design-system-controlli-con-forma-propria-portati-ai-canonici';
mkdirSync(`${DIR}/screenshots`, { recursive: true });
mkdirSync(`${DIR}/logs`, { recursive: true });
const BASE = process.env.BASE ?? 'http://localhost:4184';
const log = [];
const check = (n, ok, d = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);

const roster = await (await fetch('http://localhost:3001/patients/page?limit=50')).json();
// Pazienti ricoverati (la vista predefinita della lista è 'Ricoverati'): uno per tono.
const byName = (last, first) => roster.items.find((p) => p.lastName === last && p.firstName === first);
const P = [
  byName('Moretti', 'Davide'),
  byName('Moretti', 'Luca'),
  byName('Moretti', 'Marco'),
  byName('Moretti', 'Matteo'),
  byName('Rossi', 'Anna'),
  byName('Rossi', 'Chiara'),
];
if (P.some((p) => !p)) throw new Error('pazienti dello stub cambiati');
const full = {
  fr: '16',
  spo2: '97',
  o2: 'no',
  pa: '130/80',
  fc: '72',
  coscienza: 'A',
  temperatura: '36,8',
};
const now = Date.now();
const iso = (hAgo) => new Date(now - hAgo * 3600e3).toISOString().replace(/\.\d{3}Z$/, '.000Z');
const mk = (id, patientId, hAgo, values) => ({
  id,
  requestId: id,
  patientId,
  measuredAt: iso(hAgo),
  values,
  authorOperatorId: 'op1',
  authorName: 'Inf. Test',
  createdAt: iso(hAgo),
});
// Un paziente per tono clinico (punteggio NEWS2 calcolato dall'app, non imposto qui).
const TONES = [
  ['ds-badge--ok', { ...full }], // 0
  ['ds-badge--info', { ...full, fc: '95' }], // 1
  ['ds-badge--warning', { ...full, spo2: '91' }], // un parametro a 3
  ['ds-badge--alarm', { ...full, fr: '22', spo2: '94', fc: '104', temperatura: '38,3' }], // 5
  ['ds-badge--alarm-strong', { ...full, fr: '25', spo2: '91', fc: '112' }], // 8
];
const store = {};
TONES.forEach(([, values], i) => (store[P[i].id] = [mk(`t${i}`, P[i].id, 1, values)]));
store[P[5].id] = [mk('old', P[5].id, 72, full)]; // 0 di 72 h fa: da aggiornare, mai verde
const expected = Object.fromEntries(TONES.map(([tone], i) => [P[i].id, tone]));
expected[P[5].id] = 'ds-badge--stale';

const browser = await chromium.launch();
async function login(width) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.route(/\/patients\/[^/]+\/parameter-readings(\?.*)?$/, (route) => {
    const pid = decodeURIComponent(new URL(route.request().url()).pathname.split('/')[2]);
    route.fulfill({ json: { readings: store[pid] ?? [], hasMore: false, nextCursor: null } });
  });
  await page.route(/\/patients\/settings$/, (route) =>
    route.fulfill({ json: { deleteEnabled: true } }),
  );
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.waitForTimeout(1200);
  return page;
}
async function go(page, title, width) {
  if (width < 1024) await page.getByRole('button', { name: 'Apri menu' }).click();
  await page.locator(`.teams-sidebar__item[title="${title}"]`).click();
  await page.waitForTimeout(2000);
}
const badges = (page, scope) =>
  page.evaluate((scope) => {
    return [...document.querySelectorAll(`${scope} .news2-chip`)].map((el) => {
      const cs = getComputedStyle(el);
      const row = el.closest('tr, article, .turno-pcard, li');
      return {
        tone: [...el.classList].find((c) => c.startsWith('ds-badge--') && c !== 'ds-badge--dashed'),
        text: el.textContent.trim(),
        row: row?.textContent ?? '',
        sig: [cs.minHeight, cs.borderTopLeftRadius, cs.fontSize, cs.fontWeight].join(' '),
        bg: cs.backgroundColor,
        // area di tocco col hit-test reale: il clic a 7.5px sopra e sotto colpisce ancora il badge
        touch: (() => {
          const r = el.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          if (r.top < 12 || r.bottom > innerHeight - 12) return 'fuori vista';
          const hits = (y) => el.contains(document.elementFromPoint(cx, y));
          return hits(r.top - 7.5) && hits(r.bottom + 7.5) ? 48 : 0;
        })(),
        label: el.getAttribute('aria-label') ?? '',
        // testo tagliato: il testo (span interno) esce dal riquadro del badge
        clipped: (() => {
          const t = (el.querySelector('.ds-badge__text') ?? el).getBoundingClientRect();
          const r = el.getBoundingClientRect();
          return t.right > r.right + 1 || t.bottom > r.bottom + 1 || getComputedStyle(el).textOverflow === 'ellipsis';
        })(),
        popup: el.getAttribute('aria-haspopup'),
      };
    });
  }, scope);
// Stesso cognome per più pazienti nello stub: la riga si riconosce da nome e cognome.
const has = (text, p) => text.includes(p.lastName) && text.includes(p.firstName);
const toneFor = (list, p) => list.find((b) => has(b.row, p))?.tone;

// ── Lista pazienti e Turno: NEWS2 come badge canonico con il tono clinico ─────────────────
{
  const page = await login(1180);
  await go(page, 'Pazienti', 1180);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(1500);
  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(800);
  const list = await badges(page, '.plist-list');
  const tones = P.slice(0, 6).map((p) => [p.lastName, toneFor(list, p), expected[p.id]]);
  check(
    'AC3 lista pazienti: NEWS2 con il tono clinico atteso (ok, info, avviso, allarme, allarme forte, da aggiornare)',
    tones.every(([, got, want]) => got === want),
    JSON.stringify(tones),
  );
  check(
    'AC2 lista pazienti: badge 32px, raggio 8, 14/500, area di tocco 48, aria-haspopup',
    list.length > 0 &&
      list.every((b) => b.sig === '32px 8px 14px 500' && b.touch !== 0 && b.popup === 'dialog') &&
      list.some((b) => b.touch === 48),
    JSON.stringify([...new Set(list.map((b) => `${b.sig} tocco ${b.touch} ${b.popup}`))]),
  );
  const stale = list.filter((b) => /da aggiornare/.test(b.label));
  check(
    'AC3 lista: testo NEWS2 mai tagliato; "da aggiornare" visibile nel badge quando vale',
    list.every((b) => !b.clipped) && stale.length > 0 && stale.every((b) => /da aggiornare/.test(b.text)),
    JSON.stringify(stale.map((b) => b.text)),
  );
  const red = list.filter((b) => /rgb\(217, 58, 74\)/.test(b.bg)).map((b) => b.tone);
  check(
    'AC3 rosso pieno solo per il rischio alto',
    red.length > 0 && red.every((t) => t === 'ds-badge--alarm-strong'),
    JSON.stringify(red),
  );
  await page.screenshot({ path: `${DIR}/screenshots/pazienti-news2-1180.png` });
  // il badge apre lo storico NEWS2
  const high = page.locator('.plist-list .news2-chip.ds-badge--alarm-strong').first();
  await high.click();
  await page.waitForTimeout(800);
  const dialog = await page.getByRole('dialog').filter({ hasText: 'NEWS2' }).count();
  check('AC3 il badge NEWS2 apre lo storico', dialog > 0, `${dialog}`);
  await page.screenshot({ path: `${DIR}/screenshots/storico-news2.png` });
  const staticBadges = await page.evaluate(() =>
    [...document.querySelectorAll('[role="dialog"] .news2-table__total .ds-badge')].map((el) => ({
      tag: el.tagName,
      cls: el.className,
    })),
  );
  check(
    'AC3 nello storico il totale è lo stesso badge, non interattivo',
    staticBadges.length > 0 &&
      staticBadges.every((b) => b.tag === 'SPAN' && /ds-badge--/.test(b.cls)),
    JSON.stringify(staticBadges.slice(0, 3)),
  );
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  // apri/elimina della lista: ds-icon-btn canonici
  const btns = await page.evaluate(() =>
    [...document.querySelectorAll('.patient-roster__open, .patient-roster__delete')]
      .slice(0, 4)
      .map((el) => {
        const cs = getComputedStyle(el);
        return [el.className, cs.width, cs.height, cs.borderTopLeftRadius].join(' ');
      }),
  );
  check(
    'AC2 apri/elimina della lista: ds-icon-btn 48×48 raggio 12 (elimina nel tono distruttivo)',
    btns.length > 0 &&
      btns.every((b) => /ds-icon-btn/.test(b) && / 48px 48px 12px$/.test(b)) &&
      btns.some((b) => /ds-icon-btn--danger/.test(b)),
    JSON.stringify(btns),
  );
  const target = P[4];
  await page
    .locator('.patient-roster__row, tr', { hasText: target.lastName })
    .filter({ hasText: target.firstName })
    .first()
    .locator('.patient-roster__open')
    .click();
  await page.waitForTimeout(2500);
  const title = await page.evaluate(() => document.querySelector('.topbar-title')?.textContent ?? '');
  check('AC3 "Apri" (ds-icon-btn) della riga apre la cartella di quel paziente', has(title, target), title.slice(0, 60));
  await page.screenshot({ path: `${DIR}/screenshots/cartella-aperta-1180.png` });

  // Presa in carico: card cliniche con toggle canonico
  await page
    .locator('.chart-sections .top-nav__item', { hasText: 'Dati di ingresso' })
    .first()
    .click();
  await page.waitForTimeout(1800);
  const toggle = page.locator('.clinical-card__toggle').first();
  const before = await toggle.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      cls: el.className,
      size: `${cs.width}x${cs.height}`,
      radius: cs.borderTopLeftRadius,
      expanded: el.getAttribute('aria-expanded'),
      label: el.getAttribute('aria-label'),
      nested: !!el.closest('[role="button"]'),
    };
  });
  check(
    'AC1/AC2 toggle delle card cliniche: ds-icon-btn 48×48, aria-expanded, nome con il titolo, nessun pulsante annidato',
    /ds-icon-btn/.test(before.cls) &&
      before.size === '48px x48px'.replace(' ', '') &&
      before.expanded === 'true' &&
      before.label === 'Comprimi Dati di ingresso' &&
      !before.nested,
    JSON.stringify(before),
  );
  await toggle.click();
  await page.waitForTimeout(500);
  const after = await toggle.evaluate((el) => ({
    expanded: el.getAttribute('aria-expanded'),
    label: el.getAttribute('aria-label'),
    height: document.getElementById(el.getAttribute('aria-controls'))?.getBoundingClientRect()
      .height,
  }));
  check(
    'AC3 il toggle chiude la card (aria-expanded false, contenuto a 0, nome "Espandi …")',
    after.expanded === 'false' && after.height === 0 && after.label === 'Espandi Dati di ingresso',
    JSON.stringify(after),
  );
  await toggle.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  const kb = await toggle.evaluate((el) => ({
    expanded: el.getAttribute('aria-expanded'),
    outline: getComputedStyle(el).outlineWidth,
  }));
  check(
    'AC3 da tastiera (Invio) riapre la card, con fuoco visibile 3px',
    kb.expanded === 'true' && kb.outline === '3px',
    JSON.stringify(kb),
  );
  await page
    .locator('.clinical-card__header')
    .first()
    .click({ position: { x: 20, y: 20 } });
  await page.waitForTimeout(500);
  check(
    'AC3 il clic sulla testata della card continua ad aprire/chiudere',
    (await toggle.getAttribute('aria-expanded')) === 'false',
  );
  await page.screenshot({ path: `${DIR}/screenshots/card-cliniche-1180.png` });

  // Terapia farmacologica: "non in anagrafica" apre la ricerca sul nome
  await page
    .locator('.chart-sections .top-nav__item', { hasText: 'Terapia' })
    .first()
    .click();
  await page.waitForTimeout(2500);
  const nf = page.locator('button.farmaco-non-trovato').first();
  if ((await nf.count()) === 0)
    check(
      'AC3 "non in anagrafica" presente nella terapia',
      false,
      'nessun farmaco non risolto nello stub',
    );
  else {
    const info = await nf.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        cls: el.className,
        sig: [cs.minHeight, cs.borderTopLeftRadius, cs.fontSize, cs.fontWeight].join(' '),
        popup: el.getAttribute('aria-haspopup'),
        name: el.closest('td, .cdt__cell, span')?.parentElement?.textContent?.trim().slice(0, 60),
      };
    });
    check(
      'AC2 "non in anagrafica": badge canonico di avviso (32px, raggio 8, 14/500), aria-haspopup',
      /ds-badge ds-badge--warning/.test(info.cls) &&
        info.sig === '32px 8px 14px 500' &&
        info.popup === 'dialog',
      JSON.stringify(info),
    );
    await nf.click();
    await page.waitForTimeout(1000);
    const search = await page.evaluate(() => ({
      dialog: !!document.querySelector('[role="dialog"]'),
      value: document.querySelector('[role="dialog"] input')?.value ?? '',
    }));
    check(
      'AC3 "non in anagrafica" apre la ricerca farmaco con il nome già inserito',
      search.dialog && search.value.length > 0,
      JSON.stringify(search),
    );
    await page.screenshot({ path: `${DIR}/screenshots/ricerca-farmaco.png` });
    await page.keyboard.press('Escape');
  }
  await page.close();
}
{
  // Turno: stesso badge e stesso tono della lista
  const page = await login(1180);
  await page.waitForTimeout(1500);
  const turno = await badges(page, '.turno-pcard');
  const tones = P.slice(0, 6)
    .map((p) => [p.lastName, toneFor(turno, p), expected[p.id]])
    .filter(([, got]) => got);
  check(
    'AC3 Turno: NEWS2 con lo stesso badge e lo stesso tono della lista',
    tones.length > 0 &&
      tones.every(([, got, want]) => got === want) &&
      turno.every((b) => b.sig === '32px 8px 14px 500' && b.touch !== 0),
    JSON.stringify(tones),
  );
  const tStale = turno.filter((b) => /da aggiornare/.test(b.label));
  check(
    'AC3 Turno: testo NEWS2 mai tagliato; "da aggiornare" visibile nel badge',
    turno.every((b) => !b.clipped) && tStale.every((b) => /da aggiornare/.test(b.text)),
    JSON.stringify(tStale.map((b) => b.text)),
  );
  await page.screenshot({ path: `${DIR}/screenshots/turno-news2-1180.png` });
  await page.close();
}
for (const width of [390, 768, 1024, 1440]) {
  const page = await login(width);
  const t = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  await go(page, 'Pazienti', width);
  const l = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  const cardDelete = await page.evaluate(() => {
    const el = [...document.querySelectorAll('.patient-card__delete')].find(
      (e) => e.getBoundingClientRect().width > 0,
    );
    if (!el) return null;
    const cs = getComputedStyle(el);
    return [el.className, cs.height, cs.borderTopLeftRadius].join(' ');
  });
  check(
    `AC4 ${width}: nessuno scorrimento orizzontale in Turno e Pazienti${cardDelete ? '; elimina della card = ds-btn distruttivo 48' : ''}`,
    t <= 0 && l <= 0 && (!cardDelete || /ds-btn ds-btn--danger .* 48px 12px$/.test(cardDelete)),
    JSON.stringify({ turno: t, pazienti: l, cardDelete }),
  );
  await page.screenshot({ path: `${DIR}/screenshots/pazienti-${width}.png` });
  await page.close();
}

await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
console.log(`${log.filter((l) => l.startsWith('PASS')).length}/${log.length} PASS`);
