import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../gateway/services.ts', import.meta.url), 'utf8');
const block = source
  .split('export async function getPatientNarrativeSectionsG')[1]
  ?.split('export async function getPatientVitalSigns')[0];

test('AI narrative getter projects only bounded display text inside PostgreSQL', () => {
  assert.ok(block);
  assert.match(block, /assertPatientAllowed\(ctx, patientId\)/);
  assert.match(block, /LEFT\(display\."text", \$\{MAX_GATEWAY_NARRATIVE_TEXT\}\)/);
  assert.match(block, /char_length\(display\."text"\) > \$\{MAX_GATEWAY_NARRATIVE_TEXT\}/);
  assert.match(block, /CROSS JOIN LATERAL/);
  assert.match(block, /section\."patientId" = \$\{patientId\}/);
  assert.doesNotMatch(block, /getNarrativeSections\(/);
  assert.doesNotMatch(block, /section\."annotations"|section\."sourceReferences"/);
  assert.doesNotMatch(block, /SELECT[\s\S]*section\."originalText"[\s\S]*FROM/);
  assert.doesNotMatch(block, /SELECT[\s\S]*section\."reviewedText"[\s\S]*FROM/);
});

test('AI narrative result and sources share the same bounded text and truncation state', () => {
  assert.ok(block);
  assert.match(block, /displayText: row\.displayText/);
  assert.match(block, /contentTruncated: row\.contentTruncated/);
  assert.match(block, /section\.displayText/);
  assert.match(block, /const truncated = data\.some\(\(section\) => section\.contentTruncated\)/);
  assert.match(block, /return \{ data, sourceRefs: refs, truncated \}/);
});

test('full clinical narrative DTO loader remains available outside the AI gateway', () => {
  const narrativeSource = readFileSync(
    new URL('../sections/patient-narrative.ts', import.meta.url),
    'utf8',
  );
  assert.match(narrativeSource, /export async function getNarrativeSections/);
  assert.match(narrativeSource, /annotations: true/);
  assert.match(narrativeSource, /sourceReferences: true/);
});
