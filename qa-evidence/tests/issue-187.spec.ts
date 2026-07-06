import { test, expect, enterAs } from '../harness';

const Q = 'mostrami gli ultimi parametri di Moretti Elena';

// #187 Lettura dati paziente tramite chatbot — deterministic patient-scoped read (F0 NER), source-only.
test('#187 lettura dati paziente tramite chatbot', async ({ page }) => {
  // The unified orchestrator classifies this as a READ, resolves the patient by name, returns sourced data.
  const api = await page.request.post('http://localhost:3001/ai/actions/plan', {
    headers: { 'X-Operator-Id': 'op1', 'X-Operator-Role': 'operatore', 'X-Operator-Name': 'Demo' },
    data: { text: Q, channel: 'testo' },
  });
  const j = await api.json();
  expect(j.plan.actionType).toBe('read');
  expect(j.read.intent).toBe('vitals_recent');
  expect(j.read.results.length).toBeGreaterThan(0);   // real data
  expect(j.read.sources.length).toBeGreaterThan(0);    // with sources

  // Drive the real Agnos chatbot UI and read the answer bubble.
  await enterAs(page, 'Operatore');
  await page.getByRole('button', { name: /Agnos/ }).first().click();
  const box = page.locator('.agnos-input');
  await expect(box).toBeVisible();
  await box.fill(Q);
  await page.getByRole('button', { name: 'Invia' }).click();
  await page.waitForTimeout(3000);

  const panel = (await page.textContent('.agnos-panel')) ?? '';
  // A real answer, not the "not recognized" fallback.
  expect(panel).not.toMatch(/Comando non riconosciuto/i);
  expect(panel.toLowerCase()).toMatch(/fonte|parametr|pressione|frequenz|saturaz|temperatur|mmhg|bpm/);

  await page.screenshot({ path: `${process.env.EV_OUT}/final/after.png`, fullPage: true });
});
