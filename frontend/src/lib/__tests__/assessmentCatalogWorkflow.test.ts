import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAssessmentCatalogState } from '../assessments/assessmentCatalogState';
import { CATALOG_TYPES, type AssessmentCatalogData } from '../assessments/assessmentCatalog';
import { ASSESSMENT_VERSIONS } from '../assessments/assessmentTypes';
const empty = (): AssessmentCatalogData => ({ items: CATALOG_TYPES.map(type => ({ type, formVersion: ASSESSMENT_VERSIONS[type], latestFinal: null, ownDraftCount: 0, latestOwnDraft: null })) });
const deferred = () => { let resolve!: (value: AssessmentCatalogData) => void; let reject!: (error: Error) => void; const promise = new Promise<AssessmentCatalogData>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

test('catalog error is explicit, retry reloads once, and a stale response cannot replace the newer request', async () => {
  const first = deferred(), second = deferred(), third = deferred();
  const queue = [first, second, third];
  const signals: AbortSignal[] = [];
  const state = createAssessmentCatalogState(signal => { signals.push(signal); return queue.shift()!.promise; });
  const original = state.load();
  assert.equal(state.getSnapshot().status, 'loading');
  first.reject(new Error('Unavailable'));
  await original;
  assert.deepEqual(state.getSnapshot(), { status: 'error', data: null, error: 'Unavailable' });
  const retry = state.load();
  const newest = state.load();
  assert.equal(signals[1].aborted, true);
  const data = empty();
  third.resolve(data);
  await newest;
  second.resolve(empty());
  await retry;
  assert.equal(state.getSnapshot().data, data);
  assert.equal(signals.length, 3);
});

test('leaving the patient/session cancels pending metadata and does not publish into the next session', async () => {
  const old = deferred();
  let published = 0;
  const state = createAssessmentCatalogState(() => old.promise);
  const unsubscribe = state.subscribe(() => { published++; });
  const pending = state.load();
  const fresh = createAssessmentCatalogState(async () => empty());
  state.dispose();
  await fresh.load();
  old.resolve(empty());
  await pending;
  assert.equal(state.getSnapshot().status, 'loading');
  assert.equal(published, 1);
  assert.equal(fresh.getSnapshot().status, 'ready');
  unsubscribe();
  fresh.dispose();
});
