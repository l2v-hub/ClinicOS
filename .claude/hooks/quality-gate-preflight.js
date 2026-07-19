#!/usr/bin/env node
'use strict';
// Quality Gate — PreToolUse hook.
// Blocca modifiche a CODICE APPLICATIVO se non esiste un Task Contract valido.
// Consente sempre: letture/ricerche/git-status/ls/grep e la creazione/aggiornamento del
// Task Contract e dell'infrastruttura quality gate.
//
// Protocollo: legge JSON dell'evento su stdin ({tool_name, tool_input}); per bloccare esce
// con codice 2 e scrive il motivo su stderr. Fail-open: su qualunque errore interno consente
// (exit 0) per non bloccare la sessione. Limiti documentati in docs/quality-gate.md.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const TASK_ROOT = path.join(ROOT, 'artifacts', 'task-validation');

// Strumenti che modificano file (gli unici da gattare). Tutto il resto passa.
const MUTATING_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

// Prefissi di CODICE APPLICATIVO protetti (relativi alla root del repo).
const GUARDED = ['frontend/', 'backend/', 'clinicos-ai-runtime/', 'prisma/'];
// Pattern aggiuntivi (config runtime/provider/env).
const GUARDED_RE = [/\.env(\.|$)/i, /railway\.json$/i, /vercel\.json$/i];

// Percorsi SEMPRE consentiti (task contract + infrastruttura quality gate + docs).
const ALLOW = [
  'artifacts/task-validation/',
  'scripts/quality-gate/',
  '.claude/hooks/quality-gate',
  '.claude/skills/agent-loop-quality-gate/',
  'docs/quality-gate.md',
];

function relForward(p) {
  try {
    return path.relative(ROOT, path.resolve(ROOT, p)).split(path.sep).join('/');
  } catch (_e) {
    return String(p || '')
      .split(path.sep)
      .join('/');
  }
}

function isAllowed(rel) {
  if (ALLOW.some((a) => rel.startsWith(a))) return true;
  if (rel === 'CLAUDE.md') return true; // aggiornamento regola quality gate
  return false;
}

function isGuarded(rel) {
  if (GUARDED.some((g) => rel.startsWith(g))) return true;
  if (GUARDED_RE.some((re) => re.test(rel))) return true;
  return false;
}

// Esiste almeno un Task Contract con le sezioni minime? (associazione per-task non
// determinabile da un hook stateless — vedi limiti in docs/quality-gate.md).
function hasValidContract() {
  try {
    if (!fs.existsSync(TASK_ROOT)) return false;
    const REQUIRED = [
      'impact classification',
      'current behaviour',
      'expected behaviour',
      'acceptance criteria',
      'test plan',
      'evidence plan',
      'gate status',
    ];
    for (const name of fs.readdirSync(TASK_ROOT)) {
      const cp = path.join(TASK_ROOT, name, 'task-contract.md');
      if (!fs.existsSync(cp)) continue;
      const t = fs.readFileSync(cp, 'utf8').toLowerCase();
      if (REQUIRED.every((s) => t.includes(s))) return true;
    }
  } catch (_e) {
    /* fail-open */
  }
  return false;
}

function targetPaths(input) {
  const out = [];
  if (!input || typeof input !== 'object') return out;
  for (const k of ['file_path', 'path', 'notebook_path']) {
    if (typeof input[k] === 'string') out.push(input[k]);
  }
  if (Array.isArray(input.edits)) {
    /* MultiEdit shares file_path */
  }
  return out;
}

function main() {
  let raw = '';
  try {
    raw = fs.readFileSync(0, 'utf8');
  } catch (_e) {
    process.exit(0);
  }
  let evt;
  try {
    evt = JSON.parse(raw || '{}');
  } catch (_e) {
    process.exit(0);
  }

  const tool = evt.tool_name || evt.toolName || '';
  if (!MUTATING_TOOLS.has(tool)) process.exit(0); // read/search/bash → consentito

  const paths = targetPaths(evt.tool_input || evt.toolInput || {});
  if (!paths.length) process.exit(0);

  const rels = paths.map(relForward);
  // Se tutti i target sono consentiti (contract/infra) → passa.
  if (rels.every((r) => isAllowed(r))) process.exit(0);
  // Se nessuno è codice protetto → passa.
  if (!rels.some((r) => isGuarded(r))) process.exit(0);
  // Codice protetto: serve un contract valido.
  if (hasValidContract()) process.exit(0);

  const blocked = rels.filter(isGuarded).join(', ');
  process.stderr.write(
    'QUALITY GATE — modifica bloccata.\n' +
      `File di codice applicativo: ${blocked}\n` +
      'Manca un Task Contract valido. Crealo prima:\n' +
      '  node scripts/quality-gate/create-task-contract.js "<titolo>"\n' +
      '  # poi compila il contract e valida:\n' +
      '  node scripts/quality-gate/validate-task-contract.js <slug>\n' +
      'Percorso richiesto: artifacts/task-validation/<slug>/task-contract.md\n',
  );
  process.exit(2);
}

try {
  main();
} catch (_e) {
  process.exit(0);
} // fail-open assoluto
