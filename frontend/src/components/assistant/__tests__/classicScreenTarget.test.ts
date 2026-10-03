import test from 'node:test';
import assert from 'node:assert/strict';
import { classicScreenTarget } from '../classicScreenTarget';

test('il diario dell’ospite noto apre la sezione Diario della sua cartella', () => {
  assert.deepEqual(
    classicScreenTarget({
      screen: 'dettaglio-paziente',
      label: 'Cartella → Diario',
      needsResident: true,
      patientTab: 'diario',
      patientId: 'p1',
    }),
    { kind: 'patient', patientId: 'p1', tab: 'diario' },
  );
});

test('i parametri con ospite noto aprono i Parametri dell’ospite, non la pagina di reparto', () => {
  assert.deepEqual(
    classicScreenTarget({
      screen: 'parametri-multipaziente',
      label: 'Parametri',
      patientTab: 'parametri',
      patientId: 'p1',
    }),
    { kind: 'patient', patientId: 'p1', tab: 'parametri' },
  );
});

test('senza ospite resta la pagina di reparto', () => {
  assert.deepEqual(
    classicScreenTarget({
      screen: 'parametri-multipaziente',
      label: 'Parametri',
      patientTab: 'parametri',
    }),
    { kind: 'screen', screen: 'parametri-multipaziente' },
  );
  assert.deepEqual(classicScreenTarget({ screen: 'consegne', label: 'Consegne' }), {
    kind: 'screen',
    screen: 'consegne',
  });
});

test('un tab sconosciuto non diventa una destinazione', () => {
  assert.deepEqual(
    classicScreenTarget({
      screen: 'dettaglio-paziente',
      label: 'Cartella ospite',
      needsResident: true,
      patientTab: 'inventato',
      patientId: 'p1',
    }),
    { kind: 'patient', patientId: 'p1' },
  );
});
