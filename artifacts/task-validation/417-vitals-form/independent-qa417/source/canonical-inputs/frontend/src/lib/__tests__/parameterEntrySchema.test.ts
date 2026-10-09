import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('both entry surfaces render the same controlled form without owning a second field map', () => {
  for (const file of ['PatientParameterEntry.tsx', 'ParameterEntryPanel.tsx']) {
    const source = readFileSync(
      new URL(`../../components/operator/${file}`, import.meta.url),
      'utf8',
    );
    assert.match(source, /<ParameterReadingForm\b/);
    assert.doesNotMatch(source, /PARAMETER_FIELDS\.map|PAD_FIELDS\.map|COSCIENZA_SHORT/);
  }
});

test('shared entry schema follows all fields, including NEWS2 choices, without auto-save navigation', async () => {
  const { ENTRY_FIELDS, nextEntryField } = await import('../parameterEntrySchema');
  assert.deepEqual(
    ENTRY_FIELDS.map((field) => field.key),
    [
      'fr',
      'spo2',
      'o2',
      'pas',
      'pad',
      'fc',
      'temperatura',
      'coscienza',
      'dtx',
      'evacuazione',
      'note',
    ],
  );
  assert.equal(nextEntryField('spo2'), 'o2');
  assert.equal(nextEntryField('temperatura'), 'coscienza');
  assert.equal(nextEntryField('dtx'), 'evacuazione');
  assert.equal(nextEntryField('note'), null);
  const { PARAMETER_FIELDS, PARAMETER_OPTIONS } = await import('../patientParameterReadings');
  for (const field of ENTRY_FIELDS) {
    if (['pas', 'pad', 'note'].includes(field.key)) continue;
    const original = PARAMETER_FIELDS.find((item) => item.key === field.key)!;
    assert.equal(field.label, original.label);
    assert.equal(field.unit, original.unit);
    assert.deepEqual(field.options, PARAMETER_OPTIONS[original.key]);
  }
});
