// Source contract for the "attesa quasi nulla" navigation work: pages keep their last data on
// screen while revalidating, route chunks are preloaded after login, and every session cache is
// dropped at logout. These guards keep a future refactor from silently reintroducing the
// "Caricamento…" round trip on every context switch.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const app = read('../../App.tsx');
const listPage = read('../../components/operator/usePatientListPage.ts');
const lazyTabs = read('../../components/operator/PatientDetailLazyTabs.tsx');
const patientDetail = read('../../components/operator/PatientDetail.tsx');
const roster = read('../../components/operator/PatientRoster.tsx');

test('route chunks are preloaded after login and navigation runs in a transition', () => {
  assert.match(app, /const routeLoaders = \{/);
  assert.match(app, /function preloadRouteModules\(\)/);
  assert.match(app, /if \(!utente\) return;\s*preloadRouteModules\(\);/);
  assert.match(app, /preloadPatientDetailTabs\(\)/);
  assert.match(lazyTabs, /export async function preloadPatientDetailTabs\(\)/);
  // pushNav and popstate commit navKey inside startTransition: the previous page stays visible
  // instead of the "Caricamento modulo…" fallback while a chunk is still loading.
  assert.match(
    app,
    /window\.history\.pushState\([\s\S]*?startTransition\(\(\) => \{\s*setNavKey\(key\);/,
  );
  assert.match(
    app,
    /function onPopState[\s\S]*?startTransition\(\(\) => \{\s*setNavKey\(e\.state\.navKey as NavKey\);/,
  );
});

test('per-page datasets are kept on screen when the same query is reloaded', () => {
  // Same range / query / day: no clearing, no full-page loading state.
  assert.match(
    app,
    /const sameRange = loadedAppointmentRangeRef\.current === rangeKey;[\s\S]*?if \(!sameRange\) \{\s*setLoadingAppuntamenti\(true\);\s*setAppuntamenti\(\[\]\);/,
  );
  assert.match(
    app,
    /if \(!append && loadedConsegneKeyRef\.current !== consegneKey\) setConsegne\(\[\]\);/,
  );
  assert.match(app, /if \(!append && loadedNotesKeyRef\.current !== notesKey\) setNote\(\[\]\);/);
  assert.match(app, /const sameDay = !append && loadedTherapyKeyRef\.current === therapyKey;/);
  assert.match(
    app,
    /if \(!append && loadedPatientConsegneIdRef\.current !== patientId\) \{\s*setPatientConsegne\(\[\]\);/,
  );
  // The operator directory survives leaving the pages that use it (unless it was filtered).
  assert.match(app, /if \(filtered\) \{\s*setOperatori\(\[\]\);/);
});

test('the patient list seeds from the session snapshot and revalidates instead of clearing', () => {
  assert.match(listPage, /readSessionCache<PatientListSnapshot>\(SNAPSHOT_PREFIX \+ initialKey\)/);
  assert.match(listPage, /useState\(!snapshot\)/);
  assert.match(listPage, /const sameKey = loadedKey\.current === key;/);
  assert.match(listPage, /setLoading\(!append && !sameKey\);/);
  assert.match(listPage, /export async function prefetchPatientListSnapshot\(/);
  assert.match(app, /void prefetchPatientListSnapshot\(API_URL, \{/);
});

test('the chart is prefetched on row hover/focus and its tabs after opening', () => {
  assert.match(roster, /onMouseEnter=\{\(\) => onPrefetch\?\.\(patient\)\}/);
  assert.match(roster, /onFocus=\{\(\) => onPrefetch\?\.\(patient\)\}/);
  assert.match(app, /function prefetchCartella\(p: Paziente\): void/);
  assert.match(app, /onPrefetch=\{prefetchCartella\}/);
  assert.match(patientDetail, /prefetchPatientDetailTabs\(paziente\.id\)/);
});

test('logout drops every session cache and loaded-key marker', () => {
  const logout = app.slice(
    app.indexOf('function handleLogout()'),
    app.indexOf('// ── Operatori CRUD'),
  );
  assert.match(logout, /clearCachedGet\(\);\s*clearSessionCache\(\);/);
  for (const ref of [
    'loadedAppointmentRangeRef',
    'loadedConsegneKeyRef',
    'loadedNotesKeyRef',
    'loadedTherapyKeyRef',
    'loadedPatientConsegneIdRef',
  ]) {
    assert.match(logout, new RegExp(`${ref}\\.current = null;`));
  }
});

test('the therapy feed is never prefetched outside the therapy page (clinical contract kept)', () => {
  const prefetchEffect = app.slice(
    app.indexOf('// Prefetch a browser inattivo dei contesti'),
    app.indexOf('const needsOperatorDirectory ='),
  );
  assert.doesNotMatch(prefetchEffect, /loadTherapySlots/);
});
