import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RosterOrderContext } from '../../shared/RosterOrderContext';
import { RosterOrderControl } from '../../shared/RosterOrderControl';
import { RosterDefaultsPanel } from '../../admin/RosterDefaultsPanel';
import { PatientRoster } from '../PatientRoster';
import { TherapySlotModal } from '../TherapySlotModal';
import { createRosterOrderController } from '../../../lib/rosterOrderController';
import type { RosterOrderController } from '../../../lib/useRosterOrder';
import {
  rosterMetadata,
  rosterPreference,
  missingRosterProfile,
} from '../../../lib/__tests__/rosterOrder.fixtures';
import {
  identityPatient,
  identityHomonym,
  identityTherapySlot,
} from './operationalIdentity.fixtures';

Object.assign(globalThis, { React });
const render = (element: React.ReactElement) => renderToStaticMarkup(element);
const controller = createRosterOrderController('/api', { headers: () => ({}) });
const state: RosterOrderController = {
  ...controller.getSnapshot(),
  options: {},
  requestKey: 'synthetic',
  choose: controller.choose,
  refresh: controller.refresh,
  accept: controller.accept,
  recover: controller.recover,
};
function controls(patch: Partial<RosterOrderController>) {
  return render(
    React.createElement(
      RosterOrderContext.Provider,
      { value: { ...state, ...patch } },
      React.createElement(
        React.Fragment,
        {},
        React.createElement(RosterOrderControl),
        React.createElement(RosterDefaultsPanel),
      ),
    ),
  );
}

test('pending and unverified server order stay visibly temporary, without claiming a saved preference', () => {
  const pending = controls({ loading: true });
  assert.match(pending, /Caricamento ordine/);
  assert.match(pending, /disabled=""/);
  const ready = controls({
    ready: true,
    loading: true,
    metadata: rosterMetadata,
    order: rosterMetadata.order,
  });
  assert.match(ready, /Reparto sintetico A · Ordine temporaneo/);
  assert.match(ready, /value="location" selected=""/);
  assert.doesNotMatch(
    ready,
    /Preferenza personale|Usa predefinito reparto|Ordine predefinito dei reparti/,
  );
});

test('personal and department authority are independent and missing profiles expose no false save affordance', () => {
  const personal = controls({
    ready: true,
    preference: { ...rosterPreference, source: 'personal' },
    temporary: false,
  });
  assert.match(personal, /Preferenza personale|Usa predefinito reparto/);
  assert.doesNotMatch(personal, /Ordine predefinito dei reparti/);
  const manager = controls({
    ready: true,
    preference: { ...missingRosterProfile, canEditDefault: true },
  });
  assert.match(manager, /Ordine predefinito dei reparti/);
  assert.doesNotMatch(manager, /Usa predefinito reparto|Preferenza personale/);
  const missing = controls({ ready: true, preference: missingRosterProfile });
  assert.match(missing, /Contesto non disponibile · Ordine temporaneo/);
  assert.doesNotMatch(missing, /Usa predefinito reparto|Ordine predefinito dei reparti/);
});

test('legacy columns retain usable controls and explicitly limit temporary ordering to loaded patients', () => {
  const props: React.ComponentProps<typeof PatientRoster> = {
    patients: [identityPatient, identityHomonym],
    sort: { field: 'fiscalCode', direction: 'desc' },
    localSortActive: true,
    serverCriterion: 'location',
    onSortChange() {},
    hasMore: true,
    loading: false,
    summaryMap: new Map(),
    consegneAperteMap: new Map(),
    anomalie: {
      perPaziente: new Map(),
      pazienti: [],
      inCorso: false,
      verificaIncompleta: false,
      fallito: false,
    },
    deleteEnabled: false,
    deletingId: null,
    onSelect() {},
    onDelete() {},
  };
  const local = render(React.createElement(PatientRoster, props));
  assert.match(local, /Ordine temporaneo/);
  assert.match(local, /Solo pazienti caricati/);
  for (const label of ['ricovero', 'segnalazioni'])
    assert.ok(local.includes(`Ordina per ${label}`));
  // il codice fiscale resta ordinabile dal selettore dell'ordinamento
  assert.match(local, /<option value="fiscalCode" selected="">/);
  const server = render(React.createElement(PatientRoster, { ...props, localSortActive: false }));
  assert.match(server, /Camera e letto/);
  assert.match(server, /Ordine reparto su tutte le pagine/);
  assert.doesNotMatch(server, /Solo pazienti caricati|Ordine temporaneo/);
});

test('therapy modal preserves a deliberately non-alphabetical server order and the original action identifiers', () => {
  const [first, second] = identityTherapySlot.patients;
  const slot = {
    ...identityTherapySlot,
    patients: [
      { ...first, firstName: 'Zeno', lastName: 'Zeta' },
      { ...second, firstName: 'Ada', lastName: 'Alfa' },
    ],
  };
  const html = render(
    React.createElement(TherapySlotModal, { slot, date: '2026-09-23', onClose() {} }),
  );
  assert.ok(html.indexOf('Zeta') < html.indexOf('Alfa'));
  assert.match(html, /Erogata: Zeta, Zeno/);
  assert.match(html, /Erogata: Alfa, Ada/);
  assert.equal(slot.patients[0].administrations[0].therapyId, first.administrations[0].therapyId);
});
