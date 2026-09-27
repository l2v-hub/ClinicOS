import { test } from 'node:test';
import assert from 'node:assert/strict';
import { navEntryLabel, navHistoryState, patientDisplayName } from '../navHistory';

const LABELS = {
  pazienti: 'Pazienti',
  'operator-dashboard': 'Dashboard',
  'dettaglio-paziente': 'Scheda paziente',
};

test('page entries are labelled with the page name', () => {
  assert.equal(navEntryLabel({ navKey: 'pazienti' }, LABELS), 'Pazienti');
  assert.equal(navEntryLabel({ navKey: 'sconosciuta' }, LABELS), 'Indietro');
});

test('patient entries are labelled with the patient and the chart section', () => {
  const rossi = {
    navKey: 'dettaglio-paziente',
    pazienteId: 'p1',
    pazienteNome: patientDisplayName({ firstName: 'Giuseppe', lastName: 'Rossi' }),
  };
  assert.equal(navEntryLabel(rossi, LABELS), 'Rossi, Giuseppe');
  assert.equal(
    navEntryLabel({ ...rossi, patientTab: 'contatti' }, LABELS),
    'Rossi, Giuseppe · Contatti',
  );
  assert.equal(
    navEntryLabel({ ...rossi, patientTab: 'terapia-farmacologica' }, LABELS),
    'Rossi, Giuseppe · Terapia Farmacologica',
  );
});

test('history state keeps page, patient id, section and where back leads', () => {
  const state = navHistoryState(
    {
      navKey: 'dettaglio-paziente',
      pazienteId: 'p2',
      pazienteNome: 'Bianchi, Maria',
      patientTab: 'diagnosi',
    },
    {
      navKey: 'dettaglio-paziente',
      pazienteId: 'p1',
      pazienteNome: 'Rossi, Giuseppe',
      patientTab: 'contatti',
    },
    LABELS,
  );
  assert.deepEqual(state, {
    navKey: 'dettaglio-paziente',
    pazienteId: 'p2',
    patientTab: 'diagnosi',
    prevNavKey: 'dettaglio-paziente',
    prevLabel: 'Rossi, Giuseppe · Contatti',
  });
});

test('the first entry has nowhere to go back to', () => {
  assert.deepEqual(navHistoryState({ navKey: 'pazienti' }, null, LABELS), { navKey: 'pazienti' });
});

test('the patient name never becomes part of the stored ids', () => {
  const state = navHistoryState(
    { navKey: 'dettaglio-paziente', pazienteId: 'p9', pazienteNome: 'Verdi, Anna' },
    null,
    LABELS,
  );
  assert.ok(
    !JSON.stringify(state).includes('Verdi'),
    'only the previous entry label may carry a name',
  );
});
