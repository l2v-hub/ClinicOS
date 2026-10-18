import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NewPatientStart } from '../../../operator/NewPatientStart';
import { StepAnagrafica } from '../StepAnagrafica';
import { intakeProgress } from '../intakeProgress';

const noop = () => {};

test('450 automatic dates and whitespace do not complete admission; actual entered content does', () => {
  for (const ingresso of [
    undefined,
    {},
    { dataPresa: '2026-10-17', oraPresa: '09:00' },
    { dataPresa: '2026-10-17', provenienza: '  ', note: '' },
  ]) {
    assert.deepEqual(intakeProgress({ ingresso }).sections.ingresso, { kind: 'empty' });
  }
  assert.deepEqual(
    intakeProgress({ ingresso: { dataPresa: '2026-10-17', provenienza: 'domicilio' } }).sections
      .ingresso,
    { kind: 'done' },
  );
  for (const section of ['allergie', 'diagnosi', 'parametri'])
    assert.deepEqual(intakeProgress({ [section]: [] }).sections[section as 'allergie'], {
      kind: 'empty',
    });
});

test('450 entry renders one disabled-until-ready document choice and a working manual choice', () => {
  const html = renderToStaticMarkup(
    createElement(NewPatientStart, { onChoose: noop, onBack: noop }),
  );
  assert.equal((html.match(/class="nps-option"/g) ?? []).length, 2);
  assert.match(html, /Lettera o trasferimento/);
  assert.match(html, /A mano/);
  assert.equal((html.match(/ disabled=""/g) ?? []).length, 1);
  assert.doesNotMatch(html, /Come funziona|Da file del trasferimento|Da lettera di dimissione/);
});

test('450 actual demographics render keeps field errors and useful computed-code notice without duplicate prose', () => {
  const empty = renderToStaticMarkup(
    createElement(StepAnagrafica, { value: {}, onChange: noop, submitAttempted: true }),
  );
  assert.match(empty, /Nome obbligatorio/);
  assert.match(empty, /Cognome obbligatorio/);
  assert.doesNotMatch(
    empty,
    /Anagrafica da completare|Per registrare l’ingresso servono|Usato per calcolare il CF|Necessario per il calcolo automatico/,
  );
  const filled = renderToStaticMarkup(
    createElement(StepAnagrafica, {
      value: {
        firstName: 'Mario',
        lastName: 'Rossi',
        dateOfBirth: '1980-01-01',
        codiceFiscale: 'RSSMRA80A01H501U',
        codiceFiscaleOrigine: 'auto',
      },
      onChange: noop,
    }),
  );
  assert.match(filled, /Calcolato automaticamente dai dati anagrafici/);
  assert.match(filled, /class="ds-sr-only" role="status"/);
});

test('Claude2 close confirmation keeps three actions accessible and default callers retain two', async () => {
  const { ConfirmDialog } = await import('../../ConfirmDialog');
  const markup = renderToStaticMarkup(
    createElement(ConfirmDialog, {
      open: true,
      title: 'Chiudere?',
      message: 'Conflitti da decidere',
      confirmLabel: 'Salva bozza e chiudi',
      confirmDisabled: true,
      cancelLabel: 'Continua la revisione',
      onConfirm: noop,
      onCancel: noop,
      alternativeAction: { label: 'Chiudi senza salvare', onClick: noop },
    }),
  );
  assert.equal((markup.match(/<button/g) ?? []).length, 3);
  assert.match(markup, /flex-wrap:wrap/);
  assert.match(markup, /data-dialog-initial-focus="true"[^>]*>[^<]*<svg/);
  assert.match(markup, /disabled=""/);
  const normal = renderToStaticMarkup(
    createElement(ConfirmDialog, {
      open: true,
      title: 'Conferma',
      message: 'Verifica',
      onConfirm: noop,
      onCancel: noop,
    }),
  );
  assert.equal((normal.match(/<button/g) ?? []).length, 2);
});
