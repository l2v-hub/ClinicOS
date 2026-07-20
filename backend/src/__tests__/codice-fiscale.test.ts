import test from 'node:test';
import assert from 'node:assert/strict';
import {
  controlChar,
  isValidCodiceFiscale,
  normalizeCodiceFiscale,
} from '../lib/codice-fiscale.js';

// Synthetic fixtures only (canonical documentation examples, no real people).
const VALID = 'RSSMRA80A01H501U';

// Omocodia substitution table (digit → letter) for building a variant fixture.
const OMO: Record<string, string> = {
  '0': 'L',
  '1': 'M',
  '2': 'N',
  '3': 'P',
  '4': 'Q',
  '5': 'R',
  '6': 'S',
  '7': 'T',
  '8': 'U',
  '9': 'V',
};

test('accepts a canonical valid CF', () => {
  assert.equal(isValidCodiceFiscale(VALID), true);
});

test('normalizes case and surrounding whitespace', () => {
  assert.equal(isValidCodiceFiscale('  rssmra80a01h501u '), true);
  assert.equal(normalizeCodiceFiscale('  rssmra80a01h501u '), VALID);
});

test('accepts an omocodia variant with recomputed control character', () => {
  // Substitute the last Belfiore digit (position 15, 1-indexed) per the official table,
  // then recompute the control character — this is exactly how real omocodia CFs are issued.
  const base = VALID.slice(0, 14) + OMO[VALID[14]];
  const omocodia = base + controlChar(base);
  assert.notEqual(omocodia, VALID);
  assert.equal(isValidCodiceFiscale(omocodia), true);
});

test('rejects a CF with a wrong control character', () => {
  const wrong = VALID.slice(0, 15) + (VALID[15] === 'A' ? 'B' : 'A');
  assert.equal(isValidCodiceFiscale(wrong), false);
});

test('rejects malformed input', () => {
  assert.equal(isValidCodiceFiscale(''), false);
  assert.equal(isValidCodiceFiscale(undefined), false);
  assert.equal(isValidCodiceFiscale(null), false);
  assert.equal(isValidCodiceFiscale(12345), false);
  assert.equal(isValidCodiceFiscale('RSSMRA80A01H501'), false); // 15 chars
  assert.equal(isValidCodiceFiscale('RSSMRA80Z01H501U'), false); // Z is not a month letter
  assert.equal(isValidCodiceFiscale('RSSMR180A01H501U'), false); // digit in surname block
});
