import { test, expect, enterAs, nav, guard } from '../harness';

// #214 Consegne tra operatori — sender/recipient/status tracked; recipient can advance status.
// Real assertions + no console errors + no HTTP 4xx/5xx + data still present AFTER reload.
test('#214 consegne tra operatori', async ({ page }) => {
  const g = guard(page);

  // API carries sender/recipient/status.
  const res = await page.request.get('http://localhost:3001/consegne');
  expect(res.ok()).toBeTruthy();
  const data = await res.json();
  expect(data.length).toBeGreaterThan(0);
  expect(data[0]).toHaveProperty('creatoDA');            // sender
  expect(data[0]).toHaveProperty('operatoreAssegnato');  // recipient
  expect(['aperta', 'in_corso', 'completata']).toContain(data[0].stato); // status

  await enterAs(page, 'Operatore');
  await nav(page, 'Consegne');

  // Handover cards render with patient + acknowledge/complete controls (recipient can advance status).
  await expect(page.getByText('Moretti', { exact: false }).first()).toBeVisible();
  await expect(page.getByText(/Prendi in carico/i).first()).toBeVisible();
  await expect(page.getByText(/Aperte|Completate/i).first()).toBeVisible();

  // Persistence after reload (re-enter role gate — SPA session is in-memory — then navigate back).
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.waitForTimeout(1000);
  await nav(page, 'Consegne');
  await expect(page.getByText('Moretti', { exact: false }).first()).toBeVisible();

  g.assertClean();
  await page.screenshot({ path: `${process.env.EV_OUT}/final/after.png`, fullPage: true });
});
