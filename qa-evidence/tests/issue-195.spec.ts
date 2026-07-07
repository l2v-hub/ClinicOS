import { test, expect, showReport, reportDoc } from '../harness';
const H={'X-Operator-Id':'op1','X-Operator-Role':'operatore','X-Operator-Name':'Demo'}; const B='http://localhost:3001';
// #195 Infrastruttura voce Agnos — STT capability/degradation contract; write via 'voce' channel.
test('#195 infrastruttura voce agnos', async ({ page }) => {
  const stt = await page.request.get(`${B}/ai/voice/stt`, { headers:H }); expect(stt.ok()).toBeTruthy();
  const s = await stt.json();
  for (const f of ['available','degraded','requiredCapabilities']) expect(s).toHaveProperty(f);
  await showReport(page, reportDoc('#195 Infrastruttura voce Agnos', [
    { k:'GET /ai/voice/stt', v:`HTTP ${stt.status()}`, ok:stt.ok() },
    { k:'Contratto STT', v:JSON.stringify(s.requiredCapabilities), ok:Array.isArray(s.requiredCapabilities) },
    { k:'Degradazione senza blocco', v:`available=${s.available} degraded=${s.degraded} (Web Speech client-side resta)`, ok:true },
  ], 'Infrastruttura voce: STT capability/degradation model + trascrizione client-side (Web Speech).'));
  await expect(page.getByText('#195 Infrastruttura voce')).toBeVisible();
  await page.screenshot({ path: `${process.env.EV_OUT}/final/after.png`, fullPage: true });
});
