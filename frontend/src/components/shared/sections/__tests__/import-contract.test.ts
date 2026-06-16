import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { sectionsFromNarrative, assertNoLegacyImportArrays, type NarrativeDraft } from '../deriveSections.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const SHARED = resolve(HERE, '..', '..'); // components/shared

const DRAFT: NarrativeDraft = {
  firstName: 'Mario', lastName: 'Bianchi', dateOfBirth: '1948-07-23',
  allergyStatus: 'present', allergiesText: 'Penicillina (grave).',
  diagnosisText: 'Scompenso cardiaco.\nIpertensione.',
  anamnesisText: 'Anamnesi familiare: diabete.',
  hospitalCourseText: 'Il 12/03/2025 ingresso.',
  therapyText: 'Ramipril 5 mg.',
  consultationsText: '', imagingDiagnosticsText: '', proceduresAndInterventionsText: '',
  adviceAndFollowUpText: 'Controllo tra 30 giorni.', unmappedText: '',
  boldTags: [{ sectionKey: 'DIAGNOSI', tagType: 'DATE', text: 'x', startOffset: 0, endOffset: 1 }],
  sourceReferences: [{ sectionKey: 'DIAGNOSI', fileName: 'lettera.pdf', pageFrom: 1 }],
};

test('sectionsFromNarrative maps diagnosisText -> DISCHARGE_DIAGNOSIS block (no diagnoses[])', () => {
  const r = sectionsFromNarrative(DRAFT);
  const diag = r.sections.find((s) => s.sectionKey === 'DISCHARGE_DIAGNOSIS');
  assert.ok(diag, 'diagnosis section present');
  assert.equal(diag!.rawText, 'Scompenso cardiaco.\nIpertensione.');
  // No structured arrays anywhere in the derived result.
  assert.equal((r as Record<string, unknown>).diagnoses, undefined);
  assert.equal(r.allergies.status, 'present');
  assert.equal(r.demographics?.firstName, 'Mario');
});

test('all canonical sections kept (even empty, fillable); allergies surfaced first; empty unmapped dropped', () => {
  const r = sectionsFromNarrative(DRAFT);
  assert.ok(r.sections.find((s) => s.sectionKey === 'CONSULTATIONS'), 'empty canonical section still shown');
  assert.equal(r.sections[0].sectionKey, 'ALLERGIES'); // priority
  assert.equal(r.sections.find((s) => s.sectionKey === 'UNMAPPED_CONTENT'), undefined); // empty unmapped dropped
});

test('assertNoLegacyImportArrays throws on legacy contract, passes on narrative', () => {
  assert.throws(() => assertNoLegacyImportArrays({ diagnoses: [] }), /LEGACY_IMPORT_CONTRACT_DETECTED/);
  assert.throws(() => assertNoLegacyImportArrays({ medications: [{}] }), /LEGACY_IMPORT_CONTRACT_DETECTED/);
  assert.throws(() => assertNoLegacyImportArrays({ allergies: [{}] }), /LEGACY_IMPORT_CONTRACT_DETECTED/);
  assert.doesNotThrow(() => assertNoLegacyImportArrays(DRAFT as unknown as Record<string, unknown>));
});

test('GUARD: the import modal never renders the legacy ImportReviewFull table', () => {
  const modal = readFileSync(resolve(SHARED, 'DischargeImportModal.tsx'), 'utf8');
  assert.ok(!/<ImportReviewFull/.test(modal), 'DischargeImportModal must not render <ImportReviewFull> (legacy table)');
  assert.ok(/ImportSectionsReview/.test(modal), 'DischargeImportModal must render the narrative review');
});
