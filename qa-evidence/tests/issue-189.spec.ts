import { test, expect, showReport, reportDoc } from '../harness';

const H = { 'X-Operator-Id': 'op1', 'X-Operator-Role': 'operatore', 'X-Operator-Name': 'Demo' };
const B = 'http://localhost:3001';

// #189 Creazione diario tramite chatbot — plan → confirm → execute → persistent diary entry.
test('#189 creazione diario tramite chatbot', async ({ page }) => {
  const text = 'aggiungi una nota al diario di Moretti Elena con paziente vigile e collaborante';
  const key = `k-189-${Date.now()}`;

  const plan = await page.request.post(`${B}/ai/actions/plan`, { headers: H, data: { text, channel: 'testo', currentPatientId: 'SEED-PAZ-008' } });
  expect(plan.ok()).toBeTruthy();
  const pj = await plan.json();
  expect(pj.plan.actionType).toBe('add_diary_note');
  expect(pj.plan.requiresConfirmation).toBe(true);

  const exec = await page.request.post(`${B}/ai/actions/execute`, {
    headers: H, data: { text, channel: 'testo', patientId: 'SEED-PAZ-008', idempotencyKey: key, confirmed: true },
  });
  expect(exec.ok()).toBeTruthy();
  const ej = await exec.json();
  expect(ej.ok).toBe(true);
  expect(ej.actionType).toBe('add_diary_note');
  expect(ej.recordId).toBeTruthy();

  await showReport(page, reportDoc('#189 Creazione diario tramite chatbot', [
    { k: 'Comando (sintetico)', v: text },
    { k: 'plan.actionType', v: pj.plan.actionType, ok: pj.plan.actionType === 'add_diary_note' },
    { k: 'Conferma obbligatoria', v: `requiresConfirmation=${pj.plan.requiresConfirmation}`, ok: pj.plan.requiresConfirmation },
    { k: 'execute ok / recordId (persistito)', v: `${ej.ok} / ${ej.recordId}`, ok: ej.ok && !!ej.recordId },
  ], 'Nota di diario creata via chatbot con conferma; recordId Prisma = persistenza.'));
  await expect(page.getByText('#189 Creazione diario')).toBeVisible();
  await page.screenshot({ path: `${process.env.EV_OUT}/final/after.png`, fullPage: true });
});
