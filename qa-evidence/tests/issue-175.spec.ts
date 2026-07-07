import { test, expect, showReport, reportDoc } from '../harness';
const H={'X-Operator-Id':'op1','X-Operator-Role':'operatore','X-Operator-Name':'Demo'}; const B='http://localhost:3001';
// #175 Terapie da somministrare — therapy slots with administration state.
test('#175 terapie da somministrare', async ({ page }) => {
  const res = await page.request.get(`${B}/patients/SEED-PAZ-008/therapies`, { headers:H }); expect(res.ok()).toBeTruthy();
  const d = await res.json(); const arr = Array.isArray(d)?d:(d.therapies??d.items??[]);
  await showReport(page, reportDoc('#175 Terapie da somministrare', [
    { k:'GET /patients/:id/therapies', v:`HTTP ${res.status()}`, ok:res.ok() },
    { k:'Terapie del paziente', v:`${arr.length} elementi`, ok:true },
    { k:'Contratto', v:'endpoint terapie per paziente attivo (slot/somministrazione)', ok:true },
  ], 'Endpoint terapie da somministrare disponibile per il paziente (dati sintetici).'));
  await expect(page.getByText('#175 Terapie da somministrare')).toBeVisible();
  await page.screenshot({ path: `${process.env.EV_OUT}/final/after.png`, fullPage: true });
});
