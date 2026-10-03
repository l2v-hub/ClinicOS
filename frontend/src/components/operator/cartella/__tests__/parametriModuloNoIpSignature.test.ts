import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Phase 10 (owner request): the monthly sheet drops the «Firma IP Mattina/Pomeriggio» columns —
// the author is recorded by the server — and shows DTX 20 next to DTX 08/12/18.
const source = readFileSync(new URL('../ParametriModuloView.tsx', import.meta.url), 'utf8');

test('monthly parameters sheet has no IP morning/afternoon signature columns', () => {
  assert.doesNotMatch(source, /FIRMA_M|FIRMA_P|label: 'Firma IP'/);
});

test('monthly parameters sheet keeps DTX 08/12/18/20', () => {
  for (const key of ['DTX8', 'DTX12', 'DTX18', 'DTX20'])
    assert.match(source, new RegExp(`key: '${key}'`));
});
