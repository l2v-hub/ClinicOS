#!/usr/bin/env node
// Issue #130 — evidenze E2E per TUTTI gli AC: comandi vocali operativi via Agnos
// (consegne, diario, parametri, appuntamenti) + conferma obbligatoria + anti-delete.
//
//   CLINICOS_FRONTEND=http://localhost:5186 CLINICOS_BACKEND=http://localhost:3002 \
//     node e2e/issue-130-verify.mjs [outDir]
//
// Voce SIMULATA con lo stesso stub SpeechRecognition di e2e/agnos-cru.mjs (l'API reale non è
// emulabile headless): la trascrizione viene iniettata dallo stub, appare nel campo testo
// (visibile e modificabile) e il comando viaggia con channel='voce' sul percorso plan/execute.
// Exit 1 se un check fallisce. Output: screenshot + report.json + summary.md.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FRONTEND = process.env.CLINICOS_FRONTEND ?? 'http://localhost:5173';
const BACKEND = process.env.CLINICOS_BACKEND ?? 'http://localhost:3001';
const OUT = process.argv[2] ?? 'docs/qa/issues/130/final';
mkdirSync(OUT, { recursive: true });

const results = [];
function ok(name, cond, detail = '') {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const OP_HEADERS = {
  'X-Operator-Id': 'e2e-130',
  'X-Operator-Role': 'operatore',
  'X-Operator-Name': 'E2E Issue130',
};
const ADMIN_HEADERS = { 'X-Operator-Id': 'e2e-130', 'X-Operator-Role': 'admin' };
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

/** Detta via stub vocale: iniezione trascrizione + click sul microfono (stesso pattern agnos-cru). */
async function dictate(page, transcript) {
  await page.evaluate((t) => {
    window.__fakeTranscript = t;
  }, transcript);
  await page.locator('.agnos-mic').click();
  await page.waitForTimeout(1500); // fake STT: trascrizione nel campo, modificabile
  return page.locator('.agnos-input').inputValue();
}

async function chatConfirm(page) {
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

function localTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });

// Voce simulata: stub SpeechRecognition + getUserMedia (come e2e/agnos-cru.mjs).
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

const CONSEGNA_TEXT = 'controllare la pressione dopo cena';

