// Contratto del mapping Ingresso (wizard) → Presa in carico (cartella).
//   node node_modules/tsx/dist/cli.mjs --test frontend/src/lib/__tests__/presaInCarico.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapIngressoToPresaInCarico, resolvePresaInCarico } from '../presaInCarico';
import type { PresaInCarico } from '../../types';

test('translates the wizard provenance vocabulary to the chart one', () => {
  assert.equal(
    mapIngressoToPresaInCarico({ provenienza: 'ospedale' }).provenienza,
    'dimissione_ospedaliera',
  );
  assert.equal(
    mapIngressoToPresaInCarico({ provenienza: 'altra_struttura' }).provenienza,
    'altra_struttura',
  );
  assert.ok(!('provenienza' in mapIngressoToPresaInCarico({ provenienza: 'sconosciuta' })));
});

test('keeps admission type and arrival mode apart', () => {
  const tipo = mapIngressoToPresaInCarico({ modalitaIngresso: 'urgenza' });
  assert.equal(tipo.tipoIngresso, 'urgenza');
  assert.ok(!('modalitaIngresso' in tipo), 'an admission type is not an arrival mode');
  const mezzo = mapIngressoToPresaInCarico({ modalitaIngresso: 'barella' });
  assert.equal(mezzo.modalitaIngresso, 'barella');
  assert.ok(!('tipoIngresso' in mezzo));
});

test('never invents a clinical assessment', () => {
  const pic = mapIngressoToPresaInCarico({
    dataPresa: '2026-09-26',
    motivoIngresso: 'Riabilitazione',
  });
  for (const key of [
    'statoCoscienza',
    'orientamento',
    'autonomia',
    'condizioniGenerali',
    'dolore',
    'materialeConsegnato',
  ]) {
    assert.ok(!(key in pic), `${key} must stay unassessed`);
  }
});

test('resolve returns a saved presaInCarico untouched', () => {
  const saved = { dataIngresso: '2026-01-01', provenienza: 'centro_medico' } as PresaInCarico;
  assert.equal(resolvePresaInCarico({ presaInCarico: saved, dataPresa: '1999-01-01' }), saved);
});

test('resolve derives a partial presaInCarico from legacy root keys', () => {
  assert.deepEqual(
    resolvePresaInCarico({
      statoRicovero: 'ricoverato',
      dataPresa: '2026-09-20',
      oraPresa: '10:00',
      provenienza: 'ospedale',
      modalitaIngresso: 'programmato',
    }),
    {
      dataIngresso: '2026-09-20',
      oraIngresso: '10:00',
      provenienza: 'dimissione_ospedaliera',
      tipoIngresso: 'programmato',
    },
  );
});

test('resolve returns undefined when there is nothing to show', () => {
  assert.equal(resolvePresaInCarico({ statoRicovero: 'ricoverato' }), undefined);
});

test('an empty saved presaInCarico does not hide legacy root keys', () => {
  assert.deepEqual(
    resolvePresaInCarico({ presaInCarico: {} as PresaInCarico, dataPresa: '2026-09-20' }),
    { dataIngresso: '2026-09-20' },
  );
});
