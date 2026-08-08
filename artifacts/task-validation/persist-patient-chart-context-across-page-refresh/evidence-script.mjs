// Evidence script for task-validation/persist-patient-chart-context-across-page-refresh.
// Drives real chromium against the running Vite dev server (localhost:5173) with the app's
// backend fetches stubbed via page.route — no Postgres needed (this cycle tests view-state
// restoration on refresh, not data persistence). Run from the repo root:
//   node artifacts/task-validation/persist-patient-chart-context-across-page-refresh/evidence-script.mjs
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'http://localhost:5173';
const OUT = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(OUT, 'screenshots');
const TRACE = path.join(OUT, 'trace');
const LOGS = path.join(OUT, 'logs');
mkdirSync(SHOTS, { recursive: true });
mkdirSync(TRACE, { recursive: true });
mkdirSync(LOGS, { recursive: true });

const MOCK_PATIENT = {
  id: 'qa-mock-patient-001',
  medicalRecordNumber: 'QA-0001',
  firstName: 'Anna',
  lastName: 'Rossi',
  dateOfBirth: '1960-05-12',
  sex: 'F',
  codiceFiscale: null,
  email: null,
  phone: null,
};
const MOCK_PATIENTS = [MOCK_PATIENT];

async function stubBackend(page) {
  await page.route('**/patients', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PATIENTS) });
    } else {
      await route.continue();
    }
  });
  await page.route('**/patients/clinical-summary', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  const emptyJsonRoutes = [
    '**/therapy-slots**',
    '**/appointments**',
    '**/admin/rooms',
    '**/consegne',
    '**/operators/schedules',
    '**/operators',
    '**/notes',
  ];
  for (const pattern of emptyJsonRoutes) {
    await page.route(pattern, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );
  }
  // Cartella fetch is intentionally left unstubbed: the app's own try/catch + getCartella()
  // default-fallback handles the resulting connection failure (no backend running on :3001),
  // which is exactly how this flow already degrades gracefully without a DB.
}

const BENIGN = /favicon|sourcemap|\.map\b|net::ERR_ABORTED|ResizeObserver|hydration/i;

function wireConsole(page, bucket) {
  page.on('console', (m) => {
    if (m.type() === 'error' && !BENIGN.test(m.text())) bucket.push(m.text().slice(0, 300));
  });
  page.on('pageerror', (e) => bucket.push(`pageerror: ${String(e).slice(0, 300)}`));
}

async function enterAs(page, role = 'Operatore') {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.getByText(role, { exact: true }).first().click({ timeout: 30_000 });
  await page.waitForTimeout(1200);
}

// DISCOVERY (this cycle): `utente` has no persistence anywhere (no localStorage/cookie/session
// check) — `if (!utente) return <Login .../>` at the App.tsx render root means EVERY reload or
// full navigation shows the role-picker again, unconditionally, regardless of navKey/hash. This
// is a separate, larger issue than the one this contract scopes (flagged for a future cycle —
// touches session/auth-adjacent state, which is a stop-and-ask category, not a silent fix).
// So the real post-refresh flow this fix improves is: reload -> role-picker -> (re-click role) ->
// land directly on the previously-open patient's chart, instead of -> dashboard -> re-search.
async function reenterRoleAfterReload(page, role = 'Operatore') {
  await page.waitForTimeout(400);
  const roleText = page.getByText(role, { exact: true });
  if (await roleText.first().isVisible().catch(() => false)) {
    await roleText.first().click({ timeout: 10_000 });
    await page.waitForTimeout(600);
  }
}

// Checks whether ANY element matching `text` is currently visible — the app renders both a
// table view and a card view for the patient list and toggles visibility with CSS per viewport,
// so `.first()` alone can resolve to a DOM-order match that's hidden at the current width.
async function textVisibleNow(page, text) {
  const loc = page.getByText(text, { exact: false });
  const count = await loc.count().catch(() => 0);
  for (let i = 0; i < count; i++) {
    if (await loc.nth(i).isVisible().catch(() => false)) return true;
  }
  return false;
}

// The app renders both a desktop table row and a mobile card for each patient (CSS toggles which
// one is display:none per viewport) — click whichever instance is actually visible right now.
async function clickPatientCard(page, text) {
  const loc = page.getByText(text, { exact: false });
  await expectVisibleAndClick(page, loc);
}

async function clickVisibleNav(page, label) {
  await expectVisibleAndClick(page, page.getByText(label, { exact: true }));
}

async function expectVisibleAndClick(page, loc) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const count = await loc.count().catch(() => 0);
    for (let i = 0; i < count; i++) {
      const el = loc.nth(i);
      if (await el.isVisible().catch(() => false)) {
        await el.click({ timeout: 5000 });
        return;
      }
    }
    await page.waitForTimeout(250);
  }
  throw new Error('expectVisibleAndClick: no visible match found within timeout');
}

