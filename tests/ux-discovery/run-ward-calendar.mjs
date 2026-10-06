import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { mockApi, today } from './mock-api.mjs';

const out = path.resolve('artifacts/task-validation/ward-calendar-compact');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1150, height: 884 } });
const state = { requests: [], slotReads: 0, clinicalWrites: 0 };
await mockApi(context, state);
let partial = false;
let recordedMode = 'mixed';
const slotDates = [];
await context.route(/http:\/\/localhost:3001\/therapy-slots(?:\/page)?\?/, async (route) => {
  const url = new URL(route.request().url());
  slotDates.push(url.searchParams.get('date'));
  const patients = Array.from({ length: 21 }, (_, index) => ({
    patientId: index === 0 ? 'patient-test' : `patient-${index}`,
    firstName: index === 0 ? 'Paziente' : `Nome ${index}`,
    lastName:
      index === 0
        ? 'Test'
        : index === 3
          ? 'CognomeMoltoLungoPerVerificareLaCard'
          : `Bianchi ${index}`,
    location: { status: 'unassigned' },
    room: null,
    bed: null,
    administrations: [
      {
        therapyId: `drug-${index}`,
        drugName: `Farmaco ${index}`,
        dosage: '1 compressa — 10 mg',
        quantityLabel: '1 compressa — 10 mg',
        route: 'orale',
        scheduledTime: '07:00',
        status: index === 1 ? 'administered' : index === 2 ? 'not_administered' : 'pending',
        administeredAt: index === 1 ? new Date().toISOString() : null,
        administeredBy: index === 1 ? 'Collega Test' : null,
        notAdministeredReason: index === 2 ? 'rifiutata_paziente' : null,
      },
    ],
  }));
  patients[0].administrations.push({
    ...patients[0].administrations[0],
    therapyId: 'drug-extra',
    drugName: 'Farmaco aggiuntivo con denominazione molto lunga per verificare la leggibilità',
    quantityLabel: 'Mezza compressa — 2,5 mg',
    route: 'sublinguale',
  });
  patients[20].administrations.push({
    ...patients[20].administrations[0],
    therapyId: 'drug-later',
    drugName: 'Farmaco di un altro orario della stessa fascia',
    scheduledTime: '08:30',
    quantityLabel: '3 fiale — 30 mg',
  });
  if (recordedMode !== 'mixed')
    patients.forEach((patient) =>
      patient.administrations.forEach((dose) => {
        dose.status = recordedMode === 'done' ? 'administered' : 'not_administered';
      }),
    );
  const doses = patients.flatMap((patient) => patient.administrations);
  const more = url.searchParams.has('cursor');
  const slot = {
    id: 'many-patients',
    fascia: 'mattina',
    label: 'Mattina',
    ora: '07:00',
    summary: {
      total: doses.length,
      administered: doses.filter((dose) => dose.status === 'administered').length,
      pending: doses.filter((dose) => dose.status === 'pending').length,
      notAdministered: doses.filter((dose) => dose.status === 'not_administered').length,
    },
    patients: partial ? (more ? patients.slice(3) : patients.slice(0, 3)) : patients,
  };
  await route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(
      url.pathname === '/therapy-slots'
        ? [slot]
        : {
            slots: [slot],
            pageInfo: {
              hasMore: partial && !more,
              nextCursor: partial && !more ? 'more-test' : null,
              summaryExact: true,
              loadedTherapies: slot.patients.length,
              completeness: partial && !more ? 'partial' : 'complete',
            },
          },
    ),
  });
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const app = 'http://127.0.0.1:5187/tests/ux-turno/app.html';
const results = [];
try {
  await page.goto(app + '#/terapie');
  await page.getByRole('button', { name: /Medico Test/ }).click();
  await page.getByRole('heading', { name: 'Calendario terapie', exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole('button', { name: 'Calendario', exact: true })
      .getAttribute('aria-pressed'),
    'true',
  );
  assert.equal(await page.locator('.giro-bar').count(), 0);
  await page.getByRole('button', { name: 'Giro', exact: true }).click();
  await page.getByRole('heading', { name: 'Giro terapia', exact: true }).waitFor();
  await page.reload();
  await page.getByRole('button', { name: /Medico Test/ }).click();
  await page.getByRole('heading', { name: 'Giro terapia', exact: true }).waitFor();
  results.push(
    'PASS calendar is default; Giro remains selectable and history remembers explicit choice',
  );
  const rail = page.getByRole('navigation', { name: 'Navigazione principale', exact: true });
  await rail.getByRole('button', { name: 'Terapia', exact: true }).click();
  await page.getByRole('heading', { name: 'Calendario terapie', exact: true }).waitFor();
  assert.equal(await page.locator('.giro-bar').count(), 0);
  await page.goBack();
  await page.getByRole('heading', { name: 'Giro terapia', exact: true }).waitFor();
  await page.goForward();
  await page.getByRole('heading', { name: 'Calendario terapie', exact: true }).waitFor();
  await rail.getByRole('button', { name: 'Turno', exact: true }).click();
  await rail.getByRole('button', { name: 'Terapia', exact: true }).click();
  await page.getByRole('heading', { name: 'Calendario terapie', exact: true }).waitFor();
  results.push(
    'PASS sidebar opens the calendar even from Giro; Back and Forward restore each explicit view',
  );
  await page.getByRole('button', { name: 'Giro', exact: true }).click();
  await page.getByLabel('Data terapia', { exact: true }).fill('2026-10-01');
  await page.locator('.giro-patient').first().waitFor();
  await rail.getByRole('button', { name: 'Terapia', exact: true }).click();
  await page.getByRole('heading', { name: 'Calendario terapie', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Giro', exact: true }).click();
  await page.getByLabel('Data terapia', { exact: true }).fill('2026-10-02');
  await page.locator('.giro-patient').first().waitFor();
  await page.goBack();
  await page.getByRole('heading', { name: 'Giro terapia', exact: true }).waitFor();
  assert.equal(await page.getByLabel('Data terapia', { exact: true }).inputValue(), '2026-10-01');
  await page.locator('.giro-patient').first().waitFor();
  assert.equal(slotDates.at(-1), '2026-10-01', 'restored Giro must reload its own date');
  results.push(
    'PASS restored Giro date is revalidated rather than displaying doses from another date',
  );
  await rail.getByRole('button', { name: 'Turno', exact: true }).click();
  await page.getByRole('button', { name: /^Terapie in ritardo:/ }).click();
  await page.getByRole('heading', { name: 'Giro terapia', exact: true }).waitFor();
  assert.equal(
    await page.getByRole('button', { name: /^Da erogare/ }).getAttribute('aria-pressed'),
    'true',
  );
  results.push('PASS explicit late-dose dashboard entry still opens the directed Giro');
  await page.getByRole('button', { name: 'Calendario', exact: true }).click();
  const cards = page.getByTestId('therapy-calendar-count');
  await cards.first().waitFor();
  await page.waitForFunction(
    () => document.querySelectorAll('[data-testid="therapy-calendar-count"]').length === 14,
  );
  assert.equal(await cards.count(), 14, 'one counter per occupied slot');
  const first = cards.first();
  const firstDate = await first.getAttribute('data-date');
  assert.equal(
    await first.textContent(),
    '20',
    'counts pending doses, including two for one patient, excluding administered/refused',
  );
  assert.match(await first.getAttribute('class'), /is-late/);
  assert.match(await first.getAttribute('aria-label'), /20 dosi da erogare/);
  assert.equal(
    await page
      .locator(
        `[data-testid="therapy-calendar-count"][data-date="${firstDate}"][data-time="08:30"]`,
      )
      .textContent(),
    '1',
    'exact hour count does not use the band total or the three-fial quantity',
  );
  assert.doesNotMatch(
    await page.locator('.therapy-calendar-grid').textContent(),
    /Farmaco|Test, Paziente|dosi|registrate/,
  );
  assert.ok((await first.boundingBox()).height <= 40, 'compact counter height');
  assert.ok(
    (await first.locator('xpath=ancestor::tr').boundingBox()).height <= 54,
    'compact calendar row',
  );
  await first.click();
  const dialog = page.getByRole('dialog');
  assert.equal(await dialog.locator('.therapy-calendar-dialog__patient').count(), 21);
  assert.match(
    await dialog.textContent(),
    /Farmaco 0.*1 compressa — 10 mg.*orale.*Non registrata/s,
  );
  assert.equal(
    await dialog.locator('.therapy-calendar-dialog__dose').count(),
    22,
    'every medication of the slot is shown',
  );
  assert.match(
    await dialog.textContent(),
    /Farmaco aggiuntivo.*Mezza compressa — 2,5 mg.*sublinguale/s,
  );
  await page.keyboard.press('Escape');
  assert.equal(await first.evaluate((el) => el === document.activeElement), true);
  results.push(
    'PASS compact slot counts only pending doses; all patients and drugs stay available in popup; focus restored',
  );

  await first.click();
  assert.equal(await dialog.locator('.therapy-calendar-dialog__patient').count(), 21);
  const details = dialog.getByRole('region', { name: 'Farmaci per paziente' });
  const headingBefore = await dialog.locator('.therapy-calendar-dialog__head').boundingBox();
  await details.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  assert.deepEqual(
    await dialog.locator('.therapy-calendar-dialog__head').boundingBox(),
    headingBefore,
  );
  assert.equal(await dialog.getByRole('button', { name: 'Chiudi', exact: true }).isVisible(), true);
  assert.ok(await details.evaluate((el) => el.scrollTop > 0), 'only the dose list should scroll');
  assert.ok(
    (await dialog.locator('.therapy-calendar-dialog__dose').first().boundingBox()).height < 90,
    'compact drug row',
  );
  assert.match(
    await dialog.locator('.therapy-calendar-dialog__status.is-done').textContent(),
    /Somministrata.*Collega Test/,
  );
  assert.match(
    await dialog.locator('.therapy-calendar-dialog__status.is-missed').textContent(),
    /Non somministrata.*Rifiutata dal paziente/,
  );
  for (const width of [390, 768, 1150]) {
    await page.setViewportSize({ width, height: 884 });
    await page.locator('.teams-sidebar').evaluate(async (el) => {
      await Promise.all(el.getAnimations().map((animation) => animation.finished.catch(() => {})));
    });
    await details.evaluate((el) => {
      el.scrollTop = 0;
    });
    assert.equal(
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth),
      true,
      'dialog has no horizontal overflow',
    );
    const bounds = await dialog.boundingBox();
    assert.ok(
      bounds.x >= 0 &&
        bounds.x + bounds.width <= width &&
        bounds.y >= 0 &&
        bounds.y + bounds.height <= 884,
    );
    assert.equal(
      await dialog.evaluate((el) => {
        const heading = el.querySelector('.therapy-calendar-dialog__head');
        const rect = heading.getBoundingClientRect();
        return heading.contains(document.elementFromPoint(rect.left + 8, rect.top + 8));
      }),
      true,
      'sidebar must not obscure the popup',
    );
    await page.screenshot({ path: path.join(out, `dialog-${width}.png`) });
  }
  await page.setViewportSize({ width: 768, height: 390 });
  assert.ok((await details.boundingBox()).height > 100, 'dose list remains usable in landscape');
  await details.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await dialog.getByRole('button', { name: 'Chiudi', exact: true }).click({ trial: true });
  await page.screenshot({ path: path.join(out, 'dialog-landscape.png') });
  await page.setViewportSize({ width: 1150, height: 884 });
  results.push(
    'PASS compact responsive dose rows preserve status details; title, search and close stay visible while scrolling',
  );
  await dialog.getByRole('searchbox', { name: 'Cerca paziente' }).fill('Bianchi 20');
  assert.equal(await dialog.locator('.therapy-calendar-dialog__patient').count(), 1);
  assert.match(await dialog.textContent(), /Farmaco 20/);
  await dialog.getByRole('searchbox').fill('nonesistente');
  await dialog.getByText('Nessun paziente trovato.', { exact: true }).waitFor();
  await page.keyboard.press('Escape');
  results.push('PASS slot popup gives every patient, search and explicit empty feedback');

  await first.click();
  await dialog
    .getByRole('button', { name: 'Apri terapia di Test, Paziente, ore 07:00', exact: true })
    .click();
  await page.getByRole('tab', { name: 'Calendario', exact: true }).waitFor();
  await page.goBack();
  await dialog.waitFor();
  assert.equal(await dialog.locator('.therapy-calendar-dialog__patient').count(), 21);
  assert.match(await dialog.textContent(), /Farmaco 0/);
  await page.keyboard.press('Escape');
  assert.equal(await first.evaluate((el) => el === document.activeElement), true);
  results.push('PASS patient navigation and Back preserve exact date and time popup');

  for (const width of [390, 768, 1150]) {
    await page.setViewportSize({ width, height: 884 });
    await page.locator('.teams-sidebar').evaluate(async (el) => {
      await Promise.all(el.getAnimations().map((animation) => animation.finished.catch(() => {})));
    });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
    await page.screenshot({ path: path.join(out, `calendar-${width}.png`), fullPage: true });
  }
  for (const mode of ['done', 'missed']) {
    recordedMode = mode;
    await page.reload();
    await page.getByRole('button', { name: /Medico Test/ }).click();
    await first.waitFor();
    assert.equal(await first.textContent(), '0');
    assert.match(await first.getAttribute('class'), new RegExp(`is-${mode}`));
    await first.click();
    assert.equal(
      await dialog.locator('.therapy-calendar-dialog__dose').count(),
      22,
      'zero remains clickable',
    );
    await page.keyboard.press('Escape');
  }
  partial = true;
  recordedMode = 'done';
  await page.reload();
  await page.getByRole('button', { name: /Medico Test/ }).click();
  await first.waitFor();
  assert.equal(await first.textContent(), '—', 'partial zero cannot promise no pending doses');
  assert.match(await first.getAttribute('class'), /is-unknown/);
  assert.match(await first.getAttribute('aria-label'), /incompleto/);
  results.push(
    'PASS complete zero stays clickable; missed differs from completed; partial zero stays unknown',
  );
  recordedMode = 'mixed';
  await page.reload();
  await page.getByRole('button', { name: /Medico Test/ }).click();
  await cards.first().waitFor();
  assert.equal(await first.textContent(), '≥2');
  assert.match(
    await first.getAttribute('aria-label'),
    /almeno 2 dosi da erogare, conteggio parziale/,
  );
  await page.getByRole('button', { name: `Altri dettagli · ${firstDate}`, exact: true }).click();
  await page.waitForFunction(
    () => document.querySelector('[data-testid="therapy-calendar-count"]').textContent === '20',
  );
  await first.click();
  await dialog.getByRole('button', { name: /Apri terapia di Test, Paziente/ }).click();
  await page.getByRole('tab', { name: 'Calendario', exact: true }).waitFor();
  await page.goBack();
  await dialog.waitFor();
  assert.equal(await dialog.locator('.therapy-calendar-dialog__patient').count(), 3);
  await page.keyboard.press('Escape');
  await page.evaluate(() =>
    window.history.replaceState(
      {
        ...window.history.state,
        therapyCalendar: {
          ...window.history.state.therapyCalendar,
          open: {
            date: document.querySelector('[data-testid="therapy-calendar-count"]').dataset.date,
            time: '07:00',
            patientId: 'patient-20',
          },
        },
      },
      '',
    ),
  );
  await page.reload();
  await page.getByRole('button', { name: /Medico Test/ }).click();
  await dialog
    .getByText('Paziente non presente nei dettagli caricati: carica gli altri dettagli.', {
      exact: true,
    })
    .waitFor();
  await dialog.getByRole('button', { name: 'Carica altri dettagli', exact: true }).click();
  await dialog.getByText('Farmaco 20', { exact: true }).waitFor();
  assert.equal(await dialog.locator('.therapy-calendar-dialog__patient').count(), 1);
  await page.keyboard.press('Escape');
  assert.equal(await first.evaluate((el) => el === document.activeElement), true);
  assert.equal(state.clinicalWrites, 0);
  assert.deepEqual(errors, []);
  results.push('PASS partial pages merge; responsive grid; zero clinical writes or runtime errors');
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
