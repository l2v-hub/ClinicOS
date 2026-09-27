// Evidenza browser: coda "Da fare subito" in cima ad "Adesso", ordinata per urgenza.
// Lo stub API (:3001) fornisce terapie in ritardo e consegne urgenti reali; gli stati "non
// disponibile" e "vuoto" sono simulati con page.route sulle stesse chiamate della dashboard.
//   BASE=http://localhost:4173 node <questo file>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR =
  'artifacts/task-validation/hmi-coda-adesso-ordinata-per-urgenza-nella-dashboard-operatore';
mkdirSync(`${DIR}/screenshots`, { recursive: true });
mkdirSync(`${DIR}/logs`, { recursive: true });
const BASE = process.env.BASE ?? 'http://localhost:4173';
const log = [];
const check = (n, ok, d = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);
const RANK = {
  'terapia-ritardo': 1,
  'consegna-scaduta': 2,
  'consegna-imminente': 3,
  'terapia-imminente': 4,
  'anomalia-farmaci': 5,
  'consegna-urgente': 6,
};

const browser = await chromium.launch();

async function openDashboard(width, setup) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  if (setup) await setup(page);
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.locator('.adesso-queue').waitFor({ timeout: 15000 });
  // attende che le fonti abbiano risposto (niente più avvisi di caricamento)
  await page
    .waitForFunction(
      () => !document.querySelector('.adesso-queue [role="status"].adesso-queue__notice'),
      null,
      { timeout: 15000 },
    )
    .catch(() => {});
  await page.waitForTimeout(500);
  return page;
}

function readQueue(page) {
  return page.evaluate(() => {
    const q = document.querySelector('.adesso-queue');
    const col = q?.closest('.od-shift__col');
    const rows = [...q.querySelectorAll('.adesso-queue__row')].map((r) => ({
      kind: [...r.classList]
        .find((c) => c.startsWith('adesso-queue__row--'))
        ?.replace('adesso-queue__row--', ''),
      nome: r.querySelector('.adesso-queue__patient')?.textContent?.trim(),
      tempo: r.querySelector('.adesso-queue__time')?.textContent?.trim(),
      late: r.querySelector('.adesso-queue__time')?.classList.contains('is-late'),
      isButton: r.querySelector('.adesso-queue__patient')?.tagName === 'BUTTON',
      height: Math.round(r.getBoundingClientRect().height),
      right: Math.round(r.getBoundingClientRect().right),
    }));
    return {
      positionInColumn: col ? [...col.children].indexOf(q) : -1,
      columnTitle: col?.querySelector('.od-shift__title')?.textContent?.trim(),
      count: q.querySelector('.adesso-queue__count')?.textContent?.trim() ?? null,
      more: q.querySelector('.adesso-queue__more')?.textContent?.trim() ?? null,
      alerts: [...q.querySelectorAll('[role="alert"]')].map((e) => e.textContent.trim()),
      empty: q.querySelector('.adesso-queue__empty')?.textContent?.trim() ?? null,
      rows,
      queueRight: Math.round(q.getBoundingClientRect().right),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      deadlinesAfter: col
        ? [...col.children].indexOf(col.querySelector('.therapy-deadlines')) >
          [...col.children].indexOf(q)
        : false,
    };
  });
}