async function run() {
  const browser = await chromium.launch();
  const results = { ac1: null, ac2: null, ac3: null, ac4: null, consoleErrors: [] };

  // ── Desktop viewport ──────────────────────────────────────────────
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.tracing.start({ screenshots: true, snapshots: true, title: 'desktop' });
    const page = await context.newPage();
    const consoleErrors = [];
    wireConsole(page, consoleErrors);
    await stubBackend(page);

    await enterAs(page, 'Operatore');
    await page.getByText('Pazienti', { exact: true }).first().click();
    await page.waitForTimeout(600);
    await clickPatientCard(page, 'Rossi, Anna');
    await page.waitForTimeout(600);

    const urlBeforeReload = page.url();
    const hashHasId = urlBeforeReload.includes(`dettaglio-paziente/${MOCK_PATIENT.id}`);
    await page.screenshot({ path: path.join(SHOTS, '01-desktop-before-reload-chart-open.png'), fullPage: true });

    // AC1 + AC2: reload and confirm the chart is restored (not the empty state), fetched fresh.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await reenterRoleAfterReload(page, 'Operatore');
    let sawEmptyStateBeforeRestore = false;
    for (let i = 0; i < 20; i++) {
      if (await textVisibleNow(page, 'Nessun paziente selezionato')) sawEmptyStateBeforeRestore = true;
      if (await textVisibleNow(page, 'Rossi, Anna')) break;
      await page.waitForTimeout(150);
    }
    const restored = await textVisibleNow(page, 'Rossi, Anna');
    await page.screenshot({ path: path.join(SHOTS, '02-desktop-after-reload-restored.png'), fullPage: true });
    results.ac1 = { hashEncodedId: hashHasId, sawEmptyStateFlash: sawEmptyStateBeforeRestore, restored };
    results.ac2 = { restoredViaFreshFetch: restored }; // MOCK_PATIENTS only exists in the route stub, so a
    // successful render proves the mount effect actually re-fetched from "the backend", not a stale copy.

    // AC3: invalid/unknown id in the hash — must fall back to the empty state, not hang/crash.
    // goto() to a hash-only URL is a same-document navigation (no reload) in a real browser, so
    // it wouldn't exercise the refresh path at all — force an actual reload after it, same as a
    // real F5 on a pasted/bookmarked link.
    await page.goto(BASE + '/#/dettaglio-paziente/does-not-exist', { waitUntil: 'domcontentloaded' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await reenterRoleAfterReload(page, 'Operatore');
    await page.waitForTimeout(1200);
    const emptyStateShown = await textVisibleNow(page, 'Nessun paziente selezionato');
    await page.screenshot({ path: path.join(SHOTS, '03-desktop-invalid-id-empty-state.png'), fullPage: true });
    results.ac3 = { emptyStateShown };

    // AC4: no regression for a non-patient hash-restored view. NOTE (discovery this cycle):
    // handleLogin already unconditionally reset ANY hash to the default dashboard pre-fix — this
    // app has never actually restored the *view* after refresh for any hash, patient or not
    // (only the *login gate itself* is new-to-this-repro knowledge, see the note above); the
    // diff (verified separately, static) only adds an early-return for the dettaglio-paziente/
    // prefix, leaving this pre-existing dashboard-landing behavior byte-for-byte untouched. So
    // the real regression check is: does normal navigation still work after landing there —
    // i.e. does clicking into Pazienti still show the list — not whether the hash itself restores.
    await page.goto(BASE + '/#/pazienti', { waitUntil: 'domcontentloaded' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await reenterRoleAfterReload(page, 'Operatore');
    await page.waitForTimeout(1000);
    const landedOnDashboard = await textVisibleNow(page, 'Benvenuto');
    await clickVisibleNav(page, 'Pazienti');
    await page.waitForTimeout(600);
    const patientListShown = await textVisibleNow(page, 'Rossi, Anna');
    await page.screenshot({ path: path.join(SHOTS, '04-desktop-pazienti-nav-unaffected.png'), fullPage: true });
    results.ac4Note = 'pre-existing: non-patient hashes were never restored after refresh even before this fix (handleLogin always resets to dashboard); diff only adds an early-return for dettaglio-paziente/, verified not to touch this path';
    Object.assign(results, { ac4Landed: { landedOnDashboard } });
    results.ac4 = { patientListShown };

    results.consoleErrors.push(...consoleErrors);
    await context.tracing.stop({ path: path.join(TRACE, 'desktop-trace.zip') });
    await context.close();
  }

  // ── Mobile viewport ───────────────────────────────────────────────
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    await context.tracing.start({ screenshots: true, snapshots: true, title: 'mobile' });
    const page = await context.newPage();
    const consoleErrors = [];
    wireConsole(page, consoleErrors);
    await stubBackend(page);

    await enterAs(page, 'Operatore');
    await page.getByLabel('Apri menu').click();
    await page.waitForTimeout(300);
    await page.getByText('Pazienti', { exact: true }).first().click();
    await page.waitForTimeout(600);
    await clickPatientCard(page, 'Rossi, Anna');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SHOTS, '05-mobile-before-reload-chart-open.png'), fullPage: true });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await reenterRoleAfterReload(page, 'Operatore');
    let mobileSawEmpty = false;
    for (let i = 0; i < 20; i++) {
      if (await textVisibleNow(page, 'Nessun paziente selezionato')) mobileSawEmpty = true;
      if (await textVisibleNow(page, 'Rossi, Anna')) break;
      await page.waitForTimeout(150);
    }
    const mobileRestored = await textVisibleNow(page, 'Rossi, Anna');
    await page.screenshot({ path: path.join(SHOTS, '06-mobile-after-reload-restored.png'), fullPage: true });
    results.mobile = { sawEmptyStateFlash: mobileSawEmpty, restored: mobileRestored };

    results.consoleErrors.push(...consoleErrors);
    await context.tracing.stop({ path: path.join(TRACE, 'mobile-trace.zip') });
    await context.close();
  }

  await browser.close();
  writeFileSync(path.join(LOGS, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
}

run().catch((e) => {
  console.error('EVIDENCE SCRIPT FAILED:', e);
  process.exit(1);
});
