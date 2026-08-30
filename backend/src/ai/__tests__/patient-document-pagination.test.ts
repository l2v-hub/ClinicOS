import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  decodePatientDocumentCursor,
  encodePatientDocumentCursor,
  PATIENT_DOCUMENT_PAGE_DEFAULT,
  PATIENT_DOCUMENT_PAGE_MAX,
} from '../upload/patient-document-cursor.js';

const serviceSource = readFileSync(
  new URL('../upload/patient-documents.ts', import.meta.url),
  'utf8',
);
const routeSource = readFileSync(
  new URL('../../routes/patient-documents.ts', import.meta.url),
  'utf8',
);

test('patient document cursor is opaque, stable and bound to its patient', () => {
  const cursor = encodePatientDocumentCursor('patient-a', { sortOrder: 7, id: 'doc-9' });
  assert.deepEqual(decodePatientDocumentCursor(cursor, 'patient-a'), {
    sortOrder: 7,
    id: 'doc-9',
  });
  assert.equal(decodePatientDocumentCursor(cursor, 'patient-b'), null);
  assert.equal(decodePatientDocumentCursor('not-a-cursor', 'patient-a'), null);
  assert.equal(decodePatientDocumentCursor(`${cursor}=`, 'patient-a'), null);
  assert.equal(decodePatientDocumentCursor('a'.repeat(1025), 'patient-a'), null);

  const outOfRange = Buffer.from(
    JSON.stringify({
      version: 1,
      patientId: 'patient-a',
      sortOrder: 2_147_483_648,
      id: 'doc-9',
    }),
    'utf8',
  ).toString('base64url');
  assert.equal(decodePatientDocumentCursor(outOfRange, 'patient-a'), null);
});

test('patient document metadata query is bounded and keyset ordered', () => {
  assert.equal(PATIENT_DOCUMENT_PAGE_DEFAULT, 50);
  assert.equal(PATIENT_DOCUMENT_PAGE_MAX, 100);
  const listBlock = serviceSource
    .split('export async function listPatientDocuments(')[1]
    ?.split('/** Bounded, minimized metadata projection')[0];
  assert.ok(listBlock);
  assert.match(listBlock, /take: limit \+ 1/);
  assert.match(listBlock, /orderBy: \[\{ sortOrder: 'asc' \}, \{ id: 'asc' \}\]/);
  assert.match(listBlock, /\{ sortOrder: \{ gt: cursor\.sortOrder \} \}/);
  assert.match(listBlock, /\{ sortOrder: cursor\.sortOrder, id: \{ gt: cursor\.id \} \}/);
  assert.doesNotMatch(listBlock, /dataBase64/);
});

test('HTTP contract rejects invalid cursors and caps the requested page size', () => {
  assert.match(routeSource, /Math\.min\(parsedLimit, PATIENT_DOCUMENT_PAGE_MAX\)/);
  assert.match(routeSource, /decodePatientDocumentCursor\(rawCursor, patientId\)/);
  assert.match(routeSource, /code: 'invalid_cursor'/);
  assert.match(routeSource, /sourceFileName: rawSourceFileName \|\| undefined/);
  assert.match(routeSource, /res\.status\(200\)\.json\(page\)/);
  assert.match(
    serviceSource,
    /cursor \? Promise\.resolve\(null\) : prisma\.patientDocument\.count/,
  );
});
