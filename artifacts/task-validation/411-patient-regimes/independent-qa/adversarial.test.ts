import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { patientRegime, matchesPatientRegime, PATIENT_REGIME_LABEL } from '../../../../frontend/src/lib/patientRegime';
import { matchesListView, countListViews, unknownStateCount } from '../../../../frontend/src/lib/patientListView';
import { PatientRegimeControls } from '../../../../frontend/src/components/operator/PatientRegimeControls';

test('independent411 exhaustive regime/view intersections preserve unknown rather than fabricate admission', () => {
  const canonical = ['ricoverato', 'day_hospital', 'ambulatoriale', 'dimesso'];
  const unknown = [null, undefined, '', ' ', 'legacy', 'Ricoverato', 'day_hospital ', '__proto__', '<img src=x onerror=alert(1)>'];
  const states = [...canonical, ...unknown];
  for (const filter of Object.keys(PATIENT_REGIME_LABEL)) {
    for (const state of states) {
      const classification = canonical.includes(state as string) ? state : 'non_disponibile';
      assert.equal(patientRegime(state), classification);
      assert.equal(matchesPatientRegime(state, filter as any), filter === 'tutti' || filter === classification);
      for (const view of ['in_carico', 'dimessi', 'tutti'] as const) {
        const expected = view === 'tutti' || (view === 'dimessi' ? state === 'dimesso' : state !== 'dimesso');
        assert.equal(matchesListView(state, view), expected);
      }
    }
  }
});

test('independent411 known counters equal strict rendered predicates; one absent regime invalidates only state counters', () => {
  for (let size = 0; size < 30; size++) {
    const ids = Array.from({ length: size }, (_, i) => `${i}`);
    const stateOf = (id: string) => ['ricoverato', 'dimesso', 'day_hospital', 'ambulatoriale'][Number(id) % 4];
    const counts = countListViews(ids, stateOf);
    for (const view of ['in_carico', 'dimessi', 'tutti'] as const) {
      assert.equal(counts[view], ids.filter(id => matchesListView(stateOf(id), view)).length);
    }
    assert.equal(unknownStateCount(ids, stateOf), 0);
    const withUnknown = [...ids, 'unknown'];
    const unknownOf = (id: string) => id === 'unknown' ? undefined : stateOf(id);
    assert.deepEqual(countListViews(withUnknown, unknownOf), { in_carico: null, dimessi: null, tutti: size + 1 });
    assert.equal(unknownStateCount(withUnknown, unknownOf), 1);
  }
});

test('independent411 rendered control announces scope/loading, never implies clinical state of missing data', () => {
  const base = { regime: 'non_disponibile' as const, onChange: () => {}, view: 'in_carico' as const, count: 0, loaded: 50, hasMore: true, unverified: true, loading: true };
  const html = renderToStaticMarkup(React.createElement(PatientRegimeControls, base));
  assert.match(html, /for="patient-regime"/);
  assert.match(html, /id="patient-regime"/);
  assert.match(html, /value="non_disponibile" selected=""/);
  assert.match(html, /0 visualizzati su 50 pazienti caricati/);
  assert.match(html, /Altri pazienti non ancora caricati/);
  assert.match(html, /Verifica regimi in corso/);
  assert.match(html, /Un dato mancante non conferma il regime/);
  assert.match(html, /aria-live="polite" role="status"/);
  const recovered = renderToStaticMarkup(React.createElement(PatientRegimeControls, { ...base, view: 'dimessi', regime: 'dimesso', loading: false, unverified: false, hasMore: false, count: 1 }));
  assert.doesNotMatch(recovered, /Non dimessi:|Verifica regimi|Altri pazienti/);
});
