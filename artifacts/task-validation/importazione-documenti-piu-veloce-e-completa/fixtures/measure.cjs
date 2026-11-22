// usage: node measure.cjs <baseUrl> <role> <outDir> <file...>
// Lancia un'importazione dall'interfaccia e registra i tempi: caricamento, attesa, OCR, estrazione.
const { chromium } = require('playwright'); const fs = require('fs');
const [base, role, out, ...files] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, bypassCSP: true });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const t0 = { v: 0 }; const rel = () => ((Date.now() - t0.v) / 1000).toFixed(1);
  const timeline = []; let lastState = ''; let lastJob = null; const calls = [];
  p.on('response', async r => {
    const u = r.url(); if (!['xhr', 'fetch'].includes(r.request().resourceType()) || !t0.v) return;
    const path = u.replace(/^https?:\/\/[^/]+/, '').replace(/[0-9a-f-]{20,}|c[a-z0-9]{20,}/g, ':id');
    calls.push(`${rel()}s ${r.request().method()} ${path} ${r.status()}`);
    try {
      const j = await r.json(); const job = j.job || j;
      if (/\/result(\?|$)/.test(u) && r.status() === 200) fs.writeFileSync(`${out}/result.json`, JSON.stringify(j, null, 1));
      if (job && job.status && job.manifest) {
        lastJob = job;
        const units = (job.pages || job.units || []);
        const st = `${job.status}/${job.stage || ''}` + (job.progress ? ' ' + JSON.stringify(job.progress) : '');
        if (st !== lastState) { lastState = st; timeline.push(`${rel()}s ${st}`); }
      }
    } catch {}
  });
  await p.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
  await p.locator('button', { hasText: role }).first().click(); await p.waitForTimeout(3500);
  const ok = p.locator('button', { hasText: 'Ho capito' }); if (await ok.count()) await ok.first().click();
  const items = p.locator('.teams-sidebar button, .teams-sidebar a'); const n = await items.count();
  for (let i = 0; i < n; i++) if ((await items.nth(i).innerText()).split('\n')[0].trim() === 'Pazienti') { await items.nth(i).click(); break; }
  await p.waitForTimeout(1500);
  await p.getByText('Importa dimissione').first().click(); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/1-inizio.png` });
  t0.v = Date.now();
  await p.setInputFiles('input[type=file][multiple]', files);
  const start = p.getByRole('button', { name: /Avvia elaborazione/i });
  await start.waitFor({ state: 'visible', timeout: 60000 });
  // attende che le pagine siano caricate (pulsante abilitato)
  for (let i = 0; i < 120 && await start.isDisabled(); i++) await p.waitForTimeout(250);
  const tUploaded = rel();
  await p.screenshot({ path: `${out}/2-caricato.png` });
  await start.click(); const tClick = Date.now();
  const demo = p.locator('[data-testid="srev-PATIENT_DEMOGRAPHICS"]');
  let outcome = 'review';
  try { await demo.waitFor({ state: 'visible', timeout: 420000 }); } catch { outcome = 'timeout/errore'; }
  const tReview = ((Date.now() - tClick) / 1000).toFixed(1);
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/3-esito.png`, fullPage: true });
  const lines = [`base=${base} ruolo=${role} file=${files.map(f => f.split('/').pop()).join(',')}`,
    `caricamento pagine: ${tUploaded}s`, `da «Avvia elaborazione» alla scheda di revisione: ${tReview}s (${outcome})`, 'stati:', ...timeline.map(x => '  ' + x)];
  console.log(lines.join('\n'));
  fs.writeFileSync(`${out}/tempi.txt`, lines.join('\n') + '\n\nchiamate:\n' + calls.join('\n') + '\n');
  if (lastJob) fs.writeFileSync(`${out}/job.json`, JSON.stringify(lastJob, null, 1));
  const text = await p.locator('main').innerText().catch(() => '');
  fs.writeFileSync(`${out}/revisione.txt`, text);
  if (process.env.CLEANUP === '1') { const del = p.getByRole('button', { name: /Elimina sessione/ }).first(); if (await del.count()) { await del.click(); await p.waitForTimeout(800); const conf = p.getByRole('button', { name: /^(Elimina|Conferma|Sì)/ }).last(); if (await conf.count()) await conf.click().catch(() => {}); await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/4-eliminata.png` }); console.log('sessione di prova eliminata: ' + calls.filter(c => / DELETE /.test(c)).join(' | ')); } }
  await b.close();
})();
