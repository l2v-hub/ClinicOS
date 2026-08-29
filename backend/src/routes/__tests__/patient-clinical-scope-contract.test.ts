import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const therapyRouteUrl = new URL('../patient-therapies.ts', import.meta.url);
const narrativeRouteUrl = new URL('../narrative-sections.ts', import.meta.url);
const voiceWriterUrl = new URL('../../ai/voice/write-services.ts', import.meta.url);
const narrativeServiceUrl = new URL('../../ai/sections/patient-narrative.ts', import.meta.url);
const therapyCreateUrl = new URL('../../therapies/therapy-create.ts', import.meta.url);

test('patient therapies and administrations are private and patient-scoped', async () => {
  const source = await readFile(therapyRouteUrl, 'utf8');
  assert.match(source, /Cache-Control', 'private, no-store'/);
  assert.match(source, /router\.use\('\/:patientId\/therapies', requirePatientScope\)/);
  assert.match(
    source,
    /router\.use\('\/:patientId\/medication-administrations', requirePatientScope\)/,
  );
});

test('therapy creation overwrites client-supplied authorship with the verified actor', async () => {
  const source = await readFile(therapyRouteUrl, 'utf8');
  const createBlock =
    source.split('// POST /patients/:patientId/therapies')[1]?.split('// PUT ')[0] ?? '';
  const spreadIndex = createBlock.indexOf('...(req.body as TherapyCreateInput)');
  const actorIndex = createBlock.indexOf('operatoreInseritore: actor.name || actor.id');
  assert.ok(spreadIndex >= 0, 'the request body should be copied into the normalized input');
  assert.ok(actorIndex > spreadIndex, 'verified actor must overwrite any client authorship field');
});

test('narrative writes are private, patient-scoped and server-attributed', async () => {
  const source = await readFile(narrativeRouteUrl, 'utf8');
  assert.match(source, /Cache-Control', 'private, no-store'/);
  assert.match(source, /router\.use\('\/:patientId\/narrative-sections', requirePatientScope\)/);
  assert.match(source, /updatedBy: req\.operator!\.id/);
  assert.doesNotMatch(source, /updatedBy\?: string/);
  assert.doesNotMatch(source, /updatedBy: body\.updatedBy/);
});

test('voice narrative attribution uses the verified operator id', async () => {
  const source = await readFile(voiceWriterUrl, 'utf8');
  const narrativeBlock = source.split('async appendNarrative')[1]?.split('async ')[0] ?? '';
  assert.match(narrativeBlock, /updatedBy: meta\.operatorId/);
  assert.doesNotMatch(narrativeBlock, /updatedBy: meta\.operatorName/);
});

test('therapy mutations validate schedules before replacement and administration reads are stable', async () => {
  const source = await readFile(therapyRouteUrl, 'utf8');
  const updateBlock =
    source.split('// PUT /patients/:patientId/therapies/:therapyId')[1]?.split('// DELETE ')[0] ??
    '';
  assert.ok(
    updateBlock.indexOf('assertValidSchedulesInput(body.schedules)') <
      updateBlock.indexOf('therapySchedule.deleteMany'),
    'strict validation must happen before deleting existing schedules',
  );
  assert.match(updateBlock, /if \('dataInizio' in updates \|\| 'dataFine' in updates\)/);
  assert.ok(
    updateBlock.indexOf('const derived = deriveLegacyFromSchedules(schedules)') >
      updateBlock.indexOf('if (schedules.length)'),
    'an explicit empty array must still reset every derived legacy flag',
  );
  assert.match(source, /parseMedicationAdministrationQuery\(req\.query\)/);
  assert.match(
    source,
    /orderBy: \[\{ date: 'desc' \}, \{ createdAt: 'desc' \}, \{ id: 'desc' \}\]/,
  );
});

test('narrative reads project only fields needed by the DTO', async () => {
  const source = await readFile(narrativeServiceUrl, 'utf8');
  const reads = source.split('/** Upsert a manual/reviewed edit.')[0] ?? '';
  assert.match(reads, /select: \{/);
  for (const field of [
    'sectionKey',
    'originalText',
    'reviewedText',
    'annotations',
    'sourceReferences',
    'reviewStatus',
  ]) {
    assert.match(reads, new RegExp(`${field}: true`));
  }
});

test('an explicit empty schedule array clears derived slots instead of enabling morning fallback', async () => {
  const source = await readFile(therapyCreateUrl, 'utf8');
  assert.match(source, /const derived =\s+input\.schedules !== undefined/);
  assert.match(source, /\? deriveLegacyFromSchedules\(schedules\)/);
});
