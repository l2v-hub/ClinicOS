import { test, expect } from 'playwright/test';
import { writeFileSync } from 'node:fs';
import { guard } from './fixtures.mjs';
for (const [name, viewport] of [['mobile390', { width: 390, height: 844 }], ['desktop1256', { width: 1256, height: 1032 }]]) {
test(`${name}: canonical PRN button fits the available region without clipping`, async ({ page }, info) => {
 await page.setViewportSize(viewport); const log = await guard(page); await page.goto('/qa-therapy');
 await page.getByRole('button', { name: 'Settimana', exact: true }).click();
 const prn = page.getByRole('region', { name: 'Al bisogno', exact: true });
 const button = prn.getByRole('button', { name: 'Somministra al bisogno · dosi di oggi' });
 await expect(button).toBeVisible(); await expect(prn).toContainText('Farmaco sintetico 101');
 await prn.screenshot({ path: info.outputPath(`${name}-prn-bounded-control.png`) });
 const measure = await button.evaluate(node => { const rect = node.getBoundingClientRect();
  const parent = node.closest('.patient-therapy-calendar__unscheduled').getBoundingClientRect();
  return { button: { left: rect.left, right: rect.right, width: rect.width },
   region: { left: parent.left, right: parent.right, width: parent.width }, viewport: innerWidth }; });
 writeFileSync(info.outputPath('geometry.json'), JSON.stringify(measure, null, 2));
 expect(log.errors).toEqual([]); expect(log.blocked).toEqual([]);
 expect(measure.button.right, 'Canonical PRN control extends outside available mobile region').toBeLessThanOrEqual(measure.region.right);
});
}
