import assert from 'node:assert/strict';
import test from 'node:test';
import { createSubmissionKey } from '../submissionKey';

test('the same payload keeps the same requestId across retries; a new payload or a reset gets a new one', () => {
  const key = createSubmissionKey();
  const payload = { farmacoNome: 'Ramipril', orari: ['08:00'] };
  const first = key.for(payload);
  assert.match(first, /^[A-Za-z0-9_-]{8,128}$/, 'accepted by the backend requestId format');
  assert.equal(key.for({ ...payload }), first, 'double click / lost response → same id');
  const changed = key.for({ ...payload, orari: ['20:00'] });
  assert.notEqual(changed, first, 'edited form → new id (no false replay)');
  key.reset();
  assert.notEqual(key.for(payload), first, 'after success the next submission is a new one');
});
