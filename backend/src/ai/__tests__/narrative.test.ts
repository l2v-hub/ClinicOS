import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildNarrativeDraft, validateNarrativeDraft, NARRATIVE_SCHEMA_VERSION } from '../sections/narrative.js';
import type { SectionsResult } from '../sections/validate.js';
import type { Annotation } from '../sections/validate.js';

function ann(raw: string, text: string, tag: Annotation['tag']): Annotation {
  const i = raw.indexOf(text);
  return { tag, text, startOffset: i, endOffset: i + text.length };
}
function result(parts: Partial<SectionsResult>): SectionsResult {
  return { sections: [], allergies: { status: 'not_documented' }, ...parts } as SectionsResult;
}

test('produces a flat narrative draft — strings, never arrays (no diagnoses[])', () => {
  const d = buildNarrativeDraft(result({
    sections: [{ sectionKey: 'DISCHARGE_DIAGNOSIS', rawText: 'Scompenso cardiaco.\n\nIpertensione.' }],
  }));
  assert.equal(typeof d.diagnosisText, 'string');
  assert.equal(d.diagnosisText, 'Scompenso cardiaco.\n\nIpertensione.');
  // The discharge import must NOT emit structured arrays.
  assert.equal((d as Record<string, unknown>).diagnoses, undefined);
  assert.equal((d as Record<string, unknown>).medications, undefined);
  assert.equal((d as Record<string, unknown>).consultations, undefined);
  assert.equal(d.schemaVersion, NARRATIVE_SCHEMA_VERSION);
});

test('valid draft passes the flat contract schema', () => {
  const d = buildNarrativeDraft(result({ sections: [{ sectionKey: 'DISCHARGE_DIAGNOSIS', rawText: 'BPCO.' }] }));
  const v = validateNarrativeDraft(d);
  assert.equal(v.valid, true, v.errors.join('; '));
});

test('diagnosis multi-paragraph stays one block', () => {
  const raw = 'Diagnosi 1.\n\nDiagnosi 2.\nComorbidità.';
  const d = buildNarrativeDraft(result({ sections: [{ sectionKey: 'DISCHARGE_DIAGNOSIS', rawText: raw }] }));
  assert.equal(d.diagnosisText, raw);
});

test('anamnesis subtitles preserved + tagged as SUBSECTION_TITLE', () => {
  const raw = 'Anamnesi patologica remota: IMA. Anamnesi familiare: diabete.';
  const d = buildNarrativeDraft(result({
    sections: [{ sectionKey: 'ANAMNESIS', rawText: raw, annotations: [ann(raw, 'Anamnesi patologica remota', 'SUBSECTION_TITLE'), ann(raw, 'Anamnesi familiare', 'SUBSECTION_TITLE')] }],
  }));
  assert.equal(d.anamnesisText, raw);
  const tags = d.boldTags.filter((t) => t.sectionKey === 'ANAMNESI');
  assert.equal(tags.length, 2);
  for (const t of tags) assert.equal(d.anamnesisText.slice(t.startOffset, t.endOffset), t.text);
});

test('hospital course keeps dates (DATE tags map exactly)', () => {
  const raw = 'Il 12/03/2025 ingresso. Il 15/03/2025 dimissione.';
  const d = buildNarrativeDraft(result({
    sections: [{ sectionKey: 'HOSPITAL_COURSE', rawText: raw, annotations: [ann(raw, '12/03/2025', 'DATE'), ann(raw, '15/03/2025', 'DATE')] }],
  }));
  assert.equal(d.hospitalCourseText, raw);
  assert.equal(d.boldTags.filter((t) => t.tagType === 'DATE').length, 2);
});

test('consultations / imaging / procedures each one block', () => {
  const d = buildNarrativeDraft(result({
    sections: [
      { sectionKey: 'CONSULTATIONS', rawText: 'Cardio 01/01. Diabeto 02/01.' },
      { sectionKey: 'IMAGING_DIAGNOSTICS', rawText: 'Rx torace. Eco addome.' },
      { sectionKey: 'PROCEDURES_AND_INTERVENTIONS', rawText: 'CVC. Toracentesi.' },
    ],
  }));
  assert.equal(d.consultationsText, 'Cardio 01/01. Diabeto 02/01.');
  assert.equal(d.imagingDiagnosticsText, 'Rx torace. Eco addome.');
  assert.equal(d.proceduresAndInterventionsText, 'CVC. Toracentesi.');
});

