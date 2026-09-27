// Fotografa ogni schermata del prototipo HMI 1 (dispositivo 1180x820).
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const OUT = 'artifacts/hmi-parity/proto';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
await p.goto(pathToFileURL(resolve(OUT, 'hmi1.html')).href);
await p.waitForTimeout(1500);
// forza la scala 1:1 del dispositivo
await p.addStyleTag({ content: '.dev{transform:none!important;position:relative!important} .viewport{height:820px!important;width:1180px!important}' });
const dev = p.locator('.dev');
const shot = async (name) => { await p.waitForTimeout(400); await dev.screenshot({ path: `${OUT}/${name}.png` }); console.log('shot', name); };
for (const k of ['turno', 'pazienti', 'terapia', 'parametri', 'consegne', 'agenda', 'note', 'farmaci']) {
  await p.locator(`.rail-btn[data-arg="${k}"]`).click();
  await shot(k);
}
// cartella: apri un paziente dalla lista
await p.locator('.rail-btn[data-arg="pazienti"]').click();
await p.waitForTimeout(300);
const open = p.locator('[data-act="open"]').first();
if (await open.count()) { await open.click(); await shot('cartella'); 
  const tabs = p.locator('[data-act="ptab"]');
  const n = await tabs.count();
  for (let i = 0; i < n; i++) { const t = tabs.nth(i); const lab = (await t.innerText()).trim().split('\n')[0].replace(/\W+/g,'_'); await t.click(); await shot('cartella-' + i + '-' + lab); }
}
// ingresso
await p.locator('.rail-btn[data-arg="pazienti"]').click();
await p.waitForTimeout(300);
const ni = p.locator('[data-act="newIntake"]').first();
if (await ni.count()) { await ni.click(); await shot('ingresso-start'); }
const starts = p.locator('[data-act="ikStart"]');
if (await starts.count()) { await starts.first().click(); await p.waitForTimeout(2500); await shot('ingresso-docs'); }
// assistente
await p.locator('.rail-btn[data-arg="turno"]').click();
await p.locator('[data-act="drawer"]').click();
await shot('assistente');
await b.close();
