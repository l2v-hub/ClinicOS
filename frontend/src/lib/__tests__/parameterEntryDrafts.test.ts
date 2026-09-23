import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createParameterDraftStore } from '../parameterEntryDrafts';

test('draft values and notes survive unsubscribe/remount and remain isolated by patient ID', () => {
  const store = createParameterDraftStore();
  let changes = 0;
  const leave = store.subscribe('patient-a', () => changes++);
  store.update('patient-a', 'spo2', '97');
  store.update('patient-a', 'note', 'Nota sintetica');
  store.toggleNotes('patient-a');
  leave();
  store.update('patient-b', 'spo2', '94');
  assert.equal(changes, 3);
  assert.deepEqual(store.get('patient-a').values, { spo2: '97', note: 'Nota sintetica' });
  assert.equal(store.get('patient-a').notesOpen, true);
  assert.deepEqual(store.get('patient-b').values, { spo2: '94' });
});

test('in-flight and uncertain saves preserve the same body/id/time across remount and prevent duplicate send', () => {
  const store = createParameterDraftStore();
  store.update('a', 'fc', '72');
  store.update('a', 'note', 'Sintetico');
  const first = store.begin('a')!;
  assert.equal(store.begin('a'), null);
  store.fail(first, 'Risposta persa', true);
  store.update('a', 'fc', '80');
  assert.equal(store.get('a').values.fc, '72');
  const retry = store.begin('a')!;
  assert.equal(retry.request, first.request);
  assert.deepEqual(retry.request, first.request);
  assert.equal(store.get('a').uncertain, true);
  store.succeed(retry, '2026-09-23T08:00:00Z');
  assert.deepEqual(store.get('a').values, {});
  assert.equal(store.get('a').pending, null);
  assert.equal(store.get('a').uncertain, false);
});

test('verified failure permits correction with a fresh request, never clearing another patient draft', () => {
  const store = createParameterDraftStore();
  store.update('a', 'fc', '72');
  store.update('b', 'fc', '82');
  const first = store.begin('a')!;
  store.fail(first, 'Validation failed', false);
  store.update('a', 'fc', '73');
  const retry = store.begin('a')!;
  assert.notEqual(retry.request.requestId, first.request.requestId);
  store.succeed(first, '2026-09-23T08:00:00Z');
  assert.equal(store.get('a').saving, true);
  store.succeed(retry, '2026-09-23T08:01:00Z');
  assert.equal(store.get('b').values.fc, '82');
});

test('workspace/session cleanup rejects late responses even when the same patient ID returns', () => {
  const store = createParameterDraftStore();
  store.update('a', 'spo2', '97');
  const old = store.begin('a')!;
  store.clear();
  store.update('a', 'spo2', '94');
  store.succeed(old, '2026-09-23T08:00:00Z');
  store.fail(old, 'late failure', true);
  assert.equal(store.get('a').values.spo2, '94');
  assert.equal(store.get('a').uncertain, false);
  assert.equal(store.get('a').error, '');
  assert.deepEqual(createParameterDraftStore().get('a').values, {});
});
