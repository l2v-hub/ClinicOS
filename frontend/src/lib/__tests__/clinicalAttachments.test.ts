import assert from 'node:assert/strict';
import { test } from 'node:test';
import { attachDressingDocument, saveClinicalAttachment } from '../clinicalAttachments';
import type { MedicazioneRecord } from '../../types';
import type { PatientDocumentMeta } from '../patientDocumentsPage';

const document: PatientDocumentMeta = {
  id: 'synthetic-photo',
  originalName: 'synthetic.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 300,
  documentType: 'documentazione_medicazioni',
  createdAt: '2026-09-18T08:10:00Z',
  importJobId: null,
};
test('failed linking retries stored upload without duplicating bytes', async () => {
  let uploads = 0;
  let stored: PatientDocumentMeta | null = null;
  const input = {
    signal: new AbortController().signal,
    upload: async () => {
      uploads++;
      return document;
    },
    remember: (value: PatientDocumentMeta) => {
      stored = value;
    },
  };
  await assert.rejects(saveClinicalAttachment({ ...input, stored, link: async () => false }));
  assert.equal(stored, document);
  await saveClinicalAttachment({ ...input, stored, link: () => true });
  assert.equal(uploads, 1);
});
test('patient change during upload never links or remembers a late response', async () => {
  const controller = new AbortController();
  let links = 0;
  await assert.rejects(
    saveClinicalAttachment({
      stored: null,
      signal: controller.signal,
      upload: async () => {
        controller.abort();
        return document;
      },
      remember: () => {
        links++;
      },
      link: () => {
        links++;
      },
    }),
  );
  assert.equal(links, 0);
});
test('dressing references persist together with followups and remain idempotent', () => {
  const records = [
    {
      id: 'dressing-a',
      patientDocumentIds: ['existing-photo'],
      createdAt: '2026-09-17T08:00:00Z',
      followUps: [{ id: 'followup-a', note: 'Synthetic check' }],
    },
    { id: 'dressing-b', patientDocumentIds: [] },
  ] as unknown as MedicazioneRecord[];
  const next = attachDressingDocument(records, 'dressing-a', document.id)!;
  assert.deepEqual(next[0].patientDocumentIds, ['existing-photo', document.id]);
  assert.deepEqual(JSON.parse(JSON.stringify(next))[0].followUps, records[0].followUps);
  assert.equal(next[1], records[1]);
  assert.deepEqual(attachDressingDocument(next, 'dressing-a', document.id), next);
  assert.equal(attachDressingDocument(next, 'deleted-dressing', document.id), null);
});
