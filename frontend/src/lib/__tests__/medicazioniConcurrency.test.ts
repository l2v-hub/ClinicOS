import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CartellaWriteQueue, mergeCartellaPatch } from '../cartellaWriteQueue';
import { attachDressingDocument } from '../clinicalAttachments';
import type { CartellaPaziente, MedicazioneRecord } from '../../types';

const records = () =>
  ['a', 'b'].map((id) => ({
    id,
    sede: 'Synthetic site',
    patientDocumentIds: [],
    followUps: [{ id: 'check-a', note: 'Synthetic check' }],
  })) as unknown as MedicazioneRecord[];

test('concurrent photo writes preserve refs on the same and different dressings', async () => {
  for (const secondId of ['a', 'b']) {
    const queue = new CartellaWriteQueue<CartellaPaziente>();
    const initial = { medicazioniFerite: records() } as CartellaPaziente;
    let saved = initial;
    const persist = async (next: CartellaPaziente) => {
      saved = next;
      return true;
    };
    await Promise.all(
      ['a', secondId].map((id, index) =>
        queue.enqueue(
          'patient',
          initial,
          {
            medicazioniFerite: attachDressingDocument(
              initial.medicazioniFerite,
              id,
              `photo-${index}`,
            )!,
          },
          persist,
          mergeCartellaPatch,
        ),
      ),
    );
    assert.deepEqual(
      saved.medicazioniFerite.flatMap((r) => r.patientDocumentIds),
      ['photo-0', 'photo-1'],
    );
  }
});
test('photo, form and followup changes reconcile while preserving unrelated clinical fields', async () => {
  const queue = new CartellaWriteQueue<CartellaPaziente>();
  const initial = { medicazioniFerite: records() } as CartellaPaziente;
  let saved = initial;
  const changes = [
    attachDressingDocument(initial.medicazioniFerite, 'a', 'photo-a')!,
    initial.medicazioniFerite.map((r) => (r.id === 'a' ? { ...r, sede: 'Edited site' } : r)),
    initial.medicazioniFerite.map((r) =>
      r.id === 'a'
        ? { ...r, followUps: [...r.followUps!, { id: 'check-b', note: 'Followup added' }] }
        : r,
    ),
  ] as MedicazioneRecord[][];
  await Promise.all(
    changes.map((medicazioniFerite) =>
      queue.enqueue(
        'patient',
        initial,
        { medicazioniFerite },
        async (next) => {
          saved = next;
          return true;
        },
        mergeCartellaPatch,
      ),
    ),
  );
  assert.deepEqual(saved.medicazioniFerite[0].patientDocumentIds, ['photo-a']);
  assert.equal(saved.medicazioniFerite[0].sede, 'Edited site');
  assert.equal(saved.medicazioniFerite[0].followUps?.length, 2);
});
test('deletions win over stale edits without deleting concurrent new records or photos', () => {
  const initial = { medicazioniFerite: records() } as CartellaPaziente;
  const deleted = { ...initial, medicazioniFerite: [initial.medicazioniFerite[1]] };
  const stale = mergeCartellaPatch(deleted, initial, {
    medicazioniFerite: attachDressingDocument(initial.medicazioniFerite, 'a', 'photo-a')!,
  });
  assert.deepEqual(
    stale.medicazioniFerite.map((r) => r.id),
    ['b'],
  );
  const latest = { ...initial, medicazioniFerite: [...records(), { ...records()[0], id: 'new' }] };
  assert.deepEqual(
    mergeCartellaPatch(latest, initial, { medicazioniFerite: [] }).medicazioniFerite.map(
      (r) => r.id,
    ),
    ['new'],
  );
});
