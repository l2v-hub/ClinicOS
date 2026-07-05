#!/usr/bin/env node
'use strict';
// Valida che un task-contract.md contenga tutte le sezioni obbligatorie.
// Uso: node scripts/quality-gate/validate-task-contract.js <slug|path>
const fs = require('fs');
const { resolveTaskDir, contractPath, missingSections } = require('./lib');

const REQUIRED = [
  'Impact Classification',
  'Current Behaviour',
  'Expected Behaviour',
  'Acceptance Criteria',
  'Test Plan',
  'Evidence Plan',
  'Gate Status',
];

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('ERRORE: specifica lo slug o il path del task. Uso: validate-task-contract.js <slug|path>');
    process.exit(1);
  }
  const dir = resolveTaskDir(arg);
  const cpath = contractPath(dir);
  if (!fs.existsSync(cpath)) {
    console.error(`ERRORE: task-contract.md non trovato:\n  ${cpath}`);
    process.exit(1);
  }
  const text = fs.readFileSync(cpath, 'utf8');
  const missing = missingSections(text, REQUIRED);
  if (missing.length) {
    console.error('CONTRACT NON VALIDO — sezioni mancanti:');
    for (const m of missing) console.error('  - ' + m);
    process.exit(1);
  }
  // Gate Status deve indicare pronto all'implementazione.
  if (!/READY FOR IMPLEMENTATION/i.test(text)) {
    console.error("CONTRACT NON VALIDO — 'Gate Status' non è 'READY FOR IMPLEMENTATION'.");
    process.exit(1);
  }
  console.log('CONTRACT VALIDO: ' + cpath);
}

main();
