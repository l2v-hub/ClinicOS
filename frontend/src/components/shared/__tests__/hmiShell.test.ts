// Guscio HMI 1: titolo della pagina nell'intestazione e turno dall'ora.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PageHeader } from '../PageHeader';
import { TopbarTitleSlot } from '../topbarTitleSlot';
import { TURNO_LABEL, turnoDaOra } from '../../../lib/turno';

// Il test runner usa JSX classico per i TSX importati.
Object.assign(globalThis, { React });

const header = (props: Parameters<typeof PageHeader>[0]) => createElement(PageHeader, props);

test('without the header slot the page keeps breadcrumb, title and actions inline', () => {
  const html = renderToStaticMarkup(
    header({
      breadcrumb: [{ label: 'ClinicOS' }, { label: 'Pazienti' }],
      title: 'Pazienti',
      subtitle: '12 caricati',
      actions: createElement('button', null, 'Nuovo paziente'),
    }),
  );
  assert.match(html, /page-header__breadcrumb/);
  assert.match(html, /<h1 class="page-header__title">Pazienti<\/h1>/);
  assert.match(html, /<p class="page-header__subtitle">12 caricati<\/p>/);
  assert.match(html, /Nuovo paziente/);
  assert.doesNotMatch(html, /page-header--in-topbar/);
});

test('with the header slot the title is portalled into the header (slot branch taken)', () => {
  // Il server renderer non supporta i portal: che lanci proprio quell'errore prova che, con lo
  // spazio dell'intestazione presente, PageHeader porta il titolo lì. La resa effettiva nel
  // browser (titolo nell'intestazione, nessun breadcrumb nel contenuto) è coperta dall'evidenza.
  const slot = { nodeType: 1 } as unknown as HTMLElement;
  assert.throws(
    () =>
      renderToStaticMarkup(
        createElement(
          TopbarTitleSlot.Provider,
          { value: slot },
          header({ breadcrumb: [{ label: 'ClinicOS' }], title: 'Pazienti' }),
        ),
      ),
    /[Pp]ortal/,
  );
});

test('shift from the clock uses the diary bands and the prototype wording', () => {
  const at = (h: number, m = 0) => new Date(2026, 8, 27, h, m);
  assert.equal(turnoDaOra(at(6, 59)), 'notte');
  assert.equal(turnoDaOra(at(7, 0)), 'mattina');
  assert.equal(turnoDaOra(at(13, 59)), 'mattina');
  assert.equal(turnoDaOra(at(14, 0)), 'pomeriggio');
  assert.equal(turnoDaOra(at(20, 59)), 'pomeriggio');
  assert.equal(turnoDaOra(at(21, 0)), 'notte');
  assert.equal(TURNO_LABEL[turnoDaOra(at(8, 20))], 'mattino');
});
