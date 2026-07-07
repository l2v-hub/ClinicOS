import { test, expect, showReport, reportDoc } from '../harness';

const H = { 'X-Operator-Id': 'op1', 'X-Operator-Role': 'operatore', 'X-Operator-Name': 'Demo' };
const B = 'http://localhost:3001';

// #193 Rifiuto Delete tramite chatbot — every delete variant is refused at plan AND execute; no write.
const VARIANTS = ['elimina la nota di Moretti', 'cancella i parametri di oggi', 'rimuovi la consegna', 'svuota il diario'];

test('#193 rifiuto delete tramite chatbot', async ({ page }) => {
  const rows: Array<{ k: string; v: string; ok: boolean }> = [];
  for (const text of VARIANTS) {
    const plan = await page.request.post(`${B}/ai/actions/plan`, { headers: H, data: { text, channel: 'testo' } });
    const pj = await plan.json();
    expect(pj.plan.actionType).toBe('refuse_forbidden');
    // Even a "confirmed" execute must be rejected with no write (HTTP 4xx from the delete guard).
    const exec = await page.request.post(`${B}/ai/actions/execute`, {
      headers: H, data: { text, channel: 'testo', patientId: 'SEED-PAZ-008', idempotencyKey: `k193-${Date.now()}-${text.length}`, confirmed: true },
    });
    expect(exec.status()).toBeGreaterThanOrEqual(400);
    rows.push({ k: `"${text}"`, v: `plan=${pj.plan.actionType} · execute HTTP ${exec.status()}`, ok: pj.plan.actionType === 'refuse_forbidden' && exec.status() >= 400 });
  }

  await showReport(page, reportDoc('#193 Rifiuto Delete tramite chatbot', [
    ...rows,
    { k: 'Sintesi', v: 'ogni variante delete rifiutata al plan e all\'execute (nessuna scrittura)', ok: true },
  ], 'Delete non rappresentabile per costruzione; la cancellazione resta all\'interfaccia tradizionale.'));
  await expect(page.getByText('#193 Rifiuto Delete')).toBeVisible();
  await page.screenshot({ path: `${process.env.EV_OUT}/final/after.png`, fullPage: true });
});
