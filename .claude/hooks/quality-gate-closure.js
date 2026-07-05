#!/usr/bin/env node
'use strict';
// Quality Gate — closure hook.
// Intercetta dichiarazioni di task concluso ("done/fatto/completato/fixed/risolto/chiuso/closed")
// quando NON esiste un validation-report.md con decisione `CLOSED — VERIFIED`.
// In tal caso blocca (exit 2) e forza lo stato a `IMPLEMENTED — NOT VERIFIED`.
//
// Limite (documentato in docs/quality-gate.md): gli hook Claude Code non ricevono in modo
// affidabile il testo finale dell'assistant e non possono riscriverlo. Questo hook funziona:
//  - come Stop hook best-effort (se l'input contiene testo/transcript, lo scanna);
//  - come filtro CLI: `echo "<testo>" | node .claude/hooks/quality-gate-closure.js`.
// Fail-open su errori interni.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const TASK_ROOT = path.join(ROOT, 'artifacts', 'task-validation');
const COMPLETION_WORDS = ['done', 'fatto', 'completato', 'completed', 'fixed', 'resolved', 'risolto', 'chiuso', 'closed'];

function anyVerifiedReport() {
  try {
    if (!fs.existsSync(TASK_ROOT)) return false;
    for (const name of fs.readdirSync(TASK_ROOT)) {
      const rp = path.join(TASK_ROOT, name, 'validation-report.md');
      if (!fs.existsSync(rp)) continue;
      const t = fs.readFileSync(rp, 'utf8');
      if (/final decision/i.test(t) && /CLOSED\s*[—-]\s*VERIFIED/i.test(t)) return true;
    }
  } catch (_e) { /* fail-open */ }
  return false;
}

// Estrae testo candidato dall'evento hook (vari possibili campi) o usa il raw come testo.
function extractText(raw) {
  let evt = null;
  try { evt = JSON.parse(raw); } catch (_e) { return raw; }
  if (evt && typeof evt === 'object') {
    for (const k of ['assistant_message', 'message', 'text', 'last_message', 'response']) {
      if (typeof evt[k] === 'string') return evt[k];
    }
    // Stop hook con transcript_path: leggi l'ultimo messaggio se disponibile.
    if (typeof evt.transcript_path === 'string' && fs.existsSync(evt.transcript_path)) {
      try { return fs.readFileSync(evt.transcript_path, 'utf8').slice(-4000); } catch (_e) { /* ignore */ }
    }
    return JSON.stringify(evt);
  }
  return raw;
}

function hasCompletionClaim(text) {
  const t = String(text).toLowerCase();
  return COMPLETION_WORDS.some((w) => new RegExp('\\b' + w + '\\b', 'i').test(t));
}

function main() {
  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch (_e) { process.exit(0); }
  const text = extractText(raw || '');
  if (!hasCompletionClaim(text)) process.exit(0);
  if (anyVerifiedReport()) process.exit(0);

  process.stderr.write(
    'QUALITY GATE — dichiarazione di completamento bloccata.\n' +
    'Trovate parole di chiusura ma manca un validation-report.md con `CLOSED — VERIFIED`.\n' +
    'Stato corretto: IMPLEMENTED — NOT VERIFIED (oppure FAILED VALIDATION / BLOCKED / PARTIAL).\n' +
    'Genera il report e la decisione finale prima di dichiarare il task concluso:\n' +
    '  artifacts/task-validation/<slug>/validation-report.md → Final Decision: CLOSED — VERIFIED\n' +
    '  node scripts/quality-gate/check-closure.js <slug>\n'
  );
  process.exit(2);
}

try { main(); } catch (_e) { process.exit(0); }
