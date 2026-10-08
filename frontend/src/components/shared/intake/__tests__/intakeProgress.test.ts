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

const identity = {
  firstName: 'Anna',
  lastName: 'Rossi',
  dateOfBirth: '1980-01-01',
  codiceFiscale: 'RSSMRA80A01H501U',
};

test('empty draft: identity missing, optional sections do not require confirmations', () => {
  const { sections, missing } = intakeProgress({});
  assert.deepEqual(
    missing.map((m) => m.section),
    ['anagrafica'],
  );
  assert.match(missing[0].label, /Nome obbligatorio/);
  assert.deepEqual(sections.anagrafica, { kind: 'issues', count: 4 });
  assert.deepEqual(sections.terapia, { kind: 'empty' });
  assert.deepEqual(sections.ingresso, { kind: 'empty' });
  assert.deepEqual(sections.riepilogo, { kind: 'issues', count: 1 });
});

test('four identity fields alone: ready without contacts, clinical sections or confirmations', () => {
  const { sections, missing } = intakeProgress({
    anagrafica: identity,
  });
  assert.deepEqual(missing, []);
  assert.deepEqual(sections.anagrafica, { kind: 'done' });
  assert.deepEqual(sections.terapia, { kind: 'empty' });
  assert.deepEqual(sections.riepilogo, { kind: 'done' });
});

test('pending import proposal and uncertain decision block creation under Terapia', () => {
  const { sections, missing } = intakeProgress(
    {
      anagrafica: identity,
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
    anagrafica: identity,
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

test('actual prescriptions still require explicit acceptance, deferred ones do not', () => {
  const draft = { anagrafica: identity, terapiaImport: [row] };
  assert.ok(intakeProgress(draft).missing.some((item) => item.label === 'Conferma la terapia'));
  assert.deepEqual(intakeProgress({ ...draft, _accepted: { therapy: true } }).missing, []);
  assert.deepEqual(
    intakeProgress({ ...draft, terapiaImport: [{ ...row, excludedFromConfirm: true }] }).missing,
    [],
  );
});

test('each missing identity field blocks even when legacy confirmations are true', () => {
  for (const field of ['firstName', 'lastName', 'dateOfBirth', 'codiceFiscale']) {
    const { missing } = intakeProgress({
      anagrafica: { ...identity, [field]: '' },
      _accepted: { demographics: true, therapy: true },
    });
    assert.equal(missing.length, 1);
    assert.equal(missing[0].section, 'anagrafica');
  }
});

test('invalid supplied phone still blocks; omitted phone never does', () => {
  assert.equal(
    intakeProgress({ anagrafica: { ...identity, phone: 'not-a-number' } }).missing.length,
    1,
  );
  assert.deepEqual(intakeProgress({ anagrafica: { ...identity, phone: '' } }).missing, []);
});
