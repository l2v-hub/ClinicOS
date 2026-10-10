// Delay one real, authorized prefetch across logout on a local synthetic patient.
// Verifies that the next role never receives the previous role's narrative cache.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const backend = process.env.QA_BACKEND_URL ?? 'http://127.0.0.1:3101';
const frontend = process.env.QA_FRONTEND_URL ?? 'http://127.0.0.1:5175';
for (const base of [backend, frontend])
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const patientId = process.env.QA_SYNTHETIC_PATIENT_ID;
assert.ok(patientId, 'Provide the patient created in the isolated API audit');
const out = resolve(process.argv[2] ?? '/tmp/clinicos-session-isolation');
mkdirSync(out, { recursive: true });
const marker = 'QA SYNTHETIC narrative for doctor only';
const login = await fetch(backend + '/auth/simulator/session', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ identityId: 'SIM-DOCTOR-1' }),
});
assert.equal(login.status, 201);
const { token } = await login.json();
const updated = await fetch(`${backend}/patients/${patientId}/narrative-sections/ANAMNESIS`, {
  method: 'PUT',
  headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  body: JSON.stringify({ reviewedText: marker, reviewStatus: 'reviewed' }),
});
assert.equal(updated.status, 200);
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {}),
});
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(20000);
let release, reached, releaseDenied;
const held = new Promise((r) => (release = r));
const fetched = new Promise((r) => (reached = r));
const deniedHeld = new Promise((r) => (releaseDenied = r));
let first = true;
const evidence = { patientId, marker, requests: [] };
page.on('response', (r) => {
  if (r.url().endsWith(`/patients/${patientId}/narrative-sections`))
    evidence.requests.push({ status: r.status() });
});
try {
  await page.route(`${backend}/patients/${patientId}/narrative-sections`, async (route) => {
    if (!first) {
      const denied = await route.fetch();
      evidence.nextRoleNarrativeStatus = denied.status();
      await deniedHeld;
      return route.fulfill({ response: denied });
    }
    first = false;
    const response = await route.fetch();
    assert.equal(response.status(), 200);
    evidence.authorizedResponse = await response.json();
    reached();
    await held;
    await route.fulfill({ response });
  });
  await page.goto(`${frontend}/#/dettaglio-paziente/${patientId}`);
  await page.getByRole('button', { name: /^Medico 1/ }).click();
  await page.locator('.patient-record-view').waitFor();
  let prefetchTimeout;
  try {
    await Promise.race([
      fetched,
      new Promise((_, reject) => {
        prefetchTimeout = setTimeout(() => reject(new Error('No narrative prefetch')), 20000);
      }),
    ]);
  } finally {
    clearTimeout(prefetchTimeout);
  }
  await page.locator('.topbar-avatar').click();
  await page.getByRole('button', { name: 'Cambia profilo', exact: true }).click();
  await page.getByRole('button', { name: /^OSS 1/ }).click();
  await page.getByRole('navigation', { name: 'Navigazione principale' }).waitFor();
  release();
  await page.waitForTimeout(800);
  evidence.cacheAfterRoleChange = await page.evaluate(async (id) => {
    const cache = await import('/src/lib/sessionCache.ts');
    return cache.readSessionCache(`narrative:${id}`) ?? null;
  }, patientId);
  await page.evaluate((id) => {
    window.location.hash = `#/dettaglio-paziente/${id}`;
  }, patientId);
  await page.locator('.patient-record-view').waitFor();
  await page.getByRole('tab', { name: 'Clinica', exact: true }).click();
  await page.waitForTimeout(750);
  const source = page.locator('details[data-source-topic="ANAMNESIS"]');
  if (await source.count()) await source.locator('summary').click();
  await page.waitForTimeout(250);
  evidence.markerInDom = (await page.locator('body').innerText()).includes(marker);
  evidence.markerElements = await page.getByText(marker, { exact: false }).count();
  evidence.markerVisible =
    evidence.markerElements > 0 &&
    (await page.getByText(marker, { exact: false }).first().isVisible());
  await page.screenshot({
    path: resolve(out, 'oss-after-doctor-late-response.png'),
    fullPage: true,
  });
  evidence.pass = !evidence.cacheAfterRoleChange && !evidence.markerElements;
  writeFileSync(resolve(out, 'results.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
  process.exitCode = evidence.pass ? 0 : 1;
} finally {
  release();
  releaseDenied();
  await browser.close();
  await fetch(backend + '/auth/simulator/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}
