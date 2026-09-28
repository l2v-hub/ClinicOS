import { test } from 'node:test';
import assert from 'node:assert/strict';
import { intakeProgress } from '../intakeProgress';

const row = {
  farmacoNome: 'Farmaco sintetico',
  forma: 'CPR',
  dosaggio: '20 MG',
  viaSomministrazione: 'OS',
  quantita: '1/2 Cpr',
  orari: ['08:00'],
  giorni: [],
  dataInizio: '2026-09-15',
  classe: '',
  note: '',
  originalText: 'Fixture sintetica',
  stato: 'ok',
};

test('empty draft: names missing, both confirmations missing; optional sections are empty', () => {
  const { sections, missing } = intakeProgress({});
  assert.deepEqual(
    missing.map((m) => m.section),
    ['anagrafica', 'anagrafica', 'terapia'],
  );
  assert.match(missing[0].label, /Nome obbligatorio/);
  assert.deepEqual(sections.anagrafica, { kind: 'issues', count: 2 });
  assert.deepEqual(sections.terapia, { kind: 'confirm' });
  assert.deepEqual(sections.ingresso, { kind: 'empty' });
  assert.deepEqual(sections.riepilogo, { kind: 'issues', count: 3 });
});

test('names and both confirmations: ready, the same gate handleConfirm applies', () => {
  const { sections, missing } = intakeProgress({
    anagrafica: { firstName: 'Anna', lastName: 'Rossi' },
    _accepted: { demographics: true, therapy: true },
  });
  assert.deepEqual(missing, []);
  assert.deepEqual(sections.anagrafica, { kind: 'done' });
  assert.deepEqual(sections.terapia, { kind: 'done' });
  assert.deepEqual(sections.riepilogo, { kind: 'done' });
});

test('pending import proposal and uncertain decision block creation under Terapia', () => {
  const { sections, missing } = intakeProgress(
    {
      anagrafica: { firstName: 'Anna', lastName: 'Rossi' },
      _accepted: { demographics: true, therapy: true },
      _importProposals: [{ id: 'p', status: 'pending', row }],
    },
    { proposalUncertain: true },
  );
  assert.deepEqual(
    missing.map((m) => m.label),
    ["Una proposta d'import da decidere", 'Decisione in attesa di risposta'],
  );
  assert.deepEqual(sections.terapia, { kind: 'issues', count: 2 });
});

test('an invalid therapy row is a missing step that points to the field to correct', () => {
  const { missing, sections } = intakeProgress({
    anagrafica: { firstName: 'Anna', lastName: 'Rossi' },
    _accepted: { demographics: true, therapy: true },
    terapiaImport: [{ ...row, farmacoNome: '' }],
  });
  assert.ok(missing.length >= 1);
  assert.ok(missing.every((m) => m.section === 'terapia' && m.target));
  assert.equal(sections.terapia.kind, 'issues');
});

test('optional sections are done when filled; modules follow the selection', () => {
  const { sections } = intakeProgress(
    {
      ingresso: { motivo: 'Scompenso' },
      allergieStatus: 'assenti',
      diagnosi: [{ descrizione: 'x' }],
    },
    { moduleSelected: true },
  );
  assert.deepEqual(sections.ingresso, { kind: 'done' });
  assert.deepEqual(sections.allergie, { kind: 'done' });
  assert.deepEqual(sections.diagnosi, { kind: 'done' });
  assert.deepEqual(sections.moduli, { kind: 'done' });
  assert.deepEqual(sections.parametri, { kind: 'empty' });
});
