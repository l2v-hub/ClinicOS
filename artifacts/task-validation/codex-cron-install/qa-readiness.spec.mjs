import { test, expect } from 'playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const directory = path.dirname(fileURLToPath(import.meta.url));
test('actual non-mutating installer readiness reports blocked prerequisites without claiming an installed cron', async ({
  page,
}) => {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`HTTP ${response.status()}`);
  });
  const actual = JSON.parse(await readFile(path.join(directory, 'qa-actual-check.json'), 'utf8'));
  expect(actual.status).toBe('blocked-prerequisites');
  expect(actual.ready).toBe(false);
  expect(actual.installed).toBe(false);
  expect(actual.checks.claude).toBe(true);
  expect(actual.checks.crontab).toBe(false);
  expect(actual.checks.claudeMaxLogin).toBe(false);
  const html =
    '<!doctype html><meta charset="utf-8"><title>ClinicOS cron readiness — QA only</title><style>body{font:20px system-ui;background:#f4f8fc;color:#19394c;padding:64px}main{background:white;padding:36px;border:1px solid #cee0ee;border-radius:12px}h1{color:#1275ad}dt{font-weight:600;margin-top:18px}dd{margin-left:0}footer{margin-top:32px;color:#526b7a}</style><main><h1>ClinicOS · verifica cron</h1><p>Risultato reale del comando --check, sola lettura. Superficie esclusivamente QA.</p><dl id="facts"></dl><footer>Nessun modello invocato. Nessun cron personale installato. Integrazione e review effettiva non certificate.</footer></main>';
  await page.route('http://qa.invalid/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: html }),
  );
  const display = async () =>
    page.evaluate(
      (value) => {
        const root = document.querySelector('#facts');
        for (const [key, result] of Object.entries(value)) {
          const term = document.createElement('dt');
          term.textContent = key;
          const detail = document.createElement('dd');
          detail.dataset.key = key;
          detail.textContent = String(result);
          root.append(term, detail);
        }
      },
      {
        status: actual.status,
        ready: actual.ready,
        installed: actual.installed,
        claude: actual.checks.claude,
        crontab: actual.checks.crontab,
        claudeMaxLogin: actual.checks.claudeMaxLogin,
        githubWrite: actual.checks.githubWrite,
      },
    );
  await page.goto('http://qa.invalid/readiness');
  await display();
  await expect(page.locator('[data-key="status"]')).toHaveText('blocked-prerequisites');
  await expect(page.locator('[data-key="installed"]')).toBeVisible();
  await expect(page.locator('[data-key="installed"]')).toHaveText('false');
  await expect(page.locator('[data-key="crontab"]')).toHaveText('false');
  await expect(page.locator('[data-key="claudeMaxLogin"]')).toHaveText('false');
  await page.reload();
  await display();
  await expect(page.locator('[data-key="installed"]')).toHaveText('false');
  await page.screenshot({ path: path.join(directory, 'result.png'), fullPage: true });
  expect(errors).toEqual([]);
});
