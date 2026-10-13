// #450 (decisione del responsabile 13/10/2026: resta la pagina completa, correzioni minime).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { intakeProgress } from '../intakeProgress';

const source = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('450 «Ingresso» is not complete with only the automatic date and time', () => {
  const auto = intakeProgress({ ingresso: { dataPresa: '2026-10-13', oraPresa: '09:00' } });
  assert.deepEqual(auto.sections.ingresso, { kind: 'empty' });
  const typed = intakeProgress({
    ingresso: { dataPresa: '2026-10-13', oraPresa: '09:00', provenienza: 'domicilio' },
  });
  assert.deepEqual(typed.sections.ingresso, { kind: 'done' });
  assert.deepEqual(intakeProgress({}).sections.ingresso, { kind: 'empty' });
});

test('450 one documents option on «Nuovo ingresso», no explainer box', () => {
  const start = source('../../../operator/NewPatientStart.tsx');
  assert.equal((start.match(/key: '/g) ?? []).length, 1);
  assert.match(start, /Lettera o trasferimento/);
  assert.doesNotMatch(start, /Da lettera di dimissione|Da file del trasferimento|Come funziona/);
});

test('450 no box repeating the demographics, no required-fields paragraphs, no obvious hints', () => {
  const anagrafica = source('../StepAnagrafica.tsx');
  const workspace = source('../IntakeWorkspace.tsx');
  assert.doesNotMatch(anagrafica, /<DemographicsStatus/);
  assert.doesNotMatch(anagrafica, /Per registrare l’ingresso servono/);
  assert.doesNotMatch(workspace, /Gli altri dati possono essere completati dopo l’ingresso/);
  assert.doesNotMatch(
    anagrafica,
    /Usato per calcolare il CF|Sigla provincia; EE|Necessario per il calcolo automatico|Si compila automaticamente con nome/,
  );
  // resta l'avviso quando il codice fiscale è stato calcolato
  assert.match(anagrafica, /Calcolato automaticamente dai dati anagrafici/);
});

test('450 QA: screen-reader status lines use the design-system class, never a bare sr-only', () => {
  for (const rel of ['../StepAnagrafica.tsx', '../../InlineEditableField.tsx'])
    assert.doesNotMatch(source(rel), /className="sr-only"/);
});
