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
  assert.match(list, /<AIImportStatus\s+onImported=\{handleImported\}/);
});

test('"Nuovo paziente" opens the shared NewPatientFlow and lands on the created patient', () => {
  const list = src('operator/PatientList.tsx');
  assert.equal(list.match(/onClick=\{\(\) => setShowNewPatient\(true\)\}/g)?.length, 2);
  assert.match(
    list,
    /<NewPatientFlow[\s\S]*?onDone=\{\(patientId, moduleTabId, path\) => \{\s*setShowNewPatient\(false\);[\s\S]*?if \(path === 'documenti' \|\| !patientId\) void loadPage\(undefined, false\);\s*onImported\?\.\(patientId, moduleTabId\);/,
  );
  const flow = src('operator/NewPatientFlow.tsx');
  assert.match(
    flow,
    /if \(path === null\) return <NewPatientChooser onClose=\{onClose\} onChoose=\{setPath\} \/>/,
  );
  assert.match(
    flow,
    /<DischargeImportModal[\s\S]*?onImported=\{\(patientId, moduleTabId\) => onDone\(patientId, moduleTabId, 'documenti'\)\}/,
  );
  assert.match(
    flow,
    /<IntakeWorkspace[\s\S]*?onCreated=\{\(patientId, moduleTabId\) => onDone\(patientId, moduleTabId, 'manuale'\)\}/,
  );
});

test('the appointment form offers the same flow and selects the created patient', () => {
  const form = src('shared/AppointmentForm.tsx');
  assert.match(
    form,
    /<NewPatientFlow[\s\S]*?onDone=\{\(patientId\) => void selectCreatedPatient\(patientId\)\}/,
  );
  assert.match(form, /fetchPatientById\(API_URL, patientId, \{ headers: operatorHeaders\(\) \}\)/);
  assert.match(form, /selectPaziente\(patient\);\s*setComboKey\(\(key\) => key \+ 1\);/);
  assert.match(form, /<PatientCombobox\s+key=\{comboKey\}/);
  for (const agenda of ['operator/OperatorAgenda.tsx', 'admin/AdminAgenda.tsx']) {
    assert.doesNotMatch(src(agenda), /<IntakeWorkspace|onNewPatient/);
  }
});
