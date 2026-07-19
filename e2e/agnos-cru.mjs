#!/usr/bin/env node
// SPEC-015 T033/T034 — suite Playwright obbligatoria: flussi tradizionali, CRU via
// chat, stessi flussi via voce SIMULATA (stub SpeechRecognition — l'API reale non è
// emulabile headless), sync immediata chatbot↔UI, persistenza post-refresh, suite
// anti-delete (chat+voce+catalogo+audit) e delete via pulsante UI (FR-010).
//
//   node e2e/agnos-cru.mjs [outDir]     # default requirements/evidence/SPEC-015/e2e
//
// Assume backend :3001 + frontend :5173 attivi. Output: screenshot, trace.zip,
// video .webm, report JSON. Exit 1 se un check fallisce.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FRONTEND = process.env.CLINICOS_FRONTEND ?? 'http://localhost:5173';
const BACKEND = 'http://localhost:3001';
const OUT = process.argv[2] ?? 'requirements/evidence/SPEC-015/e2e';
mkdirSync(OUT, { recursive: true });

const results = [];
function ok(name, cond, detail = '') {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const OP_HEADERS = {
  'X-Operator-Id': 'e2e-lead',
  'X-Operator-Role': 'operatore',
  'X-Operator-Name': 'E2E Lead',
};
const ADMIN_HEADERS = { 'X-Operator-Id': 'e2e-lead', 'X-Operator-Role': 'admin' };
const api = async (path, headers = {}) => (await fetch(`${BACKEND}${path}`, { headers })).json();

async function clickText(page, label) {
  await page.locator(`text="${label}"`).first().click();
  await page.waitForTimeout(600);
}

async function openAgnos(page) {
  if (await page.locator('.agnos-panel').count()) return;
  await page.locator('.ai-fab').click();
  await page.waitForSelector('.agnos-panel');
}

async function chatSend(page, text) {
  await page.fill('.agnos-input', text);
  await page.click('.ai-asst__send');
}

async function chatConfirm(page) {
  // Conteggio-based: i .voice-done dei turni precedenti restano nel DOM.
  const okBefore = await page.locator('.voice-done, .agnos-preview__stato--ok').count();
  await page.waitForSelector('.voice-actions .btn-primary', { timeout: 10000 });
  await page.locator('.voice-actions .btn-primary').last().click();
  await page.waitForFunction(
    (n) => document.querySelectorAll('.voice-done, .agnos-preview__stato--ok').length > n,
    okBefore,
    { timeout: 10000 },
  );
  await page.waitForTimeout(600);
}

/** Domani in ORA LOCALE (il backend interpreta 'domani' in locale; toISOString è UTC). */
function localTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1366, height: 768 },
  recordVideo: { dir: OUT, size: { width: 1366, height: 768 } },
});
await ctx.tracing.start({ screenshots: true, snapshots: true });

// Voce simulata: stub SpeechRecognition + getUserMedia (D9: iniezione trascrizione).
await ctx.addInitScript(() => {
  class FakeSR {
    constructor() {
      this.lang = '';
      this.interimResults = false;
      this.continuous = false;
      this.onresult = null;
      this.onerror = null;
      this.onend = null;
      this._done = false;
    }
    start() {
      setTimeout(() => {
        if (this._done) return;
        this.onresult?.({ results: [[{ transcript: window.__fakeTranscript ?? 'test' }]] });
        setTimeout(() => {
          if (!this._done) {
            this._done = true;
            this.onend?.();
          }
        }, 150);
      }, 250);
    }
    stop() {
      if (!this._done) {
        this._done = true;
        this.onend?.();
      }
    }
  }
  window.SpeechRecognition = FakeSR;
  window.webkitSpeechRecognition = FakeSR;
  if (navigator.mediaDevices)
    navigator.mediaDevices.getUserMedia = async () => ({ getTracks: () => [] });
});

const page = await ctx.newPage();
page.on('dialog', (d) => {
  void d.accept();
});
const shot = (name) => page.screenshot({ path: join(OUT, name) });

