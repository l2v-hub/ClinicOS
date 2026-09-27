// Evidenza browser: cartella paziente come il prototipo HMI 1 (intestazione, 8 sezioni a chip,
// Panoramica con tessere e NEWS2, sezioni composte, link diretti, larghezze).
// Le rilevazioni dei parametri sono simulate con page.route (lo stub API non le espone).
//   BASE=http://localhost:4181 node <questo file>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR =
  'artifacts/task-validation/hmi-parita-3-cartella-paziente-come-il-prototipo-sezioni-intestazione-panoramica';
mkdirSync(`${DIR}/screenshots`, { recursive: true });
mkdirSync(`${DIR}/logs`, { recursive: true });
const BASE = process.env.BASE ?? 'http://localhost:4181';
const log = [];
const check = (n, ok, d = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);

const iso = (hAgo) =>
  new Date(Date.now() - hAgo * 3600e3).toISOString().replace(/\.\d{3}Z$/, '.000Z');
const full = {
  fr: '20',
  spo2: '94',
  o2: 'no',
  pa: '142/80',
  fc: '92',
  coscienza: 'A',
  temperatura: '37,4',
};
const mk = (id, pid, at, values) => ({
  id,
  requestId: id,
  patientId: pid,
  measuredAt: at,
  values,
  authorOperatorId: 'op1',
  authorName: 'Inf',
  createdAt: at,
});
const COMPLETE = (pid) => [
  mk('b', pid, iso(0.3), {
    ...full,
    fr: '24',
    spo2: '92',
    pa: '148/86',
    fc: '108',
    temperatura: '38,2',
  }),
  mk('a', pid, iso(3), full),
];
const INCOMPLETE = (pid) => [
  mk('c', pid, iso(0.5), { pa: '120/80', fc: '80', spo2: '96', temperatura: '36,5' }),
];

const browser = await chromium.launch();

async function openChart(width, readings = COMPLETE, index = 0) {
  const page = await browser.newPage({ viewport: { width, height: 820 } });
  await page.route(/\/patients\/[^/]+\/parameter-readings(\?.*)?$/, (route) => {
    const pid = decodeURIComponent(new URL(route.request().url()).pathname.split('/')[2]);
    route.fulfill({ json: { readings: readings(pid), hasMore: false, nextCursor: null } });
  });
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.waitForTimeout(1200);
  if (width < 1024) await page.getByRole('button', { name: 'Apri menu' }).click();
  await page.locator('.teams-sidebar__item[title="Pazienti"]').click();
  await page.waitForTimeout(1200);
  const btn = page.getByRole('button', { name: /^Apri cartella di / }).nth(index);
  const name = (await btn.getAttribute('aria-label')).replace('Apri cartella di ', '');
  await btn.click();
  await page.locator('.chart-sections').waitFor({ timeout: 15000 });
  await page.waitForTimeout(1800);
  return { page, name };
}

