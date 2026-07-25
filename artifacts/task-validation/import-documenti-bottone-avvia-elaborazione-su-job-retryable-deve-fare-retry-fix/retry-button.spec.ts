// Evidence spec — AC1/AC2 del task contract (bottone primario retry su job retryable).
// Stack locale: frontend :5173, backend :3001 con AI_RUNTIME_URL irraggiungibile
// (http://127.0.0.1:9) così il worker porta il job in `retryable_error` (provider_error).
import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EV = resolve(__dirname);
const SHOTS = resolve(EV, 'screenshots');

test('AC1+AC2: Avvia elaborazione -> retryable_error -> bottone primario fa /retry (mai /process 400)', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const processCalls: { url: string; status: number; phase: string }[] = [];
  const retryCalls: number[] = [];
  let phase = 'initial';
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('response', (r) => {
    const u = r.url();
    if (u.includes('/ai/extraction/jobs') && u.endsWith('/process'))
      processCalls.push({ url: u, status: r.status(), phase });
    if (u.includes('/ai/extraction/jobs') && u.endsWith('/retry')) retryCalls.push(r.status());
  });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.getByText('Operatore', { exact: true }).click();
  await page.getByText('Pazienti').first().click();
  await page.getByRole('button', { name: /Importa (dimissione|lettera di dimissione)/ }).click();

  // Upload di un documento sintetico
  const tmp = resolve(EV, 'logs', 'lettera-sintetica.txt');
  writeFileSync(tmp, 'LETTERA DI DIMISSIONE\nPaziente sintetico QA.\nDiagnosi: test.\n');
  await page.locator('.import-modal input[type="file"]').setInputFiles(tmp);
  await expect(page.locator('.import-modal__item')).toHaveCount(1);

  // AC2: primo avvio — etichetta e chiamata /process (202)
  const primary = page.locator('.import-modal__foot .btn-primary');
  await expect(primary).toHaveText('Avvia elaborazione');
  await expect(primary).toBeEnabled();
  phase = 'first-start';
  await primary.click();

  // Il worker locale fallisce (runtime irraggiungibile) -> retryable_error -> il
  // polling del modal riabilita il footer con l'etichetta di retry.
  await expect(primary).toHaveText('↻ Riprova elaborazione', { timeout: 30000 });
  await expect(page.locator('.import-modal__error')).toBeVisible();
  await page.screenshot({ path: resolve(SHOTS, 'ac1-stato-retryable.png') });

  // AC2 assert: la prima chiamata /process è avvenuta in fase first-start con 202.
  expect(processCalls.length).toBe(1);
  expect(processCalls[0].status).toBe(202);
  expect(processCalls[0].phase).toBe('first-start');

  // AC1: il click sul bottone primario ora fa /retry (202) e NESSUNA nuova /process.
  phase = 'after-retryable';
  await primary.click();
  await expect(primary).toHaveText('Elaborazione in corso…');
  await expect.poll(() => retryCalls.length, { timeout: 10000 }).toBeGreaterThan(0);
  expect(retryCalls[0]).toBe(202);
  const processAfterRetryable = processCalls.filter((c) => c.phase === 'after-retryable');
  expect(processAfterRetryable).toHaveLength(0); // niente 400 possibile
  await page.screenshot({ path: resolve(SHOTS, 'ac2-retry-in-corso.png') });

  // AC3: nessun errore console rilevante (il banner di errore del job è UI attesa).
  expect(consoleErrors).toHaveLength(0);
});
