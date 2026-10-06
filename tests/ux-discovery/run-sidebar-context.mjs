import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { mockApi, today } from './mock-api.mjs';

const out = path.resolve('artifacts/task-validation/sidebar-context');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1150, height: 884 } });
const state = { requests: [], slotReads: 0, clinicalWrites: 0 };
await mockApi(context, state);
const gates = new Map();
const patient = (id) => ({
  id,
  firstName: 'Paziente',
  lastName: 'Test',
  dateOfBirth: '1960-01-01',
});
await context.route(/http:\/\/localhost:3001\/patients\/slow-[^/?]+$/, async (route) => {
  const id = new URL(route.request().url()).pathname.split('/').at(-1);
  const gate = gates.get(id);
  gate.started();
  await gate.releasePromise;
  await route.fulfill({
    status: gate.fail ? 503 : 200,
    contentType: 'application/json',
    body: JSON.stringify(gate.fail ? { error: 'Synthetic lookup failure' } : patient(id)),
  });
});
await context.route(/http:\/\/localhost:3001\/therapy-slots\/page\?/, async (route) => {
  const id = 'slow-select';
  await route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      slots: [
        {
          id: 'slot-slow',
          fascia: 'mattina',
          label: 'Mattina',
          ora: '08:00',
          summary: { total: 1, administered: 0, pending: 1, notAdministered: 0 },
          patients: [
            {
              patientId: id,
              firstName: 'Paziente',
              lastName: 'Test',
              location: { status: 'unassigned' },
              administrations: [
                {
                  therapyId: 't1',
                  drugName: 'Farmaco sintetico',
                  dosage: '1 compressa',
                  route: 'orale',
                  scheduledTime: '08:00',
                  status: 'pending',
                  administeredAt: null,
                  administeredBy: null,
                  notAdministeredReason: null,
                },
              ],
            },
          ],
        },
      ],
      pageInfo: {
        hasMore: false,
        nextCursor: null,
        summaryExact: true,
        loadedTherapies: 1,
        completeness: 'complete',
      },
    }),
  });
});
function gate(id) {
  let started, release;
  const startedPromise = new Promise((resolve) => {
    started = resolve;
  });
  const releasePromise = new Promise((resolve) => {
    release = resolve;
  });
  const value = { started, release, startedPromise, releasePromise };
  gates.set(id, value);
  return value;
}
const page = await context.newPage();
const errors = [],
  results = [];
