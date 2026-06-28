// backend/src/ai/__tests__/intake-draft.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDraft, getDraft, patchDraft } from '../../intake/draft-service.js';
import { prisma } from '../../lib/prisma.js';

test('createDraft + patch autosave merges data', async () => {
  const d = await createDraft({ createdById: 'op-test', source: 'manual' });
  assert.equal(d.status, 'draft');
  await patchDraft(d.id, { anagrafica: { nome: 'Test' } });
  await patchDraft(d.id, { allergie: [{ allergene: 'X' }] });
  const got = await getDraft(d.id);
  assert.equal((got!.data as any).anagrafica.nome, 'Test');
  assert.equal((got!.data as any).allergie.length, 1);
  await prisma.patientIntakeDraft.delete({ where: { id: d.id } });
});
