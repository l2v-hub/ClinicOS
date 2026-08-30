import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  mergePatientDocuments,
  parsePatientDocumentPage,
  patientDocumentsPageUrl,
  type PatientDocumentMeta,
} from '../patientDocumentsPage';

function document(id: string, sortOrder: number): PatientDocumentMeta {
  return {
    id,
    originalName: `${id}.pdf`,
    mimeType: 'application/pdf',
    sizeBytes: 10,
    documentType: 'allegato',
    sortOrder,
    importJobId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

test('document page URL carries a bounded limit, opaque cursor and encoded source target', () => {
  const url = patientDocumentsPageUrl('patient/a', 'opaque+cursor', 'lettera 1.pdf');
  assert.match(url, /patients\/patient%2Fa\/documents\?/);
  assert.match(url, /limit=50/);
  assert.match(url, /cursor=opaque%2Bcursor/);
  assert.match(url, /sourceFileName=lettera\+1\.pdf/);
});

test('document pages deduplicate appends and merge a source match outside the first page', () => {
  const merged = mergePatientDocuments(
    [document('a', 1), document('b', 2)],
    [document('b', 2), document('c', 3)],
    document('target', 20),
  );
  assert.deepEqual(
    merged.map(({ id }) => id),
    ['a', 'b', 'c', 'target'],
  );
});

test('partial document page without a continuation cursor is rejected', () => {
  assert.throws(() =>
    parsePatientDocumentPage({
      documents: [],
      sourceMatch: null,
      pageInfo: { loadedCount: 0, hasMore: true, nextCursor: null },
    }),
  );
});

test('document hook aborts obsolete scope/page requests and sequence-checks results', () => {
  const source = readFileSync(new URL('../usePatientDocuments.ts', import.meta.url), 'utf8');
  assert.match(source, /controllerRef\.current\?\.abort\(\)/);
  assert.match(source, /request !== requestRef\.current/);
  assert.match(source, /requestRef\.current \+= 1/);
  assert.match(source, /append && previous\.scope === scope \? previous\.documents : \[\]/);
  assert.match(source, /append \? undefined : sourceFileName/);
  assert.match(
    source,
    /documents: mergePatientDocuments\(previous\.documents, \[document\], null\)/,
  );
});