page.on('pageerror', (error) => errors.push(error.message));
const app = 'http://127.0.0.1:5187/tests/ux-turno/app.html';
const rail = page.getByRole('navigation', { name: 'Navigazione principale', exact: true });
const routes = [
  ['Turno', 'operator-dashboard'],
  ['Pazienti', 'pazienti'],
  ['Terapia', 'terapie'],
  ['Parametri', 'parametri-multipaziente'],
  [/^Consegne,/, 'consegne'],
  ['Agenda', 'agenda-operatore'],
  ['Farmaci', 'anagrafica-farmaci'],
];
const expectWard = async (key) => {
  await page.waitForURL(app + '#/' + key);
  await page.locator('.patient-record-view').waitFor({ state: 'detached' });
  await page.waitForFunction(
    (route) =>
      document.querySelector('.teams-sidebar button[aria-current="page"]') &&
      window.location.hash === '#/' + route &&
      document.querySelector('main')?.textContent.trim().length > 0,
    key,
  );
};
const resolveAndStay = async (id, pending, key) => {
  const response = page.waitForResponse((response) => response.url().endsWith('/patients/' + id));
  pending.release();
  await response;
  // Let both promise handlers and React transitions settle after the deferred HTTP response.
  await page.waitForTimeout(200);
  assert.equal(
    new URL(page.url()).hash,
    '#/' + key,
    'late patient lookup must not overwrite chosen route',
  );
  assert.equal(await page.locator('.patient-record-view').count(), 0);
};
try {
  await page.goto(app + '#/dettaglio-paziente/patient-test');
  await page.getByRole('button', { name: /Medico Test/ }).click();
  await page.locator('.patient-record-view').waitFor();
  for (const origin of [
    '',
    '/profilo',
    '/diagnosi',
    '/terapia-farmacologica',
    '/parametri',
    '/moduli',
    '/documenti',
    '/dimissione',
  ]) {
    for (const [label, key] of routes) {
      await page.goto(app + '#/dettaglio-paziente/patient-test' + origin);
      await page.locator('.patient-record-view').waitFor();
      await rail.getByRole('button', { name: label, exact: typeof label === 'string' }).click();
      await expectWard(key);
    }
  }
  results.push('PASS all seven ward destinations leave each of eight chart origins');
  for (const [originLabel, originKey] of routes) {
    await rail
      .getByRole('button', { name: originLabel, exact: typeof originLabel === 'string' })
      .click();
    await expectWard(originKey);
    for (const [label, key] of routes) {
      await rail.getByRole('button', { name: label, exact: typeof label === 'string' }).click();
      await expectWard(key);
      await rail
        .getByRole('button', { name: originLabel, exact: typeof originLabel === 'string' })
        .click();
      await expectWard(originKey);
    }
  }
  results.push(
    'PASS every ward-to-ward sidebar transition, including repeated clicks on the current page',
  );

  const slowHash = gate('slow-hash');
  await page.goto(app + '#/dettaglio-paziente/slow-hash');
  await slowHash.startedPromise;
  await rail.getByRole('button', { name: 'Pazienti', exact: true }).click();
  await expectWard('pazienti');
  await resolveAndStay('slow-hash', slowHash, 'pazienti');
  results.push(
    'PASS deferred hash restore cannot reinsert the old patient after sidebar navigation',
  );

  const slowSelect = gate('slow-select');
  await rail.getByRole('button', { name: 'Terapia', exact: true }).click();
  await page.getByTestId('therapy-calendar-count').first().click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Apri terapia di/ })
    .click();
  await slowSelect.startedPromise;
  await page.getByRole('dialog').getByRole('button', { name: 'Chiudi', exact: true }).click();
  await rail.getByRole('button', { name: 'Turno', exact: true }).click();
  await expectWard('operator-dashboard');
  await resolveAndStay('slow-select', slowSelect, 'operator-dashboard');
  results.push(
    'PASS deferred explicit patient selection cannot reopen chart over selected ward page',
  );

  const slowBack = gate('slow-select');
  await rail.getByRole('button', { name: 'Terapia', exact: true }).click();
  await page.getByTestId('therapy-calendar-count').first().click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Apri terapia di/ })
    .click();
  await slowBack.startedPromise;
  await page.goBack();
  await expectWard('operator-dashboard');
  await resolveAndStay('slow-select', slowBack, 'operator-dashboard');
  results.push('PASS Back cancels a pending explicit patient lookup');

  const slowBoot = gate('slow-bootstrap');
  await page.goto(app + '#/dettaglio-paziente/slow-bootstrap');
  await page.reload();
  await page.getByRole('button', { name: /Medico Test/ }).click();
  await slowBoot.startedPromise;
  await rail.getByRole('button', { name: 'Parametri', exact: true }).click();
  await expectWard('parametri-multipaziente');
  await resolveAndStay('slow-bootstrap', slowBoot, 'parametri-multipaziente');
  results.push('PASS sidebar navigation wins over initial hash patient restore after login');

  const failedBack = gate('slow-failure-back');
  failedBack.fail = true;
  failedBack.release();
  await page.goto(app + '#/dettaglio-paziente/slow-failure-back');
  await page.getByText('Paziente non disponibile o non autorizzato', { exact: true }).waitFor();
  const oldBootstrap = gate('slow-bootstrap-back');
  await page.goto(app + '#/dettaglio-paziente/slow-bootstrap-back');
  await page.reload();
  await page.getByRole('button', { name: /Medico Test/ }).click();
  await oldBootstrap.startedPromise;
  const failedResponse = page.waitForResponse((response) =>
    response.url().endsWith('/patients/slow-failure-back'),
  );
  await page.goBack();
  await failedResponse;
  await page.getByText('Paziente non disponibile o non autorizzato', { exact: true }).waitFor();
  assert.equal(await page.getByText('Caricamento scheda paziente…', { exact: true }).count(), 0);
  oldBootstrap.release();
  await page.waitForTimeout(200);
  assert.match(page.url(), /slow-failure-back$/);
  assert.equal(await page.locator('.patient-record-view').count(), 0);
  results.push(
    'PASS failed Back restore clears stale bootstrap spinner and rejects its late response',
  );
  await rail.getByRole('button', { name: 'Parametri', exact: true }).click();
  await expectWard('parametri-multipaziente');

  await page.screenshot({ path: path.join(out, 'sidebar-global-context.png'), fullPage: true });
  assert.equal(state.clinicalWrites, 0);
  assert.deepEqual(errors, []);
  results.push('PASS no clinical writes or runtime errors');
} catch (error) {
  results.push('FAIL ' + error.stack);
  process.exitCode = 1;
  await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true });
} finally {
  writeFileSync(
    path.join(out, 'results.json'),
    JSON.stringify(
      { results, errors, clinicalWrites: state.clinicalWrites, date: today() },
      null,
      2,
    ),
  );
  console.log(results.join('\n'));
  await browser.close();
}