try {
  // ── Setup: operatore → paziente pilota Moretti, Elena ───────────────────────
  await page.goto(FRONTEND + '/', { waitUntil: 'networkidle' });
  await clickText(page, 'Operatore');
  await page.waitForLoadState('networkidle');
  await clickText(page, 'Pazienti');
  await clickText(page, 'Moretti, Elena');
  await page.waitForLoadState('networkidle');
  const patients = await api('/patients');
  const moretti = patients.find((p) => p.lastName === 'Moretti' && p.firstName === 'Elena');
  ok('setup: paziente pilota Moretti, Elena presente', !!moretti);

  // ── AC1 — CONSEGNA via voce ─────────────────────────────────────────────────
  const consegneBefore = await api('/consegne');
  await openAgnos(page);
  const t1 = await dictate(page, `Aggiungi una consegna per Elena Moretti: ${CONSEGNA_TEXT}`);
  ok('AC1a. voce: trascrizione visibile e modificabile nel campo', t1.includes(CONSEGNA_TEXT), t1);
  await page.click('.ai-asst__send');
  await page.waitForSelector('.voice-actions .btn-primary', { timeout: 10000 });
  const previewTxt = await page.locator('.voice-preview').last().innerText();
  ok(
    'AC1b. preview leggibile: titolo, paziente e testo consegna',
    /Aggiungi consegna/.test(previewTxt) &&
      /Moretti/.test(previewTxt) &&
      previewTxt.includes(CONSEGNA_TEXT),
  );
  await shot('after-consegna-preview.png');
  await chatConfirm(page);
  const consegneAfter = await api('/consegne');
  const nuova = consegneAfter.find(
    (c) => c.note === CONSEGNA_TEXT && !consegneBefore.some((b) => b.id === c.id),
  );
  ok('AC1c. consegna salvata nel backend (stesso service della UI)', !!nuova, nuova?.id);
  ok(
    'AC1d. consegna collegata al paziente giusto',
    nuova?.pazienteId === moretti?.id && /Moretti/.test(nuova?.pazienteNome ?? ''),
  );
  // la UI consegne si aggiorna senza reload (onExecuted → loadConsegne)
  await page.locator('.ai-drawer__scrim').click();
  await clickText(page, 'Consegne');
  await page.waitForTimeout(800);
  ok(
    'AC1e. consegna visibile nella UI consegne senza reload',
    (await page.locator(`text=${CONSEGNA_TEXT}`).count()) > 0,
  );
  await shot('after-consegna-salvata.png');
  // persistenza dopo refresh
  await page.reload({ waitUntil: 'networkidle' });
  await clickText(page, 'Operatore');
  await clickText(page, 'Consegne');
  await page.waitForTimeout(1000);
  ok(
    'AC1f. consegna persistente dopo refresh',
    (await page.locator(`text=${CONSEGNA_TEXT}`).count()) > 0,
  );
  await shot('after-refresh.png');

  // ── AC2 — DIARIO via voce (frase esatta della issue) ───────────────────────
  await clickText(page, 'Pazienti');
  await clickText(page, 'Moretti, Elena');
  await page.waitForLoadState('networkidle');
  await openAgnos(page);
  const t2 = await dictate(
    page,
    'Scrivi nel diario di Elena Moretti: paziente tranquillo, nessun dolore riferito',
  );
  ok('AC2a. voce: trascrizione diario nel campo', /paziente tranquillo/.test(t2), t2);
  await page.click('.ai-asst__send');
  await page.waitForSelector('.voice-actions .btn-primary', { timeout: 10000 });
  await shot('ac2-diario-preview.png');
  await chatConfirm(page);
  await page.locator('.ai-drawer__scrim').click();
  await clickText(page, 'Diario');
  await page.waitForTimeout(1000);
  ok(
    'AC2b. nota diario salvata e visibile nella sezione Diario',
    (await page.locator('text=paziente tranquillo, nessun dolore riferito').count()) > 0,
  );
  await shot('ac2-diario-salvato.png');

  // ── AC3 — PARAMETRI via voce ────────────────────────────────────────────────
  await openAgnos(page);
  const t3 = await dictate(page, 'registra per Elena Moretti la pressione 120 su 80 alle 17');
  ok('AC3a. voce: trascrizione parametri nel campo', /120 su 80/.test(t3), t3);
  await page.click('.ai-asst__send');
  await page.waitForSelector('.voice-actions .btn-primary', { timeout: 10000 });
  await shot('ac3-parametri-preview.png');
  await chatConfirm(page);
  const cartella = await api(`/patients/${moretti.id}/cartella`);
  const vitali = cartella?.data?.parametriVitali ?? [];
  ok(
    'AC3b. parametro 120/80 salvato nella cartella (persistito)',
    vitali.some((v) => v.valore === '120/80'),
  );
  await page.locator('.ai-drawer__scrim').click();
  await clickText(page, 'Panoramica');
  await page.waitForTimeout(800);
  ok(
    'AC3c. parametro visibile nella sezione corretta senza reload',
    /120\/80/.test(await page.locator('body').innerText()),
  );
  await shot('ac3-parametri-salvato.png');

  // ── AC4 — APPUNTAMENTO via voce (slot libero: cleanup run precedenti) ──────
  const tomorrow = localTomorrow();
  for (const a of await api(`/appointments?date=${tomorrow}`)) {
    if (a.ora === '09:30') await fetch(`${BACKEND}/appointments/${a.id}`, { method: 'DELETE' }); // cleanup (delete via REST UI-only)
  }
  await openAgnos(page);
  const t4 = await dictate(
    page,
    'crea appuntamento fisioterapia domani alle 09:30 per Elena Moretti',
  );
  ok('AC4a. voce: trascrizione appuntamento nel campo', /fisioterapia/.test(t4), t4);
  await page.click('.ai-asst__send');
  await page.waitForSelector('.voice-actions .btn-primary', { timeout: 10000 });
  await shot('ac4-appuntamento-preview.png');
  await chatConfirm(page);
  const appts = await api(`/appointments?date=${tomorrow}`);
  ok(
    'AC4b. appuntamento creato e persistito in agenda',
    appts.some((a) => a.ora === '09:30' && a.patientId === moretti.id),
  );
  await page.locator('.ai-drawer__scrim').click();
  await shot('ac4-appuntamento-salvato.png');

  // ── AC5 — CONFERMA OBBLIGATORIA: senza click su Conferma non si salva nulla ─
  const consegneCountBefore = (await api('/consegne')).length;
  await openAgnos(page);
  await chatSend(page, 'aggiungi una consegna per Elena Moretti: verifica AC5 senza conferma');
  await page.waitForSelector('.voice-actions .btn-primary', { timeout: 10000 });
  await shot('ac5-conferma-obbligatoria.png');
  // Annulla invece di confermare → NESSUNA scrittura
  await page.locator('.voice-actions .btn-secondary', { hasText: 'Annulla' }).last().click();
  await page.waitForTimeout(800);
  const consegneCountAfter = (await api('/consegne')).length;
  ok(
    'AC5. senza conferma esplicita non viene salvato nulla',
    consegneCountAfter === consegneCountBefore,
    `${consegneCountBefore} → ${consegneCountAfter}`,
  );

  // ── AC6 — DELETE rifiutato via VOCE e via CHAT ──────────────────────────────
  const beforeVoiceRef = await page.locator('.agnos-refusal').count();
  await dictate(page, 'elimina la consegna di Elena Moretti');
  await page.click('.ai-asst__send');
  await page.waitForFunction(
    (n) => document.querySelectorAll('.agnos-refusal').length > n,
    beforeVoiceRef,
    { timeout: 10000 },
  );
  ok('AC6a. delete via VOCE rifiutato', true);
  await shot('ac6-delete-voce.png');

  const beforeChatRef = await page.locator('.agnos-refusal').count();
  await chatSend(page, "cancella l'ultima nota del diario di Elena Moretti");
  await page.waitForFunction(
    (n) => document.querySelectorAll('.agnos-refusal').length > n,
    beforeChatRef,
    { timeout: 10000 },
  );
  ok('AC6b. delete via CHAT rifiutato', true);
  await shot('ac6-delete-chat.png');

  // i dati NON sono cambiati
  const consegneFinal = await api('/consegne');
  ok(
    'AC6c. nessun dato cancellato dai tentativi',
    consegneFinal.some((c) => c.note === CONSEGNA_TEXT),
  );

  // ── AC7 — Catalogo ispezionabile: ZERO azioni delete ────────────────────────
  const catalog = await api('/ai/actions/catalog', OP_HEADERS);
  ok(
    'AC7a. catalogo: 0 azioni delete su ' + catalog.length,
    catalog.length > 0 && catalog.every((a) => a.kind !== 'delete'),
    catalog.map((a) => `${a.name}:${a.kind}`).join(', '),
  );
  ok(
    'AC7b. create_consegna presente nel catalogo (kind create)',
    catalog.some((a) => a.name === 'create_consegna' && a.kind === 'create'),
  );

  // audit: create_consegna via canale voce tracciato, rifiuti delete persistiti
  const audit = await api('/ai/audit?limit=50', ADMIN_HEADERS);
  ok(
    'AC7c. audit: create_consegna eseguita con channel=voce',
    audit.some(
      (e) => e.actionType === 'create_consegna' && e.channel === 'voce' && e.outcome === 'ok',
    ),
  );
  ok(
    'AC7d. audit: rifiuti delete tracciati (refused_delete)',
    audit.some((e) => e.actionType === 'refused_delete'),
  );
} finally {
  await ctx.close();
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
const summary = [
  '# Issue #130 — Evidenze E2E (voce operativa via Agnos)',
  '',
  `Eseguito: ${new Date().toISOString()} — **${passed}/${results.length} PASS**`,
  '',
  'Provider vocale SIMULATO (stub SpeechRecognition, stesso pattern di e2e/agnos-cru.mjs);',
  'la trascrizione appare nel campo testo (modificabile) e il comando viaggia con channel=voce.',
  '',
  '| Check | Esito | Dettaglio |',
  '|---|---|---|',
  ...results.map((r) => `| ${r.name} | ${r.pass ? 'PASS' : 'FAIL'} | ${r.detail ?? ''} |`),
  '',
  '## Screenshot',
  '- `before.png` — PRIMA del fix: comando consegna mal interpretato (create_vital_sign ambiguo)',
  '- `after-consegna-preview.png` / `after-consegna-salvata.png` / `after-refresh.png` — AC1',
  '- `ac2-diario-preview.png` / `ac2-diario-salvato.png` — AC2',
  '- `ac3-parametri-preview.png` / `ac3-parametri-salvato.png` — AC3',
  '- `ac4-appuntamento-preview.png` / `ac4-appuntamento-salvato.png` — AC4',
  '- `ac5-conferma-obbligatoria.png` — AC5 (Annulla → nessuna scrittura)',
  '- `ac6-delete-voce.png` / `ac6-delete-chat.png` — AC6',
].join('\n');
writeFileSync(join(OUT, 'summary.md'), summary);
console.log(`\n${passed}/${results.length} PASS — evidenze in ${OUT}`);
if (passed !== results.length) process.exit(1);
