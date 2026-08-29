import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const route = readFileSync(new URL('../therapy.ts', import.meta.url), 'utf8');
const slots = readFileSync(new URL('../../therapies/therapy-slots.ts', import.meta.url), 'utf8');
const writer = readFileSync(new URL('../../therapies/therapy-write.ts', import.meta.url), 'utf8');
const assistant = readFileSync(new URL('../../ai/assistant/service.ts', import.meta.url), 'utf8');
const dueQuery = readFileSync(
  new URL('../../therapies/due-therapy-query.ts', import.meta.url),
  'utf8',
);
const administrationPage = readFileSync(
  new URL('../../therapies/therapy-administration-page.ts', import.meta.url),
  'utf8',
);
const schema = readFileSync(new URL('../../../../prisma/schema.prisma', import.meta.url), 'utf8');

test('therapy reads and writes apply patient scope before loading clinical data', () => {
  assert.match(route, /registeredById:\s*actor\.id/);
  assert.match(route, /resolveAuthoritativeTherapy\(tx, input, actor\)/g);
  assert.match(writer, /patient:\s*\{ registeredById: actor\.id \}/);
  assert.match(writer, /if \(!therapy\) throw new TherapyNotFoundError/);
  assert.match(assistant, /findTherapiesDue\([\s\S]*patientIds: ctx\.permittedPatientIds/);
  assert.match(dueQuery, /therapyAccessSql\(access\)/);
  assert.doesNotMatch(assistant, /patients:\s*s\.patients\.filter/);
});

test('therapy slot relations and administration candidates are bounded', () => {
  assert.match(slots, /schedules:\s*\{\s*take: MAX_THERAPY_SCHEDULES \+ 1/);
  assert.match(administrationPage, /WITH candidate\("therapyId", fascia\) AS/);
  assert.match(administrationPage, /ma\."therapyId" = candidate\."therapyId"/);
  assert.match(administrationPage, /WITH candidate\("patientId", "farmacoNome", fascia\) AS/);
  assert.match(administrationPage, /VALUES \$\{Prisma\.join/);
  assert.match(administrationPage, /ma\."patientId" = candidate\."patientId"/);
  assert.match(administrationPage, /ma\."farmacoNome" = candidate\."farmacoNome"/);
  assert.doesNotMatch(administrationPage, /patientId:\s*\{ in:/);
  assert.match(slots, /legacyCandidateKeys\.has\(legacyKey\)/);
  assert.match(schema, /MedicationAdministration_legacy_slot_idx/);
});

test('assistant therapy queue is exact-counted, bounded and declares sampled results', () => {
  assert.doesNotMatch(assistant, /buildTherapySlots/);
  assert.match(dueQuery, /COUNT\(\*\) OVER \(PARTITION BY bucket\)/);
  assert.match(dueQuery, /sample_rank <= \$\{boundedSample\}/);
  assert.match(dueQuery, /truncated: overdueCount > overdueRows\.length/);
  assert.match(assistant, /therapiesOverdueSampleCount/);
  assert.match(assistant, /truncated:\s*therapies\.truncated/);
});

test('interactive agenda uses keyset pages with exact scoped summaries', () => {
  assert.match(route, /router\.get\('\/page'/);
  assert.match(route, /parseTherapySlotPageQuery/);
  assert.match(route, /encodeTherapySlotCursor/);
  assert.match(slots, /orderBy: \{ id: 'asc' \}/);
  assert.match(slots, /take: limit \+ 1/);
  assert.match(slots, /\{ id: \{ gt: cursorId \} \}/);
  assert.match(slots, /buildTherapySlotExactSummary/);
  assert.match(slots, /COUNT\(\*\) FILTER \(WHERE stato = 'erogata'\)/);
  assert.match(slots, /therapyAccessSql\(access\)/);
  assert.doesNotMatch(slots, /allowed\.includes\(isoDay\)/);
  assert.match(
    slots,
    /FROM due_therapy due\s+JOIN "MedicationAdministration" ma[\s\S]*ma\."patientId" = due\."patientId"/,
  );
});
