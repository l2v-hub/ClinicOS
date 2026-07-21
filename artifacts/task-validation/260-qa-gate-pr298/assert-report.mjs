// Playwright chromium assertion of the adversarial qa-report.html (real expect()).
// Asserts: 0 attacks accepted, verdict text present, zero console errors. Saves screenshot + trace.
import { chromium, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';

const EV = 'E:/Workspace/DG_SE_DEV/ClinicOS/artifacts/task-validation/260-qa-gate-pr298';
const reportUrl = pathToFileURL(`${EV}/qa-report.html`).href;

const browser = await chromium.launch();
const context = await browser.newContext();
await context.tracing.start({ screenshots: true, snapshots: true });
const page = await context.newPage();

const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push(String(e)));

await page.goto(reportUrl, { waitUntil: 'load' });

// data-accepted must be 0
const acceptedAttr = await page.locator('#verdict-flag').getAttribute('data-accepted');
expect(acceptedAttr, 'zero attacks accepted').toBe('0');

// verdict text
const verdict = page.locator('#verdict');
await expect(verdict).toBeVisible();
await expect(verdict).toContainText('ALL ATTACKS REJECTED');

// every row shows REJECTED/PASS, none ACCEPTED/FAIL
const badRows = await page.locator('tr.bad').count();
expect(badRows, 'no failing/accepted rows').toBe(0);
const okRows = await page.locator('tr.ok').count();
expect(okRows, 'at least 13 passing rows').toBeGreaterThanOrEqual(13);

// unit totals present
await expect(page.getByText('376/376')).toBeVisible();

expect(consoleErrors, `console errors: ${consoleErrors.join('; ')}`).toHaveLength(0);

await page.screenshot({ path: `${EV}/screenshots/qa-report.png`, fullPage: true });
await context.tracing.stop({ path: `${EV}/test-results/trace.zip` });
await browser.close();

console.log(
  `PLAYWRIGHT ASSERT OK — accepted=${acceptedAttr} okRows=${okRows} badRows=${badRows} consoleErrors=${consoleErrors.length}`,
);
