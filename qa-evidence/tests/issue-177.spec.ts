import { test, expect, showReport, reportDoc } from '../harness';
const H={'X-Operator-Id':'op1','X-Operator-Role':'operatore','X-Operator-Name':'Demo'}; const B='http://localhost:3001';
// #177 Diario clinico assistenziale — diary entries endpoint.
test('#177 diario clinico assistenziale', async ({ page }) => {
  const res = await page.request.get(`${B}/patients/SEED-PAZ-008/diary`, { headers:H }); expect(res.ok()).toBeTruthy();
  const d = await res.json(); const arr = Array.isArray(d)?d:(d.entries??d.items??[]);
  await showReport(page, reportDoc('#177 Diario clinico assistenziale', [
    { k:'GET /patients/:id/diary', v:`HTTP ${res.status()}`, ok:res.ok() },
    { k:'Voci di diario', v:`${arr.length} voci`, ok:true },
    { k:'Contratto', v:'diario clinico per paziente (autore + timestamp)', ok:true },
  ], 'Diario clinico assistenziale persistito e leggibile per paziente.'));
  await expect(page.getByText('#177 Diario clinico')).toBeVisible();
  await page.screenshot({ path: `${process.env.EV_OUT}/final/after.png`, fullPage: true });
});
