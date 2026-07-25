import assert from 'node:assert/strict';
import test from 'node:test';

import { assertStableId, normalizeId, sha256, stableJson } from '../lib/contracts.mjs';

test('normalizes knowledge identifiers deterministically', () => {
  assert.equal(normalizeId(' API Backend / Patient Create '), 'api.backend.patient-create');
  assert.doesNotThrow(() => assertStableId('entity.patient'));
  assert.throws(() => assertStableId('Entity Patient'), /stable identifier/);
});

test('serializes object keys deterministically', () => {
  assert.equal(stableJson({ z: 1, a: { d: 2, b: 1 } }), '{"a":{"b":1,"d":2},"z":1}\n');
  assert.equal(sha256('same'), sha256('same'));
});
