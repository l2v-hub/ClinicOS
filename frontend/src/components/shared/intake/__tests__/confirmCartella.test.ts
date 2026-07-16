// #265: unit contract for the intake draft → confirmed cartella mapping.
// The chosen allergy status (presenti / assenti / paziente_nega) MUST enter the
// confirmed cartella — losing it silently turns "verified absent" into
// "undocumented", a clinically ambiguous state.
//   node node_modules/tsx/dist/cli.mjs --test frontend/src/components/shared/intake/__tests__/confirmCartella.test.ts

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildConfirmCartella } from '../confirmCartella';
import type { AllergiaItem } from '../../../../types';

const allergen = (allergene = 'Penicillina'): AllergiaItem => ({
  id: `a-${allergene}`,
  allergene,
  reazione: 'Orticaria',
  gravita: 'moderata',
  documentato: '2026-01-01',
  documentatoDa: 'Operatore Test',
});

test('carries allergieStatus=paziente_nega into the confirmed cartella', () => {
  const cartella = buildConfirmCartella({ allergieStatus: 'paziente_nega' });
  assert.equal(cartella.allergieStatus, 'paziente_nega');
});

test('carries allergieStatus=assenti into the confirmed cartella', () => {
  const cartella = buildConfirmCartella({ allergieStatus: 'assenti' });
  assert.equal(cartella.allergieStatus, 'assenti');
});

test('presenti keeps BOTH the status and the allergy list (no data loss)', () => {
  const list = [allergen(), allergen('Lattice')];
  const cartella = buildConfirmCartella({ allergieStatus: 'presenti', allergie: list });
  assert.equal(cartella.allergieStatus, 'presenti');
  assert.deepEqual(cartella.allergie, list);
});

test('omits allergieStatus when the operator never selected one (undocumented ≠ false value)', () => {
  const cartella = buildConfirmCartella({});
  assert.ok(!('allergieStatus' in cartella), 'no ambiguous default status must be invented');
});

test('preserves the pre-existing mapping keys unchanged', () => {
  const cartella = buildConfirmCartella({
    ingresso: { dataIngresso: '2026-02-01', provenienza: 'domicilio' },
    allergie: [allergen()],
    diagnosi: [{ id: 'd1', descrizione: 'Dx test', stato: 'attiva' }],
    anamnesi: { remota: 'testo' },
    parametri: { parametriVitali: [{ id: 'v1' }] },
    dolore: [{ id: 'n1', valore: 3 }],
    _terapiaText: 'Paracetamolo 1000mg',
    allergieStatus: 'presenti',
  });
  assert.equal(cartella.statoRicovero, 'ricoverato');
  assert.equal(cartella.dataIngresso, '2026-02-01');
  assert.equal(cartella.provenienza, 'domicilio');
  assert.equal((cartella.allergie as AllergiaItem[]).length, 1);
  assert.equal((cartella.diagnosi as unknown[]).length, 1);
  assert.deepEqual(cartella.anamnesi, { remota: 'testo' });
  assert.deepEqual(cartella.parametriMensili, []);
  assert.equal((cartella.parametriVitali as unknown[]).length, 1);
  assert.equal((cartella.valutazioniNRS as unknown[]).length, 1);
  assert.equal(cartella.terapiaImportText, 'Paracetamolo 1000mg');
});

test('does not leak wizard-internal keys (_accepted, _narrative, anagrafica) into the cartella', () => {
  const cartella = buildConfirmCartella({
    _accepted: { demographics: true, therapy: true },
    _narrative: { sourceReferences: [] },
    anagrafica: { firstName: 'E2E' },
  });
  assert.ok(!('_accepted' in cartella));
  assert.ok(!('_narrative' in cartella));
  assert.ok(!('anagrafica' in cartella));
});
