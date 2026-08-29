import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const route = readFileSync(new URL('../therapy.ts', import.meta.url), 'utf8');
const slots = readFileSync(new URL('../../therapies/therapy-slots.ts', import.meta.url), 'utf8');
const writer = readFileSync(new URL('../../therapies/therapy-write.ts', import.meta.url), 'utf8');
const assistant = readFileSync(new URL('../../ai/assistant/service.ts', import.meta.url), 'utf8');
const schema = readFileSync(new URL('../../../../prisma/schema.prisma', import.meta.url), 'utf8');

test('therapy reads and writes apply patient scope before loading clinical data', () => {
  assert.match(route, /registeredById:\s*actor\.id/);
  assert.match(route, /resolveAuthoritativeTherapy\(tx, input, actor\)/g);
  assert.match(writer, /patient:\s*\{ registeredById: actor\.id \}/);
  assert.match(writer, /if \(!therapy\) throw new TherapyNotFoundError/);
  assert.match(
    assistant,
    /buildTherapySlots\(dayKey\(now\), \{ patientIds: ctx\.permittedPatientIds \}\)/,
  );
  assert.doesNotMatch(assistant, /patients:\s*s\.patients\.filter/);
});

test('therapy slot relations and administration candidates are bounded', () => {
  assert.match(slots, /schedules:\s*\{\s*take: MAX_THERAPY_SCHEDULES \+ 1/);
  assert.match(slots, /therapyId:\s*\{ in: therapyIds \}/);
  assert.match(slots, /therapyId:\s*null,[\s\S]*patientId:\s*\{ in: patientIds \}/);
  assert.match(slots, /take: MAX_THERAPY_SLOT_ADMINISTRATION_ROWS \+ 1/);
  assert.match(slots, /legacyCandidateKeys\.has\(legacyKey\)/);
  assert.match(schema, /MedicationAdministration_legacy_slot_idx/);
});
