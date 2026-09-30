// Phase 2 browser evidence (Role Simulator + Administrator "Ruoli e permessi" + live revocation).
// Run from the repo root with the demo stack up (backend :3101 with ROLE_SIMULATOR_ENABLED=true,
// frontend :5273 with VITE_API_URL=http://localhost:3101):
//   node qa-evidence/phase2-roles/roles-evidence.mjs
// Uses the `playwright` library (not @playwright/test). Real assertions; exits 1 on failure.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

const APP = process.env.APP_URL ?? 'http://localhost:5273/';
const OUT =
  process.env.EVIDENCE_DIR ??
  'artifacts/task-validation/phase-2-roles-authorization-and-capability-policy';
for (const dir of ['screenshots', 'trace', 'video', 'logs'])
  mkdirSync(`${OUT}/${dir}`, { recursive: true });

const results = [];
const consoleErrors = [];
const browser = await chromium.launch();

async function openAs(identityName, label) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: `${OUT}/video`, size: { width: 1440, height: 900 } },
  });
  await context.tracing.start({ screenshots: true, snapshots: true, title: label });
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`[${label}] ${m.text()}`);
  });
  await page.goto(APP);
  await page.getByText(identityName, { exact: true }).first().click();
  await page.waitForURL(/#\/(admin-dashboard|operator-dashboard)/);
  await page.waitForTimeout(1200);
  return { context, page, label };
}

