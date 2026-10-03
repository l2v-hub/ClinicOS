// Phase 10: the monthly sheet gains DTX 20; the IP signature is never client-writable.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PatientParametersInputError, validateParameterMonth } from '../parameters-update.js';

const month = (day: Record<string, unknown>) => ({
  month: {
    id: 'm1',
    mese: 10,
    anno: 2026,
    createdAt: '2026-10-02',
    giorni: [{ giorno: 2, ...day }],
  },
});

test('DTX 20 is accepted on the monthly sheet', () => {
  const saved = validateParameterMonth('patient-1', month({ dtx20: '140' }));
  assert.equal(saved.giorni[0].dtx20, '140');
});

test('the IP morning/afternoon signature stays server-owned', () => {
  for (const key of ['firmaIpM', 'firmaIpP'])
    assert.throws(
      () => validateParameterMonth('patient-1', month({ [key]: 'XY' })),
      PatientParametersInputError,
    );
});
