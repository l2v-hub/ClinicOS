// usage: node e2e-docs.cjs <baseUrl> <role> <outDir> <file...>
// Ingresso a mano con documenti aggiunti DENTRO la scheda: l'AI compila i campi vuoti e li segna «AI»;
// un campo già scritto dall'operatore non viene toccato (proposta).
const { chromium } = require('playwright'); const fs = require('fs');
const [base, role, out, ...files] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const lines = []; const say = (...a) => { const l = a.join(' '); lines.push(l); console.log(l); };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1366, height: 1000 }, bypassCSP: true });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  p.on('response', r => { if (['xhr', 'fetch'].includes(r.request().resourceType()) && r.status() >= 400) errs.push(r.status() + ' ' + r.request().method() + ' ' + r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 80)); });
  await p.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
  await p.locator('button', { hasText: role }).first().click(); await p.waitForTimeout(3000);
  const ok = p.locator('button', { hasText: 'Ho capito' }); if (await ok.count()) await ok.first().click();
  const items = p.locator('.teams-sidebar button, .teams-sidebar a'); const n = await items.count();
  for (let i = 0; i < n; i++) if ((await items.nth(i).innerText()).split('\n')[0].trim() === 'Pazienti') { await items.nth(i).click(); break; }
  await p.waitForTimeout(1500);
  await p.getByRole('button', { name: /Nuovo (ingresso|paziente)/i }).first().click(); await p.waitForTimeout(1200);
  await p.getByText('A mano', { exact: false }).first().click();
  await p.locator('[data-testid="intake-documents-file-input"]').waitFor({ state: 'attached', timeout: 30000 });
  await p.waitForTimeout(1000);
  // l'operatore ha già scritto il comune: l'AI non deve sostituirlo
  const comune = p.locator('.npm-field', { has: p.locator('.npm-label', { hasText: /^Comune$/ }) }).locator('input').first();
  await comune.fill('Imola'); await p.waitForTimeout(1200);
  const t = Date.now();
  await p.setInputFiles('[data-testid="intake-documents-file-input"]', files);
  const status = p.locator('[data-testid="intake-documents-status"]');
  let last = '';
  for (let i = 0; i < 240; i++) {
    const s = (await status.innerText().catch(() => '')).trim();
    if (s !== last) { say(`${((Date.now() - t) / 1000).toFixed(1)}s  stato: ${s}`); last = s; }
    const nome = await p.locator('.npm-field', { has: p.locator('.npm-label', { hasText: /^Nome/ }) }).locator('input').first().inputValue().catch(() => '');
    const motivo = await p.locator('[data-ai-field="ingresso.motivoIngresso"]').count();
    if (nome && motivo) { say(`${((Date.now() - t) / 1000).toFixed(1)}s  campi compilati nella scheda`); break; }
    await p.waitForTimeout(500);
  }
  await p.waitForTimeout(2500);
  const fields = await p.evaluate(() => [...document.querySelectorAll('.npm-field')].map(f => { const label = (f.querySelector('.npm-label')?.textContent || '').replace(/\s*\*$/, '').trim(); const c = f.querySelector('input, select, textarea'); if (!label || !c) return null; return { label, value: c.tagName === 'SELECT' ? (c.selectedOptions[0]?.value ? c.selectedOptions[0].textContent.trim() : '') : c.value, ai: f.getAttribute('data-ai-field') || '' }; }).filter(Boolean));
  say('## Campi con il segno «AI» (scritti dai documenti)');
  for (const f of fields.filter(f => f.ai)) say(`  [AI] ${f.label.padEnd(28)} ${JSON.stringify(f.value)}   (${f.ai})`);
  say(`campi «AI»: ${fields.filter(f => f.ai).length}`);
  const c = fields.find(f => f.label === 'Comune'); say(`## Comune scritto dall'operatore: ${JSON.stringify(c?.value)} — segno AI: ${!!c?.ai}`);
  const props = await p.locator('[data-testid^="intake-field-proposal"], .intake-proposals, [class*="proposal"]').allInnerTexts().catch(() => []);
  say('## Proposte mostrate: ' + JSON.stringify(props.join(' | ').replace(/\s+/g, ' ').slice(0, 400)));
  await p.screenshot({ path: `${out}/scheda-con-documenti.png`, fullPage: true });
  say('errori console/API: ' + JSON.stringify(errs));
  fs.writeFileSync(`${out}/campi-ai.txt`, lines.join('\n') + '\n');
  if (process.env.CLEANUP === '1') { const del = p.getByRole('button', { name: /Elimina bozza/i }).first(); if (await del.count()) { await del.click(); await p.waitForTimeout(600); await p.getByRole('button', { name: /^Elimina bozza$|^Elimina$|Conferma/ }).last().click().catch(() => {}); await p.waitForTimeout(1500); } }
  await b.close();
})();
