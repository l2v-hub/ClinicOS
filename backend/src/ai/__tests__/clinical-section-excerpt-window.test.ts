import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const services = readFileSync(new URL('../gateway/services.ts', import.meta.url), 'utf8');
const assistant = readFileSync(new URL('../assistant/service.ts', import.meta.url), 'utf8');
const types = readFileSync(new URL('../gateway/types.ts', import.meta.url), 'utf8');
const search = services
  .split('export async function searchClinicalSections')[1]
  ?.split('export async function searchDocuments')[0];

test('clinical section search reuses the bounded SQL excerpt projection', () => {
  assert.ok(search);
  assert.match(search, /\$\{narrativeExcerptColumns\}/);
  assert.match(search, /narrativeExcerptLateral\(validated\.query\)/);
  assert.match(search, /LIMIT \$\{validated\.limit\}/);
  assert.doesNotMatch(search, /SELECT\s+section\."reviewedText"/);
  assert.doesNotMatch(search, /section\."reviewedText"\s+AS/);
  assert.doesNotMatch(search, /excerptAround\(/);
});

test('section result and source share the same excerpt and disclose truncation', () => {
  assert.ok(search);
  assert.match(search, /excerpt: r\.excerpt/);
  assert.match(search, /contentTruncated: r\.contentTruncated/);
  assert.match(search, /narrativeSource\(r\.patientId, r\.sectionKey, r\.id, r\.excerpt/);
  assert.match(types, /contentTruncated\?: boolean/);
});

test('assistant propagates truncation for direct and cross-patient section search', () => {
  for (const tool of ['search_clinical_sections', 'search_across_patients']) {
    const block = assistant.split(`case '${tool}'`)[1]?.split(/case '[^']+'/)[0];
    assert.ok(block);
    assert.match(block, /truncated: data\.some\(\(match\) => match\.contentTruncated === true\)/);
  }
});
