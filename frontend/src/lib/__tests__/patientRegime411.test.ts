import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { LIST_VIEW_LABEL, countListViews, matchesListView } from '../patientListView';
import { PATIENT_REGIME_LABEL, patientRegime, matchesPatientRegime } from '../patientRegime';

test('411 broad view describes the exact non-discharged predicate, not admission', () => {
  assert.equal(LIST_VIEW_LABEL.in_carico, 'Non dimessi');
  for (const state of ['ricoverato', 'day_hospital', 'ambulatoriale', null, undefined, '', 'legacy']) {
    assert.equal(matchesListView(state, 'in_carico'), true);
    assert.equal(matchesListView(state, 'dimessi'), false);
  }
  assert.equal(matchesListView('dimesso', 'in_carico'), false);
});

test('411 canonical regimes match strictly and have human readable labels', () => {
  const regimes = ['ricoverato', 'day_hospital', 'ambulatoriale', 'dimesso'] as const;
  for (const state of regimes) {
    assert.equal(patientRegime(state), state);
    for (const filter of regimes) assert.equal(matchesPatientRegime(state, filter), state === filter);
    assert.equal(matchesPatientRegime(state, 'non_disponibile'), false);
    assert.equal(matchesPatientRegime(state, 'tutti'), true);
  }
  assert.equal(PATIENT_REGIME_LABEL.day_hospital, 'Day Hospital');
  assert.equal(PATIENT_REGIME_LABEL.ambulatoriale, 'Ambulatoriale');
});

test('411 missing/unsupported runtime regime never becomes admitted or discharged', () => {
  for (const state of [null, undefined, '', ' ', 'RICOVERATO', 'ricoverato ', 'legacy', '__proto__']) {
    assert.equal(patientRegime(state), 'non_disponibile');
    assert.equal(matchesPatientRegime(state, 'non_disponibile'), true);
    assert.equal(matchesPatientRegime(state, 'ricoverato'), false);
    assert.equal(matchesPatientRegime(state, 'dimesso'), false);
  }
});

test('411 contextual view counts agree with each exact rendered intersection', () => {
  const states: Record<string, string> = { a: 'ricoverato', b: 'day_hospital', c: 'ambulatoriale', d: 'dimesso' };
  for (const regime of ['tutti', 'ricoverato', 'day_hospital', 'ambulatoriale', 'dimesso'] as const) {
    const ids = Object.keys(states).filter(id => matchesPatientRegime(states[id], regime));
    const counts = countListViews(ids, id => states[id]);
    for (const view of ['in_carico', 'dimessi', 'tutti'] as const) {
      assert.equal(counts[view], ids.filter(id => matchesListView(states[id], view)).length);
    }
  }
});

test('411 state counts remain unverified for malformed or unavailable regimes', () => {
  for (const state of [null, undefined, '', 'legacy']) {
    assert.deepEqual(countListViews(['a', 'b'], id => id === 'a' ? 'ricoverato' : state),
      { in_carico: null, dimessi: null, tutti: 2 });
  }
});

test('411 KPI and dashboard copy describe the broad set without changing navigation key', () => {
  const kpi = readFileSync(new URL('../../components/operator/OperatorClinicalKpiBand.tsx', import.meta.url), 'utf8');
  const dashboard = readFileSync(new URL('../../components/operator/OperatorDashboard.tsx', import.meta.url), 'utf8');
  assert.match(kpi, /label: LIST_VIEW_LABEL.in_carico/);
  assert.match(kpi, /Apri i pazienti non dimessi/);
  assert.match(kpi, /view: 'in_carico'/);
  assert.match(kpi, /Senza dimissione registrata/);
  assert.doesNotMatch(dashboard, /\? 'ricoverato' : 'ricoverati'/);
});
