import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
const bootstrap = source
  .split('// ── Fetch constant-size session data')[1]
  ?.split('// Facility occupancy contains patient identity')[0];
const loader = source
  .split('const loadOperatorDirectory = useCallback(')[1]
  ?.split('// ── Fetch constant-size session data')[0];

test('ordinary login bootstrap never downloads the operator directory', () => {
  assert.ok(bootstrap);
  assert.doesNotMatch(bootstrap, /\/operators(?:\/directory)?/);
  assert.match(source, /OPERATOR_DIRECTORY_NAV_KEYS\.has\(navKey\)/);
  assert.doesNotMatch(
    source.split("'operator-dashboard'")[1]?.split(']);')[0] ?? '',
    /operator-dashboard/,
  );
});

test('operator directory reads are abortable, session-safe, cached and retryable', () => {
  assert.ok(loader);
  assert.match(loader, /operatorDirectoryLoadStateRef\.current === 'ready'/);
  assert.match(loader, /operatorDirectoryAbortRef\.current\?\.abort\(\)/);
  assert.match(loader, /sessionEpoch !== sessionEpochRef\.current/);
  assert.match(loader, /request !== operatorDirectoryRequestRef\.current/);
  assert.match(loader, /if \(!response\.ok\) throw new Error/);
  assert.match(source, /Directory operatori non disponibile\. Riprova\./);
  assert.match(source, /Sono mostrati gli ultimi dati disponibili/);
  assert.match(source, /loadOperatorDirectory\(true\)/);
});

test('navigation and logout abort obsolete operator directory requests', () => {
  assert.match(
    source,
    /if \(!needsOperatorDirectory\)[\s\S]*operatorDirectoryAbortRef\.current\.abort/,
  );
  const logout = source.split('function handleLogout()')[1]?.split('// ── Operatori CRUD')[0];
  assert.ok(logout);
  assert.match(logout, /operatorDirectoryRequestRef\.current \+= 1/);
  assert.match(logout, /operatorDirectoryAbortRef\.current\?\.abort\(\)/);
  assert.match(logout, /setOperatori\(\[\]\)/);
});
