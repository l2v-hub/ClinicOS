import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canFacilityRead } from '../gateway/context.js';

test('016 F3: facility read off by default', () => {
  assert.equal(canFacilityRead({}), false);
});

test('016 F3: facility read enabled by env flag (role-independent)', () => {
  assert.equal(canFacilityRead({ AI_FACILITY_QUERIES_ENABLED: 'true' }), true);
});

test('016 F3: any non-true value keeps facility read off', () => {
  assert.equal(canFacilityRead({ AI_FACILITY_QUERIES_ENABLED: 'false' }), false);
  assert.equal(canFacilityRead({ AI_FACILITY_QUERIES_ENABLED: '1' }), false);
});
