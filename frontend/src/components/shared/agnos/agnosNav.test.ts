import test from 'node:test';
import assert from 'node:assert/strict';
import { navChipLabel, navTabId } from './agnosNav';

test('una sezione narrativa atterra sul tab testuale, non sul dato strutturato', () => {
  assert.equal(navTabId({ type: 'open_section', sectionKey: 'DIAGNOSIS' }), 'sezioni-narrative');
  assert.equal(navTabId({ type: 'open_section', sectionKey: 'ALLERGIES' }), 'sezioni-narrative');
});

test('ogni tipo con paziente porta al proprio tab della cartella', () => {
  assert.equal(navTabId({ type: 'open_therapy' }), 'terapia-farmacologica');
  assert.equal(navTabId({ type: 'open_parameter' }), 'parametri');
  assert.equal(navTabId({ type: 'open_document' }), 'documenti');
  assert.equal(navTabId({ type: 'open_consegne' }), 'consegne');
});

test('le destinazioni di reparto non hanno un tab di cartella', () => {
  assert.equal(navTabId({ type: 'open_agenda' }), undefined);
  assert.equal(navTabId({ type: 'open_therapies_today' }), undefined);
  assert.equal(navTabId({ type: 'open_beds' }), undefined);
  assert.equal(navTabId({ type: 'open_patient' }), undefined);
});

test('l’etichetta perde il verbo del backend e porta il paziente', () => {
  const label = navChipLabel(
    { type: 'open_therapy', label: 'Apri terapia', patientId: 'p1' },
    { patientName: 'Rossi Mario' },
  );
  assert.equal(label, 'Terapia Farmacologica · Rossi Mario');
});

test('il paziente già aperto non viene ripetuto nel chip', () => {
  const label = navChipLabel(
    { type: 'open_therapy', label: 'Apri terapia', patientId: 'p1' },
    { patientName: 'Rossi Mario', isCurrentPatient: true },
  );
  assert.equal(label, 'Terapia Farmacologica');
});

test('la pagina del documento compare come dettaglio finale', () => {
  const label = navChipLabel(
    { type: 'open_document', label: 'Apri documento', patientId: 'p1', pageNumber: 3 },
    { patientName: 'Rossi Mario' },
  );
  assert.equal(label, 'Documenti · Rossi Mario · p. 3');
});

test('una destinazione di reparto resta nuda', () => {
  assert.equal(navChipLabel({ type: 'open_agenda', label: 'Apri agenda' }), 'Agenda');
  assert.equal(navChipLabel({ type: 'open_beds', label: 'Apri posti letto' }), 'Posti letto');
  assert.equal(
    navChipLabel({ type: 'open_consegne', label: 'Apri consegne', recordId: 'c1' }),
    'Consegne',
  );
});

test('una forma non riconosciuta ricade sulla label del backend', () => {
  assert.equal(navChipLabel({ type: 'open_qualcosa', label: 'Apri qualcosa' }), 'Apri qualcosa');
});
