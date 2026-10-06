import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createConsegnaDraftStore } from '../../../lib/consegnaDrafts';
import { ConsegnaComposer } from '../ConsegnaComposer';
import { ConsegnaQuickAdd } from '../ConsegnaQuickAdd';
import { ConsegnePatientRoster } from '../ConsegnePatientRoster';
import { ConsegneWorkspace, type ConsegneWorkspaceProps } from '../ConsegneWorkspace';
import { identityPatient, identityHomonym, identityHandover } from './operationalIdentity.fixtures';
import { saved } from '../../../lib/__tests__/consegnaGiro.fixtures';
Object.assign(globalThis, { React });
const render = (element: React.ReactElement) => renderToStaticMarkup(element);
const onAdd: ConsegneWorkspaceProps['onAdd'] = async (request) => saved(request);
const feed: ConsegneWorkspaceProps = {
  sessionKey: 'synthetic-session',
  consegne: [identityHandover],
  summary: { total: 1, urgentActive: 0, urgentTaken: 0 },
  operatori: [],
  operatoreId: 'test',
  isAdmin: false,
  onAdd,
  onUpdate() {},
  onAcknowledge() {},
  onDelete() {},
  loading: false,
  loadError: null,
  hasMore: false,
  onQueryChange() {},
  onLoadMore() {},
  onRetry() {},
};

test('handover workspace has one patient round and legacy feed entry returns to that workspace', () => {
  const general = render(React.createElement(ConsegneWorkspace, feed));
  assert.match(general, /Giro pazienti|Feed consegne|Caricamento pazienti/);
  assert.doesNotMatch(general, /Solo dati sintetici/);
  const explicit = render(
    React.createElement(ConsegneWorkspace, {
      ...feed,
      entry: { mode: 'feed', key: 1, query: { status: 'attive' }, focusId: identityHandover.id },
    }),
  );
  assert.doesNotMatch(explicit, /Feed consegne|Solo dati sintetici/);
  assert.match(explicit, /Caricamento pazienti/);
});

test('composer retains patient-specific draft and identity after remount; permitted assignment is visible', () => {
  const store = createConsegnaDraftStore();
  store.update(identityPatient.id, { note: 'Bozza solo A', priorita: 'urgente' });
  const component = () =>
    React.createElement(ConsegnaComposer, {
      patient: identityPatient,
      store,
      operatori: [],
      onSave() {},
      nextAvailable: true,
    });
  const first = render(component());
  const again = render(component());
  for (const html of [first, again]) {
    assert.match(html, /Bozza solo A/);
    assert.match(html, /RSSMRA80A01H501U/);
    assert.match(html, /Assegna a|Salva e prossimo/);
  }
  const other = render(
    React.createElement(ConsegnaComposer, {
      patient: identityHomonym,
      store,
      operatori: [],
      onSave() {},
    }),
  );
  assert.doesNotMatch(other, /Bozza solo A/);
  assert.match(other, /15\/06\/1975/);
});

test('roster always opens the patient diary instead of duplicating summaries', () => {
  const html = render(
    React.createElement(ConsegnePatientRoster, {
      patients: [identityPatient],
      summaries: { [identityPatient.id]: { status: 'error' } },
      store: createConsegnaDraftStore(),
      onSelect() {},
      onRetry() {},
    }),
  );
  assert.match(html, /aria-label="Diario di Rossi, Mario"/);
  assert.match(html, /title="Apri diario paziente"/);
  assert.match(html, /<a[^>]*class="ds-icon-btn handover-rounds__diary"[^>]*>[\s\S]*?<svg/);
  assert.ok(html.includes(`#/dettaglio-paziente/${identityPatient.id}`));
  assert.doesNotMatch(html, /Riprova riepilogo|Riepilogo non disponibile/);
});

test('uncertain save keeps fields locked and exposes exact retry, deleted outcome never offers advance', () => {
  const store = createConsegnaDraftStore();
  store.update(identityPatient.id, { note: 'Bozza' });
  const token = store.begin(identityPatient.id)!;
  store.finish(token, {
    kind: 'failed',
    uncertain: true,
    code: 'unverified',
    message: 'Esito non verificato',
  });
  let html = render(
    React.createElement(ConsegnaComposer, {
      patient: identityPatient,
      store,
      operatori: [],
      onSave() {},
      nextAvailable: true,
    }),
  );
  assert.match(html, /Riprova salvataggio/);
  assert.match(html, /disabled=""[^>]*>Salva e prossimo/);
  const retry = store.begin(identityPatient.id)!;
  store.finish(retry, {
    kind: 'failed',
    uncertain: false,
    code: 'consegna_creation_deleted',
    message: 'Eliminata',
  });
  html = render(
    React.createElement(ConsegnaComposer, {
      patient: identityPatient,
      store,
      operatori: [],
      onSave() {},
      nextAvailable: true,
    }),
  );
  assert.match(html, /Eliminata/);
  assert.match(html, /Scarta bozza/);
});

test('both PatientDetail entry points share receipt-backed quick-add and keep the same draft', () => {
  const store = createConsegnaDraftStore();
  store.update(identityPatient.id, { note: 'Bozza rapida' });
  const html = render(
    React.createElement(ConsegnaQuickAdd, {
      patient: identityPatient,
      operatori: [],
      onAdd,
      onClose() {},
      draftStore: store,
    }),
  );
  assert.match(html, /Bozza rapida|Chiudi · conserva bozza/);
  const token = store.begin(identityPatient.id)!;
  store.finish(token, saved(token.request));
  const refreshed = render(
    React.createElement(ConsegnaQuickAdd, {
      patient: identityPatient,
      operatori: [],
      onAdd,
      onClose() {},
      draftStore: store,
    }),
  );
  assert.match(refreshed, /Consegna salvata per Rossi, Mario/);
  assert.doesNotMatch(refreshed, /Bozza rapida/);
});
