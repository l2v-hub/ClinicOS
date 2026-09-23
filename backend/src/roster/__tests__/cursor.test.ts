import assert from 'node:assert/strict';
import test from 'node:test';
import {
  encodeRosterCursor,
  decodeRosterCursor,
  rosterScopeFingerprint,
  type RosterBinding,
} from '../cursor.js';

const binding: RosterBinding = {
  view: 'patients',
  scope: 'scope',
  contextId: null,
  contextVersion: null,
  revision: null,
  order: { criterion: 'name', direction: 'asc' },
  filters: { q: 'Rossi' },
  asOf: '2026-09-23',
  epoch: { roster: '9007199254740993' },
};
test('cursor v3 is canonical, bounded, anchor-only and binds every snapshot field', () => {
  const token = encodeRosterCursor(binding, { patientId: 'patient-1' });
  assert.deepEqual(decodeRosterCursor(token, binding), { patientId: 'patient-1' });
  for (const altered of [
    { ...binding, view: 'parameters' as const },
    { ...binding, scope: 'other' },
    { ...binding, asOf: '2026-09-24' },
    { ...binding, epoch: { roster: '9007199254740994' } },
    { ...binding, contextVersion: '2' },
    { ...binding, revision: '1' },
  ]) {
    assert.throws(() => decodeRosterCursor(token, altered), { code: 'roster_changed' });
  }
  for (const value of [
    token + '=',
    '!',
    'x'.repeat(4097),
    Buffer.from('{"v":2}').toString('base64url'),
  ])
    assert.throws(() => decodeRosterCursor(value, binding));
});
test('scope fingerprint includes actor, role and both authorization restrictions with canonical IDs', () => {
  const actor = { id: 'actor', role: 'operatore' };
  const access = { patientIds: ['b', 'a'], registeredById: 'owner' };
  const fingerprint = rosterScopeFingerprint(actor, access);
  assert.equal(
    fingerprint,
    rosterScopeFingerprint(actor, { ...access, patientIds: ['a', 'b', 'a'] }),
  );
  assert.notEqual(
    fingerprint,
    rosterScopeFingerprint(actor, { ...access, registeredById: 'other' }),
  );
  assert.notEqual(fingerprint, rosterScopeFingerprint({ ...actor, id: 'other' }, access));
  assert.notEqual(fingerprint, rosterScopeFingerprint({ ...actor, role: 'manager' }, access));
});
