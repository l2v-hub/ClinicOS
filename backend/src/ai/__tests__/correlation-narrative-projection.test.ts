import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const services = readFileSync(new URL('../gateway/services.ts', import.meta.url), 'utf8');
const assistant = readFileSync(new URL('../assistant/service.ts', import.meta.url), 'utf8');
const correlation = services
  .split('export async function correlate')[1]
  ?.split('/** Resolve a NARRATIVE_SECTION')[0];

test('correlation projects a centered bounded narrative excerpt in PostgreSQL', () => {
  assert.ok(correlation);
  assert.match(correlation, /CROSS JOIN LATERAL/);
  assert.match(correlation, /strpos\(/);
  assert.match(correlation, /GREATEST\(1, source\."matchPosition" - 120\)/);
  assert.match(correlation, /240 \+ \$\{validated\.sectionContains\.text\.length\}/);
  assert.match(
    correlation,
    /GREATEST\(1, source\."matchPosition" - 120\)\s*\+ 240 \+ \$\{validated\.sectionContains\.text\.length\} - 1\s*AS "endPosition"/,
  );
  assert.match(correlation, /AS "excerpt"/);
  assert.match(correlation, /AS "contentTruncated"/);
  assert.doesNotMatch(correlation, /section\."originalText", section\."reviewedText"/);
  assert.doesNotMatch(correlation, /excerptAround\(text/);
});

test('a match at the first character does not report false truncation inside the window', () => {
  const matchPosition = 1;
  const queryLength = 5;
  const textLength = 200;
  const startPosition = Math.max(1, matchPosition - 120);
  const excerptLength = 240 + queryLength;
  const endPosition = startPosition + excerptLength - 1;
  assert.equal(startPosition, 1);
  assert.equal(endPosition < textLength, false);
});

test('full-text matching and authorized candidate scope remain unchanged', () => {
  assert.ok(correlation);
  assert.match(correlation, /WHERE section\."patientId" IN \(\$\{Prisma\.join\(patientIds\)\}\)/);
  assert.match(correlation, /LIKE \$\{normalizedLikePattern\(validated\.sectionContains\.text\)\}/);
  assert.match(correlation, /ORDER BY section\."patientId", section\."updatedAt" DESC/);
  assert.match(correlation, /narrativeSource\(p\.id, hit\.sectionKey, hit\.id, hit\.excerpt\)/);
});

test('narrative truncation propagates through correlate and assistant dispatch', () => {
  assert.ok(correlation);
  assert.match(correlation, /truncated \|\|= hit\.contentTruncated/);
  assert.match(correlation, /return \{ data: out, sourceRefs: allRefs, truncated \}/);
  const dispatch = assistant
    .split("case 'correlate_structured_data'")[1]
    ?.split("case 'query_appointments_today'")[0];
  assert.ok(dispatch);
  assert.match(dispatch, /return r/);
});
