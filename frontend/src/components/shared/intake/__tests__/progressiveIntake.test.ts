import assert from 'node:assert/strict';
import test from 'node:test';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StepVerifica } from '../StepVerifica';
import { buildIntakeTherapyReview, prepareIntakeConfirmData } from '../intakeTherapies';
import type { DischargeTherapyRow } from '../dischargeTherapy';
Object.assign(globalThis, { React });

const imported: DischargeTherapyRow = {
  farmacoNome: 'Terapia sintetica',
  forma: 'compressa',
  dosaggio: '10 mg',
  viaSomministrazione: 'OS',
  quantita: '1',
  orari: ['08:00'],
  giorni: [],
  dataInizio: '2026-09-23',
  classe: '',
  note: '',
  originalText: 'Riga originale sintetica',
  stato: 'da_verificare',
};
const base = {
  anagrafica: { firstName: 'Ada', lastName: 'Rossi' },
  _accepted: { demographics: true, therapy: true },
};
function reviewMarkup(data: Record<string, unknown>) {
  return renderToStaticMarkup(
    createElement(StepVerifica, {
      data,
      busy: false,
      error: null,
      onConfirm() {},
      onUpdateSection() {},
      onReviewDemographics() {},
    }),
  );
}

test('accepted minimal demographics can create patient and missing fields remain actionable', () => {
  const markup = reviewMarkup(base);
  assert.match(markup, /Anagrafica da completare/);
  for (const field of ['Data di nascita', 'Codice fiscale', 'Telefono'])
    assert.ok(markup.includes(`>${field}</button>`));
  assert.match(markup, /class="btn-success"[^>]*>/);
  assert.doesNotMatch(markup, /class="btn-success"[^>]*disabled/);
});

test('unverified imported therapy still blocks confirmation until explicitly excluded', () => {
  const rows = buildIntakeTherapyReview({ terapiaImport: [imported] });
  assert.equal(rows[0].requiresSourceReview, true);
  assert.ok(rows[0].issues.length > 0);
  assert.match(
    reviewMarkup({ ...base, terapiaImport: [imported] }),
    /class="btn-success"[^>]*disabled/,
  );
  const deferred = { ...imported, excludedFromConfirm: true };
  const selected = buildIntakeTherapyReview({ terapiaImport: [deferred] }).filter(
    (row) => !row.excluded,
  );
  assert.deepEqual(selected, []);
  assert.equal(deferred.originalText, imported.originalText);
  const markup = reviewMarkup({ ...base, terapiaImport: [deferred] });
  assert.match(markup, /Terapie che restano in bozza/);
  assert.match(markup, /non saranno somministrabili/);
  assert.doesNotMatch(markup, /class="btn-success"[^>]*disabled/);
});

test('source mapping preserves original indexes after an excluded row', () => {
  const source = [
    { ...imported, excludedFromConfirm: true },
    { ...imported, stato: 'ok' as const },
  ];
  const snapshot = JSON.stringify(source);
  const review = buildIntakeTherapyReview({ terapiaImport: source });
  assert.deepEqual(review.filter((row) => !row.excluded)[0].input.intakeSource, {
    type: 'import',
    index: 1,
  });
  assert.equal(JSON.stringify(source), snapshot);
});

test('confirmation persists a full review snapshot without certifying or changing original therapy data', () => {
  const source = { terapiaImport: [imported, { ...imported, excludedFromConfirm: true }] };
  const snapshot = JSON.stringify(source);
  const prepared = prepareIntakeConfirmData(source);
  assert.ok(prepared.terapiaImport[0].reviewedTherapy);
  assert.equal(prepared.terapiaImport[0].stato, 'da_verificare');
  assert.equal(prepared.terapiaImport[0].originalText, imported.originalText);
  assert.equal(prepared.terapiaImport[1].reviewedTherapy, undefined);
  assert.equal(JSON.stringify(source), snapshot);
  const { dosaggio: legacyDose, ...legacyMapped } = buildIntakeTherapyReview(source)[0].input;
  assert.equal(prepared.terapiaImport[0].dosaggio, legacyDose);
  assert.deepEqual(buildIntakeTherapyReview(prepared)[0].input, legacyMapped);
  assert.equal(buildIntakeTherapyReview(prepared)[0].requiresSourceReview, true);
});
