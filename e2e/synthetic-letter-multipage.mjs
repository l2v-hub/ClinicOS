// 2-page SYNTHETIC discharge letter for BUG-045 (#67) multipage continuation + BUG-046 (#68)
// repeated-header filtering. Page 1 starts "Anamnesi"; page 2 repeats the SAME header and
// continues the anamnesi with NO new heading, then starts "Terapia". Distinct sentinel phrases
// ("pagina uno" / "pagina due") let the verifier prove both pages merged into ONE block.
import { chromium } from 'playwright';
import { resolve } from 'node:path';

const HEADER = `<div class="hdr">Paziente: ROSSI MARIO (PAZIENTE FITTIZIO) &nbsp; Nascita: 01/01/1950 &nbsp; Sesso: M<br>
  Residenza: Via di Prova 1, Testopoli &nbsp; Codice Fiscale: RSSMRA50A01L000T &nbsp; Cartella: TEST-0001</div>`;

const HTML = `<!doctype html><html lang="it"><head><meta charset="utf-8"><style>
  body{font-family:Arial,sans-serif;font-size:13px;color:#000;margin:32px;line-height:1.5}
  h1{font-size:16px} h2{font-size:14px;margin:14px 0 4px}
  .hdr{border:1px solid #000;padding:6px;margin-bottom:10px;font-size:11px}
  .page{page-break-after:always}
</style></head><body>
<div class="page">
  <h1>OSPEDALE DI TEST — Lettera di Dimissione (DOCUMENTO SINTETICO)</h1>
  ${HEADER}
  <h2>Anamnesi Patologica Recente:</h2>
  <p>Frase di prova pagina uno: paziente fittizio con dolore toracico di prova, nessun dato reale.</p>
</div>
<div>
  ${HEADER}
  <p>Frase di prova pagina due: prosecuzione del ricovero fittizio sulla pagina successiva senza nuovo titolo.</p>
  <h2>Terapia alla dimissione:</h2>
  <p>Farmaco-di-prova A 5 mg 1 cp/die.</p>
</div>
</body></html>`;

const out = process.argv[2] ?? resolve(process.cwd(), 'dimissione-multipagina-test.pdf');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(HTML, { waitUntil: 'networkidle' });
await page.pdf({ path: out, format: 'A4', printBackground: true });
await browser.close();
console.log('wrote', out);
