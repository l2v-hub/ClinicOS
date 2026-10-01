import assert from 'node:assert/strict';
import test from 'node:test';
import { matchShortcut, type CopilotShortcut } from '../assistantApi';

const shortcuts: CopilotShortcut[] = [
  { id: 'round_vitals', kind: 'resident_round', label: 'Inizia giro parametri', phrases: ['iniziamo il giro', 'giro parametri'] },
  { id: 'start_shift', kind: 'start_shift', label: 'Inizia il turno', phrases: ['inizia il turno'] },
];

test('the same phrase matches whether typed or dictated (one function, same path)', () => {
  assert.equal(matchShortcut('Iniziamo il giro.', shortcuts)?.id, 'round_vitals');
  assert.equal(matchShortcut('  iniziamo   il giro  ', shortcuts)?.id, 'round_vitals');
  assert.equal(matchShortcut('«Inizia il turno»', shortcuts)?.id, 'start_shift');
});

test('only a WHOLE phrase triggers a shortcut — real requests are never hijacked', () => {
  assert.equal(matchShortcut('registra pressione 120/80, poi iniziamo il giro', shortcuts), null);
  assert.equal(matchShortcut('giro', shortcuts), null);
  assert.equal(matchShortcut('', shortcuts), null);
  assert.equal(matchShortcut('iniziamo il giro', []), null, 'no shortcut for a role that has none');
});
