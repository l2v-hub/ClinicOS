import { test } from 'node:test';
import assert from 'node:assert/strict';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnamnesisEditor } from '../../components/operator/sections/AnamnesisEditor';
import { StepVerifica } from '../../components/shared/intake/StepVerifica';
import { legacyPastHistoryProposal, previousClinicalText } from '../clinicalHistory';
import { buildConfirmCartella } from '../../components/shared/intake/confirmCartella';
import InvioPSModal from '../../components/operator/InvioPSModal';
import type { CartellaPaziente, Paziente } from '../../types';

// The repository's Node/tsx runner uses classic JSX while Vite uses react-jsx.
Object.assign(globalThis, { React });

const source =
  '## Anamnesi recente\nVertigine acuta.\n## Anamnesi patologica remota\nNega diabete.\n## Anamnesi familiare\nTesto familiare separato.';

test('legacy history proposal selects an explicit remote block, preserves negations and never overrides text', () => {
  const value = { patologicaProssima: source, note: 'Nota operatore' };
  assert.equal(legacyPastHistoryProposal(value), '## Anamnesi patologica remota\nNega diabete.');
  assert.equal(
    legacyPastHistoryProposal({ ...value, patologicaRemota: 'Testo rivisto manualmente' }),
    '',
  );
  assert.equal(
    legacyPastHistoryProposal({ patologicaProssima: 'Malattia recente e patologie generiche' }),
    '',
  );
  assert.equal(value.patologicaProssima, source);
});

test('removed editing cards stay absent in chart/intake; retained fields, allergies and previous source remain readable', () => {
  for (const mode of ['patient-chart', 'intake'] as const) {
    const markup = renderToStaticMarkup(
      createElement(AnamnesisEditor, {
        mode,
        value: {
          patologicaProssima: source,
          patologicaRemota: 'Storia confermata',
          fisiologica: 'Valore precedente',
          abitudini: 'Testo precedente',
        },
        onChange: () => assert.fail('render must not mutate data'),
      }),
    );
    const headings = [...markup.matchAll(/<h3[^>]*>(.*?)<\/h3>/g)].map((match) => match[1]);
    assert.deepEqual(headings, [
      'Allergie',
      'Patologie note e interventi pregressi',
      'Note aggiuntive',
    ]);
    assert.ok(markup.includes('Storia confermata'));
    assert.ok(markup.includes('Testo clinico precedente e fonte'));
    assert.ok(markup.includes('Valore precedente'));
  }
});

test('history/source survive confirmation without inferred replacements or dropping hidden legacy values', () => {
  const value = {
    patologicaProssima: source,
    patologicaRemota: 'Testo manuale',
    fisiologica: 'Funzione precedente',
    familiare: 'Storia familiare',
    note: 'Nota manuale',
  };
  const confirmed = buildConfirmCartella({ anamnesi: value });
  assert.deepEqual(confirmed.anamnesi, value);
  const rows = previousClinicalText(value);
  assert.deepEqual(
    rows.map((row) => row.value),
    [source, 'Funzione precedente', 'Storia familiare'],
  );
});

test('confirmation summary uses retained past history and notes, never relabels generic history', () => {
  const markup = renderToStaticMarkup(
    createElement(StepVerifica, {
      data: {
        anamnesi: {
          patologicaProssima: 'Generico da non classificare',
          patologicaRemota: 'Pregresso intervento verificato',
          note: 'Nota manuale',
        },
      },
      busy: false,
      error: null,
      onConfirm: () => {},
      onUpdateSection: () => {},
    }),
  );
  assert.ok(markup.includes('Patologie note e interventi pregressi'));
  assert.ok(markup.includes('Pregresso intervento verificato'));
  assert.ok(markup.includes('Nota manuale'));
  assert.equal(markup.includes('Generico da non classificare'), false);
});

test('printed PS document shows each current diagnosis once and keeps documented prior history separate', () => {
  const markup = renderToStaticMarkup(
    createElement(InvioPSModal, {
      paziente: {
        id: 'synthetic-preview',
        firstName: 'Persona',
        lastName: 'Sintetica',
      } as Paziente,
      cartella: {
        diagnosi: [
          { descrizione: 'Trauma recente sintetico', stato: 'attiva', tipo: 'principale' },
        ],
        patologiaIngresso: 'Trauma recente sintetico',
        anamnesi: {
          patologicaRemota: 'Pregresso intervento sintetico',
          note: 'Nota manuale sintetica',
        },
      } as CartellaPaziente,
      onClose: () => {},
    }),
  );
  assert.equal(markup.split('Trauma recente sintetico').length - 1, 1);
  assert.ok(markup.includes('Diagnosi attuali / di dimissione:'));
  assert.ok(markup.includes('Patologie note e interventi pregressi:'));
  assert.ok(markup.includes('Pregresso intervento sintetico'));
  assert.ok(markup.includes('Nota manuale sintetica'));
});
