import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../patients.ts', import.meta.url), 'utf8');

test('patient seed and demo setup require an admin or manager before their handlers', () => {
  assert.match(source, /router\.post\('\/seed', requireRole\('admin', 'manager'\), async/);
  assert.match(source, /router\.post\('\/demo-setup', requireRole\('admin', 'manager'\), async/);
});

test('patient seed and demo setup retain the production fail-closed gate', () => {
  const seed = source.split("router.post('/seed'")[1]?.split("router.post('/demo-setup'")[0];
  const demo = source.split("router.post('/demo-setup'")[1]?.split("router.post('/',")[0];
  assert.ok(seed);
  assert.ok(demo);
  assert.match(seed, /process\.env\.NODE_ENV === 'production'/);
  assert.match(demo, /process\.env\.NODE_ENV === 'production'/);
});
