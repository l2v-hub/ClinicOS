import { test, expect } from 'playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const directory = path.dirname(fileURLToPath(import.meta.url));
test('Windows readiness accurately shows actual Linux-host limitation without claiming task installation', async ({
  page,
}) => {
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`HTTP ${r.status()}`);
  });
  const actual = JSON.parse(
    await readFile(path.join(directory, 'qa-actual-readiness.json'), 'utf8'),
  );
  expect(actual.hostPlatform).toBe('linux');
  expect(actual.status).toBe('blocked-prerequisites');
  expect(actual.installed).toBe(false);
  expect(actual.checks.powershell).toBe(false);
  const html =
    '<!doctype html><meta charset="utf-8"><title>ClinicOS Windows review — QA only</title><style>body{font:20px system-ui;background:#f4f8fc;color:#19394c;padding:48px}main{background:white;padding:32px;border:1px solid #cee0ee;border-radius:12px}h1{color:#1275ad}dt{font-weight:600;margin-top:14px}dd{margin-left:0}footer{margin-top:28px;color:#526b7a}</style><main><h1>ClinicOS · verifica Windows</h1><p>Diagnosi reale del solo ambiente cloud accessibile. Superficie esclusivamente QA.</p><dl id="facts"></dl><footer>File Windows personali preservati. Nessun task reale registrato e nessuna inferenza. Test Windows nativi separati, ancora necessari.</footer></main>';
  await page.route('http://qa.invalid/**', (r) =>
    r.fulfill({ contentType: 'text/html', body: html }),
  );
  const render = async () =>
    page.evaluate(
      (value) => {
        const list = document.querySelector('#facts');
        for (const [key, result] of Object.entries(value)) {
          const dt = document.createElement('dt');
          dt.textContent = key;
          const dd = document.createElement('dd');
          dd.dataset.key = key;
          dd.textContent = String(result);
          list.append(dt, dd);
        }
      },
      {
        hostPlatform: actual.hostPlatform,
        targetPlatform: actual.targetPlatform,
        status: actual.status,
        powershellAvailable: actual.checks.powershell,
        personalTaskInstalled: actual.personalTaskInstalled,
        nativeWindowsExecuted: actual.nativeWindowsExecuted,
        providerInferenceExecuted: actual.providerInferenceExecuted,
      },
    );
  await page.goto('http://qa.invalid/windows-readiness');
  await render();
  await expect(page.locator('[data-key="status"]')).toBeVisible();
  await expect(page.locator('[data-key="status"]')).toHaveText('blocked-prerequisites');
  await expect(page.locator('[data-key="personalTaskInstalled"]')).toHaveText('false');
  await expect(page.locator('[data-key="nativeWindowsExecuted"]')).toHaveText('false');
  await expect(page.locator('[data-key="providerInferenceExecuted"]')).toHaveText('false');
  await page.reload();
  await render();
  await expect(page.locator('[data-key="hostPlatform"]')).toHaveText('linux');
  await page.screenshot({ path: path.join(directory, 'result.png'), fullPage: true });
  expect(errors).toEqual([]);
});
