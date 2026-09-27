// Evidenza browser: schermata Turno come il prototipo HMI 1, con i dati reali dello stub API.
// Le rilevazioni dei parametri (per il NEWS2) sono simulate con page.route: lo stub non le espone.
//   BASE=http://localhost:4173 node <questo file>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR = 'artifacts/task-validation/hmi-parita-2-schermata-turno-come-il-prototipo';
mkdirSync(`${DIR}/screenshots`, { recursive: true });
mkdirSync(`${DIR}/logs`, { recursive: true });
const BASE = process.env.BASE ?? 'http://localhost:4173';
const log = [];
const check = (n, ok, d = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);

const roster = (await (await fetch('http://localhost:3001/patients/page?limit=25')).json()).items;
const summary = await (
  await fetch('http://localhost:3001/patients/clinical-summary', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ids: roster.map((p) => p.id) }),
  }).catch(() => null)
)
  ?.json()
  .catch(() => null);

// NEWS2: un paziente con rilevazione completa recente (FR 24, SpO₂ 92, FC 108, T 38,2 → NEWS2 6)
const full = {
  fr: '16',
  spo2: '97',
  o2: 'no',
  pa: '130/80',
  fc: '72',
  coscienza: 'A',
  temperatura: '36,8',
};
const iso = (hAgo) =>
  new Date(Date.now() - hAgo * 3600e3).toISOString().replace(/\.\d{3}Z$/, '.000Z');
const mk = (id, patientId, at, values) => ({
  id,
  requestId: id,
  patientId,
  measuredAt: at,
  values,
  authorOperatorId: 'op1',
  authorName: 'Inf. Test',
  createdAt: at,
});

async function open(width, setup) {
  const page = await browser.newPage({ viewport: { width, height: 820 } });
  const readingsFor = {};
  await page.route(/\/patients\/[^/]+\/parameter-readings(\?.*)?$/, (route) => {
    const pid = decodeURIComponent(new URL(route.request().url()).pathname.split('/')[2]);
    return route.fulfill({
      json: { readings: readingsFor[pid] ?? [], hasMore: false, nextCursor: null },
    });
  });
  if (setup) await setup(page, readingsFor);
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.locator('.turno-grid').waitFor({ timeout: 15000 });
  await page.waitForTimeout(2500);
  return page;
}

const browser = await chromium.launch();

