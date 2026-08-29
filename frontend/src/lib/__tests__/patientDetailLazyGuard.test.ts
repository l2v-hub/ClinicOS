import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const patientDetail = readFileSync(
  new URL('../../components/operator/PatientDetail.tsx', import.meta.url),
  'utf8',
);
const app = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
const lazyTabs = readFileSync(
  new URL('../../components/operator/PatientDetailLazyTabs.tsx', import.meta.url),
  'utf8',
);
const diaryFilters = readFileSync(
  new URL('../../components/operator/cartella/diarioFilters.ts', import.meta.url),
  'utf8',
);
const clinicalLoading = readFileSync(
  new URL('../../components/operator/ClinicalSectionLoading.tsx', import.meta.url),
  'utf8',
);
const diaryTab = readFileSync(
  new URL('../../components/operator/cartella/DiarioPazienteTab.tsx', import.meta.url),
  'utf8',
);
const nestedEditors = ['TherapyEditor', 'VitalSignsEditor', 'PainAssessmentEditor'].map((name) =>
  readFileSync(new URL(`../../components/operator/sections/${name}.tsx`, import.meta.url), 'utf8'),
);

const lazyModules = [
  'PresaInCaricoTab',
  'DocumentiTab',
  'NarrativeSectionsTab',
  'DiarioPazienteTab',
  'MedicazioniTab',
  'ContenzioniTab',
  'ScalaBradenTab',
  'ScalaTinettiTab',
  'DimissioneTab',
  'EsamiConsulenzeTab',
  'AnamnesisEditor',
  'TherapyEditor',
  'VitalSignsEditor',
  'PainAssessmentEditor',
  'InvioPSModal',
];

test('patient detail specialist modules stay behind explicit lazy imports', () => {
  for (const moduleName of lazyModules) {
    assert.match(lazyTabs, new RegExp(`export const ${moduleName} = lazy\\(`), moduleName);
  }
  assert.doesNotMatch(
    patientDetail,
    /from '\.\/cartella\/(?:Dimissione|Medicazioni|Contenzioni)Tab'/,
  );
  assert.match(patientDetail, /from '\.\/PatientDetailLazyTabs'/);
});

test('patient detail keeps a local accessible loading state without an empty clinical claim', () => {
  assert.match(patientDetail, /<Suspense fallback=\{<ClinicalSectionLoading \/>\}>/);
  assert.match(clinicalLoading, /role="status"/);
  assert.match(clinicalLoading, /aria-live="polite"/);
  assert.match(clinicalLoading, /Caricamento sezione clinica/);
  for (const editor of nestedEditors) {
    assert.match(editor, /fallback=\{<ClinicalSectionLoading \/>\}/);
    assert.doesNotMatch(editor, /fallback=\{null\}/);
  }
});

test('diary filter metadata is dependency-light and does not eager-load the diary tab', () => {
  assert.match(patientDetail, /from '\.\/cartella\/diarioFilters'/);
  assert.match(diaryFilters, /DIARIO_AUTHOR_FILTERS/);
  assert.doesNotMatch(diaryFilters, /DiarioPazienteTab|react|\.tsx/);
});

test('patient changes remount the chart and stale diary reads cannot retarget', () => {
  assert.match(app, /<PatientDetail\s+key=\{pazienteSelezionato\.id\}/);
  assert.match(diaryTab, /new AbortController\(\)/);
  assert.match(diaryTab, /request === readSequenceRef\.current/);
  assert.match(diaryTab, /signal,/);
  assert.match(diaryTab, /controller\.abort\(\)/);
});
