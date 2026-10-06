import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { mockApi } from './mock-api.mjs';

const out = 'artifacts/task-validation/catalog-draft-deletion';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1150, height: 884 } });
  const state = { requests: [], slotReads: 0, clinicalWrites: 0 };
  await mockApi(context, state);
  const versions = {
    painad: 'painad-it-2026-09-22-v1',
    postural_transfers: 'transfers-it-2026-09-22-v1',
    tinetti: 'tinetti-it-2026-10-03-v2',
    mna: 'mna-sf-it-2026-10-03-v2',
    gds15: 'gds15-it-2026-10-03-v2',
    barthel: 'barthel-it-2026-10-03-v1',
    ucla_npi_sleep: 'ucla-npi-sleep-it-2026-10-03-v1',
  };
  let serverDraft = false;
  await context.route('**/patients/patient-test/assessments/catalog', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: Object.entries(versions).map(([type, formVersion]) => ({
          type,
          formVersion,
          latestFinal: null,
          ownDraftCount: serverDraft && type === 'painad' ? 1 : 0,
          latestOwnDraft:
            serverDraft && type === 'painad'
              ? {
                  id: 'saved-draft',
                  formVersion,
                  assessedAt: '2026-10-06T06:00:00.000Z',
                  createdAt: '2026-10-06T06:00:00.000Z',
                  updatedAt: '2026-10-06T06:00:00.000Z',
                }
              : null,
        })),
      }),
    }),
  );
  const page = await context.newPage();
  await page.goto(
    'http://127.0.0.1:5187/tests/ux-turno/app.html#/dettaglio-paziente/patient-test/moduli',
  );
  await page.getByRole('button', { name: /Medico Test/ }).click();
  for (const module of ['PAINAD', 'Braden']) {
    await page.getByRole('button', { name: `Nuova compilazione ${module}`, exact: true }).click();
    if (module === 'Braden') await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: '← Tutti i moduli', exact: true }).click();
    const row = page
      .locator('.assessment-catalog-row')
      .filter({ has: page.getByRole('heading', { name: module, exact: true }) });
    await row.locator('.assessment-draft-chip').waitFor();
    await row.getByRole('button', { name: `Elimina bozza locale ${module}`, exact: true }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Annulla', exact: true })
      .click();
    assert.equal(await row.locator('.assessment-draft-chip').count(), 1);
    await row.getByRole('button', { name: `Elimina bozza locale ${module}`, exact: true }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Elimina bozza', exact: true })
      .click();
    await row.locator('.assessment-draft-chip').waitFor({ state: 'detached', timeout: 3000 });
    assert.equal(
      await row
        .getByRole('button', { name: `Elimina bozza locale ${module}`, exact: true })
        .count(),
      0,
    );
    assert.equal(
      await row.getByRole('button', { name: `Riprendi bozza ${module}`, exact: true }).count(),
      0,
    );
  }
  await page.screenshot({ path: `${out}/deleted-without-reload.png`, fullPage: false });
  assert.equal(state.clinicalWrites, 0);
  await page.reload();
  await page.getByRole('button', { name: /Medico Test/ }).click();
  await page.getByRole('button', { name: 'Apri PAINAD', exact: true }).waitFor();
  assert.equal(await page.locator('.assessment-draft-chip').count(), 0);
  serverDraft = true;
  await page.getByRole('button', { name: 'Nuova compilazione PAINAD', exact: true }).click();
  await page.getByRole('button', { name: '← Tutti i moduli', exact: true }).click();
  const painad = page
    .locator('.assessment-catalog-row')
    .filter({ has: page.getByRole('heading', { name: 'PAINAD', exact: true }) });
  await painad.getByText('1 bozza personale', { exact: false }).waitFor();
  await painad.getByRole('button', { name: 'Elimina bozza locale PAINAD', exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Elimina bozza', exact: true })
    .click();
  await painad.locator('.assessment-draft-chip').waitFor({ state: 'detached', timeout: 3000 });
  assert.equal(
    await painad.getByRole('button', { name: 'Riprendi bozza PAINAD', exact: true }).count(),
    1,
  );
  assert.equal(await painad.getByText('1 bozza personale', { exact: false }).count(), 1);
  assert.equal(state.clinicalWrites, 0);
  await context.close();
  console.log(
    'PASS: PAINAD and Braden update without reload; cancellation, persistence and server drafts are preserved without clinical writes',
  );
} finally {
  await browser.close();
}
