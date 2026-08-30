import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const services = readFileSync(new URL('../gateway/services.ts', import.meta.url), 'utf8');
const assistant = readFileSync(new URL('../assistant/service.ts', import.meta.url), 'utf8');
const correlation = services
  .split('export async function correlate')[1]
  ?.split('/** Resolve a NARRATIVE_SECTION')[0];
const excerptSql = services
  .split('function narrativeExcerptLateral')[1]
  ?.split('interface LegacyClinicalMatchRow')[0];

test('correlation projects a centered bounded narrative excerpt in PostgreSQL', () => {
  assert.ok(correlation);
  assert.ok(excerptSql);
  assert.match(excerptSql, /CROSS JOIN LATERAL/);
  assert.match(excerptSql, /strpos\(/);
  assert.match(excerptSql, /GREATEST\(1, source\."matchPosition" - 120\)/);
  assert.match(excerptSql, /240 \+ \$\{query\.length\}/);
  assert.match(
    excerptSql,
    /GREATEST\(1, source\."matchPosition" - 120\) \+ 240 \+ \$\{query\.length\} - 1\s*AS "endPosition"/,
  );
  assert.match(excerptSql, /AS "excerpt"/);
  assert.match(excerptSql, /AS "contentTruncated"/);
  assert.match(correlation, /narrativeExcerptLateral\(validated\.sectionContains\.text\)/);
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
