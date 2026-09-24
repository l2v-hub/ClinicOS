// Navigation-performance harness. Drives the real SPA (dev server or preview build) against the
// stub API on :3001 and measures, for every context switch:
//   shellMs    — first DOM change after the click (page shell/heading appears)
//   contentMs  — first frame where no "Caricamento…" placeholder is visible AND the page text has
//                reached ≥ 90% of its final length  ← the wait the operator actually perceives
//   settledMs  — last DOM mutation in the page area (all data arrived)
//   api        — API requests issued for that navigation (OPTIONS preflights excluded)
//   chunks     — lazy JS chunks fetched for that navigation
//   longTasks  — main-thread tasks > 50 ms during that navigation
//
//   node measure.mjs --base http://localhost:5173 --out baseline.json [--cpu 4] [--label name]
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
};
const BASE = arg('base', 'http://localhost:5173');
const OUT = arg('out', null);
const CPU = Number(arg('cpu', '1'));
const LABEL = arg('label', BASE);
const ROLE = arg('role', 'Operatore');

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const page = await context.newPage();
if (CPU > 1) {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
}
await page.addInitScript(() => {
  window.__lt = [];
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__lt.push({ s: e.startTime, d: e.duration });
    }).observe({ type: 'longtask', buffered: true });
  } catch {
    /* unsupported */
  }
});

const consoleErrors = [];
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
let apiRequests = [];
let chunkRequests = [];
page.on('request', (r) => {
  const u = r.url();
  if (u.startsWith('http://localhost:3001') && r.method() !== 'OPTIONS')
    apiRequests.push(`${r.method()} ${u.replace('http://localhost:3001', '').split('?')[0]}`);
  else if (/\.(m?js)(\?|$)/.test(u) && !u.includes('/@vite/') && !u.includes('/node_modules/'))
    chunkRequests.push(u.split('/').pop().split('?')[0]);
});

const results = [];

