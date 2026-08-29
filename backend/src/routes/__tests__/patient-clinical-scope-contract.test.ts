import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const therapyRouteUrl = new URL('../patient-therapies.ts', import.meta.url);
const narrativeRouteUrl = new URL('../narrative-sections.ts', import.meta.url);
const voiceWriterUrl = new URL('../../ai/voice/write-services.ts', import.meta.url);

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
