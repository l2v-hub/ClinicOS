import { test, expect, enterAs, nav } from '../harness';

// #214 Consegne tra operatori — sender (creatoDA) / recipient (operatoreAssegnato) / status (stato)
// tracked; recipient can advance the status (in_corso / completata). Real Consegne page.
test('#214 consegne tra operatori', async ({ page }) => {
  // API carries sender/recipient/status.
  const res = await page.request.get('http://localhost:3001/consegne');
  expect(res.ok()).toBeTruthy();
  const data = await res.json();
  expect(data.length).toBeGreaterThan(0);
  expect(data[0]).toHaveProperty('creatoDA');            // sender
  expect(data[0]).toHaveProperty('operatoreAssegnato');  // recipient
  expect(data[0]).toHaveProperty('stato');               // status
  expect(['aperta', 'in_corso', 'completata']).toContain(data[0].stato);

  await enterAs(page, 'Operatore');
  await nav(page, 'Consegne');

  // The handover list renders seeded consegne (patient name + note).
  await expect(page.getByText('Moretti', { exact: false }).first()).toBeVisible();
  const body = (await page.textContent('body')) ?? '';
  expect(body.length).toBeGreaterThan(200);

  await page.screenshot({ path: `${process.env.EV_OUT}/final/after.png`, fullPage: true });
});
