// A fine import da lettera di dimissione si apre il paziente creato: ogni anello della catena
// wizard → DischargeImportModal → AIImportStatus → PatientList → App deve inoltrare
// (patientId, moduleTabId). Prima l'import chiamava onImported() a vuoto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = (p: string) => readFileSync(new URL(`../../components/${p}`, import.meta.url), 'utf8');

test('the import modal forwards the created patient and module', () => {
  const modal = src('shared/DischargeImportModal.tsx');
  assert.match(modal, /onImported\?\(patientId\?: string, moduleTabId\?: string\): void/);
  assert.match(modal, /function completed\(patientId\?: string, moduleTabId\?: string\)/);
  assert.match(modal, /onImported\?\.\(patientId, moduleTabId\)/);
  assert.doesNotMatch(modal, /onImported\?\.\(\);/);
});

test('existing-patient imports forward the target patient id', () => {
  const review = src('shared/import/ImportReviewWorkspace.tsx');
  assert.match(review, /onImported\(result\._target\.patientId\)/);
  assert.doesNotMatch(review, /onImported\(\);/);
});

test('AIImportStatus and PatientList pass the ids through to App', () => {
  assert.match(
    src('shared/AIImportStatus.tsx'),
    /onImported\?: \(patientId\?: string, moduleTabId\?: string\) => void/,
  );
  const list = src('operator/PatientList.tsx');
  assert.match(
    list,
    /onImported=\{\(patientId, moduleTabId\) => \{\s*void loadPage\(undefined, false\);\s*onImported\?\.\(patientId, moduleTabId\);/,
  );
});
