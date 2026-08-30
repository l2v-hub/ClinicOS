import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('../gateway/services.ts', import.meta.url), 'utf8');
const helper = source
  .split('async function loadLegacyClinicalMatches')[1]
  ?.split('/** Structured clinical filters')[0];
const search = source
  .split('export async function searchPatients')[1]
  ?.split('// ── Per-patient getters')[0];
const correlation = source
  .split('export async function correlate')[1]
  ?.split('/** Resolve a NARRATIVE_SECTION')[0];

test('legacy match loader projects one bounded allergy/therapy instead of chart JSON', () => {
  assert.ok(helper);
  assert.match(helper, /jsonb_array_elements/);
  assert.equal(helper.match(/LIMIT 1/g)?.length, 2);
  assert.match(helper, /WITH ORDINALITY/);
  assert.match(helper, /ORDER BY item\.ordinal/);
  assert.match(helper, /LEFT\(item\.value->>'allergene', \$\{MAX_GATEWAY_SOURCE_EXCERPT\}\)/);
  assert.match(helper, /LEFT\(item\.value->>'descrizione', \$\{MAX_GATEWAY_SOURCE_EXCERPT\}\)/);
  assert.equal(helper.match(/BETWEEN 1 AND \$\{MAX_GATEWAY_SOURCE_EXCERPT\}/g)?.length, 2);
  assert.match(helper, /length\(item\.value->>'dataInizio'\).*BETWEEN 1 AND 64/s);
  assert.match(helper, /WHERE chart\."patientId" IN \(\$\{Prisma\.join\(patientIds\)\}\)/);
  assert.doesNotMatch(helper, /SELECT chart\."data"/);
});

test('patient search and correlation share the projection without Prisma blob reads or N+1', () => {
  assert.ok(search);
  assert.ok(correlation);
  for (const block of [search, correlation]) {
    assert.match(block, /loadLegacyClinicalMatches\(/);
    assert.doesNotMatch(block, /select:\s*\{[^}]*data:\s*true/);
    assert.doesNotMatch(block, /prisma\.cartella\.findMany/);
    assert.doesNotMatch(block, /matchAllergy\(/);
    assert.doesNotMatch(block, /matchTherapy\(/);
  }
  assert.equal(search.match(/loadLegacyClinicalMatches\(/g)?.length, 1);
  assert.equal(correlation.match(/loadLegacyClinicalMatches\(/g)?.length, 1);
});

test('legacy sources preserve first-match fields and relational therapy stays authoritative', () => {
  for (const block of [search, correlation]) {
    assert.match(block!, /allergyAllergene/);
    assert.match(block!, /therapyDescription/);
    assert.match(block!, /therapyStart/);
    assert.match(block!, /therapy\s*\? therapySource/);
    assert.match(block!, /legacyMatch\?\.recordId \?\? p\.id/);
  }
});
