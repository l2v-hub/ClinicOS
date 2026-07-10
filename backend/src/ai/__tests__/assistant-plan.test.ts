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
  // Nota: "negli ultimi sette giorni" ora è correttamente vitals_trend (KB fix Finding 2);
  // questa frase resta puramente "recenti" per non sovrapporsi al ramo trend.
  const p = planQuery('Quali parametri sono stati rilevati ultimamente?', { currentPatientId: P });
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

// ── 016 F0: plurali/sinonimi + estrazione nome paziente ───────────────────────
import { extractPatientName } from '../assistant/plan.js';

test('016 F0: plural "terapie" is recognized (not only singular)', () => {
  const p = planQuery('quali terapie assume', { currentPatientId: P });
  assert.equal(p.intent, 'therapies');
  assert.equal(p.tools[0].tool, 'get_patient_therapies');
});

test('016 F0: plural "allergie" and synonym "farmaci" recognized', () => {
  assert.equal(planQuery('mostra le allergie', { currentPatientId: P }).intent, 'allergies');
  assert.equal(planQuery('quali farmaci prende', { currentPatientId: P }).intent, 'therapies');
});

test('016 F0: extractPatientName pulls "di <Nome Cognome>"', () => {
  assert.equal(extractPatientName('mostra le allergie di Elena Moretti'), 'Elena Moretti');
});

test('016 F0: extractPatientName pulls a single surname after the verb', () => {
  assert.equal(extractPatientName('quali terapie assume Rossi'), 'Rossi');
});

test('016 F0: extractPatientName returns null when no patient is named', () => {
  assert.equal(extractPatientName('mostra gli ultimi parametri'), null);
});

import { pickResolvedPatient } from '../assistant/plan.js';

test('016 F0: pickResolvedPatient resolves a unique match', () => {
  assert.deepEqual(pickResolvedPatient([{ patientId: 'p1' }]), { patientId: 'p1' });
});

test('016 F0: pickResolvedPatient returns "none" when no match', () => {
  assert.equal(pickResolvedPatient([]), 'none');
});

test('016 F0: pickResolvedPatient returns "ambiguous" for multiple matches', () => {
  assert.equal(pickResolvedPatient([{ patientId: 'p1' }, { patientId: 'p2' }]), 'ambiguous');
});

// ── Agnos KB (Task 5): 8 nuovi intent read + invariante refuse_clinical ───────

test('KB: "com\'è la pressione rispetto a ieri" → vitals_compare (paziente in contesto)', () => {
  const p = planQuery("com'è la pressione rispetto a ieri?", { currentPatientId: P });
  assert.equal(p.intent, 'vitals_compare');
  assert.equal(p.tools[0].tool, 'compare_patient_vitals');
});
test('KB: "andamento della temperatura questa settimana" → vitals_trend', () => {
  const p = planQuery('andamento della temperatura questa settimana', { currentPatientId: P });
  assert.equal(p.intent, 'vitals_trend');
});
test('KB: "quante camere sono occupate oggi" → rooms_occupancy aggregato, no cross access', () => {
  const p = planQuery('quante camere sono occupate oggi');
  assert.equal(p.intent, 'rooms_occupancy');
  assert.equal(p.requiresCrossPatientAccess, false);
});
test('KB: "la camera 12 è occupata da chi" → rooms_occupants con roomNumero', () => {
  const p = planQuery('la camera 12 è occupata da chi?');
  assert.equal(p.intent, 'rooms_occupants');
  assert.equal(p.tools[0].args.roomNumero, '12');
});
test('KB: "che consegne ci sono oggi" → consegne', () => {
  assert.equal(planQuery('che consegne ci sono oggi').intent, 'consegne');
});
test('KB: "cosa è stato scritto ieri nel diario" → diary_notes', () => {
  assert.equal(planQuery('cosa è stato scritto ieri nel diario?', { currentPatientId: P }).intent, 'diary_notes');
});
test('KB: "ultimo punteggio braden" → clinical_scores braden', () => {
  const p = planQuery('ultimo punteggio Braden', { currentPatientId: P });
  assert.equal(p.intent, 'clinical_scores');
  assert.equal(p.tools[0].args.scale, 'braden');
});
test('KB: "chi è di turno oggi" → operators_on_duty', () => {
  assert.equal(planQuery('chi è di turno oggi?').intent, 'operators_on_duty');
});
test('KB invariante: refuse_clinical vince sui nuovi intent', () => {
  assert.equal(planQuery('che terapia dovrei dare per la pressione alta?', { currentPatientId: P }).intent, 'refuse_clinical');
});

// ── KB fix (review findings): rooms_occupants cross-flag + ordine rami vitals ─
test('KB fix: rooms_occupants richiede cross access (nomi = esposizione cross)', () => {
  const p = planQuery('la camera 12 è occupata da chi?');
  assert.equal(p.intent, 'rooms_occupants');
  assert.equal(p.requiresCrossPatientAccess, true);
});
test('KB fix: "andamento della pressione negli ultimi 7 giorni" → vitals_trend (non vitals_recent)', () => {
  const p = planQuery('andamento della pressione negli ultimi 7 giorni', { currentPatientId: P });
  assert.equal(p.intent, 'vitals_trend');
});
test('KB fix: "ultimi parametri" resta vitals_recent (nessuna regressione)', () => {
  const p = planQuery('mostrami gli ultimi parametri', { currentPatientId: P });
  assert.equal(p.intent, 'vitals_recent');
});
