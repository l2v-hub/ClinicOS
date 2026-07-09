// REQ-039 (Agnos KB Task 2): pure functions behind the rooms/occupancy gateway services.
// Occupazione attiva = assignment con endDate === null (join già risolto a monte in loadBeds()).
// L'aggregato non deve MAI contenere nomi paziente (spec §2); occupantRows li espone perché
// replica la disclosure già presente nella UI attuale (assegnazione letti).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateRooms, occupantRows } from '../gateway/services.js';

const beds = [
  { id: 'b1', stato: 'libero', room: { numero: '12' }, label: 'A', active: null },
  { id: 'b2', stato: 'libero', room: { numero: '12' }, label: 'B',
    active: { patientId: 'p1', patient: { firstName: 'Elena', lastName: 'Moretti' }, startDate: '2026-07-01' } },
  { id: 'b3', stato: 'manutenzione', room: { numero: '14' }, label: 'A', active: null },
];

test('aggregateRooms: conta occupati/liberi/manutenzione senza nomi', () => {
  const a = aggregateRooms(2, beds);
  assert.deepEqual(a, { totalRooms: 2, totalBeds: 3, occupiedBeds: 1, freeBeds: 1, maintenanceBeds: 1, occupancyPct: 33 });
  assert.equal(JSON.stringify(a).includes('Moretti'), false);
});

test('occupantRows: righe con nome per il letto occupato, filtro per camera', () => {
  const rows = occupantRows(beds, '12');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].patientName, 'Moretti Elena');
  assert.equal(rows[0].roomNumero, '12');
  assert.equal(rows[0].bedLabel, 'B');
});

test('occupantRows senza filtro: tutte le camere con occupante', () => {
  assert.equal(occupantRows(beds).length, 1);
});