async function close({ context, label }) {
  await context.tracing.stop({ path: `${OUT}/trace/${label}.zip` });
  await context.close();
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/screenshots/${name}.png` });
}

async function step(name, fn) {
  try {
    await fn();
    results.push({ step: name, result: 'PASS' });
    console.log(`PASS  ${name}`);
  } catch (error) {
    results.push({ step: name, result: 'FAIL', error: String(error?.message ?? error) });
    console.log(`FAIL  ${name}\n      ${error?.message ?? error}`);
  }
}

// Active policy version as shown in the page subtitle ("Policy attiva vN …").
let appliedVersion = 0;
async function activeVersion(page) {
  const text = await page.locator('.compact-topbar').innerText();
  const match = /Policy attiva v(\d+)/.exec(text);
  return match ? Number(match[1]) : NaN;
}
async function waitForActiveVersion(page, version) {
  await page
    .getByText(new RegExp(`Policy attiva v${version}(?!\\d)`))
    .first()
    .waitFor({ timeout: 10_000 });
}

const navText = async (page) => (await page.locator('.teams-sidebar').innerText()).split('\n');

// 1. Simulator login screen: server-owned identities, clearly marked as development only.
await step('simulator login lists the 5 server-owned identities', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(APP);
  await page.getByText('Simulatore ruoli — solo sviluppo').waitFor();
  for (const name of ['Administrator', 'Supervisor 1', 'Doctor 1', 'Nurse 1', 'OSS 1']) {
    await page.getByText(name, { exact: true }).first().waitFor();
  }
  await shot(page, '01-simulator-login');
  await context.close();
});

// 2. OSS 1 and Doctor 1: the GUI follows the effective capabilities (backend enforces anyway).
const oss = await openAs('OSS 1', 'oss-1');
await step('OSS 1: operator shell without Terapia (no drug capabilities)', async () => {
  const nav = await navText(oss.page);
  assert.ok(!nav.includes('Terapia'), `nav: ${nav.join(',')}`);
  assert.ok(nav.includes('Consegne'));
  assert.ok(!nav.includes('Ruoli'));
  await oss.page
    .locator('.user-menu-trigger, [aria-haspopup="menu"]')
    .first()
    .click()
    .catch(() => {});
  await oss.page.waitForTimeout(300);
  await shot(oss.page, '02-oss-shell');
});
await close(oss);

const doctor = await openAs('Doctor 1', 'doctor-1');
await step('Doctor 1: operator shell with Terapia, no Ruoli', async () => {
  const nav = await navText(doctor.page);
  assert.ok(nav.includes('Terapia'), `nav: ${nav.join(',')}`);
  assert.ok(!nav.includes('Ruoli'));
  await shot(doctor.page, '03-doctor-shell');
});
await close(doctor);

// 3. Nurse 1 opens a session that stays open during the policy change.
const nurse = await openAs('Nurse 1', 'nurse-1');
// Consegne → "Giro pazienti": the inline composer is the create entry point.
async function nurseCanCreateHandover() {
  await nurse.page.locator('.teams-sidebar').getByText('Consegne', { exact: true }).click();
  await nurse.page.waitForTimeout(1500);
  const form = await nurse.page.getByLabel('Cosa deve essere fatto?').count();
  const refusal = await nurse.page.getByText('Il tuo ruolo non può creare consegne.').count();
  return { form, refusal };
}
await step('Nurse 1 (before): can create handovers', async () => {
  assert.deepEqual(await nurseCanCreateHandover(), { form: 1, refusal: 0 });
  await shot(nurse.page, '04-nurse-consegne-before');
});

// 4. Administrator: Role & Capability matrix, views, impact preview, Save/Apply, history.
const admin = await openAs('Administrator', 'administrator');
const nurseCell = () => admin.page.getByLabel('Nurse – Consegne — crea', { exact: true });
async function openMatrixGroup(domainLabel) {
  const toggle = admin.page.locator('.rp-group-toggle', { hasText: domainLabel });
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
}
async function applyNurseCell(value, note) {
  await nurseCell().selectOption(value);
  await admin.page.getByPlaceholder('Nota (motivo della modifica)').fill(note);
  await admin.page.getByRole('button', { name: 'Salva e applica' }).first().click();
  const dialog = admin.page.getByRole('alertdialog');
  await dialog.waitFor();
  return dialog;
}

await step('Administrator: Ruoli e permessi page with matrix grouped by domain', async () => {
  await admin.page.locator('.teams-sidebar').getByText('Ruoli', { exact: true }).click();
  await admin.page.waitForURL(/ruoli-permessi/);
  await admin.page.getByText('Espandi tutti').waitFor();
  await shot(admin.page, '05-admin-matrix');
});

await step('Administrator: per-role, per-capability, identities views', async () => {
  for (const [tab, name] of [
    ['Per ruolo', '06-view-per-role'],
    ['Per capability', '07-view-per-capability'],
    ['Identità', '08-view-identities'],
  ]) {
    await admin.page.getByRole('tab', { name: tab, exact: true }).click();
    await admin.page.waitForTimeout(600);
    await shot(admin.page, name);
  }
  const identities = await admin.page.locator('main').innerText();
  for (const who of ['Doctor 1', 'Nurse 1', 'OSS 1']) assert.ok(identities.includes(who), who);
  await admin.page.getByRole('tab', { name: 'Matrice', exact: true }).click();
});

await step(
  'Administrator: edit Nurse × consegne.create, impact preview, Save & Apply (new version)',
  async () => {
    await openMatrixGroup('Consegne');
    await nurseCell().scrollIntoViewIfNeeded();
    await nurseCell().selectOption('DENIED');
    await admin.page.waitForTimeout(300);
    await shot(admin.page, '09-pending-change');
    await admin.page.getByRole('button', { name: 'Anteprima impatto' }).click();
    const impact = admin.page.locator('.rp-impact');
    await impact.waitFor();
    await impact.scrollIntoViewIfNeeded();
    const impactText = await impact.innerText();
    assert.match(impactText, /Nurse/);
    assert.match(impactText, /consegne\.create|Consegne — crea/);
    assert.match(impactText, /Nurse 1|SIM-NURSE-1/);
    await shot(admin.page, '10-impact-preview');
    await admin.page
      .getByPlaceholder('Nota (motivo della modifica)')
      .fill('Evidenza QA: revoca consegne infermiere');
    await admin.page.getByRole('button', { name: 'Salva e applica' }).first().click();
    const dialog = admin.page.getByRole('alertdialog');
    await dialog.waitFor();
    await shot(admin.page, '11-confirm-apply');
    appliedVersion = (await activeVersion(admin.page)) + 1;
    await dialog.getByRole('button', { name: 'Salva e applica' }).click();
    await waitForActiveVersion(admin.page, appliedVersion);
    assert.equal(await nurseCell().inputValue(), 'DENIED');
  },
);

await step(
  'Persistence: after a full reload the history shows the applied version with its note',
  async () => {
    await admin.page.reload();
    await admin.page.getByText('Administrator', { exact: true }).first().click();
    await admin.page.waitForURL(/admin-dashboard/);
    await admin.page.locator('.teams-sidebar').getByText('Ruoli', { exact: true }).click();
    await admin.page.getByRole('tab', { name: 'Storico', exact: true }).click();
    await admin.page.waitForTimeout(800);
    const text = await admin.page.locator('main').innerText();
    assert.match(text, new RegExp(`v${appliedVersion}(?!\\d)`));
    assert.match(text, /Evidenza QA: revoca consegne infermiere/);
    await shot(admin.page, '12-history-after-reload');
  },
);

await step(
  'Nurse 1 (same open session, after Apply): handover creation no longer offered',
  async () => {
    await nurse.page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await nurse.page.waitForTimeout(1200);
    assert.deepEqual(await nurseCanCreateHandover(), { form: 0, refusal: 1 });
    await shot(nurse.page, '13-nurse-consegne-after-revocation');
  },
);

await step(
  'Administrator: restore Nurse × consegne.create (next version) and the open Nurse session follows',
  async () => {
    await admin.page.getByRole('tab', { name: 'Matrice', exact: true }).click();
    await openMatrixGroup('Consegne');
    const dialog = await applyNurseCell('ALLOWED', 'Evidenza QA: ripristino');
    await dialog.getByRole('button', { name: 'Salva e applica' }).click();
    await waitForActiveVersion(admin.page, appliedVersion + 1);
    await nurse.page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await nurse.page.waitForTimeout(1200);
    assert.deepEqual(await nurseCanCreateHandover(), { form: 1, refusal: 0 });
    await shot(nurse.page, '14-nurse-consegne-restored');
  },
);

await close(admin);
await close(nurse);
await browser.close();

writeFileSync(`${OUT}/logs/browser-console-errors.txt`, consoleErrors.join('\n') || '(none)');
writeFileSync(`${OUT}/logs/playwright-results.json`, JSON.stringify(results, null, 2));
const failed = results.filter((r) => r.result === 'FAIL');
console.log(
  `\n${results.length - failed.length}/${results.length} steps passed; console errors: ${consoleErrors.length}`,
);
process.exit(failed.length ? 1 : 0);