// ── 1180 × 820: struttura del prototipo e dati reali ─────────────────────────
{
  let target;
  const page = await open(1180, (p, readingsFor) => {
    target = roster[1];
    readingsFor[target.id] = [
      mk('a1', target.id, iso(0.5), {
        ...full,
        fr: '24',
        spo2: '92',
        fc: '108',
        temperatura: '38,2',
      }),
    ];
  });
  const m = await page.evaluate(() => {
    const r = (sel) => {
      const e = document.querySelector(sel);
      if (!e) return null;
      const b = e.getBoundingClientRect();
      return {
        x: Math.round(b.left),
        y: Math.round(b.top),
        w: Math.round(b.width),
        h: Math.round(b.height),
      };
    };
    return {
      title: document.querySelector('.topbar-title .page-header__title')?.textContent,
      subtitle: document.querySelector('.topbar-title .page-header__subtitle')?.textContent,
      kpis: [...document.querySelectorAll('.dashboard-kpi-card')].map((k) => ({
        label: k.querySelector('.dashboard-kpi-card__label')?.textContent,
        value: k.querySelector('.dashboard-kpi-card__value')?.textContent,
        y: Math.round(k.getBoundingClientRect().top),
      })),
      adesso: r('.adesso-queue'),
      appts: r('.turno-side .turno-card'),
      pgrid: r('.turno-pgrid'),
      pcols: new Set(
        [...document.querySelectorAll('.turno-pcard')].map((c) =>
          Math.round(c.getBoundingClientRect().left),
        ),
      ).size,
      rows: [...document.querySelectorAll('.adesso-queue__row')].map((row) => ({
        ora: row.querySelector('.adesso-queue__ora')?.textContent,
        late: row.querySelector('.adesso-queue__ora')?.classList.contains('is-late'),
        who: row.querySelector('.adesso-queue__who')?.textContent,
        what: row.querySelector('.adesso-queue__what')?.textContent,
        btn: row.querySelector('button')?.textContent,
        primary: row.querySelector('button')?.classList.contains('ds-btn--primary'),
        btnH: Math.round(row.querySelector('button')?.getBoundingClientRect().height ?? 0),
      })),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      contentTop: r('.dashboard-kpi-band')?.y,
    };
  });
  check(
    'AC1 titolo "Il mio turno" nell\'intestazione con sottotitolo ricoverati · reparto',
    m.title === 'Il mio turno' && /ricoverat[oi] · /.test(m.subtitle ?? ''),
    `${m.title} | ${m.subtitle}`,
  );
  check(
    'AC1 5 indicatori in riga con le etichette del prototipo',
    m.kpis.length === 5 &&
      new Set(m.kpis.map((k) => k.y)).size === 1 &&
      m.kpis.map((k) => k.label).join(',') ===
        'Parametri critici,Rischi elevati,Allergie gravi,Ricoverati,Terapie in ritardo',
    JSON.stringify(m.kpis),
  );
  check(
    "AC1 contenuto a 24 px sotto l'intestazione (72 + 24)",
    m.contentTop === 96,
    `y=${m.contentTop}`,
  );
  check(
    'AC1 "Adesso" a sinistra, appuntamenti e griglia pazienti a 2 colonne a destra',
    m.adesso &&
      m.appts &&
      m.pgrid &&
      m.adesso.x < m.appts.x &&
      m.appts.x === m.pgrid.x &&
      m.pgrid.y > m.appts.y &&
      m.pcols === 2,
    JSON.stringify({ a: m.adesso, b: m.appts, g: m.pgrid, cols: m.pcols }),
  );
  const lateRows = m.rows.filter((r) => r.late);
  check(
    'AC2 righe: ora, "luogo · paziente", titolo, pulsante ≥ 48; scadute con ora rossa e pulsante primario',
    m.rows.length > 0 &&
      m.rows.every((r) => r.ora && r.who && r.what && r.btn === 'Apri' && r.btnH >= 48) &&
      lateRows.length > 0 &&
      lateRows.every((r) => r.primary),
    JSON.stringify(m.rows.slice(0, 2)),
  );
  check('AC5 1180: nessuno scorrimento orizzontale', m.overflow <= 0, `overflow=${m.overflow}`);

  // AC3: card del paziente con NEWS2 reale e dati del roster
  const nome = `${target.lastName}, ${target.firstName}`;
  const card = page.locator('.turno-pcard', {
    has: page.getByRole('button', { name: `Apri cartella di ${nome}` }),
  });
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  const c = await card.evaluate((el) => ({
    bed: el.querySelector('.turno-pcard__bed')?.textContent,
    sub: el.querySelector('.turno-pcard__sub')?.textContent,
    news2: el.querySelector('.news2-chip')?.textContent,
    badges: [...el.querySelectorAll('.turno-badge')].map((b) => b.textContent),
    next: el.querySelector('.turno-pcard__next')?.textContent,
  }));
  const age = (() => {
    const [y, mo, d] = target.dateOfBirth.split('-').map(Number);
    const t = new Date();
    let a = t.getFullYear() - y;
    if (t.getMonth() + 1 < mo || (t.getMonth() + 1 === mo && t.getDate() < d)) a--;
    return a;
  })();
  check(
    `AC3 card di ${nome}: camera, età, letto e NEWS2 reale (6) dalle rilevazioni`,
    c.bed === target.location?.room &&
      c.sub === `${age} anni · Letto ${target.location?.bed}` &&
      /NEWS2 6/.test(c.news2 ?? ''),
    JSON.stringify(c),
  );
  // "Prossima" come il prototipo: prima ciò che è in ritardo (con quante altre), poi la prossima.
  const late = /^In ritardo: (.+) · (\d{2}:\d{2})(?: \(\+(\d+)\))?$/.exec(c.next ?? '');
  const lateCount = await page.evaluate(async (pid) => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' });
    const slots = await (await fetch(`http://localhost:3001/therapy-slots?date=${today}`)).json();
    const nowMin = (() => { const t = new Date().toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' }); return Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)); })();
    let n = 0;
    for (const s of slots) for (const p of s.patients) if (p.patientId === pid) for (const a of p.administrations) {
      const m = /^(\d{1,2}):(\d{2})$/.exec(a.scheduledTime ?? '');
      if (a.status === 'pending' && m && Number(m[1]) * 60 + Number(m[2]) < nowMin) n++;
    }
    return n;
  }, target.id);
  check('AC3 "Prossima" coerente con le terapie del paziente (in ritardo per prime, con il conteggio esatto)', late ? 1 + Number(late[3] ?? 0) === lateCount : lateCount === 0 && /^(Prossima: .+|Da verificare: .+|Nessuna terapia in sospeso)$/.test(c.next ?? ''), `${c.next} · in ritardo nello stub: ${lateCount}`);
  await page.screenshot({ path: `${DIR}/screenshots/turno-1180.png` });
  await card.getByRole('button', { name: `Apri cartella di ${nome}` }).click();
  await page.waitForTimeout(1500);
  const opened = await page.locator('.compact-topbar .topbar-title', { hasText: nome }).count();
  check('AC3 la card apre la cartella del paziente giusto', opened > 0, nome);
  await page.close();
}

// AC4: centro segnalazioni dal pulsante compatto
{
  const page = await open(1180);
  const btn = page.locator('.dashboard-notification-compact');
  const label = await btn.getAttribute('aria-label');
  await btn.click();
  const dialog = await page.getByRole('dialog', { name: 'Segnalazioni operative' }).count();
  check('AC4 "Segnalazioni" apre lo stesso dialogo del centro notifiche', dialog > 0, label);
  await page.screenshot({ path: `${DIR}/screenshots/segnalazioni.png` });
  await page.keyboard.press('Escape');
  await page.close();
}

// AC4: fonti non disponibili dichiarate
{
  const page = await open(1180, (p) =>
    Promise.all([
      p.route(/\/therapy-slots\?/, (route) => route.fulfill({ status: 500, json: { error: 'x' } })),
      p.route(/\/patients\/clinical-summary\/overview/, (route) =>
        route.fulfill({ status: 500, json: { error: 'x' } }),
      ),
    ]),
  );
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => ({
    notices: [...document.querySelectorAll('.adesso-queue [role="alert"]')].map((e) =>
      e.textContent.trim(),
    ),
    kpi: [...document.querySelectorAll('.dashboard-kpi-card')].map(
      (k) =>
        `${k.querySelector('.dashboard-kpi-card__value')?.textContent}|${getComputedStyle(k.querySelector('.dashboard-kpi-card__status')).display !== 'none' ? k.querySelector('.dashboard-kpi-card__status')?.textContent : ''}`,
    ),
  }));
  check(
    'AC4 terapie e indicatori non disponibili: "—" con il motivo, avviso in "Adesso"',
    r.notices.some((n) => /Scadenze terapia non disponibili/.test(n)) &&
      r.kpi.every((k) => k.startsWith('—|') && k.length > 2),
    JSON.stringify(r),
  );
  await page.screenshot({ path: `${DIR}/screenshots/non-disponibile.png` });
  await page.close();
}