// AC1 + AC2: 1180 × 820
{
  const { page, name } = await openChart(1180);
  const m = await page.evaluate(() => {
    const r = (el) => {
      const b = el.getBoundingClientRect();
      return {
        x: Math.round(b.left),
        y: Math.round(b.top),
        w: Math.round(b.width),
        h: Math.round(b.height),
        right: Math.round(b.right),
      };
    };
    const bar = document.querySelector('.chart-sections');
    return {
      title: document.querySelector('.topbar-title .page-header__title')?.textContent,
      sub: document.querySelector('.topbar-title .page-header__subtitle')?.textContent,
      allergy:
        document.querySelector('.topbar-title .patient-topbar-title__allergy')?.textContent ?? null,
      chips: [...document.querySelectorAll('.top-nav--chips .top-nav__item')].map((c) => ({
        label: c.childNodes[0]?.textContent?.trim() ?? c.textContent.trim(),
        ...r(c),
        active: c.classList.contains('is-active'),
      })),
      captions: document.querySelectorAll('.top-nav__group-label, .top-nav__group-sep').length,
      actions: [...document.querySelectorAll('.ds-btn--collapsible')].map((a) => ({
        label: a.getAttribute('aria-label'),
        ...r(a),
      })),
      bar: bar ? r(bar) : null,
      compactHeader: document.querySelectorAll('.patient-compact-header').length,
      tiles: [...document.querySelectorAll('.vitals .vt')].map((t) =>
        t.innerText.replace(/\n/g, ' | '),
      ),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  check(
    "AC1 nome del paziente nell'intestazione con camera, letto, età e data di nascita",
    // stessa persona: la lista scrive "Nome Cognome", la cartella "Cognome, Nome"
    (m.title ?? '').replace(',', '').split(/\s+/).sort().join(' ') === name.replace(',', '').split(/\s+/).sort().join(' ') &&
      /Camera .* · Letto .* · \d+ anni · nat(?:o|a|o\/a) il \d{2}\/\d{2}\/\d{4}/.test(m.sub ?? ''),
    `${m.title} | ${m.sub} | atteso: ${name}`,
  );
  const labels = m.chips.map((c) => c.label.replace(/\d+$/, '').trim());
  check(
    "AC1 8 sezioni a chip ≥ 48 px nell'ordine del prototipo, tutte visibili, nessuna didascalia",
    labels.join(',') ===
      'Panoramica,Dati di ingresso,Clinica,Terapia,Parametri,Moduli,Documenti,Dimissione' &&
      m.chips.every((c) => c.h >= 48 && c.right <= m.actions[0].x) &&
      m.captions === 0,
    JSON.stringify(labels),
  );
  check(
    "AC1 barra delle sezioni a tutta larghezza sotto l'intestazione, Stampa e Invio in PS a destra",
    m.bar &&
      m.bar.y === 72 &&
      m.bar.x === 96 &&
      m.bar.w === 1084 &&
      m.actions.map((a) => a.label).join(',') === 'Stampa la scheda,Invio in Pronto Soccorso' &&
      m.actions.every((a) => a.w >= 48 && a.h >= 48),
    JSON.stringify({ bar: m.bar, actions: m.actions }),
  );
  check(
    "AC1 nessuna card intestazione nel contenuto; Panoramica attiva all'apertura",
    m.compactHeader === 0 && m.chips[0].active,
  );
  check(
    'AC2 tessere FR, SpO₂, PA, FC, Temp. con valore, unità e andamento',
    m.tiles.length === 6 &&
      /^FR \| 24(?: \| | )?atti\/min \| era 20$/.test(m.tiles[0]) &&
      /^SpO₂ \| 92(?: \| | )?% aria \| era 94$/.test(m.tiles[1]) &&
      /^PA \| 148\/86(?: \| | )?mmHg \| era 142\/80$/.test(m.tiles[2]) &&
      /^FC \| 108(?: \| | )?bpm \| era 92$/.test(m.tiles[3]) &&
      /^Temp\. \| 38,2(?: \| | )?°C \| era 37,4$/.test(m.tiles[4]),
    JSON.stringify(m.tiles.slice(0, 5)),
  );
  check(
    'AC2 tessera NEWS2 = 6 dalla rilevazione completa, con risposta clinica',
    /^NEWS2 · \d{2}:\d{2} \| 6(?: \| | )?punti \| .+/.test(m.tiles[5]),
    m.tiles[5],
  );
  await page.screenshot({ path: `${DIR}/screenshots/panoramica-1180.png` });
  await page.locator('.vt--news2').click();
  const dialog = await page.getByRole('dialog').filter({ hasText: /NEWS2/ }).count();
  check('AC2 la tessera NEWS2 apre lo storico NEWS2', dialog > 0);
  await page.keyboard.press('Escape');
  check('AC5 1180: nessuno scorrimento orizzontale', m.overflow <= 0, `overflow=${m.overflow}`);

  // AC3: sezioni composte
  await page.getByRole('tab', { name: /^Dati di ingresso/ }).click();
  await page.waitForTimeout(1200);
  const ingresso = await page.evaluate(() =>
    [...document.querySelectorAll('[data-chart-part]')].map((p) =>
      p.getAttribute('data-chart-part'),
    ),
  );
  check(
    'AC3 Dati di ingresso: Anagrafica, Contatti e Presa in carico insieme',
    ingresso.join(',') === 'profilo,contatti,presa-in-carico',
    ingresso.join(','),
  );
  await page.screenshot({ path: `${DIR}/screenshots/dati-di-ingresso-1180.png` });
  await page.getByRole('tab', { name: /^Clinica/ }).click();
  await page.waitForTimeout(1500);
  const clinica = await page.evaluate(() =>
    [...document.querySelectorAll('[data-chart-part]')].map((p) =>
      p.getAttribute('data-chart-part'),
    ),
  );
  check(
    'AC3 Clinica: Diagnosi, Esami e consulenze, Note e visite, Consegne insieme',
    clinica.join(',') === 'diagnosi,esami-consulenze,note,consegne',
    clinica.join(','),
  );
  await page.screenshot({ path: `${DIR}/screenshots/clinica-1180.png` });
  for (const [label, sel] of [
    ['Terapia', /Terapia/],
    ['Parametri', /rilevazion/i],
    ['Moduli', /Moduli|moduli/],
    ['Documenti', /Document/],
    ['Dimissione', /Dimission/],
  ]) {
    await page.getByRole('tab', { name: new RegExp(`^${label}`) }).click();
    await page.waitForTimeout(1200);
    const text = await page.locator('#patient-tab-panel').innerText();
    check(
      `AC3 sezione ${label}: contenuto presente`,
      sel.test(text) && text.length > 40,
      text.slice(0, 60).replace(/\n/g, ' '),
    );
  }
  // AC4: Stampa e Invio in PS
  await page.getByRole('button', { name: 'Stampa la scheda' }).click();
  const print = await page
    .getByRole('dialog')
    .filter({ hasText: /Tutte le sezioni/ })
    .count();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Invio in Pronto Soccorso' }).click();
  await page.waitForTimeout(800);
  const ps = await page
    .getByRole('dialog')
    .filter({ hasText: /Pronto Soccorso|PS/ })
    .count();
  check(
    'AC4 Stampa apre la finestra di selezione; Invio in PS apre il modulo',
    print > 0 && ps > 0,
  );
  await page.close();
}

// AC2: NEWS2 non calcolabile, detto
{
  const { page } = await openChart(1180, INCOMPLETE);
  const tile = (await page.locator('.vt--news2').innerText()).replace(/\n/g, ' | ');
  check(
    'AC2 NEWS2 non calcolabile: la tessera resta visibile e dice cosa manca',
    /Non calcolabile/.test(tile) && /Mancano FR, O₂, Coscienza/.test(tile),
    tile,
  );
  await page.screenshot({ path: `${DIR}/screenshots/news2-non-calcolabile.png` });
  await page.close();
}

// AC4: avvisi di sicurezza visibili (paziente con allergie/rischi nello stub)
{
  const { page } = await openChart(1180);
  const r = await page.evaluate(() => ({
    allergyBand: !!document.querySelector('.cr-alert-strip--allergie'),
    topbarAllergy: !!document.querySelector('.patient-topbar-title__allergy'),
  }));
  check(
    "AC4 allergie: badge nell'intestazione e fascia di sicurezza nel contenuto",
    r.allergyBand && r.topbarAllergy,
    JSON.stringify(r),
  );
  await page.close();
}

// AC3: link diretto a una parte non in cima alla sezione (Contatti) la porta in vista
{
  const { page } = await openChart(1180);
  const ok = await page.evaluate(async () => {
    const tab = [...document.querySelectorAll('.top-nav--chips .top-nav__item')].find((t) =>
      /Clinica/.test(t.textContent),
    );
    tab.click();
    await new Promise((r) => setTimeout(r, 1200));
    return true;
  });
  // Consegne è l'ultima parte di Clinica: il link "Vai alla terapia" dell'avviso anomalie apre Terapia
  await page
    .getByRole('button', { name: 'Vai alla terapia' })
    .click()
    .catch(() => {});
  await page.waitForTimeout(1200);
  const active = await page.locator('.top-nav--chips .top-nav__item.is-active').innerText();
  check(
    'AC3 un link interno (avviso anomalie → terapia) apre la sezione Terapia',
    ok && /^Terapia/.test(active),
    active,
  );
  await page.close();
}

// Verifica QA, primo giro: coerenza e regressioni
{
  const { page } = await openChart(1180);
  const legacy = await page.evaluate(() => ({
    riepilogo: document.querySelectorAll('.cr-riepilogo-card, .cr-overview-section').length,
    rileva: [...document.querySelectorAll('button')].filter((b) => /Rileva parametri/.test(b.textContent)).length,
  }));
  check('QA1 Panoramica senza dati legacy in contrasto con tessere e terapia (niente quadro operativo, niente "Rileva parametri" a finestra)', legacy.riepilogo === 0 && legacy.rileva === 0, JSON.stringify(legacy));
  // link "Codice fiscale" del riquadro "Anagrafica da completare" → cursore nel campo
  const link = page.getByRole('button', { name: /^Codice fiscale$/ }).first();
  if (await link.count()) {
    await link.click();
    await page.waitForTimeout(1500);
    const focused = await page.evaluate(() => document.activeElement?.id ?? '');
    check('QA1 "Codice fiscale" da completare porta il cursore nel campo', focused === 'patient-profile-codiceFiscale', focused);
  } else {
    check('QA1 "Codice fiscale" da completare porta il cursore nel campo', false, 'link non trovato');
  }
  // un solo modulo Medicazioni montato anche dopo averlo aperto e cambiato sezione
  await page.getByRole('tab', { name: /^Moduli/ }).click();
  await page.waitForTimeout(1200);
  const med = page.getByRole('button', { name: /Medicazioni/ }).first();
  if (await med.count()) {
    await med.click();
    await page.waitForTimeout(1200);
  }
  for (const label of ['Clinica', 'Panoramica', 'Dati di ingresso']) {
    await page.getByRole('tab', { name: new RegExp(`^${label}`) }).click();
    await page.waitForTimeout(1000);
    const copies = await page.evaluate(() => document.querySelectorAll('[data-chart-part] > div[hidden]').length);
    check(`QA1 ${label}: al massimo una copia nascosta dei moduli già aperti`, copies <= 1, `copie=${copies}`);
  }
  await page.close();
}
for (const width of [390, 768]) {
  const { page, name } = await openChart(width);
  const r = await page.evaluate(() => {
    const h = document.querySelector('.topbar-title .page-header__title');
    return { text: h?.textContent ?? '', clipped: h ? h.scrollWidth > h.clientWidth + 1 : true };
  });
  check(`QA1 ${width}: nome del paziente leggibile per intero nell'intestazione`, !r.clipped && r.text.length > 3, JSON.stringify({ ...r, name }));
  await page.close();
}

// Verifica QA, secondo giro: la bozza di un modulo aperto sopravvive al cambio di sezione
{
  const { page } = await openChart(1180);
  await page.getByRole('tab', { name: /^Moduli/ }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /Medicazioni/ }).first().click();
  await page.waitForTimeout(1500);
  const add = page.locator('[data-chart-part] button, .chart-keepalive button').filter({ hasText: /Aggiungi|Nuova|Nuovo/ }).first();
  let typed = false;
  if (await add.count()) {
    await add.click();
    await page.waitForTimeout(800);
  }
  const field = page.locator('.chart-keepalive textarea:visible, .chart-keepalive input[type="text"]:visible').first();
  if (await field.count()) {
    await field.fill('BOZZA-QA-123');
    typed = true;
  }
  const route = [];
  for (const label of ['Clinica', 'Dati di ingresso', 'Panoramica', 'Terapia']) {
    await page.getByRole('tab', { name: new RegExp(`^${label}`) }).click();
    await page.waitForTimeout(900);
    route.push(label);
  }
  await page.getByRole('tab', { name: /^Moduli/ }).click();
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /Medicazioni/ }).first().click();
  await page.waitForTimeout(1200);
  const kept = await page.evaluate(() =>
    [...document.querySelectorAll('.chart-keepalive textarea, .chart-keepalive input')].some((e) => e.value === 'BOZZA-QA-123'),
  );
  check('QA2 bozza di Medicazioni conservata dopo Clinica → Dati di ingresso → Panoramica → Terapia → Moduli', typed && kept, JSON.stringify({ typed, kept, route }));
  await page.close();
}
for (const width of [390, 768]) {
  const { page } = await openChart(width);
  const r = await page.evaluate(() => {
    const vis = (sel) => {
      const e = document.querySelector(sel);
      if (!e) return false;
      const b = e.getBoundingClientRect();
      return getComputedStyle(e).display !== 'none' && b.width > 0 && b.height > 0;
    };
    return {
      badge: vis('.patient-topbar-title__allergy'),
      mini: vis('.patient-topbar-title__allergy-mini'),
      label: document.querySelector('.patient-topbar-title__allergy-mini')?.getAttribute('aria-label') ?? null,
    };
  });
  check(`QA2 ${width}: l'allergia resta visibile nell'intestazione (badge o icona con nome accessibile)`, r.badge || (r.mini && /^Allergia: .+/.test(r.label ?? '')), JSON.stringify(r));
  await page.close();
}

// AC5: larghezze
for (const width of [390, 768, 1024, 1440]) {
  const { page } = await openChart(width);
  const r = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    tiles: document.querySelectorAll('.vitals .vt').length,
  }));
  check(
    `AC5 ${width}: nessuno scorrimento orizzontale, tessere presenti`,
    r.overflow <= 0 && r.tiles === 6,
    JSON.stringify(r),
  );
  await page.screenshot({ path: `${DIR}/screenshots/panoramica-${width}.png` });
  await page.close();
}

await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
process.exit(log.some((l) => l.startsWith('FAIL')) ? 1 : 0);
