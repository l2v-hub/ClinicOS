import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ARCHIVE_CATEGORIES,
  DOCUMENT_TYPE_LABELS,
  archiveFolderLabel,
  buildDocumentArchive,
  documentCategory,
  filterDocumentArchive,
} from '../patientDocumentArchive';
import type { DocumentoConsegnato } from '../../types';
import type { PatientDocumentMeta } from '../patientDocumentsPage';

const file = (
  id: string,
  documentType: string,
  originalName = `${id}.pdf`,
): PatientDocumentMeta => ({
  id,
  documentType,
  originalName,
  mimeType: 'application/pdf',
  sizeBytes: 50,
  importJobId: null,
  createdAt: '2026-09-18T08:00:00Z',
});
test('every supported type belongs to exactly one folder and all originals remain represented', () => {
  const types = Object.keys(DOCUMENT_TYPE_LABELS);
  const folderTypes = ARCHIVE_CATEGORIES.flatMap((folder) => [...folder.types]);
  assert.equal(folderTypes.length, types.length);
  assert.equal(new Set(folderTypes).size, types.length);
  const entries = buildDocumentArchive(
    [],
    types.map((type) => file(type, type)),
  );
  const byFolder = ARCHIVE_CATEGORIES.flatMap((folder) =>
    filterDocumentArchive(entries, folder.id, '', 'tutti'),
  );
  assert.deepEqual(
    new Set(byFolder.map((entry) => entry.id)),
    new Set(entries.map((entry) => entry.id)),
  );
  assert.equal(byFolder.length, entries.length);
});
test('dressing photos have their own folder, separate from therapy plans', () => {
  const entries = buildDocumentArchive(
    [],
    [file('photo', 'documentazione_medicazioni'), file('plan', 'piano_terapeutico')],
  );
  assert.equal(documentCategory('documentazione_medicazioni'), 'medicazioni');
  assert.deepEqual(
    filterDocumentArchive(entries, 'medicazioni', '', 'tutti').map((x) => x.document?.id),
    ['photo'],
  );
  assert.deepEqual(
    filterDocumentArchive(entries, 'terapie', '', 'tutti').map((x) => x.document?.id),
    ['plan'],
  );
});
test('subfolder search keeps scope and treats accents and case consistently', () => {
  const entries = buildDocumentArchive(
    [],
    [file('plan', 'piano_terapeutico', 'Unità QA.pdf'), file('rx', 'prescrizione', 'Unità QA.pdf')],
  );
  assert.equal(filterDocumentArchive(entries, 'terapie', 'UNITA', 'tutti').length, 2);
  assert.deepEqual(
    filterDocumentArchive(entries, 'terapie', 'UNITA', 'tutti', 'piano_terapeutico').map(
      (x) => x.document?.id,
    ),
    ['plan'],
  );
  assert.equal(
    filterDocumentArchive(entries, 'personali', 'UNITA', 'tutti', 'piano_terapeutico').length,
    0,
  );
  assert.equal(
    archiveFolderLabel({ category: 'terapie', type: 'piano_terapeutico' }),
    'Piano terapeutico',
  );
});
test('all-documents view includes saved historical files and legacy types without duplicating links', () => {
  const historical = {
    id: 'historical',
    patientDocumentId: 'saved',
    tipo: 'esame',
    descrizione: 'Analisi storica QA',
    dataConsegna: '2026-09-17',
    archiviato: true,
  } as DocumentoConsegnato;
  const entries = buildDocumentArchive(
    [historical],
    [file('saved', 'esame'), file('old-import', 'discharge_import'), file('unknown', 'old_type')],
  );
  assert.equal(filterDocumentArchive(entries, 'tutti', '', 'tutti').length, 3);
  assert.equal(filterDocumentArchive(entries, 'tutti', '', false).length, 2);
  assert.equal(filterDocumentArchive(entries, 'tutti', '', true)[0].document?.id, 'saved');
  assert.equal(
    filterDocumentArchive(entries, 'dimissioni', '', 'tutti')[0].document?.id,
    'old-import',
  );
  assert.equal(filterDocumentArchive(entries, 'altro', '', 'tutti')[0].document?.id, 'unknown');
});
