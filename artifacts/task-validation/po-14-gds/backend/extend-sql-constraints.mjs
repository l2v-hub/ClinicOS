import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
const previous='prisma/migrations/20260923070000_mna/migration.sql';
const target='prisma/migrations/20260923080000_gds15/migration.sql';
const base=await readFile(previous,'utf8');
let constraints=base.slice(base.indexOf('ALTER TABLE "PatientAssessment" DROP CONSTRAINT'),base.indexOf('ALTER TABLE "PatientAssessment" ADD CONSTRAINT "PatientAssessment_mna_assessed_date_check"'));
for(const [from,to] of [
 ["(type='mna' AND \"formVersion\"='mna-it-2026-09-22-q-corrected-v1'));","(type='mna' AND \"formVersion\"='mna-it-2026-09-22-q-corrected-v1') OR\n  (type='gds15' AND \"formVersion\"='gds15-it-2026-09-22-v1'));"],
 ["(type='mna' AND mna_answers_valid(answers))) IS TRUE);","(type='mna' AND mna_answers_valid(answers)) OR\n  (type='gds15' AND gds15_answers_valid(answers))) IS TRUE);"],
 ["OR (type='tinetti' AND tinetti_answers_valid(answers,true))","OR (type='tinetti' AND tinetti_answers_valid(answers,true))\n      OR (type='gds15' AND gds15_answers_valid(answers,true) AND gds15_snapshot_valid(\"finalSnapshot\",answers))"],
]) { assert(constraints.includes(from)); constraints=constraints.replace(from,to); }
const functions=await readFile(target,'utf8');
assert(!functions.includes('DROP CONSTRAINT'));
await writeFile(target,functions+'\n'+constraints);