async function measure(label, action, opts = {}) {
  apiRequests = [];
  chunkRequests = [];
  await page.evaluate(() => {
    const main = document.querySelector('.page-content') || document.body;
    window.__mo?.disconnect();
    window.__m = {
      t0: performance.now(),
      first: null,
      last: performance.now(),
      muts: 0,
      lt0: window.__lt.length,
      samples: [],
      done: false,
    };
    window.__mo = new MutationObserver((ms) => {
      const n = performance.now();
      window.__m.muts += ms.length;
      if (window.__m.first === null) window.__m.first = n;
      window.__m.last = n;
    });
    window.__mo.observe(main, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });
    const tick = () => {
      if (window.__m.done) return;
      const text = main.textContent || '';
      window.__m.samples.push([performance.now(), text.length, /Caricamento/.test(text) ? 1 : 0]);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await action();
  const settle = opts.settle ?? 700;
  const deadline = Date.now() + 20000;
  let m;
  for (;;) {
    await page.waitForTimeout(50);
    m = await page.evaluate(() => {
      const main = document.querySelector('.page-content') || document.body;
      const now = performance.now();
      const s = window.__m.samples;
      return {
        t0: window.__m.t0,
        first: window.__m.first,
        last: window.__m.last,
        muts: window.__m.muts,
        now,
        loading: /Caricamento/.test(main.textContent || ''),
        lastLen: s.length ? s[s.length - 1][1] : 0,
      };
    });
    const quiet = m.now - m.last > settle && m.now - m.t0 > 300;
    if ((quiet && !m.loading) || Date.now() > deadline) break;
  }
  const fin = await page.evaluate(() => {
    window.__m.done = true;
    window.__mo?.disconnect();
    const main = document.querySelector('.page-content') || document.body;
    const s = window.__m.samples;
    const finalLen = s.length ? s[s.length - 1][1] : 0;
    // last sample that was still "not content": a placeholder visible, or text below 90% of final
    let content = null;
    const startAt = window.__m.first ?? Infinity;
    for (const [t, len, loading] of s) {
      if (t >= startAt && !loading && len >= finalLen * 0.9) {
        content = t;
        break;
      }
    }
    return {
      content,
      samples: s.length,
      finalLen,
      lt: window.__lt.slice(window.__m.lt0),
      text: (main.innerText || '').slice(0, 90).replace(/\n/g, ' | '),
    };
  });
  const r = {
    label,
    shellMs: m.first === null ? null : Math.round(m.first - m.t0),
    contentMs: fin.content === null ? null : Math.round(fin.content - m.t0),
    settledMs: Math.round(m.last - m.t0),
    muts: m.muts,
    api: apiRequests.length,
    apiList: [...new Set(apiRequests)],
    chunks: chunkRequests.length,
    chunkList: chunkRequests,
    longTasks: fin.lt.map((x) => Math.round(x.d)),
    stillLoading: m.loading,
    text: fin.text,
  };
  results.push(r);
  console.log(
    `${label.padEnd(26)} shell=${String(r.shellMs).padStart(4)} content=${String(r.contentMs).padStart(5)} settled=${String(r.settledMs).padStart(5)} api=${String(r.api).padStart(2)} chunks=${String(r.chunks).padStart(2)} lt=${r.longTasks.length ? r.longTasks.join('/') : '-'}${r.stillLoading ? ' STILL-LOADING' : ''}`,
  );
  return r;
}

const sidebar = (label) => page.locator('.teams-sidebar button', { hasText: label }).first();
const nav = (label) => measure(`nav:${label}`, () => sidebar(label).click());
const openFirstPatient = (tag) =>
  measure(`row->detail${tag}`, () => page.locator('.page-content tbody tr').nth(1).click());
const tab = (name) =>
  measure(`tab:${name}`, () =>
    page
      .getByRole('tab', { name: new RegExp('^' + name) })
      .first()
      .click(),
  );

// ── Login ────────────────────────────────────────────────────────────────────
const tLogin = Date.now();
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.getByText(ROLE, { exact: true }).first().click();
await page.locator('.teams-sidebar').waitFor({ timeout: 30000 });
await page.waitForTimeout(1500);
console.log(`login+dashboard ready in ~${Date.now() - tLogin}ms (${LABEL})`);

// ── Round 1: first visits (cold chunks) ──────────────────────────────────────
await nav('Pazienti');
await nav('Dashboard');
await nav('Pazienti');
await openFirstPatient('(1st)');
await measure('back->Pazienti', () => page.goBack());
await openFirstPatient('(2nd)');
await tab('Clinica');
await tab('Terapia Farmacologica');
await tab('Diagnosi');
await tab('Diario');
await tab('Moduli');
await tab('Raccolta dati ingresso');
await nav('Pazienti');
await nav('Consegne');
await nav('Pazienti');
await nav('Agenda');
await nav('Pazienti');
await nav('Note');
await nav('Pazienti');
await nav('Terapia');
await nav('Pazienti');
await nav('Parametri');
await nav('Pazienti');
await nav('Dashboard');
// ── Round 2: warm revisits ───────────────────────────────────────────────────
await nav('Pazienti');
await nav('Consegne');
await nav('Agenda');
await nav('Note');
await nav('Terapia');
await nav('Pazienti');
await openFirstPatient('(3rd)');
await tab('Clinica');
await tab('Diario');
await nav('Dashboard');

const nz = (v) => v ?? 20000;
const summary = {
  label: LABEL,
  base: BASE,
  cpu: CPU,
  at: new Date().toISOString(),
  consoleErrors: consoleErrors.slice(0, 10),
  results,
  totals: {
    steps: results.length,
    contentAvgMs: Math.round(results.reduce((s, r) => s + nz(r.contentMs), 0) / results.length),
    contentP50Ms: [...results.map((r) => nz(r.contentMs))].sort((a, b) => a - b)[
      Math.floor(results.length / 2)
    ],
    contentMaxMs: Math.max(...results.map((r) => nz(r.contentMs))),
    settledAvgMs: Math.round(results.reduce((s, r) => s + r.settledMs, 0) / results.length),
    apiTotal: results.reduce((s, r) => s + r.api, 0),
    chunksTotal: results.reduce((s, r) => s + r.chunks, 0),
    stepsOver300msContent: results.filter((r) => nz(r.contentMs) > 300).length,
    stepsOver1000msContent: results.filter((r) => nz(r.contentMs) > 1000).length,
  },
};
console.log('TOTALS', JSON.stringify(summary.totals));
if (consoleErrors.length) console.log('consoleErrors', consoleErrors.length, consoleErrors[0]);
if (OUT) writeFileSync(OUT, JSON.stringify(summary, null, 2));
await browser.close();
