import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { acknowledgeDerivedSex, pendingDerivedSex } from '../intakeSexReview';
import { StepAnagrafica } from '../StepAnagrafica';
const seeded = {
  anagrafica: { sex: 'M', codiceFiscale: 'RSSMRA80A01H501U' },
  _derivedFields: {
    anagrafica: { sex: { source: 'codiceFiscale', value: 'M', reviewRequired: true } },
  },
};
test('CF-only server seed displays review provenance until explicit acknowledgement, preserving provenance', () => {
  assert.equal(pendingDerivedSex(seeded), true);
  const markup = renderToStaticMarkup(
    createElement(StepAnagrafica, {
      value: seeded.anagrafica,
      derivedSexPending: pendingDerivedSex(seeded),
      onChange() {},
      onConfirmDerivedSex() {},
    }),
  );
  assert.match(markup, /Sesso dal codice fiscale, da verificare/);
  assert.match(markup, /Conferma sesso/);
  const acknowledged = acknowledgeDerivedSex(seeded);
  assert.equal(pendingDerivedSex(acknowledged), false);
  assert.equal(seeded._derivedFields.anagrafica.sex.reviewRequired, true);
  assert.equal(
    (acknowledged._derivedFields as typeof seeded._derivedFields).anagrafica.sex.source,
    'codiceFiscale',
  );
});
test('operator edit hides pending provenance; explicit contradictory sex remains selected and warned', () => {
  const explicit = { ...seeded, anagrafica: { ...seeded.anagrafica, sex: 'F' } };
  assert.equal(pendingDerivedSex(explicit), false);
  const markup = renderToStaticMarkup(
    createElement(StepAnagrafica, { value: explicit.anagrafica, onChange() {} }),
  );
  assert.match(markup, /value="F" selected=""/);
  assert.match(markup, /diverso da quello del codice fiscale/);
  assert.equal(pendingDerivedSex({}), false);
});