// 1. Dati reali dello stub, a più larghezze.
for (const width of [1280, 1024, 768, 390]) {
  const page = await openDashboard(width);
  const m = await readQueue(page);
  check(
    `${width}: "Da fare subito" è il primo blocco di "Adesso", prima di "Prossime terapie"`,
    m.columnTitle === 'Adesso' && m.positionInColumn === 1 && m.deadlinesAfter,
    JSON.stringify({ col: m.columnTitle, pos: m.positionInColumn }),
  );
  check(
    `${width}: al massimo 6 righe, contatore e "Altre N" coerenti`,
    m.rows.length <= 6 &&
      m.rows.length > 0 &&
      (m.rows.length < 6 ? m.more === null : /^Altre \d+ in coda/.test(m.more ?? '')) &&
      Number(m.count) >= m.rows.length,
    JSON.stringify({ rows: m.rows.length, count: m.count, more: m.more }),
  );
  const ranks = m.rows.map((r) => RANK[r.kind]);
  const monotone = ranks.every((r, i) => i === 0 || ranks[i - 1] <= r);
  const lateRows = m.rows.filter((r) => r.kind === 'terapia-ritardo');
  const lateMinutes = lateRows.map((r) => Number(/In ritardo di (\d+) min/.exec(r.tempo)?.[1]));
  const lateDesc = lateMinutes.every(
    (v, i) => Number.isFinite(v) && (i === 0 || lateMinutes[i - 1] >= v),
  );
  check(
    `${width}: ordine per urgenza (gruppi in ordine; ritardi decrescenti e in rosso)`,
    monotone && lateRows.length > 0 && lateDesc && lateRows.every((r) => r.late),
    JSON.stringify(m.rows.map((r) => `${r.kind}:${r.tempo}`)),
  );
  check(
    `${width}: ogni riga ≥ 48 px, paziente è un pulsante, nessuno scorrimento orizzontale`,
    m.rows.every((r) => r.height >= 48 && r.isButton && r.right <= width + 0.5) && m.overflow <= 0,
    JSON.stringify({ heights: m.rows.map((r) => r.height), overflow: m.overflow }),
  );
  await page.screenshot({
    path: `${DIR}/screenshots/adesso-${width}.png`,
    fullPage: width !== 390,
  });
  if (width === 1280) {
    // AC3: il paziente della prima riga apre la cartella
    const first = m.rows[0];
    await page.locator('.adesso-queue__patient').first().click();
    await page.waitForTimeout(1500);
    const [cognome, ...resto] = first.nome.split(' ');
    const atteso = `${cognome}, ${resto.join(' ')}`;
    const opened = await page.locator('.patient-compact-header', { hasText: atteso }).count();
    check(`1280: il paziente della prima riga apre la sua cartella (${atteso})`, opened > 0);
    await page.screenshot({ path: `${DIR}/screenshots/adesso-apre-cartella.png` });
  }
  await page.close();
}

// 2. Scadenze terapia non disponibili: avviso esplicito, le consegne restano.
{
  const page = await openDashboard(1280, (p) =>
    p.route(/\/therapy-slots\?/, (route) => route.fulfill({ status: 500, json: { error: 'x' } })),
  );
  await page
    .locator('.adesso-queue [role="alert"]')
    .first()
    .waitFor({ timeout: 15000 })
    .catch(() => {});
  const m = await readQueue(page);
  check(
    'terapie non disponibili: la coda lo dice e non include terapie',
    m.alerts.some((a) => /Scadenze terapia non disponibili/.test(a)) &&
      !m.rows.some((r) => r.kind.startsWith('terapia')),
    JSON.stringify(m.alerts),
  );
  check(
    'terapie non disponibili: le consegne urgenti restano in coda',
    m.rows.length > 0 && m.rows.every((r) => r.kind.startsWith('consegna')),
    JSON.stringify(m.rows.map((r) => r.kind)),
  );
  await page.screenshot({ path: `${DIR}/screenshots/adesso-terapie-non-disponibili.png` });
  await page.close();
}

// 3. Fonti pronte e vuote: "Niente in sospeso adesso".
{
  const page = await openDashboard(1280, async (p) => {
    await p.route(/\/therapy-slots\?/, (route) => route.fulfill({ json: [] }));
    await p.route(/\/consegne\/overview/, async (route) => {
      const res = await route.fetch();
      const body = await res.json();
      route.fulfill({
        json: { ...body, urgentPreview: [], summary: { ...body.summary, urgentOpen: 0 } },
      });
    });
  });
  await page
    .locator('.adesso-queue__empty')
    .waitFor({ timeout: 15000 })
    .catch(() => {});
  const m = await readQueue(page);
  check(
    'fonti pronte e vuote: "Niente in sospeso adesso", nessun avviso',
    m.empty === 'Niente in sospeso adesso.' && m.rows.length === 0 && m.alerts.length === 0,
    JSON.stringify({ empty: m.empty, alerts: m.alerts }),
  );
  await page.screenshot({ path: `${DIR}/screenshots/adesso-vuoto.png` });
  await page.close();
}

await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
process.exit(log.some((l) => l.startsWith('FAIL')) ? 1 : 0);
