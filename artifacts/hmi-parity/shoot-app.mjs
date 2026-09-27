// Fotografa le schermate dell'app (preview :4173, stub :3001) a 1180x820, come il prototipo.
import { chromium } from 'playwright';
const OUT = process.env.OUT ?? 'artifacts/hmi-parity/app';
const BASE = process.env.BASE ?? 'http://localhost:4173';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1180, height: 820 } });
await p.goto(BASE);
await p.getByText('Operatore', { exact: true }).first().click();
await p.waitForTimeout(2500);
const shot = async (n) => { await p.waitForTimeout(1200); await p.screenshot({ path: `${OUT}/${n}.png` }); console.log('shot', n); };
await shot('turno');
const nav = async (title) => { await p.locator(`.teams-sidebar__item[title="${title}"]`).click(); };
for (const [t, n] of [['Pazienti','pazienti'],['Terapia','terapia'],['Parametri','parametri'],['Consegne','consegne'],['Agenda','agenda'],['Note','note'],['Farmaci','farmaci']]) {
  try { await nav(t); await shot(n); } catch (e) { console.log('skip', t, e.message.split('\n')[0]); }
}
await nav('Pazienti'); await p.waitForTimeout(1000);
await p.getByRole('button', { name: /^Apri cartella di / }).first().click();
await shot('cartella');
await nav('Pazienti'); await p.waitForTimeout(800);
await p.getByRole('button', { name: 'Nuovo paziente' }).first().click();
await shot('ingresso-start');
await b.close();
