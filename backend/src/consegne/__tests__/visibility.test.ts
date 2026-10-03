import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { readsAllConsegne } from '../visibility.js';

const original = process.env.RESIDENT_SCOPE_CONFIG;
afterEach(() => {
  if (original === undefined) delete process.env.RESIDENT_SCOPE_CONFIG;
  else process.env.RESIDENT_SCOPE_CONFIG = original;
});

test('urgency model: by default every clinical identity reads all handovers (shared notes)', () => {
  delete process.env.RESIDENT_SCOPE_CONFIG;
  for (const role of ['operatore', 'infermiere', 'medico', 'oss', 'manager', 'admin'])
    assert.equal(readsAllConsegne({ role }), true, role);
});

test('restricted scope config keeps the author/assignee rule for ordinary operators', () => {
  process.env.RESIDENT_SCOPE_CONFIG = JSON.stringify({ fallback: 'registered_by_me' });
  assert.equal(readsAllConsegne({ role: 'operatore' }), false);
  assert.equal(readsAllConsegne({ role: 'manager' }), true);
});
