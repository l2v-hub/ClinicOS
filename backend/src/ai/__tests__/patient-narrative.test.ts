import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NARRATIVE_SECTION_KEYS, NARRATIVE_TITLES, pickDisplayText, narrativeDraftToSectionRows,
} from '../sections/patient-narrative.js';
import { buildNarrativeDraft } from '../sections/narrative.js';
import type { SectionsResult } from '../sections/validate.js';

function result(parts: Partial<SectionsResult>): SectionsResult {
  return { sections: [], allergies: { status: 'not_documented' }, ...parts } as SectionsResult;
}

test('10 canonical persistence keys with Italian titles', () => {
  assert.equal(NARRATIVE_SECTION_KEYS.length, 10);
  assert.equal(NARRATIVE_TITLES.DIAGNOSIS, 'Diagnosi');
  assert.equal(NARRATIVE_TITLES.THERAPY, 'Terapia');
  assert.ok(NARRATIVE_SECTION_KEYS.includes('UNMAPPED_CONTENT'));
});

test('displayText = reviewedText when present, else originalText', () => {
  assert.equal(pickDisplayText('orig', 'rev'), 'rev');
  assert.equal(pickDisplayText('orig', ''), 'orig');
  assert.equal(pickDisplayText('orig', '   '), 'orig'); // whitespace-only edit ignored
});

test('narrative draft maps to rows: diagnosisText -> DIAGNOSIS.originalText (no arrays)', () => {
  const draft = buildNarrativeDraft(result({ sections: [{ sectionKey: 'DISCHARGE_DIAGNOSIS', rawText: 'Scompenso.\nIpertensione.' }] }));
  const rows = narrativeDraftToSectionRows(draft);
  const diag = rows.find((r) => r.sectionKey === 'DIAGNOSIS')!;
  assert.equal(diag.originalText, 'Scompenso.\nIpertensione.');
  assert.equal(diag.reviewStatus, 'pending');
  assert.equal(rows.length, 10);
});

test('empty sections map to reviewStatus "absent"', () => {
  const rows = narrativeDraftToSectionRows(buildNarrativeDraft(result({})));
  assert.ok(rows.find((r) => r.sectionKey === 'DIAGNOSIS')!.reviewStatus === 'absent');
});

test('annotations are routed to their section by italian key', () => {
  const raw = 'Anamnesi familiare: diabete.';
  const draft = buildNarrativeDraft(result({
    sections: [{ sectionKey: 'ANAMNESIS', rawText: raw, annotations: [{ tag: 'SUBSECTION_TITLE', text: 'Anamnesi familiare', startOffset: 0, endOffset: 18 }] }],
  }));
  const rows = narrativeDraftToSectionRows(draft);
  const anam = rows.find((r) => r.sectionKey === 'ANAMNESIS')!;
  assert.equal(anam.annotations.length, 1);
  assert.equal(rows.find((r) => r.sectionKey === 'DIAGNOSIS')!.annotations.length, 0);
});

test('allergy conflict/unclear -> reviewStatus conflict (blocks silent save)', () => {
  const conflict = narrativeDraftToSectionRows(buildNarrativeDraft(result({ allergies: { status: 'conflicting', rawText: 'A vs B' } })));
  assert.equal(conflict.find((r) => r.sectionKey === 'ALLERGIES')!.reviewStatus, 'conflict');
  const unclear = narrativeDraftToSectionRows(buildNarrativeDraft(result({ allergies: { status: 'unclear', rawText: '[ILLEGGIBILE]' } })));
  assert.equal(unclear.find((r) => r.sectionKey === 'ALLERGIES')!.reviewStatus, 'conflict');
});

// BUG-040/041/042: a multi-line narrative diagnosis must stay ONE faithful text block —
// never exploded into N structured rows, never given inferred type/status, never an ICD field.
test('BUG-040/041/042: multi-line diagnosis -> ONE narrative block, no structured fields', () => {
  const multiLine = [
    'Scompenso cardiaco congestizio.',
    'Ipertensione arteriosa.',
    'Diabete mellito tipo 2.',
    'Insufficienza renale cronica.',
  ].join('\n');
  const draft = buildNarrativeDraft(result({ sections: [{ sectionKey: 'DISCHARGE_DIAGNOSIS', rawText: multiLine }] }));
  const rows = narrativeDraftToSectionRows(draft);
  // exactly the 10 canonical narrative sections — NOT one row per diagnosis line (no "36 rows")
  assert.equal(rows.length, 10);
  const diag = rows.find((r) => r.sectionKey === 'DIAGNOSIS')!;
  // the whole text is preserved verbatim in a single originalText block
  assert.equal(diag.originalText, multiLine);
  // no inferred clinical classification leaked onto the row (BUG-041) and no ICD field (BUG-042)
  const keys = Object.keys(diag);
  for (const forbidden of ['type', 'status', 'tipo', 'stato', 'icd', 'icdCode', 'priority']) {
    assert.ok(!keys.includes(forbidden), `row must not carry inferred field "${forbidden}"`);
  }
  // the draft itself never carries a structured diagnoses array (BUG-040)
  assert.equal((draft as Record<string, unknown>).diagnoses, undefined);
});

test('therapy combined block maps to THERAPY.originalText', () => {
  const draft = buildNarrativeDraft(result({
    sections: [
      { sectionKey: 'DISCHARGE_HOME_THERAPY', rawText: 'Ramipril 5 mg.' },
      { sectionKey: 'HOSPITAL_THERAPY', rawText: 'Furosemide ev.' },
    ],
  }));
  const therapy = narrativeDraftToSectionRows(draft).find((r) => r.sectionKey === 'THERAPY')!;
  assert.ok(therapy.originalText.includes('Ramipril 5 mg.'));
  assert.ok(therapy.originalText.includes('Furosemide ev.'));
});
