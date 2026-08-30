import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoiceStartGate } from './voiceStartGate';

test('voice start cancelled during permission prompt cannot resume', () => {
  const gate = createVoiceStartGate();
  const token = gate.begin();
  assert.equal(typeof token, 'number');
  gate.cancel();
  assert.equal(gate.isCurrent(token!), false);
  assert.equal(gate.complete(token!), false);
});

test('voice gate rejects concurrent starts and permits a later explicit start', () => {
  const gate = createVoiceStartGate();
  const first = gate.begin();
  assert.equal(gate.begin(), null);
  assert.equal(gate.complete(first!), true);
  assert.equal(typeof gate.begin(), 'number');
});
