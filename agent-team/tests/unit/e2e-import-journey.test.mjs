import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// QA-263-014 / AC6: the browser happy-path used to stop at the ImportSectionsReview
// "Crea paziente" click, but that click now hands off to the IntakeWorkspace wizard
// (F5 #124) whose #235 acceptance gates (anagrafica + terapia) were never satisfied,
// so CI recorded created=false with the therapy acceptance unchecked and the allergy
// state undocumented. These deterministic checks pin the completed journey contract:
// every required intake confirmation, all wizard steps, an explicitly documented
// allergy state, and a persistence assertion against the backend rather than
// transient form text — while keeping the hard failure path for real regressions.

const repoRoot = path.resolve('.');
const e2ePath = path.join(repoRoot, 'e2e', 'import-happy-path.mjs');
const stepClinicaPath = path.join(repoRoot, 'frontend', 'src', 'components', 'shared', 'intake', 'StepClinica.tsx');
const workspacePath = path.join(repoRoot, 'frontend', 'src', 'components', 'shared', 'intake', 'IntakeWorkspace.tsx');

test('browser journey completes every required intake confirmation (QA-263-014)', async () => {
  const script = await readFile(e2ePath, 'utf8');
  assert.match(script, /accept-therapy/, 'the journey must check the #235 therapy acceptance in step 3 (Clinica)');
  assert.match(script, /accept-demographics/, 'the journey must check the #235 demographics acceptance in step 6 (Verifica)');
  assert.match(script, /intake-step-3/, 'the journey must wait for the IntakeWorkspace handoff (step 3 Clinica)');
  assert.match(script, /intake-step-6/, 'the journey must reach step 6 (Verifica) before creating the patient');
  assert.match(script, /allergy-status-/, 'the journey must document the allergy state instead of leaving it "non documentato"');
});

test('browser journey asserts a persisted patient, not transient form text (QA-263-014)', async () => {
  const script = await readFile(e2ePath, 'utf8');
  assert.match(script, /\/patients/, 'the journey must verify creation against the backend /patients API');
  assert.match(script, /reload|goto\(FRONTEND/, 'the journey must re-load the SPA and verify the patient survives a reload');
  assert.match(script, /process\.exit\(failures \? 1 : 0\)/, 'a non-created outcome must remain a hard failure (regression safety)');
  assert.match(script, /failures\+\+/, 'failed assertions must still increment the failure count');
});

test('intake wizard persists the operator-selected allergy state (QA-263-014)', async () => {
  const stepClinica = await readFile(stepClinicaPath, 'utf8');
  assert.match(
    stepClinica,
    /onUpdateSection\('allergieStatus'/,
    'StepClinica must wire AllergiesEditor onStatusChange to the draft (the #244 selector was rendered but dead in intake mode)'
  );
  const workspace = await readFile(workspacePath, 'utf8');
  assert.match(
    workspace,
    /cartella\.allergieStatus/,
    'IntakeWorkspace confirm payload must carry data.allergieStatus into cartella.allergieStatus (same key PatientDetail uses)'
  );
});
