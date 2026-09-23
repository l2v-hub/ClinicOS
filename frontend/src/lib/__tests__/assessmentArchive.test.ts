import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { PAINAD_VERSION } from '../assessments/assessmentTypes';
import { buildDocumentArchive, filterDocumentArchive } from '../patientDocumentArchive';
import {
  assertArchiveDocument,
  classifyArchiveDocument,
  readArchiveDocumentMetadata,
  saveArchiveEntry,
  uploadArchiveDocument,
} from '../patientDocumentArchiveIO';
import { selectedArchiveDocuments } from '../archivePrint';
import type { PatientDocumentMeta } from '../patientDocumentsPage';
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
const document: PatientDocumentMeta = {
  id: 'document-a',
  originalName: 'valutazione.pdf',
  documentType: 'patient_assessment',
  mimeType: 'application/pdf',
  sizeBytes: 200,
  createdAt: '2026-09-23T10:00:00.000Z',
  importJobId: null,
  assessment: {
    id: 'assessment-a',
    type: 'painad',
    formVersion: PAINAD_VERSION,
    assessedAt: '2026-09-21T23:30:00.000Z',
  },
};
const scope = () => ({
  patientId: 'patient-a',
  signal: new AbortController().signal,
  getHeaders: async () => ({}),
});

test('generated PAINAD archives under its module using clinical Rome date and exact IDs for multi-print', () => {
  const entries = buildDocumentArchive([], [document]);
  assert.equal(entries[0].type, 'patient_assessment');
  assert.equal(entries[0].date, '2026-09-22');
  for (const query of ['PAINAD', '2026-09-22'])
    assert.equal(
      filterDocumentArchive(entries, 'valutazioni', query, 'tutti')[0].document?.id,
      'document-a',
    );
  assert.equal(filterDocumentArchive(entries, 'personali', '', 'tutti').length, 0);
  assert.equal(
    selectedArchiveDocuments(entries, new Set(['document-a']))[0].assessment?.id,
    'assessment-a',
  );
  assert.equal(selectedArchiveDocuments(entries, new Set(['assessment-a'])).length, 0);
});

test('archive metadata requires reserved category and valid assessment association together', () => {
  assertArchiveDocument(document);
  for (const bad of [
    { ...document, assessment: undefined },
    { ...document, assessment: false },
    { ...document, documentType: 'esame' },
    { ...document, assessment: { ...document.assessment, id: '../other' } },
    { ...document, assessment: { ...document.assessment, formVersion: 'unknown' } },
  ])
    assert.throws(() => assertArchiveDocument(bad));
});

test('direct metadata open verifies document identity before content access', async () => {
  const urls: string[] = [];
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    return Response.json({ document });
  };
  assert.equal(
    (await readArchiveDocumentMetadata(scope(), 'document-a')).assessment?.id,
    'assessment-a',
  );
  await assert.rejects(readArchiveDocumentMetadata(scope(), 'other'), /corrispondente/);
  await assert.rejects(readArchiveDocumentMetadata(scope(), '../outside'));
  assert.equal(urls.length, 2);
  assert.ok(urls.every((url) => !url.endsWith('/content')));
});

test('manual upload, classification and stored document edit cannot use generated assessment category', async () => {
  let writes = 0;
  globalThis.fetch = async () => {
    writes++;
    throw new Error('must not write');
  };
  const file = new File(['%PDF synthetic'], 'synthetic.pdf', { type: 'application/pdf' });
  await assert.rejects(uploadArchiveDocument(scope(), file, 'patient_assessment'));
  await assert.rejects(classifyArchiveDocument(scope(), 'ordinary-doc', 'patient_assessment'));
  await assert.rejects(
    saveArchiveEntry(
      {
        stored: document,
        file: null,
        signal: scope().signal,
        records: [],
        record: {
          id: 'manual',
          tipo: 'esame',
          descrizione: 'Manual',
          dataConsegna: '2026-09-22',
          stato: 'ricevuto',
          firmatoDA: 'non_firmato',
          operatore: 'Sintetico',
          note: '',
        },
      },
      {
        upload: async () => {
          writes++;
          return document;
        },
        classify: async () => {
          writes++;
          return document;
        },
        remember: () => {
          writes++;
        },
        persist: () => {
          writes++;
        },
      },
    ),
    /rettifica/,
  );
  assert.equal(writes, 0);
});
