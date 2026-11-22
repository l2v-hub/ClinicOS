// usage: node e2e-fields.cjs <baseUrl> <role> <outDir> <file...>
// Importa, crea la bozza dalla revisione e legge i campi dell'ingresso compilati, poi ricarica e riapre la bozza.
const { chromium } = require('playwright'); const fs = require('fs');
const [base, role, out, ...files] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const lines = []; const say = (...a) => { const l = a.join(' '); lines.push(l); console.log(l); };
async function login(p) {
  await p.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
  await p.locator('button', { hasText: role }).first().click(); await p.waitForTimeout(3000);
  const ok = p.locator('button', { hasText: 'Ho capito' }); if (await ok.count()) await ok.first().click();
  const items = p.locator('.teams-sidebar button, .teams-sidebar a'); const n = await items.count();
  for (let i = 0; i < n; i++) if ((await items.nth(i).innerText()).split('\n')[0].trim() === 'Pazienti') { await items.nth(i).click(); break; }
  await p.waitForTimeout(1500);
}
async function readFields(p) {
  return p.evaluate(() => {
    const outp = {};
    for (const f of document.querySelectorAll('.npm-field')) {
      const label = (f.querySelector('.npm-label')?.textContent || '').replace(/\s*\*$/, '').trim();
      const c = f.querySelector('input, select, textarea'); if (!label || !c) continue;
      const v = c.tagName === 'SELECT' ? (c.selectedOptions[0]?.value ? c.selectedOptions[0].textContent.trim() : '') : c.value;
      outp[label] = { value: v, ai: !!f.getAttribute('data-ai-field') || !!f.querySelector('.intake-ai-badge') };
    }
    return outp;
  });
}
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1366, height: 1000 }, bypassCSP: true });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  p.on('response', r => { if (['xhr', 'fetch'].includes(r.request().resourceType()) && r.status() >= 400) errs.push(r.status() + ' ' + r.request().method() + ' ' + r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 80)); });
  await login(p);
  await p.getByText('Importa dimissione').first().click(); await p.waitForTimeout(1000);
  await p.setInputFiles('input[type=file][multiple]', files);
  const start = p.getByRole('button', { name: /Avvia elaborazione/i }); await start.waitFor({ state: 'visible', timeout: 60000 });
  for (let i = 0; i < 120 && await start.isDisabled(); i++) await p.waitForTimeout(250);
  const t = Date.now(); await start.click();
  await p.locator('[data-testid="srev-PATIENT_DEMOGRAPHICS"]').waitFor({ state: 'visible', timeout: 420000 });
  say(`revisione pronta in ${((Date.now() - t) / 1000).toFixed(1)}s`);
  await p.getByRole('button', { name: /Crea paziente/i }).click();
  await p.locator('[data-testid="intake-section-terapia"]').waitFor({ state: 'visible', timeout: 30000 });
  await p.waitForTimeout(2000);
  const fields = await readFields(p);
  const wanted = ['Nome', 'Cognome', 'Data di nascita', 'Sesso', 'Comune di nascita', 'Provincia di nascita', 'Codice fiscale', 'Telefono', 'Email', 'Indirizzo', 'Comune', 'Provincia', 'CAP', 'Nome e cognome referente', 'Relazione con il paziente', 'Telefono referente', 'Provenienza', 'Centro inviante', 'Motivo di ingresso'];
  say('## Campi dell\'ingresso dopo «Crea paziente»');
  for (const k of wanted) { const f = Object.entries(fields).find(([l]) => l.replace(/ · .*/, '') === k)?.[1]; say(`${k.padEnd(28)} ${f ? JSON.stringify(f.value) : '(campo non trovato)'}${f?.ai ? '  [AI]' : ''}`); }
  const filledCount = wanted.filter(k => { const f = Object.entries(fields).find(([l]) => l.replace(/ · .*/, '') === k)?.[1]; return f && f.value; }).length;
  say(`compilati ${filledCount} su ${wanted.length}`);
  const therapy = await p.locator('[data-testid="intake-section-terapia"]').innerText();
  fs.writeFileSync(`${out}/terapia.txt`, therapy);
  const clinical = await p.locator('main').innerText().catch(() => '');
  fs.writeFileSync(`${out}/scheda.txt`, clinical);
  say('## Terapia: righe ' + (therapy.match(/da verificare|Da verificare/g) || []).length + ' «da verificare»; farmaci citati: ' + ['Furosemide', 'Bisoprololo', 'Ramipril', 'Apixaban', 'Spironolattone', 'Atorvastatina', 'Insulina', 'Pantoprazolo', 'Tiotropio'].filter(d => new RegExp(d, 'i').test(therapy)).length + '/9 nomi');
  await p.screenshot({ path: `${out}/bozza.png`, fullPage: true });
  // persistenza: ricarica e riapri la bozza
  await p.waitForTimeout(1500);
  await login(p);
  const resume = p.getByRole('button', { name: /Riprendi bozza · .*Bianchi/i }).first();
  if (await resume.count()) {
    await resume.click(); await p.locator('[data-testid="intake-section-terapia"]').waitFor({ state: 'visible', timeout: 30000 }); await p.waitForTimeout(1500);
    const again = await readFields(p);
    const same = wanted.every(k => { const a = Object.entries(fields).find(([l]) => l.replace(/ · .*/, '') === k)?.[1]?.value; const c = Object.entries(again).find(([l]) => l.replace(/ · .*/, '') === k)?.[1]?.value; return a === c; });
    say(`## Dopo ricarica e «Riprendi bozza»: campi identici = ${same}`);
    await p.screenshot({ path: `${out}/bozza-riaperta.png`, fullPage: true });
    if (process.env.CLEANUP === '1') { const del = p.getByRole('button', { name: /Elimina bozza/i }).first(); if (await del.count()) { await del.click(); await p.waitForTimeout(600); const c = p.getByRole('button', { name: /^Elimina bozza$|^Elimina$|Conferma/ }).last(); await c.click().catch(() => {}); await p.waitForTimeout(1500); say('bozza di prova eliminata'); } }
  } else say('## «Riprendi bozza» non trovato');
  say('errori console/API: ' + JSON.stringify(errs));
  fs.writeFileSync(`${out}/campi.txt`, lines.join('\n') + '\n');
  await b.close();
})();
