import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearSessionCache,
  invalidateSessionCache,
  readSessionCache,
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
