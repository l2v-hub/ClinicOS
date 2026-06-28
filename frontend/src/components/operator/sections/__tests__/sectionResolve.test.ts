import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSectionComponent } from '../PatientSection.js';

test('resolves a registered, implemented section', () => {
  assert.ok(resolveSectionComponent('allergie'));
});

test('returns null for unknown section', () => {
  assert.equal(resolveSectionComponent('nope'), null);
});
