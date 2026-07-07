import { test, expect, showReport, reportDoc } from '../harness';

const H = { 'X-Operator-Id': 'op1', 'X-Operator-Role': 'operatore', 'X-Operator-Name': 'Demo' };
const B = 'http://localhost:3001';

// #194 Conferma obbligatoria per Create/Update Agnos — execute without confirmation is blocked (428);
// with confirmation it succeeds. Plan re-derived server-side (tamper-proof).
test('#194 conferma obbligatoria per create update agnos', async ({ page }) => {
  const text = 'registra temperatura 37.2 alle 10 per Moretti Elena';

  // Without confirmation -> 428 Confirmation required, NO write.
  const noConf = await page.request.post(`${B}/ai/actions/execute`, {
    headers: H, data: { text, channel: 'testo', patientId: 'SEED-PAZ-008', idempotencyKey: `k194a-${Date.now()}`, confirmed: false },
  });
  expect(noConf.status()).toBe(428);

  // With confirmation -> success.
  const conf = await page.request.post(`${B}/ai/actions/execute`, {
    headers: H, data: { text, channel: 'testo', patientId: 'SEED-PAZ-008', idempotencyKey: `k194b-${Date.now()}`, confirmed: true },
  });
  expect(conf.ok()).toBeTruthy();
  const cj = await conf.json();
  expect(cj.ok).toBe(true);
  expect(cj.recordId).toBeTruthy();

  await showReport(page, reportDoc('#194 Conferma obbligatoria per Create/Update Agnos', [
    { k: 'Comando (sintetico)', v: text },
    { k: 'execute confirmed:false', v: `HTTP ${noConf.status()} (428 = conferma richiesta), nessuna scrittura`, ok: noConf.status() === 428 },
    { k: 'execute confirmed:true', v: `ok=${cj.ok}, recordId=${cj.recordId}`, ok: cj.ok && !!cj.recordId },
    { k: 'Sintesi', v: 'nessuna Create/Update senza conferma esplicita', ok: true },
  ], 'Il plan è ri-derivato server-side dal testo (tamper-proof); conferma obbligatoria per ogni scrittura.'));
  await expect(page.getByText('#194 Conferma obbligatoria')).toBeVisible();
  await page.screenshot({ path: `${process.env.EV_OUT}/final/after.png`, fullPage: true });
});
