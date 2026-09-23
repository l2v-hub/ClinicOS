import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import * as frontend from '../../../../frontend/src/lib/assessments/gds15Definition.ts';
const backendRoot = 'C:/Workspace/ClinicOSHouse-worktrees/po14-gds-backend';
const backend = await import(pathToFileURL(`${backendRoot}/backend/src/assessments/gds15.ts`));
const definition = await import(pathToFileURL(`${backendRoot}/backend/src/assessments/gds15-definition.ts`));
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const frozen = JSON.parse(readFileSync(new URL('definition-contract.snapshot.json', import.meta.url), 'utf8'));
assert.deepEqual(frontend.GDS15_ITEMS, definition.GDS15_ITEMS);
assert.deepEqual(frontend.GDS15_ITEMS, frozen.items);
for (const [key, property] of [['INSTRUCTION','instruction'], ['SCREENING_NOTE','screeningNote'], ['PROVENANCE','provenance'], ['REFERENCE','reference']]) {
  assert.equal(frontend[`GDS15_${key}`], definition[`GDS15_${key}`]);
  assert.equal(frontend[`GDS15_${key}`], frozen[property]);
}
let scenarios = 0;
for (let bits = 0; bits < 32768; bits++) {
  const answers = { ...Object.fromEntries(frontend.GDS15_KEYS.map((key, index) => [key, Boolean(bits & (1 << index))])), notes: ' Note\nconservate ' };
  assert.deepEqual(frontend.parseGds15Answers(answers), backend.parseGds15Answers(answers));
  assert.deepEqual(frontend.gds15Completion(answers), backend.gds15Completion(answers));
  assert.deepEqual(frontend.gds15Result(answers), backend.gds15Result(answers));
  assert.deepEqual(frontend.gds15SnapshotItems(answers), backend.gds15SnapshotItems(answers));
  scenarios++;
}
const allYes = Object.fromEntries(frontend.GDS15_KEYS.map(key => [key, true]));
for (const key of frontend.GDS15_KEYS) {
  const answers = { ...allYes, [key]: null, notes: '' };
  assert.deepEqual(frontend.gds15Completion(answers), backend.gds15Completion(answers));
  assert.equal(frontend.gds15Result(answers), backend.gds15Result(answers));
  scenarios++;
}
for (const notes of [undefined, null, 1, '\ud800', '\udfff', '\u0000', '\u007f', '😀'.repeat(4001)]) {
  assert.throws(() => frontend.parseGds15Answers({ ...allYes, notes }));
  assert.throws(() => backend.parseGds15Answers({ ...allYes, notes }));
  scenarios++;
}
assert.deepEqual(frontend.parseGds15Answers(allYes), backend.parseGds15Answers(allYes)); scenarios++;
assert.deepEqual(frontend.parseGds15Answers({ ...allYes, notes: '😀'.repeat(4000) }), backend.parseGds15Answers({ ...allYes, notes: '😀'.repeat(4000) })); scenarios++;
const paths = ['backend/src/assessments/gds15.ts','backend/src/assessments/gds15-definition.ts','backend/src/assessments/gds15-types.ts'];
const report = { generatedAtUtc: new Date().toISOString(), scenarios, completeCombinations: 32768, outcome: 'pass', texts: 'Exact items/instruction/screeningNote/provenance/reference', partialSnapshotNote: 'Frontend can describe missing draft items; backend snapshot items require a complete final. Complete snapshot items are compared exhaustively.', backendInputs: paths.map(path => ({ path: `${backendRoot}/${path}`, sha256: hash(`${backendRoot}/${path}`) })), frontendInput: { path: 'frontend/src/lib/assessments/gds15Definition.ts', sha256: hash('frontend/src/lib/assessments/gds15Definition.ts') } };
writeFileSync(new URL('definition-parity.json', import.meta.url), JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
