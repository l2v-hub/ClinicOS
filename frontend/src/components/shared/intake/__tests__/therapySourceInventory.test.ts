import assert from 'node:assert/strict';
import { test } from 'node:test';
import { therapySourceInventory } from '../../../../../../backend/src/intake/therapy-source-inventory';
import { dischargeRowToTherapyForm, therapyFormToDischargeRow, type DischargeTherapyRow } from '../dischargeTherapy';
import { buildIntakeTherapyReview, prepareIntakeConfirmData } from '../intakeTherapies';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TherapyImportSource } from '../TherapyImportSource';
import { ImportProposalsReview } from '../ImportProposalsReview';
import { IntakeTherapySummary } from '../IntakeTherapySummary';
Object.assign(globalThis, { React });

const extracted = { nome: 'Beta', dose: '25 mg', frequenza: 'al bisogno', via: 'orale', stato: 'sospeso', note: '<script>non eseguire</script>' };
const candidate = () => therapySourceInventory('', [extracted])[0] as unknown as DischargeTherapyRow;

test('structured-only candidates have no inferred active state, administration dose, time or start date', () => {
  const row = candidate(), form = dischargeRowToTherapyForm(row);
  assert.equal(form.farmacoNome, 'Beta');
  assert.equal(form.stato, '');
  assert.equal(form.viaSomministrazione, '');
  assert.equal(form.dataInizio, '');
  assert.equal(form.commercialStrengthValue, '');
  assert.deepEqual(form.schedules, []);
  const [review] = buildIntakeTherapyReview({ terapiaImport: [row] });
  assert.ok(review.requiresSourceReview);
  assert.ok(review.diagnostics.some(d => d.field === 'stato'));
  assert.ok(review.diagnostics.some(d => d.field === 'dataInizio'));
  assert.deepEqual(review.structuredSource, extracted);
  assert.equal(review.originalText, '');
});

test('edits and browser draft reload retain immutable extraction and identity', () => {
  const row = candidate();
  const edited = { ...dischargeRowToTherapyForm(row), farmacoNome: 'Beta verificata',
    stato: 'sospesa' as const, note: 'revisione sintetica' };
  const saved = JSON.parse(JSON.stringify(therapyFormToDischargeRow(edited, row)));
  assert.equal(saved.importRowKey, row.importRowKey);
  assert.equal(saved.sourceKind, 'structured');
  assert.deepEqual(saved.structuredSource, extracted);
  assert.equal(saved.originalText, '');
  assert.equal(saved.stato, 'da_verificare');
  assert.deepEqual(dischargeRowToTherapyForm(saved), edited);
});

test('explicit exclusion retains extracted evidence in draft and summary, not a prescription', () => {
  const row = { ...candidate(), excludedFromConfirm: true };
  const prepared = prepareIntakeConfirmData({ terapiaImport: [row] });
  const [review] = buildIntakeTherapyReview(prepared);
  assert.equal(review.excluded, true);
  assert.deepEqual(review.structuredSource, extracted);
  assert.equal(prepared.terapiaImport[0].reviewedTherapy, undefined);
});

test('same-name different extractions remain separate through review projection and reload', () => {
  const rows = therapySourceInventory('', [extracted, { ...extracted, dose: '50 mg' }]);
  const reviews = buildIntakeTherapyReview(JSON.parse(JSON.stringify({ terapiaImport: rows })));
  assert.equal(reviews.length, 2);
  assert.deepEqual(reviews.map(r => r.structuredSource), [extracted, { ...extracted, dose: '50 mg' }]);
  assert.ok(reviews.every(r => r.requiresSourceReview && !r.excluded));
});

test('review, proposals and summary render escaped extraction distinctly from verbatim text', () => {
  const row = candidate(), [review] = buildIntakeTherapyReview({ terapiaImport: [row] });
  const surfaces = [
    React.createElement(TherapyImportSource, { row }),
    React.createElement(ImportProposalsReview, { proposals: [{ id: 'p1', groupId: 'g1', inputHash: 'h1', row, status: 'pending' }], busy: false, onDecision() {} }),
    React.createElement(IntakeTherapySummary, { therapy: review, busy: false }),
  ];
  for (const surface of surfaces) {
    const html = renderToStaticMarkup(surface);
    assert.match(html, /Dati estratti automaticamente/);
    assert.match(html, /confronta il documento/);
    assert.match(html, /25 mg/);
    assert.match(html, /sospeso/);
    assert.doesNotMatch(html, /<script>|Dal documento:/);
    assert.match(html, /&lt;script&gt;/);
  }
});
