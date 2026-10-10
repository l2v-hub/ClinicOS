import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearSessionCache,
  invalidateSessionCache,
  pendingSessionCache,
  readSessionCache,
  sessionCacheEpoch,
  trackSessionCache,
  writeSessionCache,
} from '../sessionCache';
import {
  assessmentsCacheKey,
  diaryCacheKey,
  narrativeCacheKey,
  sortTherapiesByState,
  therapyListCacheKey,
} from '../patientTabSnapshots';
import type { PatientTherapyAPI } from '../../types';

test('session cache stores, reads, invalidates by prefix and clears everything', () => {
  clearSessionCache();
  writeSessionCache('patient-list:a', { rows: 1 });
  writeSessionCache('patient-list:b', { rows: 2 });
  writeSessionCache('diary:p1:tutti', { entries: [] });
  assert.deepEqual(readSessionCache('patient-list:a'), { rows: 1 });
  assert.equal(readSessionCache('missing'), undefined);

  invalidateSessionCache('patient-list:');
  assert.equal(readSessionCache('patient-list:a'), undefined);
  assert.equal(readSessionCache('patient-list:b'), undefined);
  assert.deepEqual(readSessionCache('diary:p1:tutti'), { entries: [] });

  // Logout must leave nothing behind: the next operator never sees the previous one's data.
  clearSessionCache();
  assert.equal(readSessionCache('diary:p1:tutti'), undefined);
});

test('a late read from the previous session cannot repopulate any clinical snapshot', async () => {
  clearSessionCache();
  const epoch = sessionCacheEpoch();
  let complete!: (value: string) => void;
  const pending = new Promise<string>((resolve) => (complete = resolve));
  trackSessionCache('narrative:p1', pending, epoch);
  const publish = pending.then((value) => writeSessionCache('narrative:p1', value, epoch));
  clearSessionCache();
  writeSessionCache('narrative:p1', 'current session');
  complete('previous session');
  await publish;
  assert.equal(readSessionCache('narrative:p1'), 'current session');
  assert.equal(pendingSessionCache('narrative:p1'), undefined);
  trackSessionCache('old idle task', pending, epoch);
  assert.equal(pendingSessionCache('old idle task'), undefined);
});

test('an in-flight prefetch is exposed while pending, never rejects, and is dropped when done', async () => {
  clearSessionCache();
  let resolve!: (v: unknown) => void;
  const read = new Promise((r) => (resolve = r));
  trackSessionCache('narrative:p1', read);
  const waiter = pendingSessionCache('narrative:p1');
  assert.ok(waiter, 'pending promise exposed while the read is in flight');
  resolve({ ok: true });
  await waiter;
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(pendingSessionCache('narrative:p1'), undefined);

  // A failed prefetch must not surface as a rejection to the tab awaiting it.
  const failing = Promise.reject(new Error('rete'));
  trackSessionCache('diary:p1:tutti', failing);
  await assert.doesNotReject(pendingSessionCache('diary:p1:tutti')!);
  await new Promise((r) => setTimeout(r, 0));
  clearSessionCache();
  assert.equal(pendingSessionCache('diary:p1:tutti'), undefined);
});

test('tab snapshot keys are scoped per patient and per query so no patient sees another chart', () => {
  assert.notEqual(therapyListCacheKey('p1', {}), therapyListCacheKey('p2', {}));
  assert.notEqual(therapyListCacheKey('p1', {}), therapyListCacheKey('p1', { q: 'x' }));
  assert.notEqual(diaryCacheKey('p1', 'tutti'), diaryCacheKey('p1', 'medico'));
  assert.notEqual(narrativeCacheKey('p1'), narrativeCacheKey('p2'));
  assert.notEqual(assessmentsCacheKey('p1'), assessmentsCacheKey('p2'));
  // Prefetch and tab share the very same key builders (same module), so a prefetched entry is
  // exactly what the tab reads back.
  assert.equal(therapyListCacheKey('p1', {}), 'therapies:p1:{}');
});

test('therapy snapshot ordering matches the tab: active, then suspended, then concluded', () => {
  const t = (id: string, stato: PatientTherapyAPI['stato']) => ({ id, stato }) as PatientTherapyAPI;
  const sorted = sortTherapiesByState([t('c', 'conclusa'), t('a', 'attiva'), t('s', 'sospesa')]);
  assert.deepEqual(
    sorted.map((x) => x.id),
    ['a', 's', 'c'],
  );
});
