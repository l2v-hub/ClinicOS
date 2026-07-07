import { test, expect, showReport, reportDoc } from '../harness';
const B = 'http://localhost:3001';
// #178 Consegne strutturate — model with patient/operator link + structured status (aperta/in_corso/completata).
test('#178 consegne strutturate', async ({ page }) => {
  const res = await page.request.get(`${B}/consegne`); expect(res.ok()).toBeTruthy();
  const d = await res.json(); expect(d.length).toBeGreaterThan(0);
  const c = d[0];
  for (const f of ['pazienteNome','operatoreAssegnato','creatoDA','stato','priorita','tipo']) expect(c).toHaveProperty(f);
  const stati = [...new Set(d.map((x:any)=>x.stato))];
  expect(stati.every((s:string)=>['aperta','in_corso','completata'].includes(s))).toBeTruthy();
  await showReport(page, reportDoc('#178 Consegne strutturate', [
    { k:'GET /consegne', v:`HTTP ${res.status()} · ${d.length} consegne`, ok:res.ok() },
    { k:'Campi strutturati', v:'pazienteNome, operatoreAssegnato, creatoDA, stato, priorita, tipo', ok:true },
    { k:'Stati (enum)', v:stati.join(', '), ok:true },
    { k:'Link paziente/operatore', v:`paziente=${c.pazienteNome} · assegnato=${c.operatoreAssegnato}`, ok:true },
  ], 'Consegne strutturate con stato e collegamento paziente/operatore.'));
  await expect(page.getByText('#178 Consegne strutturate')).toBeVisible();
  await page.screenshot({ path: `${process.env.EV_OUT}/final/after.png`, fullPage: true });
});
