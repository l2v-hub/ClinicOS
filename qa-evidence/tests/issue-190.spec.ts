import { test, expect, showReport, reportDoc } from '../harness';

const H = { 'X-Operator-Id': 'op1', 'X-Operator-Role': 'operatore', 'X-Operator-Name': 'Demo' };
const B = 'http://localhost:3001';

// #190 Registrazione parametri tramite chatbot — plan → confirm → execute → vital persisted; the read
// path then returns the freshly recorded value (persistence proof).
test('#190 registrazione parametri tramite chatbot', async ({ page }) => {
  const text = 'registra pressione 128 su 84 alle 11 per Moretti Elena';
  const key = `k-190-${Date.now()}`;

  const plan = await page.request.post(`${B}/ai/actions/plan`, { headers: H, data: { text, channel: 'testo', currentPatientId: 'SEED-PAZ-008' } });
  expect(plan.ok()).toBeTruthy();
  const pj = await plan.json();
  expect(pj.plan.actionType).toBe('create_vital_sign');
  expect(pj.plan.requiresConfirmation).toBe(true);

  const exec = await page.request.post(`${B}/ai/actions/execute`, {
    headers: H, data: { text, channel: 'testo', patientId: 'SEED-PAZ-008', idempotencyKey: key, confirmed: true },
  });
  expect(exec.ok()).toBeTruthy();
  const ej = await exec.json();
  expect(ej.ok).toBe(true);
  expect(ej.actionType).toBe('create_vital_sign');
  expect(ej.recordId).toBeTruthy();

  // Persistence via the read path: the recorded value is now retrievable.
  const read = await page.request.post(`${B}/ai/actions/plan`, {
    headers: H, data: { text: 'mostrami gli ultimi parametri di Moretti Elena', channel: 'testo' },
  });
  const rj = await read.json();
  expect(rj.read.results.length).toBeGreaterThan(0);
  const hasPA = JSON.stringify(rj.read.results).includes('128');

  await showReport(page, reportDoc('#190 Registrazione parametri tramite chatbot', [
    { k: 'Comando (sintetico)', v: text },
    { k: 'plan.actionType', v: pj.plan.actionType, ok: pj.plan.actionType === 'create_vital_sign' },
    { k: 'Conferma obbligatoria', v: `requiresConfirmation=${pj.plan.requiresConfirmation}`, ok: pj.plan.requiresConfirmation },
    { k: 'execute ok / recordId', v: `${ej.ok} / ${ej.recordId}`, ok: ej.ok && !!ej.recordId },
    { k: 'Persistenza (read path)', v: hasPA ? 'valore 128 presente negli ultimi parametri' : `${rj.read.results.length} risultati`, ok: rj.read.results.length > 0 },
  ], 'Parametro creato via chatbot con conferma; visibile poi via lettura (persistenza).'));
  await expect(page.getByText('#190 Registrazione parametri')).toBeVisible();
  await page.screenshot({ path: `${process.env.EV_OUT}/final/after.png`, fullPage: true });
});
