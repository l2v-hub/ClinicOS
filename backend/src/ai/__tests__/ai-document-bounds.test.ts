import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const documents = readFileSync(new URL('../upload/patient-documents.ts', import.meta.url), 'utf8');
const gateway = readFileSync(new URL('../gateway/services.ts', import.meta.url), 'utf8');

test('AI document metadata uses a bounded minimal database projection', () => {
  const aiList = documents
    .split('export async function listPatientDocumentsForAi')[1]
    ?.split('/** Fetch one document')[0];
  assert.ok(aiList);
  assert.match(aiList, /take: AI_PATIENT_DOCUMENT_LOOKAHEAD/);
  assert.match(aiList, /orderBy: \[\{ sortOrder: 'asc' \}, \{ id: 'asc' \}\]/);
  for (const field of [
    'id',
    'originalName',
    'mimeType',
    'sizeBytes',
    'documentType',
    'createdAt',
  ]) {
    assert.match(aiList, new RegExp(`${field}: true`));
  }
  assert.doesNotMatch(aiList, /sha256|importJobId|dataBase64|sortOrder: true/);
});

test('AI gateway emits at most 100 document rows and propagates truncation', () => {
  const block = gateway
    .split('export async function getPatientDocumentsG')[1]
    ?.split('export async function getPatientAppointments')[0];
  assert.ok(block);
  assert.match(block, /listPatientDocumentsForAi\(patientId\)/);
  assert.match(block, /rows\.length > AI_PATIENT_DOCUMENT_LIMIT/);
  assert.match(block, /rows\.slice\(0, AI_PATIENT_DOCUMENT_LIMIT\)/);
  assert.match(block, /return \{ data: docs, sourceRefs: refs, truncated \}/);
});
