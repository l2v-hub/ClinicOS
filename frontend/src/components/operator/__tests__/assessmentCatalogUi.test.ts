import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AssessmentCatalogView } from '../assessments/AssessmentCatalog';
import { CATALOG_TYPES, type AssessmentCatalogData } from '../../../lib/assessments/assessmentCatalog';
import { ASSESSMENT_VERSIONS } from '../../../lib/assessments/assessmentTypes';
import type { AssessmentCatalogState } from '../../../lib/assessments/assessmentCatalogState';
import type { CartellaPaziente } from '../../../types';
import type { Paziente } from '../../../types';
import { MedicazioniTab } from '../cartella/MedicazioniTab';
import { ContenzioniTab } from '../cartella/ContenzioniTab';
import { ScalaBradenTab } from '../cartella/ScalaBradenTab';
Object.assign(globalThis, { React });
const empty = (): AssessmentCatalogData => ({ items: CATALOG_TYPES.map(type => ({ type, formVersion: ASSESSMENT_VERSIONS[type], latestFinal: null, ownDraftCount: 0, latestOwnDraft: null })) });
const render = (state: AssessmentCatalogState, cartella = {} as CartellaPaziente, localDraftTypes = new Set<string>()) => renderToStaticMarkup(React.createElement(AssessmentCatalogView, { state, cartella, localDraftTypes, onRetry() {}, onOpen() {}, onNrs() {} }));

test('catalog immediately exposes eight routes and new commands with a separate NRS history link', () => {
  const html = render({ status: 'loading', data: null, error: null });
  assert.equal((html.match(/<h4>/g) ?? []).length, 8);
  assert.equal((html.match(/aria-label="Apri /g) ?? []).length, 8);
  assert.equal((html.match(/aria-label="Nuova compilazione /g) ?? []).length, 8);
  assert.match(html, /Assistenza e mobilizzazione/);
  assert.match(html, /Scale di valutazione/);
  assert.match(html, /Storico NRS precedente/);
  assert.match(html, /Caricamento date e bozze/);
  assert.doesNotMatch(html, /Nessuna compilazione finale/);
});
test('metadata error is retryable rather than empty; own-only and local drafts remain reachable', () => {
  const failed = render({ status: 'error', data: null, error: 'Errore controllato' });
  assert.match(failed, /role="alert"/);
  assert.match(failed, /Riprova/);
  assert.doesNotMatch(failed, /Nessuna compilazione finale/);
  const data = empty();
  const row = data.items[4];
  row.ownDraftCount = 2;
  row.latestOwnDraft = { id: 'mine', formVersion: row.formVersion, assessedAt: '2026-09-23T07:00:00.000Z', createdAt: '2026-09-23T07:00:00.000Z', updatedAt: '2026-09-23T08:00:00.000Z' };
  const html = render({ status: 'ready', data, error: null }, {} as CartellaPaziente, new Set(['mna']));
  assert.match(html, /Bozza personale · nessuna compilazione finale/);
  assert.match(html, /Riprendi bozza GDS-15/);
  assert.match(html, /Riprendi bozza MNA/);
  assert.match(html, /Bozza locale da salvare/);
});
test('legacy rows distinguish no compilation, unavailable dates and valid start dates', () => {
  const html = render({ status: 'ready', data: empty(), error: null }, { medicazioniFerite: [], contenzioni: [{ dataInizio: '2026-09-20' }], valutazioniBraden: [{}] } as unknown as CartellaPaziente);
  assert.match(html, /Medicazioni<\/h4><p>Nessuna compilazione/);
  assert.match(html, /Ultimo inizio riportato: 20\/09\/2026/);
  assert.match(html, /Braden<\/h4><p>Data di compilazione non disponibile/);
});
test('legacy new entry opens the existing form while the default remains history and no save is invoked', () => {
  let writes = 0;
  const props = { cartella: { medicazioniFerite: [], contenzioni: [], valutazioniBraden: [] } as unknown as CartellaPaziente, paziente: { id: 'patient-a', firstName: 'Sara', lastName: 'Rossi' } as Paziente, onUpdate: () => { writes++; }, operatoreNome: 'Operatore' };
  for (const Component of [MedicazioniTab, ContenzioniTab, ScalaBradenTab]) {
    const before = renderToStaticMarkup(React.createElement(Component, props));
    const after = renderToStaticMarkup(React.createElement(Component, { ...props, createRequest: 'catalog-new-a' }));
    assert.doesNotMatch(before, /class="cr-inline-form/);
    assert.match(after, /class="cr-inline-form/);
    assert.match(after, /type="date"/);
  }
  assert.equal(writes, 0);
});
