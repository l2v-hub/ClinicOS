import { test, expect, enterAs, nav } from '../harness';

// #171 Stato camere e pazienti presenti — admin "Posti Letto" view, backed by /admin/rooms.
test('#171 stato camere e pazienti presenti', async ({ page }) => {
  // The rooms API must return real seeded rooms/beds (occupancy source).
  const rooms = await page.request.get('http://localhost:3001/admin/rooms');
  expect(rooms.ok()).toBeTruthy();
  const data = await rooms.json();
  expect(Array.isArray(data)).toBeTruthy();
  expect(data.length).toBeGreaterThan(0);
  expect(data[0]).toHaveProperty('beds');

  await enterAs(page, 'Amministratore');
  await nav(page, 'Posti Letto');

  // The rooms view renders room numbers and bed state from the API.
  await expect(page.getByText('101', { exact: false }).first()).toBeVisible();
  const body = (await page.textContent('body')) ?? '';
  expect(body.length).toBeGreaterThan(200);

  await page.screenshot({ path: `${process.env.EV_OUT}/final/after.png`, fullPage: true });
});
