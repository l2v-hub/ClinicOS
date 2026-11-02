import test from 'node:test';
import assert from 'node:assert/strict';
import { authAvailability, canStartLogin, parseAuthStatus } from '../authAvailability';

const expired = {
  mode: 'disabled',
  simulator: false,
  temporaryDemo: false,
  syntheticOnly: true,
  expiresAt: '2026-10-31T23:59:59Z',
};
const now = Date.parse('2026-11-02T12:00:00Z');

test('pending or unavailable auth never exposes an executable login, even with stale enabled status', () => {
  const stale = parseAuthStatus({ ...expired, mode: 'demo', temporaryDemo: true, simulator: true });
  for (const check of ['checking', 'unavailable'] as const) {
    assert.equal(authAvailability(check, stale, now), check);
    assert.equal(canStartLogin(check, stale), false);
  }
  assert.equal(canStartLogin('available', null), false);
  assert.equal(authAvailability('available', null, now), 'unavailable');
});

test('expired synthetic demo is blocked and clearly distinguished from a configuration failure', () => {
  const status = parseAuthStatus(expired);
  assert.equal(authAvailability('available', status, now), 'expired');
  assert.equal(canStartLogin('available', status), false);
  for (const change of [
    { expiresAt: null },
    { expiresAt: '2027-01-01T00:00:00Z' },
    { syntheticOnly: false },
  ]) {
    assert.equal(
      authAvailability('available', parseAuthStatus({ ...expired, ...change }), now),
      'disabled',
    );
  }
});

test('the server mode controls access; client clock and expiry only affect a disabled-state explanation', () => {
  for (const simulator of [true, false]) {
    const status = parseAuthStatus({ ...expired, mode: 'demo', temporaryDemo: true, simulator });
    assert.equal(authAvailability('available', status, now), 'ready');
    assert.equal(canStartLogin('available', status), true);
  }
  const entra = parseAuthStatus({ mode: 'entra', simulator: false, temporaryDemo: false });
  assert.equal(canStartLogin('available', entra), true);
  assert.equal(authAvailability('available', entra, now), 'ready');
});

test('malformed, unsupported and contradictory auth responses fail closed', () => {
  for (const payload of [
    null,
    [],
    {},
    'demo',
    { ...expired, mode: 'unexpected' },
    { ...expired, temporaryDemo: 'false' },
    { ...expired, simulator: 'true' },
    { ...expired, syntheticOnly: 'true' },
    { ...expired, expiresAt: 'not-a-date' },
    { ...expired, expiresAt: {} },
    { ...expired, simulator: true },
    { ...expired, mode: 'entra', temporaryDemo: true },
    { ...expired, mode: 'entra', simulator: true },
  ]) {
    assert.throws(() => parseAuthStatus(payload), /auth_status_invalid/);
  }
});