// Coerenza dei dati con fonti non disponibili (verifica QA)
{
  const page = await open(1180, (p) =>
    p.route(/\/therapy-slots\?/, (route) => route.fulfill({ status: 500, json: { error: 'x' } })),
  );
  await page.waitForTimeout(1500);
  const next = await page.locator('.turno-pcard__next').allInnerTexts();
  check('Terapie non disponibili: ogni card lo dice, nessun "Nessuna terapia"', next.length > 0 && next.every((t) => t === 'Terapie non disponibili'), JSON.stringify([...new Set(next)]));
  await page.close();
}
{
  const page = await open(1180, (p) =>
    p.route(/\/patients\/clinical-summary\?/, (route) => route.fulfill({ status: 500, json: { error: 'x' } })),
  );
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => ({
    alert: document.querySelector('.turno-empty--error')?.textContent ?? '',
    cards: document.querySelectorAll('.turno-pcard').length,
    badges: [...document.querySelectorAll('.turno-pcard')].map((c) => [...c.querySelectorAll('.turno-badge')].map((b) => b.textContent).join('|')),
  }));
  check('Riepilogo clinico non disponibile: avviso con Riprova e badge "Dati clinici non disponibili" su ogni card', /Riepilogo clinico non disponibile/.test(r.alert) && r.cards > 0 && r.badges.every((b) => b === 'Dati clinici non disponibili'), JSON.stringify({ alert: r.alert.slice(0, 60), cards: r.cards, badges: [...new Set(r.badges)] }));
  await page.screenshot({ path: `${DIR}/screenshots/riepilogo-non-disponibile.png` });
  await page.close();
}
{
  const tomorrow = new Date(Date.now() + 86400e3).toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' });
  const page = await open(1180, (p) =>
    p.route(new RegExp(`/therapy-slots\?.*date=${tomorrow}`), (route) => route.fulfill({ status: 500, json: { error: 'x' } })),
  );
  await page.waitForTimeout(1500);
  const alerts = await page.locator('.adesso-queue [role="alert"]').allInnerTexts();
  const foot = await page.locator('.adesso-queue__foot').innerText();
  check('Scadenze di domani non disponibili: avviso nella coda; piè di pagina con Aggiorna e orari della struttura', alerts.some((a) => /Scadenze di domani non disponibili/.test(a)) && /Orari della struttura \(Roma\)/.test(foot) && /Aggiorna/.test(foot), JSON.stringify({ alerts, foot }));
  await page.close();
}

