import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../gateway/services.ts', import.meta.url), 'utf8');
const helper = source
  .split('async function loadRelationalTherapyMatches')[1]
  ?.split('/** Structured clinical filters')[0];
const search = source
  .split('export async function searchPatients')[1]
  ?.split('export async function getPatientDemographics')[0];
const correlation = source
  .split('export async function correlate')[1]
  ?.split('export async function resolveNarrativeSource')[0];

test('relational therapy matches are filtered and reduced to one row per patient in SQL', () => {
  assert.ok(helper);
  assert.match(helper, /SELECT DISTINCT ON \(therapy\."patientId"\)/);
  assert.match(helper, /therapy\."patientId" IN \(\$\{Prisma\.join\(patientIds\)\}\)/);
  assert.match(helper, /normalizedSql\(Prisma\.sql`therapy\."farmacoNome"`\)/);
  assert.match(helper, /normalizedLikePattern\(query\)/);
  assert.match(helper, /LEFT\(therapy\."farmacoNome", \$\{MAX_GATEWAY_SOURCE_EXCERPT\}\)/);
  assert.match(
    helper,
    /ORDER BY therapy\."patientId", therapy\."createdAt" DESC, therapy\."id" ASC/,
  );
  assert.match(helper, /return new Map\(rows\.map\(\(row\) => \[row\.patientId, row\]\)\)/);
});

test('patient search and correlation share the bounded relational therapy loader', () => {
  assert.ok(search);
  assert.ok(correlation);
  assert.match(search, /loadRelationalTherapyMatches\(/);
  assert.match(correlation, /loadRelationalTherapyMatches\(/);
  assert.doesNotMatch(search, /patientTherapy\.findMany/);
  assert.doesNotMatch(correlation, /patientTherapy\.findMany/);
  assert.doesNotMatch(search, /textIncludes\(therapy\.farmacoNome/);
  assert.doesNotMatch(correlation, /textIncludes\(therapy\.farmacoNome/);
});

test('therapy sources keep the selected relational record identity', () => {
  assert.ok(search);
  assert.ok(correlation);
  for (const block of [search, correlation]) {
    assert.match(block, /therapySource\([\s\S]*?therapy\.id,[\s\S]*?therapy\.farmacoNome/);
  }
});
