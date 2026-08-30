import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { MAX_GATEWAY_ALLERGIES, MAX_GATEWAY_ALLERGY_FIELD_LENGTH } from '../gateway/filters.js';

const source = readFileSync(new URL('../gateway/services.ts', import.meta.url), 'utf8');
const block = source
  .split('export async function getPatientAllergies')[1]
  ?.split('export async function getPatientNarrativeSectionsG')[0];

test('allergy gateway projects only the first 101 JSON items in PostgreSQL', () => {
  assert.ok(block);
  assert.equal(MAX_GATEWAY_ALLERGIES, 100);
  assert.equal(MAX_GATEWAY_ALLERGY_FIELD_LENGTH, 240);
  assert.match(block, /prisma\.\$queryRaw/);
  assert.match(block, /jsonb_array_elements/);
  assert.match(block, /WITH ORDINALITY/);
  assert.match(block, /ORDER BY allergy\.ordinal/);
  assert.match(block, /LIMIT \$\{MAX_GATEWAY_ALLERGIES \+ 1\}/);
  assert.doesNotMatch(block, /loadCartella\(/);
  assert.doesNotMatch(block, /boundAllergies\(/);
});

test('allergy fields, row count and sources remain bounded and aligned', () => {
  assert.ok(block);
  for (const field of ['id', 'allergene', 'reazione', 'gravita', 'documentato']) {
    assert.match(block, new RegExp(`raw\\.item->>'${field}'`));
  }
  assert.match(block, /AS "arrayTruncated"/);
  assert.match(block, /AS "contentTruncated"/);
  assert.match(block, /if \(allergies\.length === MAX_GATEWAY_ALLERGIES\) break/);
  assert.match(block, /const refs = allergies\.map/);
  assert.match(block, /return \{ data: allergies, sourceRefs: refs, truncated \}/);
});

test('malformed/non-array allergy JSON is converted to an empty SQL array', () => {
  assert.ok(block);
  assert.equal(block.match(/jsonb_typeof\([^)]*->'allergie'\) = 'array'/g)?.length, 2);
  assert.equal(block.match(/ELSE '\[\]'::jsonb END/g)?.length, 2);
  assert.match(block, /LEFT JOIN LATERAL/);
});