try {
  // ── Setup: entra come operatore e apri il paziente pilota ──────────────────
  await page.goto(FRONTEND + '/', { waitUntil: 'networkidle' });
  await clickText(page, 'Operatore');
  await page.waitForLoadState('networkidle');
  await clickText(page, 'Pazienti');
  await clickText(page, 'Moretti, Elena');
  await page.waitForLoadState('networkidle');
  const patients = await api('/patients');
  const moretti = patients.find((p) => p.lastName === 'Moretti');

  // ── 1. Flusso tradizionale: nota diario via UI ──────────────────────────────
  await clickText(page, 'Diario');
  await clickText(page, 'Aggiungi voce');
  await page.fill('input[placeholder="Titolo voce…"]', 'Controllo E2E tradizionale');
  await page.fill(
    'textarea[placeholder="Descrizione, note cliniche…"]',
    'Voce creata dalla UI tradizionale (suite SPEC-015).',
  );
  await page.locator('.btn-primary', { hasText: 'Salva' }).first().click();
  await page.waitForTimeout(1200);
  ok(
    '1. UI tradizionale: nota diario creata',
    (await page.locator('text=Controllo E2E tradizionale').count()) > 0,
  );
  await shot('01-tradizionale-diario.png');

  // ── 2. CREATE via chat ──────────────────────────────────────────────────────
  await openAgnos(page);
  await chatSend(page, 'registra frequenza cardiaca 72 alle 16');
  await page.waitForSelector('.voice-preview', { timeout: 10000 });
  await shot('02-create-preview.png');
  await chatConfirm(page);
  ok('2. CREATE via chat: vitale confermato', true);
  await shot('02-create-eseguito.png');

  // ── 3. READ via chat (nessuna conferma) ─────────────────────────────────────
  await chatSend(page, 'mostra i parametri di oggi');
  await page.waitForTimeout(2500);
  const bodyTxt = await page.locator('.ai-asst__body').innerText();
  ok('3. READ via chat con risultati, senza conferma', /72|frequenza/i.test(bodyTxt));
  await shot('03-read.png');

  // ── 4. UPDATE via chat (anagrafica whitelisted) ─────────────────────────────
  await chatSend(page, 'aggiorna il telefono di Elena Moretti a 333 7654321');
  await page.waitForSelector('.voice-actions .btn-primary', { timeout: 10000 });
  await shot('04-update-preview.png');
  await chatConfirm(page);
  const afterUpd = (await api('/patients')).find((p) => p.id === moretti.id);
  ok(
    '4. UPDATE via chat: telefono aggiornato nel backend',
    /7654321/.test(afterUpd?.phone ?? ''),
    afterUpd?.phone,
  );
  await shot('04-update-eseguito.png');

  // ── 5. CREATE via VOCE simulata (stesso percorso, channel=voce) ─────────────
  await page.evaluate(() => {
    window.__fakeTranscript = 'registra saturazione 97 alle 15';
  });
  await page.locator('.agnos-mic').click();
  await page.waitForTimeout(1500); // fake STT: trascrizione nel campo, modificabile
  const fieldVal = await page.locator('.agnos-input').inputValue();
  ok(
    '5a. Voce: trascrizione visibile e modificabile nel campo',
    /saturazione 97/.test(fieldVal),
    fieldVal,
  );
  await shot('05-voce-trascrizione.png');
  await page.click('.ai-asst__send');
  await page.waitForSelector('.voice-actions .btn-primary', { timeout: 10000 });
  await shot('05-voce-preview.png');
  await chatConfirm(page);
  const audit1 = await api('/ai/audit?limit=20', ADMIN_HEADERS);
  const voceEvt = audit1.find(
    (e) => e.channel === 'voce' && e.actionType === 'create_vital_sign' && e.outcome === 'ok',
  );
  ok('5b. Voce: stesso percorso del testo, audit con channel=voce', !!voceEvt);
  await shot('05-voce-eseguito.png');

  // ── 6. Sync immediata chatbot ↔ UI (senza reload) ──────────────────────────
  await page.locator('.ai-drawer__scrim').click();
  await clickText(page, 'Panoramica');
  await page.waitForTimeout(800);
  let pageTxt = await page.locator('body').innerText();
  ok('6. Sync immediata: vitali visibili senza reload', /72/.test(pageTxt) && /97/.test(pageTxt));
  await shot('06-sync.png');

  // ── 7. Persistenza dopo refresh ─────────────────────────────────────────────
  await page.reload({ waitUntil: 'networkidle' });
  await clickText(page, 'Operatore');
  await clickText(page, 'Pazienti');
  await clickText(page, 'Moretti, Elena');
  await page.waitForTimeout(1000);
  pageTxt = await page.locator('body').innerText();
  ok('7. Persistenza dopo refresh', /72/.test(pageTxt) && /97/.test(pageTxt));
  await shot('07-persistenza.png');

  // ── 8. Appuntamento via chat (US4) ──────────────────────────────────────────
  const tomorrow = localTomorrow();
  for (const a of await api(`/appointments?date=${tomorrow}`)) {
    if (a.ora === '11:00') await fetch(`${BACKEND}/appointments/${a.id}`, { method: 'DELETE' }); // cleanup run precedenti
  }
  await openAgnos(page);
  await chatSend(page, 'crea appuntamento fisioterapia domani alle 11:00 per Elena Moretti');
  await page.waitForSelector('.voice-actions .btn-primary', { timeout: 10000 });
  await shot('08-appuntamento-preview.png');
  await chatConfirm(page);
  const appts = await api(`/appointments?date=${tomorrow}`);
  ok(
    '8. Appuntamento creato via chat e persistito',
    appts.some((a) => a.ora === '11:00' && a.patientId === moretti.id),
  );
  await shot('08-appuntamento-eseguito.png');

  // ── 9. NO-DELETE: varianti via chat ─────────────────────────────────────────
  const deleteAttempts = [
    "cancella l'ultima nota del diario",
    'elimina il parametro delle 9',
    'rimuovi il paziente Rossi',
    'togli la nota di ieri',
    'svuota il diario del paziente',
    "cancella l'appuntamento di domani",
  ];
  let refused = 0;
  for (const cmd of deleteAttempts) {
    const before = await page.locator('.agnos-refusal').count();
    await chatSend(page, cmd);
    await page.waitForFunction(
      (n) => document.querySelectorAll('.agnos-refusal').length > n,
      before,
      { timeout: 10000 },
    );
    refused += 1;
  }
  ok(
    '9a. Delete via chat: tutte le varianti rifiutate',
    refused === deleteAttempts.length,
    `${refused}/${deleteAttempts.length}`,
  );
  await shot('09-delete-rifiutati-chat.png');

  // 9b. Delete via VOCE simulata
  const beforeVoice = await page.locator('.agnos-refusal').count();
  await page.evaluate(() => {
    window.__fakeTranscript = 'elimina la nota del diario di Elena Moretti';
  });
  await page.locator('.agnos-mic').click();
  await page.waitForTimeout(1500);
  await page.click('.ai-asst__send');
  await page.waitForFunction(
    (n) => document.querySelectorAll('.agnos-refusal').length > n,
    beforeVoice,
    { timeout: 10000 },
  );
  ok('9b. Delete via voce: rifiutato', true);
  await shot('09-delete-rifiutato-voce.png');

  // 9c. Catalogo ispezionabile: zero azioni delete
  const catalog = await api('/ai/actions/catalog', OP_HEADERS);
  ok(
    '9c. Catalogo: 0 azioni delete su ' + catalog.length,
    catalog.every((a) => a.kind !== 'delete') && catalog.length > 0,
    catalog.map((a) => `${a.name}:${a.kind}`).join(', '),
  );

  // 9d. Audit: i rifiuti delete sono tracciati (chat e voce)
  const audit2 = await api('/ai/audit?limit=50', ADMIN_HEADERS);
  const refusals = audit2.filter((e) => e.actionType === 'refused_delete');
  ok(
    '9d. Audit: rifiuti delete persistiti (testo+voce)',
    refusals.some((e) => e.channel === 'testo') && refusals.some((e) => e.channel === 'voce'),
    `${refusals.length} eventi refused_delete`,
  );

  // 9e. I dati NON sono cambiati (la nota diario del punto 1 esiste ancora)
  await page.locator('.ai-drawer__scrim').click();
  await clickText(page, 'Diario');
  await page.waitForTimeout(800);
  ok(
    '9e. Nessun dato cancellato dai tentativi',
    (await page.locator('text=Controllo E2E tradizionale').count()) > 0,
  );

  // ── 10. Delete via pulsante UI (FR-010: resta possibile SOLO qui) ───────────
  const row = page.locator('tr', { hasText: 'Controllo E2E tradizionale' }).first();
  await row.locator('[title="Elimina"]').first().click(); // window.confirm accettato dal handler dialog
  await page.waitForFunction(
    () => !document.body.innerText.includes('Controllo E2E tradizionale'),
    undefined,
    { timeout: 15000 },
  );
  ok('10. Delete via pulsante UI funziona', true);
  await shot('10-delete-via-ui.png');
} finally {
  await ctx.tracing.stop({ path: join(OUT, 'trace.zip') });
  await ctx.close(); // finalizza il video
  await browser.close();
}

const passed = results.filter((r) => r.pass).length;
writeFileSync(
  join(OUT, 'report.json'),
  JSON.stringify(
    { ranAt: new Date().toISOString(), passed, total: results.length, results },
    null,
    2,
  ),
);
console.log(`\n${passed}/${results.length} PASS — evidenze in ${OUT}`);
if (passed !== results.length) process.exit(1);
