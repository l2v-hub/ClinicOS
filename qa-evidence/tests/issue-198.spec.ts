import { test, expect, showReport, reportDoc } from '../harness';
const H={'X-Operator-Id':'op1','X-Operator-Role':'operatore','X-Operator-Name':'Demo'}; const B='http://localhost:3001';
// #198 Dettatura parametri — spoken command (channel 'voce') recognized as a vital-sign write.
test('#198 dettatura parametri', async ({ page }) => {
  const plan = await page.request.post(`${B}/ai/actions/plan`, { headers:H, data:{ text:'registra saturazione 96 alle 8 per Moretti Elena', channel:'voce', currentPatientId:'SEED-PAZ-008' }});
  expect(plan.ok()).toBeTruthy(); const p = await plan.json();
  expect(p.plan.actionType).toBe('create_vital_sign'); expect(p.plan.channel).toBe('voce');
  await showReport(page, reportDoc('#198 Dettatura parametri (canale voce)', [
    { k:'Comando dettato (sintetico)', v:'registra saturazione 96 alle 8 per Moretti Elena', ok:true },
    { k:'Canale', v:p.plan.channel, ok:p.plan.channel==='voce' },
    { k:'plan.actionType', v:p.plan.actionType, ok:p.plan.actionType==='create_vital_sign' },
    { k:'Conferma obbligatoria', v:`${p.plan.requiresConfirmation}`, ok:true },
  ], 'Dettatura vocale (trascritta client-side) riconosciuta come registrazione parametro con conferma.'));
  await expect(page.getByText('#198 Dettatura parametri')).toBeVisible();
  await page.screenshot({ path: `${process.env.EV_OUT}/final/after.png`, fullPage: true });
});
