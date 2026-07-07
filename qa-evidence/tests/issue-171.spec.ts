import { test, expect, enterAs, nav, guard } from '../harness';

// #171 Stato camere e pazienti presenti — admin "Posti Letto" view, backed by /admin/rooms.
// Real assertions + no console errors + no HTTP 4xx/5xx + data still present AFTER reload.
test('#171 stato camere e pazienti presenti', async ({ page }) => {
  const g = guard(page);

  // The rooms API returns real seeded rooms/beds (occupancy source) with 2xx.
  const rooms = await page.request.get('http://localhost:3001/admin/rooms');
  expect(rooms.ok()).toBeTruthy();
  const data = await rooms.json();
  expect(Array.isArray(data)).toBeTruthy();
  expect(data.length).toBeGreaterThan(0);
  expect(data[0]).toHaveProperty('beds');

  await enterAs(page, 'Amministratore');
  await nav(page, 'Posti Letto');

  // Room numbers + occupancy render from the API.
  await expect(page.getByText('101', { exact: false }).first()).toBeVisible();
  await expect(page.getByText(/Posti Letto/i).first()).toBeVisible();
  await expect(page.getByText(/occupazione/i).first()).toBeVisible();

  // Persistence after reload: the rooms data is still shown after a full page refresh (re-enter the
  // role gate — SPA session is in-memory — then navigate back).
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('Amministratore', { exact: true }).first().click();
  await page.waitForTimeout(1000);
  await nav(page, 'Posti Letto');
  await expect(page.getByText('101', { exact: false }).first()).toBeVisible();

  g.assertClean();
  await page.screenshot({ path: `${process.env.EV_OUT}/final/after.png`, fullPage: true });
});
