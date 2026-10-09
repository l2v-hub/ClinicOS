// Viste della lista pazienti: in carico / dimessi / tutti; lo stato non noto resta in carico.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countListViews, matchesListView, unknownStateCount } from '../patientListView';

test('Non dimessi keeps admitted, day hospital and unknown state; excludes discharged', () => {
  assert.equal(matchesListView('ricoverato', 'in_carico'), true);
  assert.equal(matchesListView('day_hospital' as 'ricoverato', 'in_carico'), true);
  assert.equal(matchesListView(undefined, 'in_carico'), true);
  assert.equal(matchesListView(null, 'in_carico'), true);
  assert.equal(matchesListView('dimesso', 'in_carico'), false);
});

test('Dimessi e archivio shows only discharged; Tutti shows everyone', () => {
  assert.equal(matchesListView('dimesso', 'dimessi'), true);
  assert.equal(matchesListView('ricoverato', 'dimessi'), false);
  assert.equal(matchesListView(undefined, 'dimessi'), false);
  for (const s of ['ricoverato', 'dimesso', undefined] as const)
    assert.equal(matchesListView(s, 'tutti'), true);
});

test('counts add up when every state is known', () => {
  const stato: Record<string, 'ricoverato' | 'dimesso'> = {
    a: 'ricoverato',
    b: 'dimesso',
    c: 'ricoverato',
    d: 'dimesso',
  };
  assert.deepEqual(
    countListViews(Object.keys(stato), (id) => stato[id]),
    { in_carico: 2, dimessi: 2, tutti: 4 },
  );
});

test('with any unknown state the Non dimessi/Dimessi counts are not verifiable (null), never a false zero', () => {
  const stato: Record<string, 'ricoverato' | 'dimesso' | undefined> = {
    a: 'ricoverato',
    b: 'dimesso',
    c: undefined,
  };
  assert.deepEqual(
    countListViews(Object.keys(stato), (id) => stato[id]),
    { in_carico: null, dimessi: null, tutti: 3 },
  );
  assert.equal(
    unknownStateCount(Object.keys(stato), (id) => stato[id]),
    1,
  );
});
