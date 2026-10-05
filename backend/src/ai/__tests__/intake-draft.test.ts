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

test('autosave rejects extraction metadata replacement atomically and preserves it on ordinary edits', async () => {
  const source = {
    _narrative: { diagnosisText: 'Synthetic source' },
    _sections: { version: 1 },
    anagrafica: { nome: 'Original' },
  };
  const draft = await prisma.patientIntakeDraft.create({
    data: { source: 'import', data: source },
  });
  try {
    for (const key of ['_narrative', '_sections']) {
      const before = await getDraft(draft.id);
      await assert.rejects(
        patchDraft(draft.id, { anagrafica: { nome: 'Rejected' }, [key]: {} }),
        (error: any) => error.kind === 'config',
      );
      const after = await getDraft(draft.id);
      assert.deepEqual(after?.data, before?.data);
      assert.equal(after?.version, before?.version);
    }
    await patchDraft(draft.id, { anagrafica: { nome: 'Edited' } });
    const saved = await getDraft(draft.id);
    assert.deepEqual(saved?.data, { ...source, anagrafica: { nome: 'Edited' } });
    assert.equal(saved?.version, draft.version + 1);
  } finally {
    await prisma.patientIntakeDraft.delete({ where: { id: draft.id } });
  }
});
