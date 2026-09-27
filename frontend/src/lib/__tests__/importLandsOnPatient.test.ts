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
    /const handleImported = \(patientId\?: string, moduleTabId\?: string\) => \{\s*void loadPage\(undefined, false\);\s*onImported\?\.\(patientId, moduleTabId\);/,
  );
  // sia il pulsante "Importa dimissione" sia la scelta "Nuovo paziente → Da documenti"
  assert.equal(list.match(/onImported=\{handleImported\}/g)?.length, 2);
});

test('"Nuovo paziente" opens the chooser; each path opens the existing flow', () => {
  const list = src('operator/PatientList.tsx');
  assert.equal(list.match(/onClick=\{\(\) => setNewPatient\('scelta'\)\}/g)?.length, 2);
  assert.match(
    list,
    /newPatient === 'scelta' && \(\s*<NewPatientChooser onClose=\{\(\) => setNewPatient\(null\)\} onChoose=\{setNewPatient\} \/>/,
  );
  assert.match(list, /newPatient === 'documenti' && \([\s\S]*?<DischargeImportModal/);
  assert.match(
    list,
    /newPatient === 'manuale' && \([\s\S]*?<IntakeWorkspace[\s\S]*?onImported\?\.\(patientId, moduleTabId\)/,
  );
});
