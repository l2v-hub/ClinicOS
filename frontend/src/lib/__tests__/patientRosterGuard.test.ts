import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createLatestRequestGuard } from '../usePatientDirectorySearch';

const appSource = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
const parametersSource = readFileSync(
  new URL('../../components/operator/MultiPatientParametri.tsx', import.meta.url),
  'utf8',
);
const parametersApiSource = readFileSync(
  new URL('../patientParametersPage.ts', import.meta.url),
  'utf8',
);

test('App login has no unbounded patient roster state or request', () => {
  assert.doesNotMatch(appSource, /useState<Paziente\[\]>/);
  assert.doesNotMatch(appSource, /fetch\(`\$\{API_URL\}\/patients`,/);
  assert.match(appSource, /patients\/clinical-summary\/overview/);
});

test('multi-patient parameters uses one bounded page instead of cartella fan-out', () => {
  assert.match(parametersApiSource, /patients\/parameters\/page/);
  assert.match(parametersSource, /limit:\s*25/);
  assert.doesNotMatch(parametersSource, /Promise\.all/);
  assert.match(parametersSource, /pageRequestGuard/);
  assert.match(parametersSource, /guard\.isCurrent\(request\)/);
});

test('directory search rejects a stale response even when fetch ignores abort', () => {
  const guard = createLatestRequestGuard();
  const first = guard.start();
  const second = guard.start();
  const committed: string[] = [];
  if (guard.isCurrent(first)) committed.push('stale');
  if (guard.isCurrent(second)) committed.push('latest');
  assert.deepEqual(committed, ['latest']);
  guard.invalidate(second);
  assert.equal(guard.isCurrent(second), false);
});

test('logout clears clinical, search and assistant state before another session', () => {
  for (const cleanup of [
    /setCartelle\(\[\]\)/,
    /setAppuntamenti\(\[\]\)/,
    /setConsegne\(\[\]\)/,
    /setSearchQuery\(''\)/,
    /setPazientiRicerca\(''\)/,
    /setAiLoaded\(false\)/,
    /patientNavigationSequenceRef\.current \+= 1/,
    /sessionEpoch !== patientNavigationSequenceRef\.current/,
    /sessionEpochRef\.current \+= 1/,
    /sessionEpoch === sessionEpochRef\.current/,
    /request !== patientNavigationSequenceRef\.current/,
  ]) {
    assert.match(appSource, cleanup);
  }
});
