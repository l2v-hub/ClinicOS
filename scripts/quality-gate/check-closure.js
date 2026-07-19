#!/usr/bin/env node
'use strict';
// Verifica che un task possa essere dichiarato completato.
// Solo `CLOSED — VERIFIED` in validation-report.md consente lo stato "done".
// Uso: node scripts/quality-gate/check-closure.js <slug|path>
const fs = require('fs');
const { resolveTaskDir, reportPath, ALLOWED_DECISIONS } = require('./lib');

// Estrae la decisione finale: prima riga sotto '## Final Decision' che combacia con una ammessa.
function extractDecision(text) {
  const idx = text.toLowerCase().indexOf('final decision');
  const scope = idx >= 0 ? text.slice(idx) : text;
  for (const d of ALLOWED_DECISIONS) {
    // confronto tollerante su trattino normale/lungo
    const re = new RegExp(
      d
        .replace(/[—-]/g, '[—-]')
        .replace(/[.*+?^${}()|[\]\\]/g, (m) =>
          m === '[' || m === ']' || m === '—' || m === '-' ? m : '\\' + m,
        ),
      'i',
    );
    if (re.test(scope)) return d;
  }
  return null;
}

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error(
      'ERRORE: specifica lo slug o il path del task. Uso: check-closure.js <slug|path>',
    );
    process.exit(1);
  }
  const dir = resolveTaskDir(arg);
  const rpath = reportPath(dir);
  if (!fs.existsSync(rpath)) {
    console.error(`NON COMPLETABILE — validation-report.md mancante:\n  ${rpath}`);
    console.error('Stato forzato: IMPLEMENTED — NOT VERIFIED');
    process.exit(1);
  }
  const text = fs.readFileSync(rpath, 'utf8');
  if (!/final decision/i.test(text)) {
    console.error("NON COMPLETABILE — sezione 'Final Decision' assente nel report.");
    process.exit(1);
  }
  const decision = extractDecision(text);
  if (!decision) {
    console.error('NON COMPLETABILE — decisione finale assente o non tra quelle ammesse:');
    for (const d of ALLOWED_DECISIONS) console.error('  - ' + d);
    process.exit(1);
  }
  if (decision !== 'CLOSED — VERIFIED') {
    console.error(
      `NON COMPLETABILE — decisione: ${decision}. Solo 'CLOSED — VERIFIED' consente "done".`,
    );
    process.exit(2);
  }
  console.log('CLOSED — VERIFIED: il task può essere dichiarato completato. (' + rpath + ')');
}

main();
