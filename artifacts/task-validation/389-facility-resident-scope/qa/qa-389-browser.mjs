// QA gate #389 — independent browser evidence on a LOCAL synthetic stack (backend :3104, vite :5204).
// Usage (from worktree root): node artifacts/task-validation/389-facility-resident-scope/qa/qa-389-browser.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const FRONT = process.env.FRONT ?? 'http://127.0.0.1:5204';
const API = process.env.API ?? 'http://127.0.0.1:3104';
const OUT = 'artifacts/task-validation/389-facility-resident-scope/qa';
mkdirSync(`${OUT}/screens`, { recursive: true });

// Synthetic seed (scripts/assistant/seed-assistant-demo.mts + scripts/e2e/seed-phase10-demo.mts).
const RESIDENTS = ['Conti', 'Galli', 'Nanni', 'Neri', 'Verdi'];
const results = [];
const httpErrors = [];
const consoleErrors = [];
const apiCalls = [];
function check(id, name, ok, detail = '') {
  results.push({ id, name, result: ok ? 'PASS' : 'FAIL', detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name}${detail ? ' — ' + detail : ''}`);
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
await context.tracing.start({ screenshots: true, snapshots: true });
const page = await context.newPage();
let currentRole = '';
let lastAuth = '';
page.on('request', (req) => {
  const a = req.headers()['authorization'];
  if (a && req.url().startsWith(API)) lastAuth = a;
});
page.on('console', (m) => {
  if (m.type() === 'error' && !/Failed to load resource/.test(m.text()))
    consoleErrors.push(`${currentRole}: ${m.text().slice(0, 200)}`);
});
page.on('response', (r) => {
  const path = new URL(r.url()).pathname;
  if (r.url().startsWith(API) && /\/patients/.test(path))
    apiCalls.push(`${currentRole} ${r.status()} ${r.request().method()} ${path}`);
  if (r.status() >= 500 || (r.status() >= 400 && !/\/auth\/|favicon/.test(r.url())))
    httpErrors.push(`${currentRole} ${r.status()} ${r.request().method()} ${path}`);
});

const shot = (name) => page.screenshot({ path: `${OUT}/screens/${name}.png`, fullPage: true });
const side = (name) => page.locator('.teams-sidebar').getByRole('button', { name }).first().click();

async function loginAs(role) {
  currentRole = role;
  await page
    .getByRole('button', { name: new RegExp(role) })
    .first()
    .click();
  await page.waitForSelector('.teams-sidebar', { timeout: 20000 });
  await page.waitForTimeout(1000);
}
async function switchProfile() {
  await page.locator('.topbar-avatar').click();
  await page.getByRole('button', { name: /Cambia profilo/ }).click();
  await page.waitForSelector('.teams-sidebar', { state: 'detached', timeout: 10000 });
}
async function pazientiList() {
  const btn = page.locator('.teams-sidebar').getByRole('button', { name: 'Pazienti' });
  if (await btn.count()) await btn.first().click();
  else await page.getByText('Totale pazienti').first().click(); // supervisor: dashboard card → Pazienti
  const list = page.locator('.plist-list');
  await list.waitFor({ timeout: 15000 });
  // Wait until the roster stops changing (first page loaded).
  let prev = '';
  for (let i = 0; i < 20; i += 1) {
    await page.waitForTimeout(400);
    const txt = await list.innerText();
    if (txt === prev && /\S/.test(txt)) break;
    prev = txt;
  }
  const text = await list.innerText();
  const subtitle = await page
    .getByText(/caricati su|risultati caricati/)
    .first()
    .innerText()
    .catch(() => '');
  return { present: RESIDENTS.filter((n) => text.includes(n)), text, subtitle };
}

const roster = {};
try {
  await page.goto(FRONT);
  const roles = ['Supervisore 1', 'Medico 1', 'Infermiere 1', 'OSS 1'];
  for (const [i, role] of roles.entries()) {
    if (i > 0) await switchProfile();
    await loginAs(role);
    const r = await pazientiList();
    roster[role] = r;
    const slug = role.replace(/\s+/g, '-').toLowerCase();
    await shot(`01-pazienti-${slug}`);
    check(
      `ROSTER-${slug}`,
      `${role}: Pazienti/Tutti contains all 5 synthetic residents (registered by doctor, nurse, OSS)`,
      r.present.length === RESIDENTS.length,
      `${r.present.join(',')} · "${r.subtitle}"`,
    );
  }
  const sets = Object.values(roster).map((r) => r.present.join(','));
  check(
    'ROSTER-SAME',
    'All four profiles see the same resident set',
    new Set(sets).size === 1,
    sets[0],
  );

  // Same session, profile switched back and forth: no stale rows from the previous profile.
  await switchProfile();
  await loginAs('Supervisore 1');
  const back = await pazientiList();
  await switchProfile();
  await loginAs('Infermiere 1');
  const nurseAgain = await pazientiList();
  await shot('02-switch-back-infermiere');
  const rowCount = (t) => t.split('\n').filter((l) => RESIDENTS.some((n) => l.includes(n))).length;
  check(
    'SWITCH-NO-STALE',
    'Supervisore → Infermiere switch in the same session: same roster, no duplicated/stale rows',
    back.present.length === 5 &&
      nurseAgain.present.length === 5 &&
      rowCount(nurseAgain.text) === rowCount(roster['Infermiere 1'].text),
    `supervisor=${back.present.length} nurse=${nurseAgain.present.length} rows=${rowCount(nurseAgain.text)}/${rowCount(roster['Infermiere 1'].text)} subtitle="${nurseAgain.subtitle}"`,
  );

  // Nurse opens a resident registered by the DOCTOR (Neri).
  await page.locator('.plist-list').getByText('Neri').first().click();
  await page.waitForTimeout(2500);
  const nurseChart = await page.locator('main, .main-area-clean').first().innerText();
  const notFound = /non trovato|non disponibile|accesso negato/i.test(nurseChart);
  await shot('03-infermiere-apre-neri-registrato-dal-medico');
  check(
    'NURSE-OPEN-DOCTOR-RESIDENT',
    'Nurse opens a resident registered by the doctor (chart loads, no 403/404)',
    /Neri/.test(nurseChart) && !notFound && !httpErrors.some((e) => e.startsWith('Infermiere 1')),
    page.url().split('#')[1] ?? '',
  );
  const nurseTabs = (await page.locator('.top-nav__item').allInnerTexts()).map((t) => t.trim());

  // OSS chart: Terapia/Documenti hidden.
  await switchProfile();
  await loginAs('OSS 1');
  await pazientiList();
  await page.locator('.plist-list').getByText('Neri').first().click();
  await page.waitForTimeout(2500);
  const ossTabs = (await page.locator('.top-nav__item').allInnerTexts()).map((t) =>
    t.replace(/\s+/g, ' ').trim(),
  );
  const ossSidebar = (await page.locator('.teams-sidebar button').allInnerTexts()).map((t) =>
    t.replace(/\s+/g, ' ').trim(),
  );
  await shot('04-oss-cartella-neri');
  check(
    'OSS-NO-THERAPY-DOCS',
    'OSS chart hides Terapia and Documenti (capability policy unchanged)',
    ossTabs.length > 0 &&
      !ossTabs.some((t) => /^Terapia|Documenti/.test(t)) &&
      !ossSidebar.some((t) => /^Terapia/.test(t)),
    `oss tabs=${ossTabs.join('|')} ; nurse tabs=${nurseTabs.join('|')}`,
  );

  // Server-side: OSS direct API call for therapy/documents is still denied.
  const neriId = page.url().match(/[a-z0-9]{20,}/)?.[0];
  const direct = await page.evaluate(
    async ({ api, id, auth }) => {
      const headers = auth ? { Authorization: auth } : {};
      const t = await fetch(`${api}/patients/${id}/therapies/page`, {
        headers,
        credentials: 'include',
      });
      const d = await fetch(`${api}/patients/${id}/documents`, { headers, credentials: 'include' });
      const m = await fetch(`${api}/patients/does-not-exist-389-qa`, {
        headers,
        credentials: 'include',
      });
      return { therapy: t.status, documents: d.status, missing: m.status, hasToken: !!auth };
    },
    { api: API, id: neriId, auth: lastAuth },
  );
  check(
    'OSS-DIRECT-API-DENIED',
    'OSS direct API: therapy & documents denied server-side; missing resident 404',
    direct.therapy === 403 && direct.documents === 403 && direct.missing === 404,
    JSON.stringify(direct),
  );
} catch (err) {
  check('RUN', 'script completed without exceptions', false, String(err).slice(0, 300));
  await shot('zz-error').catch(() => {});
} finally {
  await context.tracing.stop({ path: `${OUT}/trace.zip` });
  await browser.close();
}
const expectedDenials =
  /OSS 1 403 GET \/patients\/[^/]+\/(therapies\/page|documents)$|404 GET \/patients\/does-not-exist-389-qa$/;
const unexpectedHttp = httpErrors.filter((e) => !expectedDenials.test(e));
check(
  'NO-HTTP-ERRORS',
  'No unexpected HTTP 4xx/5xx during the UI flow',
  unexpectedHttp.length === 0,
  unexpectedHttp.join(' ; '),
);
check(
  'NO-CONSOLE-ERRORS',
  'No console errors',
  consoleErrors.length === 0,
  consoleErrors.join(' ; '),
);
writeFileSync(
  `${OUT}/results.json`,
  JSON.stringify(
    {
      when: new Date().toISOString(),
      front: FRONT,
      api: API,
      results,
      httpErrors,
      consoleErrors,
      apiCalls,
      roster: Object.fromEntries(
        Object.entries(roster).map(([k, v]) => [k, { present: v.present, subtitle: v.subtitle }]),
      ),
    },
    null,
    2,
  ),
);
const failed = results.filter((r) => r.result === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
