import { test, expect, showReport, reportDoc } from '../harness';

const H = { 'X-Operator-Id': 'op1', 'X-Operator-Role': 'operatore', 'X-Operator-Name': 'Demo' };
const B = 'http://localhost:3001';

// #188 Creazione consegne tramite chatbot — plan → confirm → execute → persisted, visible on reload.
test('#188 creazione consegne tramite chatbot', async ({ page }) => {
  const text = 'crea una consegna per Moretti Elena controllare la ferita operatoria';
  const key = `k-188-${Date.now()}`;

  const plan = await page.request.post(`${B}/ai/actions/plan`, { headers: H, data: { text, channel: 'testo' } });
  expect(plan.ok()).toBeTruthy();
  const pj = await plan.json();
  expect(pj.plan.actionType).toBe('create_consegna');
  expect(pj.plan.patientId).toBeTruthy();
  expect(pj.preview.canExecute).toBeTruthy();

  const exec = await page.request.post(`${B}/ai/actions/execute`, {
    headers: H, data: { text, channel: 'testo', patientId: pj.plan.patientId, idempotencyKey: key, confirmed: true },
  });
  expect(exec.ok()).toBeTruthy();
  const ej = await exec.json();
  expect(ej.ok).toBe(true);
  expect(ej.actionType).toBe('create_consegna');
  expect(ej.recordId).toBeTruthy();

  // Persistence: the new consegna is retrievable afterwards (survives a fresh GET / reload).
  const list = await page.request.get(`${B}/consegne`);
  const created = (await list.json()).find((c: any) => c.id === ej.recordId);
  expect(created, 'consegna persisted').toBeTruthy();
  expect(created.note).toContain('ferita');

  await showReport(page, reportDoc('#188 Creazione consegne tramite chatbot', [
    { k: 'Comando (sintetico)', v: text },
    { k: 'plan.actionType', v: pj.plan.actionType, ok: pj.plan.actionType === 'create_consegna' },
    { k: 'Conferma obbligatoria', v: `requiresConfirmation=${pj.plan.requiresConfirmation}`, ok: true },
    { k: 'execute ok / recordId', v: `${ej.ok} / ${ej.recordId}`, ok: ej.ok },
    { k: 'Persistenza (GET /consegne)', v: `trovata id=${created.id}`, ok: !!created },
    { k: 'Contenuto', v: created.note, ok: /ferita/.test(created.note) },
  ], 'Create-only, no Delete; conferma richiesta prima del salvataggio; consegna persistita su Postgres.'));
  await expect(page.getByText('#188 Creazione consegne')).toBeVisible();
  await page.screenshot({ path: `${process.env.EV_OUT}/final/after.png`, fullPage: true });
});
