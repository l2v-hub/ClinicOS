import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArchiveEmptyState, isEmptyArchive } from '../ArchiveEmptyState';
import { ArchiveResultList } from '../ArchiveResultList';
import { ARCHIVE_CATEGORIES, DOCUMENT_TYPE_LABELS } from '../../../../lib/patientDocumentArchive';
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_UPLOAD_MAX_BYTES,
} from '../../../../lib/patientDocumentArchiveIO';
Object.assign(globalThis, { React });

test('423 empty is complete combined archive only, never loading/error or filtered zero', () => {
  assert.equal(isEmptyArchive('ready', 0), true);
  for (const status of ['loading', 'error'] as const)
    assert.equal(isEmptyArchive(status, 0), false);
  assert.equal(isEmptyArchive('ready', 1), false);
});

test('423 authorized empty has next step and native closed taxonomy disclosure, not management controls', () => {
  const html = renderToStaticMarkup(
    React.createElement(ArchiveEmptyState, {
      canAdd: true,
      onAdd: () => {},
    }),
  );
  assert.match(html, /Nessun documento/);
  assert.match(html, />Aggiungi documento</);
  assert.match(html, /scegli il tipo/i);
  assert.match(html, /Salva documento/);
  assert.match(html, /PDF, JPEG, JPG o PNG/);
  assert.match(html, /15 MB/);
  assert.equal(DOCUMENT_UPLOAD_MAX_BYTES, 15 * 1024 * 1024);
  assert.match(DOCUMENT_ACCEPT, /\.pdf,\.jpeg,\.jpg,\.png/);
  assert.match(html, /<details[^>]*><summary/);
  assert.doesNotMatch(
    html,
    /<details[^>]* open|Stampa selezionati|Seleziona documenti visibili|Cerca nell/,
  );
  assert.equal(ARCHIVE_CATEGORIES.length, 10);
  for (const category of ARCHIVE_CATEGORIES) assert.ok(html.includes(category.label));
  assert.match(html, /sezione Moduli/);
});

test('423 read-only empty explains limitation and actual organizational referent without add action', () => {
  const html = renderToStaticMarkup(
    React.createElement(ArchiveEmptyState, {
      canAdd: false,
      onAdd: () => {
        throw Error('must not call');
      },
    }),
  );
  assert.match(html, /Il tuo ruolo non può aggiungere documenti/);
  assert.match(html, /coordinatore|amministrazione/);
  assert.doesNotMatch(html, />Aggiungi documento</);
  assert.match(html, /Categorie disponibili/);
});

test('423 upload taxonomy retains existing non-assessment types', () => {
  const types = ARCHIVE_CATEGORIES.filter((c) => c.id !== 'valutazioni').flatMap((c) => c.types);
  assert.equal(types.length, 22);
  assert.equal(new Set(types).size, types.length);
  assert.equal((types as readonly string[]).includes('patient_assessment'), false);
  for (const type of types) assert.equal(typeof DOCUMENT_TYPE_LABELS[type], 'string');
});

test('423 populated list respects save/classify gates, keeps read/print and escapes document titles', () => {
  const entry = {
    id: 'record:qa-only',
    type: 'altro' as const,
    title: '<img src=x onerror=alert(1)>',
    date: '2026-10-10',
    archived: false,
    unavailable: false,
    record: {
      id: 'qa-only',
      tipo: 'altro' as const,
      descrizione: 'Synthetic',
      dataConsegna: '2026-10-10',
      stato: 'ricevuto' as const,
      firmatoDA: 'non_firmato',
      operatore: 'QA Synthetic',
    },
    document: {
      id: 'qa-document',
      originalName: 'synthetic.pdf',
      documentType: 'altro',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      createdAt: '2026-10-10T00:00:00Z',
    },
  };
  const render = (canSave: boolean) =>
    renderToStaticMarkup(
      React.createElement(ArchiveResultList, {
        entries: [entry],
        selected: new Set<string>(),
        complete: true,
        formOpen: false,
        saving: false,
        canSave,
        onToggle: () => {},
        onPreview: () => {},
        onEdit: () => {},
        onRemove: () => {},
      }),
    );
  let html = render(false);
  assert.doesNotMatch(html, /Modifica dettagli|Rimuovi scheda|<img/);
  assert.match(html, /Visualizza/);
  assert.match(html, /Seleziona per la stampa/);
  assert.match(html, /&lt;img/);
  html = render(true);
  assert.match(html, /Modifica dettagli/);
  assert.match(html, /Rimuovi scheda/);
});
