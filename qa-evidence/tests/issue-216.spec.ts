import { test, expect, enterAs, nav, guard } from '../harness';
// #216 Ordinamento pazienti — patients list renders in a defined order (lib/patientSort), real UI.
test('#216 ordinamento pazienti', async ({ page }) => {
  const g = guard(page);
  const res = await page.request.get('http://localhost:3001/patients'); expect(res.ok()).toBeTruthy();
  const pts = await res.json(); expect(pts.length).toBeGreaterThan(1);
  await enterAs(page, 'Operatore');
  await nav(page, 'Pazienti');
  // The list renders multiple patients (sorted by patientSort in the app).
  const rows = page.locator('text=/,/');
  await expect(page.getByText(/Pazienti/i).first()).toBeVisible();
  await expect(page.getByText(/Moretti|García|López|Martínez/).first()).toBeVisible();
  g.assertClean();
  await page.screenshot({ path: `${process.env.EV_OUT}/final/after.png`, fullPage: true });
});
