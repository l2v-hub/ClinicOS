const { test, expect } = require('/tmp/clinicos-qa-tools/node_modules/@playwright/test');
const { createServer } = require('node:http');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const root = __dirname;
let server, url;
test.beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === '/results.json') {
      res.setHeader('Content-Type', 'application/json');
      res.end(readFileSync(path.join(root, 'results.json')));
      return;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(readFileSync(path.join(root, 'qa-surface.html')));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async () => new Promise((resolve) => server.close(resolve)));
test('local synthetic result surface shows this QA run and explicit evidence limits', async ({ page }) => {
  const consoleErrors = [], pageErrors = [], httpErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) httpErrors.push({ url: response.url(), status: response.status() }); });
  await page.goto(url);
  await expect(page.locator('#suite')).toBeVisible();
  await expect(page.locator('#suite')).toHaveText('77 passed · 0 failed · 0 skipped · 77 total');
  await expect(page.locator('#same-account')).toHaveText('accepted with exact-SHA proof');
  await expect(page.locator('#native')).toHaveText('required');
  await expect(page.locator('#reservation')).toHaveText('required');
  await expect(page.locator('#boundary')).toHaveText('rejected');
  await expect(page.locator('#recovery')).toHaveText('tested; no blind replay');
  await expect(page.locator('#limits')).toContainText('GitHub merge, native CI, workflow activation and deployment were not verified');
  const response = await page.request.get(`${url}/results.json`);
  expect(response.ok()).toBe(true);
  const data = await response.json();
  expect(data.targetedSuite).toEqual({ tests: 77, passed: 77, failed: 0, skipped: 0 });
  expect(data.reviewAssertions.applicationProviderRuntimePathsRejected).toBe(true);
  expect(data.reviewAssertions.adminBypassUsed).toBe(false);
  expect(data.liveClaims).toEqual({ githubMergeVerified: false, nativeCiVerified: false, workflowActivationVerified: false, deploymentVerified: false });
  await page.screenshot({ path: path.join(root, 'screenshots', 'result.png'), fullPage: true });
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(httpErrors).toEqual([]);
});
