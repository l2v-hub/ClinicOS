import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const out = path.resolve('artifacts/task-validation/consegne-diario-condiviso-e-conferma-vocale-milo');
for (const folder of ['screenshots', 'trace', 'test-results']) mkdirSync(path.join(out, folder), { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1150, height: 1004 } });
await context.tracing.start({ screenshots: true, snapshots: true });
let reads = [], writes = 0, failNext = false;
await context.route('http://localhost:3001/**', async route => {
  const request = route.request(); const url = new URL(request.url());
  if (request.method() !== 'GET') writes++;
  if (url.pathname.endsWith('/diary/therapy-preview')) return route.fulfill({ json: {
    intent: 'prescrizione', inferred: [], ambiguous: [], warnings: [], fasciaConflicts: [], prescriptionRange: null,
    row: { farmacoNome: 'Farmaco Test', forma: 'compressa', dosaggio: '10 mg', viaSomministrazione: 'OS',
      quantita: '1 compressa', quantityNumerator: 1, quantityDenominator: 1, unitaSomministrazione: 'compressa',
      orari: ['08:00'], giorni: [], dataInizio: '2026-10-04', dataFine: '', note: '', classe: '',
      originalText: 'test', stato: 'ok', quantitaValore: '1' },
  } });
  if (url.pathname.endsWith('/diary/with-therapy')) return route.fulfill({ status: 201, json: {
    entry: { id: 'created-test', authorType: 'medico', authorName: 'Medico Test', content: 'test', entryDateTime: '2026-10-04T12:00', priority: 'normale' },
    therapy: { id: 'therapy-test', farmacoNome: 'Farmaco Test', stato: 'attiva' },
  } });
  if (url.pathname.endsWith('/diary')) {
    reads.push(Object.fromEntries(url.searchParams));
    if (failNext && url.searchParams.has('cursor')) { failNext = false; return route.fulfill({ status: 500, json: {} }); }
    const filtered = url.searchParams.has('from'); const page = url.searchParams.get('cursor') === 'page2' ? 2 : 1;
    const count = filtered ? 3 : 50;
    return route.fulfill({ json: { entries: Array.from({ length: count }, (_, i) => ({
      id: `entry-${page}-${i}`, authorType: 'infermiere', authorName: 'Operatore Test', title: `Segnalazione ${page}-${i}`,
      content: 'Osservazione sintetica per validare lo storico', priority: 'normale', status: 'aperta',
      entryDateTime: `2026-10-0${page}T10:${String(59-i).padStart(2,'0')}`, sourceType: 'diary', sourceId: `entry-${page}-${i}`, urgency: { state: 'none' },
    })), hasMore: !filtered && page === 1, nextCursor: !filtered && page === 1 ? 'page2' : null } });
  }
  return route.fulfill({ json: {} });
});
const page = await context.newPage(); const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto('http://127.0.0.1:5190/tests/ux-handover-voice/index.html');
  await page.locator('.diario-card').first().waitFor();
  assert.equal(await page.locator('.diario-card').count(), 50);
  await page.getByRole('button', { name: 'Segnalazioni precedenti →', exact: true }).click();
  await page.getByText('Pagina 2 ·', { exact: false }).waitFor();
  assert.equal(await page.locator('.diario-card').count(), 50, 'bounded render, no appended hundred cards');
  await page.getByRole('button', { name: '← Segnalazioni più recenti', exact: true }).click();
  await page.getByText('Pagina 1 ·', { exact: false }).waitFor();
  failNext = true;
  await page.getByRole('button', { name: 'Segnalazioni precedenti →', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Impossibile caricare altre voci. Riprova.' }).waitFor();
  assert.equal(await page.locator('.diario-card').count(), 50, 'failed navigation preserves current entries');
  await page.getByLabel('Dal', { exact: true }).fill('2026-10-01');
  await page.getByLabel('Al', { exact: true }).fill('2026-10-02');
  await page.getByRole('button', { name: 'Filtra storico' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.diario-card').length === 3);
  assert.deepEqual(reads.at(-1), { limit: '50', from: '2026-10-01', to: '2026-10-02' });
  assert.equal(await page.getByRole('button', { name: '← Segnalazioni più recenti' }).count(), 0);
  await page.screenshot({ path: path.join(out, 'screenshots/history-filter.png'), fullPage: true });
  await page.getByRole('button', { name: 'Consegna test' }).click();
  await page.getByLabel('Segnalazione', { exact: true }).fill('Terapia: farmaco sintetico 10 mg alle 8');
  assert.equal(await page.getByRole('button', { name: 'Anteprima terapia dal testo' }).count(), 0, 'nurse cannot prescribe');
  assert.equal(await page.locator('input[type=date],input[type=time],input[type=datetime-local]').count(), 0);
  await page.getByLabel('Gravità', { exact: true }).selectOption('urgente');
  assert.match(await page.locator('.clinical-note-editor').textContent(), /Ho capito/);
  await page.getByRole('button', { name: 'Ruolo: Infermiere' }).click();
  await page.getByRole('button', { name: 'Anteprima terapia dal testo' }).click();
  await page.getByRole('button', { name: 'Conferma e aggiungi in Terapia' }).waitFor();
  assert.equal(writes, 1, 'preview is the only request, no clinical creation');
  await page.screenshot({ path: path.join(out, 'screenshots/doctor-preview.png'), fullPage: true });
  await page.getByRole('button', { name: 'Chiudi anteprima' }).click();
  assert.equal(writes, 1, 'cancel creates nothing');
  await page.getByRole('button', { name: 'Anteprima terapia dal testo' }).click();
  await page.getByRole('button', { name: 'Conferma e aggiungi in Terapia' }).click();
  await page.getByText('Segnalazione e terapia salvate nel diario paziente.', { exact: true }).waitFor();
  assert.equal(writes, 3, 'two previews then one explicit atomic creation');
  assert.equal(await page.getByTestId('save-count').textContent(), '0', 'therapy path does not create duplicate Consegna');
  await page.goto('http://127.0.0.1:5190/tests/ux-handover-voice/index.html?legacy=1');
  await page.locator('.diario-card').first().waitFor();
  await page.getByText('Registrazioni precedenti (120)', { exact: true }).click();
  assert.equal(await page.locator('details .diario-card').count(), 50);
  await page.getByRole('button', { name: 'Mostra altre registrazioni precedenti', exact: true }).click();
  assert.equal(await page.locator('details .diario-card').count(), 50, 'legacy render also remains bounded');
  await page.getByRole('button', { name: '← Registrazioni precedenti più recenti', exact: true }).click();
  assert.equal(await page.locator('details .diario-card').count(), 50);
  await page.getByLabel('Dal', { exact: true }).fill('2026-10-01');
  await page.getByLabel('Al', { exact: true }).fill('2026-10-02');
  await page.getByRole('button', { name: 'Filtra storico' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.diario-card').length === 3);
  assert.equal(await page.getByText('Registrazioni precedenti (120)', { exact: true }).count(), 0, 'date filter applies to legacy records too');
  assert.equal(errors.length, 0, errors.join('\n'));
  writeFileSync(path.join(out, 'test-results/runtime.json'), JSON.stringify({ passed: 10, errors, reads: reads.length, syntheticWrites: writes }, null, 2));
  console.log('PASS 10 synthetic runtime groups');
} catch (error) {
  await page.screenshot({ path: path.join(out, 'screenshots/runtime-failure.png'), fullPage: true });
  throw error;
} finally {
  await context.tracing.stop({ path: path.join(out, 'trace/runtime.zip') });
  await browser.close();
}
