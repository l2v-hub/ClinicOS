// Read-only synthetic reproduction of unresolved import paths, not medical advice.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { parseDischargeTherapy } from '../../../backend/src/intake/parse-discharge-therapy';

const a = 'FarmacoAlfa 10 mg (OS) 1 Cpr ore 08:00';
const c = 'FarmacoGamma 20 mg (OS) 1 Cpr ore 20:00';
const separated = parseDischargeTherapy(`${a}\n\nFarmacoBeta\n\n${c}`);
assert.deepEqual(separated.map(r => r.farmacoNome), ['FARMACOALFA']);
const numbered = parseDischargeTherapy(`1. ${a}\n2. ${c}`);
assert.equal(numbered.length, 2); assert.ok(numbered.every(r => r.farmacoNome === ''));
const combined = parseDischargeTherapy(`${a}; ${c}`);
assert.equal(combined.length, 1); assert.equal(combined[0].stato, 'da_verificare');
assert.match(combined[0].note, /FarmacoGamma/);
writeFileSync('artifacts/task-validation/therapy-completeness/import-audit.json', JSON.stringify({
  applicationCommit: '14a03038f758cf728e563807752da1642dc35fa8', syntheticOnly: true, writes: 0,
  separated: { inputPrescriptions: 3, outputRows: separated.length, names: separated.map(r=>r.farmacoNome),
    finding: 'Known incomplete paragraph terminates parsing, dropping a later complete prescription.' },
  numbered: { inputPrescriptions: 2, outputRows: numbered.length, names: numbered.map(r=>r.farmacoNome),
    finding: 'Both source names are not mapped from numbered lines; not accepted as complete medicines.' },
  combined: { inputPrescriptions: 2, outputRows: combined.length, state: combined[0].stato,
    originalTextPreserved: combined[0].originalText === `${a}; ${c}`,
    finding: 'Intentional ambiguity guard keeps second medicine in note; do not auto-invent a second prescription.' },
  finalDecision: 'PARTIAL: assigned-medication display candidate does not repair unresolved import paths.' }, null, 2));
console.log('Synthetic import audit3 paths reproduced; broader issue remains open.');