test('therapy combines home + hospital into one block (home first), offsets shifted exactly', () => {
  const home = 'Ramipril 5 mg 1 cp.';
  const hosp = 'Furosemide ev.';
  const d = buildNarrativeDraft(result({
    sections: [
      { sectionKey: 'HOSPITAL_THERAPY', rawText: hosp, annotations: [ann(hosp, 'Furosemide', 'MEDICATION_NAME')] },
      { sectionKey: 'DISCHARGE_HOME_THERAPY', rawText: home, annotations: [ann(home, 'Ramipril', 'MEDICATION_NAME')] },
    ],
  }));
  assert.equal(d.therapyText, `${home}\n${hosp}`); // home first
  for (const t of d.boldTags.filter((t) => t.sectionKey === 'TERAPIA')) {
    assert.equal(d.therapyText.slice(t.startOffset, t.endOffset), t.text);
  }
});

test('partially illegible therapy line kept integrally', () => {
  const raw = 'Ramipril 5 mg.\n[ILLEGGIBILE] 1-0-1.';
  const d = buildNarrativeDraft(result({ sections: [{ sectionKey: 'DISCHARGE_HOME_THERAPY', rawText: raw }] }));
  assert.ok(d.therapyText.includes('[ILLEGGIBILE] 1-0-1.'));
});

test('advice and follow-up kept integrally', () => {
  const raw = 'Controllo 30 gg. Dieta iposodica. PS se dispnea.';
  const d = buildNarrativeDraft(result({ sections: [{ sectionKey: 'ADVICE_AND_FOLLOW_UP', rawText: raw }] }));
  assert.equal(d.adviceAndFollowUpText, raw);
});

test('allergies — present/absent/not_documented/unclear faithful', () => {
  const present = buildNarrativeDraft(result({ allergies: { status: 'present', rawText: 'Penicillina.' }, sections: [{ sectionKey: 'ALLERGIES', rawText: 'Penicillina.', annotations: [ann('Penicillina.', 'Penicillina', 'ALLERGY_CRITICAL')] }] }));
  assert.equal(present.allergyStatus, 'present');
  assert.equal(present.allergiesText, 'Penicillina.');
  assert.ok(present.boldTags.some((t) => t.tagType === 'ALLERGY_CRITICAL'));

  assert.equal(buildNarrativeDraft(result({ allergies: { status: 'explicitly_absent' } })).allergyStatus, 'explicitly_absent');
  assert.equal(buildNarrativeDraft(result({})).allergyStatus, 'not_documented');

  const unclear = buildNarrativeDraft(result({ allergies: { status: 'unclear', rawText: 'Allergia a [ILLEGGIBILE]' } }));
  assert.equal(unclear.allergyStatus, 'unclear');
  assert.equal(unclear.allergiesText, 'Allergia a [ILLEGGIBILE]');
});

test('unmapped content not lost; missing sections listed', () => {
  const d = buildNarrativeDraft(result({ sections: [{ sectionKey: 'UNMAPPED_CONTENT', rawText: 'Timbro reparto.' }] }));
  assert.equal(d.unmappedText, 'Timbro reparto.');
  assert.ok(d.missingSections.includes('DIAGNOSI'));
  assert.ok(!d.missingSections.includes('CONTENUTO_NON_CLASSIFICATO'));
});

test('all canonical text fields always exist as strings (empty when absent)', () => {
  const d = buildNarrativeDraft(result({}));
  for (const f of ['diagnosisText', 'anamnesisText', 'hospitalCourseText', 'consultationsText', 'imagingDiagnosticsText', 'proceduresAndInterventionsText', 'therapyText', 'adviceAndFollowUpText', 'unmappedText', 'allergiesText'] as const) {
    assert.equal(typeof d[f], 'string');
  }
  assert.equal(validateNarrativeDraft(d).valid, true);
});
