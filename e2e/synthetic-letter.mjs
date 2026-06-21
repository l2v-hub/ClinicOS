// Generate a 100% SYNTHETIC Italian discharge letter PDF for prod import verification.
// Clearly-fake patient, clearly-fake clinical text. No real patient data. Structured with
// canonical section headings + a multi-line diagnosis + a date-prefixed course line, so the
// import pipeline (OCR -> sections -> narrative) has real content to map. Renders via Chromium.
import { chromium } from 'playwright';
import { resolve } from 'node:path';

const HTML = `<!doctype html><html lang="it"><head><meta charset="utf-8">
<style>
  body{font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#000;margin:32px;line-height:1.5}
  h1{font-size:16px;margin:0 0 4px} h2{font-size:14px;margin:16px 0 4px}
  .hdr{border:1px solid #000;padding:6px;margin-bottom:10px;font-size:11px}
  .muted{color:#333}
</style></head><body>
<h1>OSPEDALE DI TEST — Lettera di Dimissione (DOCUMENTO SINTETICO DI PROVA)</h1>
<div class="hdr">
  Paziente: ROSSI MARIO (PAZIENTE FITTIZIO) &nbsp; Nascita: 01/01/1950 &nbsp; Sesso: M<br>
  Residenza: Via di Prova 1, Testopoli &nbsp; Codice Fiscale: RSSMRA50A01L000T &nbsp; Cartella: TEST-0001
</div>

<h2>Anamnesi Patologica Recente:</h2>
<p>In data 03/02/2024 accesso in Pronto Soccorso per dolore toracico atipico in paziente fittizio
creato a soli fini di test. Riferito benessere precedente. Nessun dato clinico reale.</p>

<h2>Anamnesi Patologica Remota:</h2>
<p>Pregresso intervento di prova non significativo (dato sintetico).</p>

<h2>Diagnosi di dimissione:</h2>
<p>Scompenso cardiaco di prova.
Ipertensione arteriosa di prova.
Diabete mellito tipo 2 di prova.</p>

<h2>Decorso ospedaliero:</h2>
<p>03/02/2024 ingresso in reparto di test, parametri stabili.
05/02/2024 miglioramento del quadro clinico fittizio e dimissione.</p>

<h2>Terapia alla dimissione:</h2>
<p>Farmaco-di-prova A 5 mg 1 cp/die. Farmaco-di-prova B 25 mg al bisogno.</p>

<h2>Allergie:</h2>
<p>Pantoprazolo-di-prova: riferita reazione cutanea (dato sintetico, gravità non specificata).</p>

<h2>Consigli e controlli:</h2>
<p>Controllo cardiologico di prova tra 30 giorni. Dieta iposodica fittizia.</p>
</body></html>`;

const out = process.argv[2] ?? resolve(process.cwd(), 'dimissione-sintetica-test.pdf');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(HTML, { waitUntil: 'networkidle' });
await page.pdf({ path: out, format: 'A4', printBackground: true });
await browser.close();
console.log('wrote', out);