// Appuntamenti non letti: la card non dice "nessun appuntamento" (verifica QA, secondo giro)
{
  const page = await open(1180, (p) => p.route(/\/appointments\?/, (route) => route.fulfill({ status: 500, json: { error: 'x' } })));
  await page.waitForTimeout(1000);
  const txt = await page.locator('.turno-side .turno-card').first().innerText();
  check('Appuntamenti non disponibili: la card lo dice con Riprova, non "nessun appuntamento"', /Appuntamenti non disponibili/.test(txt) && /Riprova/.test(txt) && !/Nessun altro appuntamento/.test(txt), txt.replace(/\n/g, ' | '));
  await page.close();
}
{
  // Agenda su un altro giorno, poi ritorno al Turno: si ricarica oggi con il filtro dell'operatore.
  const page = await open(1180);
  const reqs = [];
  page.on('request', (r) => { if (/\/appointments\?/.test(r.url())) reqs.push(new URL(r.url()).search); });
  await page.locator('.teams-sidebar__item[title="Agenda"]').click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Intervallo successivo' }).click();
  await page.waitForTimeout(1200);
  await page.locator('.teams-sidebar__item[title="Turno"]').click();
  await page.waitForTimeout(2000);
  const txt = await page.locator('.turno-side .turno-card').first().innerText();
  const last = reqs.at(-1) ?? '';
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' });
  const opId = new URLSearchParams(reqs[0] ?? '').get('operatorId');
  check("Dopo un altro giorno in Agenda, il Turno ricarica oggi con lo stesso filtro dell'operatore", !/Nessun altro appuntamento/.test(txt) && /\d{2}:\d{2}/.test(txt) && !!opId && new URLSearchParams(last).get('operatorId') === opId && new URLSearchParams(last).get('from') === today && new URLSearchParams(last).get('to') === today, JSON.stringify({ first: reqs[0], last, card: txt.replace(/\n/g, ' | ').slice(0, 120) }));
  await page.close();
}

// AC5: larghezze
for (const width of [390, 768, 1024, 1440]) {
  const page = await open(width);
  const r = await page.evaluate(() => {
    const a = document.querySelector('.adesso-queue').getBoundingClientRect();
    const s = document.querySelector('.turno-side').getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      stacked: s.top > a.top && Math.round(s.left) === Math.round(a.left),
    };
  });
  check(
    `AC5 ${width}: nessuno scorrimento orizzontale${width < 1024 ? ', colonne impilate' : ', colonne affiancate'}`,
    r.overflow <= 0 && (width < 1024 ? r.stacked : !r.stacked),
    JSON.stringify(r),
  );
  await page.screenshot({ path: `${DIR}/screenshots/turno-${width}.png`, fullPage: width < 1024 });
  await page.close();
}

await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
process.exit(log.some((l) => l.startsWith('FAIL')) ? 1 : 0);
