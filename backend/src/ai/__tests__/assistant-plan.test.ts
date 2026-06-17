import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planQuery } from '../assistant/plan.js';

const P = 'patient-1';

test('allergies question on the patient page → allergies tool, current-patient scope', () => {
  const p = planQuery('Quali allergie sono documentate?', { currentPatientId: P });
  assert.equal(p.intent, 'allergies');
  assert.equal(p.scope, 'current_patient');
  assert.equal(p.tools[0].tool, 'get_patient_allergies');
  assert.equal(p.tools[0].args.patientId, P);
});

test('therapy question → therapies tool', () => {
  const p = planQuery('Mostrami l’ultima terapia domiciliare.', { currentPatientId: P });
  assert.equal(p.intent, 'therapies');
  assert.equal(p.tools[0].tool, 'get_patient_therapies');
});

test('search inside Anamnesi → narrative search with sectionKey', () => {
  const p = planQuery('Cerca le consulenze cardiologiche in anamnesi', { currentPatientId: P });
  assert.equal(p.intent, 'narrative_search');
  assert.equal(p.tools[0].tool, 'search_clinical_sections');
  assert.equal(p.tools[0].args.sectionKey, 'ANAMNESIS');
});

test('document search → search_documents', () => {
  const p = planQuery('Cerca nei documenti la frase "controllo cardiologico"', { currentPatientId: P });
  assert.equal(p.intent, 'document_search');
  assert.equal(p.tools[0].tool, 'search_documents');
  assert.equal(p.tools[0].args.query, 'controllo cardiologico');
});

test('recent vitals → vital signs tool', () => {
  const p = planQuery('Quali parametri sono stati rilevati negli ultimi sette giorni?', { currentPatientId: P });
  assert.equal(p.intent, 'vitals_recent');
  assert.equal(p.tools[0].tool, 'get_patient_vital_signs');
});

test('timeline question → timeline tool', () => {
  const p = planQuery('Mostrami la sequenza temporale del decorso ospedaliero', { currentPatientId: P });
  assert.equal(p.intent, 'timeline');
  assert.equal(p.tools[0].tool, 'get_patient_timeline');
});

test('appointments question → appointments tool', () => {
  const p = planQuery('Mostra gli appuntamenti del paziente', { currentPatientId: P });
  assert.equal(p.intent, 'appointments');
});

test('cross-patient systolic search requires cross access', () => {
  const p = planQuery('Trova i pazienti con valori pressori superiori a 150', {});
  assert.equal(p.scope, 'cross_patient');
  assert.equal(p.requiresCrossPatientAccess, true);
  assert.equal(p.tools[0].args.systolicMin, 151);
});

test('cross-patient allergy correlate', () => {
  const p = planQuery('Quali pazienti hanno allergia alla penicillina?', {});
  assert.equal(p.requiresCrossPatientAccess, true);
  assert.equal(p.tools[0].tool, 'correlate_structured_data');
});

test('appointments today → cross tool', () => {
  const p = planQuery('Mostra gli appuntamenti di oggi', {});
  assert.equal(p.tools[0].tool, 'query_appointments_today');
  assert.equal(p.requiresCrossPatientAccess, true);
});

test('a diagnosis request is refused', () => {
  const p = planQuery('Che diagnosi ha questo paziente?', { currentPatientId: P });
  assert.equal(p.intent, 'refuse_clinical');
  assert.equal(p.tools.length, 0);
});

test('a therapy suggestion request is refused', () => {
  const p = planQuery('Suggerisci una terapia per la polmonite', { currentPatientId: P });
  assert.equal(p.intent, 'refuse_clinical');
});

test('a "which patient is more serious" request is refused', () => {
  const p = planQuery('Quale paziente è più grave?', {});
  assert.equal(p.intent, 'refuse_clinical');
});

test('an unrelated question is unknown (no tools, no invented answer)', () => {
  const p = planQuery('Buongiorno', { currentPatientId: P });
  assert.equal(p.intent, 'unknown');
  assert.equal(p.tools.length, 0);
});
