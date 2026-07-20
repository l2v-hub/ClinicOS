// #285 — Persistenza CRUD: gli orari operatori dell'admin sono persistiti su DB
// (OperatorSchedule, PUT /operators/:id/schedule + GET /operators/schedules) e sopravvivono al
// reload; il widget agenda della dashboard deriva dagli appuntamenti reali (non più MOCK_AGENDA).
import { test } from '@playwright/test';
import { guard, enterAs, nav, expect } from '../helpers';

const OUT = process.env.EV_OUT ?? 'qa-evidence/_out';
const STAMP = Date.now();
const NOTA = `Turno QA #285 — ${STAMP}`;

async function openOrari(page: import('@playwright/test').Page) {
  await enterAs(page, 'Amministratore');
  await nav(page, 'Orari');
  await expect(page.getByText('Orari Operatori').first()).toBeVisible();
}

test('#285 orari operatori: salvataggio su DB e persistenza dopo reload', async ({ page }) => {
  const g = guard(page);
  await openOrari(page);

  // Apri l'editor (primo operatore selezionato di default).
  const editBtn = page.getByRole('button', { name: /Modifica orari|Imposta orario/ }).first();
  await editBtn.click();

  // Cambia l'orario di inizio del primo giorno disponibile e la nota.
  const firstStart = page.locator('.schedule-day--active select.form-select').first();
  await firstStart.selectOption('07:30');
  await page.getByPlaceholder("Note sull'orario…").fill(NOTA);

  // AC1: Salva → PUT 200 sul backend.
  const putResp = page.waitForResponse(
    (r) => /\/operators\/.+\/schedule$/.test(r.url()) && r.request().method() === 'PUT',
  );
  await page.getByRole('button', { name: /Salva/ }).first().click();
  const put = await putResp;
  expect(put.status()).toBe(200);
  await expect(page.getByText('Orari salvati')).toBeVisible({ timeout: 8000 });

  // AC1: il dato è rileggibile dal DB via GET /operators/schedules.
  const apiRows = (await (
    await page.request.get('http://localhost:3001/operators/schedules')
  ).json()) as Array<{ operatoreId: string; note: string; turni: Array<{ oraInizio: string }> }>;
  const saved = apiRows.find((r) => r.note === NOTA);
  expect(saved, 'schedule presente in GET /operators/schedules').toBeTruthy();
  expect(saved!.turni.some((t) => t.oraInizio === '07:30')).toBeTruthy();

  // AC2: persistenza dopo reload completo della pagina.
  await page.reload();
  await openOrari(page);
  await expect(page.getByText(`Nota: ${NOTA}`)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('07:30 –').first()).toBeVisible();

  await page.screenshot({ path: `${OUT}/screenshots/285-orari-persistiti.png`, fullPage: true });
  g.assertClean();
});

test('#285 dashboard: agenda con appuntamenti reali, niente MOCK_AGENDA', async ({ page }) => {
  const g = guard(page);
  await enterAs(page, 'Operatore');

  // I nomi finti di MOCK_AGENDA non devono più comparire in dashboard.
  await expect(page.getByText('García, María')).toHaveCount(0);
  await expect(page.getByText('López, Carlos')).toHaveCount(0);

  await page.screenshot({
    path: `${OUT}/screenshots/285-dashboard-agenda-reale.png`,
    fullPage: true,
  });
  g.assertClean();
});
