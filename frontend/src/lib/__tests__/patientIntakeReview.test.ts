import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parsePatientIntakeReview } from '../patientIntakeReview';
const therapy = { name: 'Terapia da verificare', dose: '5 mg', route: '', frequency: '', times: [], notes: 'Originale', reason: 'Da verificare' };
const base = () => ({ draftId: 'confirmed-a', deferredTherapies: [therapy], sourceDocumentIds: ['document-a'] });
const row = (pain: unknown) => ({ draftId: 'draft-a', confirmedAt: null, pain });
test('intake review preserves arbitrary JSON pain and the existing therapy projection', () => {
  for (const pain of [null, false, 0, [], {}, { punteggio: -1, note: '  Originale\n' }, [{ punteggio: 0 }, { unknown: true }]]) {
    const input = { ...base(), legacyPainDrafts: [row(pain)], legacyPainError: null };
    const before = structuredClone(input);
    const result = parsePatientIntakeReview(input);
    assert.deepEqual(result.legacyPainDrafts?.[0].pain, pain);
    assert.deepEqual(result.deferredTherapies, [therapy]);
    assert.deepEqual(input, before);
  }
});
test('legacy pain overflow preserves therapies and never becomes an empty result; only both missing fields use compatibility', () => {
  const old = parsePatientIntakeReview(base());
  assert.deepEqual(old.legacyPainDrafts, []);
  assert.equal(old.legacyPainError, null);
  const overflow = parsePatientIntakeReview({ ...base(), legacyPainDrafts: null, legacyPainError: 'intake_review_legacy_pain_too_large' });
  assert.equal(overflow.legacyPainDrafts, null);
  assert.equal(overflow.legacyPainError, 'intake_review_legacy_pain_too_large');
  assert.deepEqual(overflow.deferredTherapies, [therapy]);
  for (const fields of [
    { legacyPainDrafts: [] }, { legacyPainError: null }, { legacyPainDrafts: null, legacyPainError: null },
    { legacyPainDrafts: [], legacyPainError: 'intake_review_legacy_pain_too_large' },
    { legacyPainDrafts: [], legacyPainError: 'unknown' }, { legacyPainDrafts: {}, legacyPainError: null },
    { legacyPainDrafts: [row(undefined)], legacyPainError: null },
    { legacyPainDrafts: [{ ...row(null), confirmedAt: '2026-02-31T00:00:00.000Z' }], legacyPainError: null },
    { legacyPainDrafts: [row(null), row(0)], legacyPainError: null },
    { legacyPainDrafts: Array.from({ length: 101 }, (_, index) => ({ ...row(null), draftId: String(index) })), legacyPainError: null },
  ]) assert.throws(() => parsePatientIntakeReview({ ...base(), ...fields }));
});
