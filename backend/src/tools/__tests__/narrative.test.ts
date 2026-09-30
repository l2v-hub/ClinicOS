// Invocability + GUI parity: narrative.* tools reach the SAME services as
// routes/narrative-sections.ts (getNarrativeSections, getNarrativeSection, upsertNarrativeSection).

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../lib/prisma.js';
import narrativeRouter from '../../routes/narrative-sections.js';
import { NARRATIVE_SECTION_KEYS } from '../../ai/sections/patient-narrative.js';
import { createToolRegistry } from '../registry.js';
import { narrativeTools } from '../capabilities/narrative.js';
import {
  captureAudit,
  cleanup,
  createOperator,
  createPatient,
  ctxOf,
  demoHeaders,
  restoreAudit,
  serve,
  type TestOperator,
} from './support.js';

const registry = createToolRegistry(narrativeTools);
let owner: TestOperator;
let stranger: TestOperator;
let guiPatientId = '';
let toolPatientId = '';
let strangerPatientId = '';
let gui: Awaited<ReturnType<typeof serve>>;
const [keyA, keyB] = NARRATIVE_SECTION_KEYS;

before(async () => {
  captureAudit();
  owner = await createOperator('narr-owner');
  stranger = await createOperator('narr-stranger');
  guiPatientId = (await createPatient('narr-gui', owner)).id;
  toolPatientId = (await createPatient('narr-tool', owner)).id;
  strangerPatientId = (await createPatient('narr-foreign', stranger)).id;
  gui = await serve('/patients', narrativeRouter);
});

after(async () => {
  restoreAudit();
  await gui.close();
  const ids = [guiPatientId, toolPatientId, strangerPatientId];
  await prisma.patientNarrativeSection.deleteMany({ where: { patientId: { in: ids } } });
  await cleanup([owner, stranger], ids);
});

const rowOf = (patientId: string, sectionKey: string) =>
  prisma.patientNarrativeSection.findUniqueOrThrow({
    where: { patientId_sectionKey: { patientId, sectionKey } },
    select: { originalText: true, reviewedText: true, reviewStatus: true, updatedBy: true },
  });

test('GUI == Tool: narrative.save persists the same row (updatedBy = actor, originalText immutable)', async () => {
  const create = { originalText: 'Testo originale', reviewedText: 'Testo revisionato' };
  const res = await fetch(`${gui.base}/patients/${guiPatientId}/narrative-sections/${keyA}`, {
    method: 'PUT',
    headers: demoHeaders(owner),
    body: JSON.stringify(create),
  });
  assert.equal(res.status, 200);
  const httpDto = await res.json();
  const tool = await registry.invoke(
    'narrative.save',
    { patientId: toolPatientId, sectionKey: keyA, body: create },
    ctxOf(owner),
  );
  assert.equal(tool.ok, true, JSON.stringify(tool));
  if (!tool.ok) return;
  assert.deepEqual(JSON.parse(JSON.stringify(tool.data)), httpDto);

  const guiRow = await rowOf(guiPatientId, keyA);
  const toolRow = await rowOf(toolPatientId, keyA);
  assert.deepEqual(toolRow, guiRow);
  assert.equal(toolRow.updatedBy, owner.operatorId);
  assert.equal(toolRow.reviewStatus, 'modified');

  // Second save: originalText is never overwritten, only reviewedText changes.
  const edit = { originalText: 'tentativo di sovrascrittura', reviewedText: 'Seconda revisione' };
  await fetch(`${gui.base}/patients/${guiPatientId}/narrative-sections/${keyA}`, {
    method: 'PATCH',
    headers: demoHeaders(owner),
    body: JSON.stringify(edit),
  });
  const again = await registry.invoke(
    'narrative.save',
    { patientId: toolPatientId, sectionKey: keyA, body: edit },
    ctxOf(owner),
  );
  assert.equal(again.ok, true);
  const guiRow2 = await rowOf(guiPatientId, keyA);
  const toolRow2 = await rowOf(toolPatientId, keyA);
  assert.deepEqual(toolRow2, guiRow2);
  assert.equal(toolRow2.originalText, 'Testo originale');
  assert.equal(toolRow2.reviewedText, 'Seconda revisione');
});

test('narrative.save validation comes from parseNarrativeSaveInput (route 400 ⇔ invalid_input)', async () => {
  const body = { reviewStatus: 'inventato' };
  const res = await fetch(`${gui.base}/patients/${toolPatientId}/narrative-sections/${keyB}`, {
    method: 'PUT',
    headers: demoHeaders(owner),
    body: JSON.stringify(body),
  });
  assert.equal(res.status, 400);
  const tool = await registry.invoke(
    'narrative.save',
    { patientId: toolPatientId, sectionKey: keyB, body },
    ctxOf(owner),
  );
  assert.equal(tool.ok, false);
  if (!tool.ok) assert.equal(tool.error.code, 'invalid_input');
  const badKey = await registry.invoke(
    'narrative.save',
    { patientId: toolPatientId, sectionKey: 'non_esiste', body: {} },
    ctxOf(owner),
  );
  assert.equal(badKey.ok, false);
  if (!badKey.ok) assert.equal(badKey.error.code, 'invalid_input');
  assert.equal(
    await prisma.patientNarrativeSection.count({
      where: { patientId: toolPatientId, sectionKey: keyB },
    }),
    0,
  );
});

test('GUI == Tool: narrative.list and narrative.get return the same data', async () => {
  const httpList = await (
    await fetch(`${gui.base}/patients/${toolPatientId}/narrative-sections`, {
      headers: demoHeaders(owner),
    })
  ).json();
  const list = await registry.invoke<{ total: number }>(
    'narrative.list',
    { patientId: toolPatientId },
    ctxOf(owner),
  );
  assert.equal(list.ok, true);
  if (list.ok) {
    assert.deepEqual(JSON.parse(JSON.stringify(list.data)), httpList);
    assert.equal(list.data.total, NARRATIVE_SECTION_KEYS.length);
  }
  const httpOne = await (
    await fetch(`${gui.base}/patients/${toolPatientId}/narrative-sections/${keyA}`, {
      headers: demoHeaders(owner),
    })
  ).json();
  const one = await registry.invoke<{ reviewedText: string }>(
    'narrative.get',
    { patientId: toolPatientId, sectionKey: keyA },
    ctxOf(owner),
  );
  assert.equal(one.ok, true);
  if (one.ok) {
    assert.deepEqual(JSON.parse(JSON.stringify(one.data)), httpOne);
    assert.equal(one.data.reviewedText, 'Seconda revisione');
  }
});

test('scope: an operatore cannot reach another owner’s patient through narrative tools', async () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ['narrative.list', { patientId: strangerPatientId }],
    ['narrative.get', { patientId: strangerPatientId, sectionKey: keyA }],
    [
      'narrative.save',
      { patientId: strangerPatientId, sectionKey: keyA, body: { reviewedText: 'x' } },
    ],
  ];
  for (const [name, input] of cases) {
    const result = await registry.invoke(name, input, ctxOf(owner));
    assert.equal(result.ok, false, name);
    if (!result.ok) {
      assert.equal(result.error.code, 'not_found', name);
      assert.equal(result.error.domainCode, 'patient_not_found', name);
    }
  }
  assert.equal(
    await prisma.patientNarrativeSection.count({ where: { patientId: strangerPatientId } }),
    0,
  );
});
