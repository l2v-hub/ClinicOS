import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdessoQueue } from '../AdessoQueue';
import { TurnoHandovers } from '../TurnoHandovers';
import { VitalsOverview } from '../VitalsOverview';
import { HandoverEntryButton } from '../../shared/HandoverEntryButton';
import Sidebar from '../../shared/TeamsLikeSidebar';
import { urgencyTraceText } from '../../../lib/urgency';
import { DashboardNotificationCenter } from '../DashboardNotificationCenter';
import type { AdessoItem } from '../../../lib/adessoQueue';
import type { UtenteApp } from '../../../types';
Object.assign(globalThis, { React });
const render = (component: React.ReactElement) => renderToStaticMarkup(component);
const user: UtenteApp = {
  id: 'reader',
  nome: 'Operatore Test',
  ruolo: 'operatore',
  iniziali: 'OT',
  reparto: 'Reparto Test',
};
test('overdue therapy is not labelled urgent, patient identity and details are distinct', () => {
  const entry: AdessoItem = {
    key: 't1',
    kind: 'terapia-ritardo',
    patientId: 'p1',
    nome: 'Paziente Test Cognome Lungo',
    dettaglio: 'Farmaco Test · 1 compressa · orale',
    tempo: 'In ritardo di 28 min',
    ora: '18:00',
    luogo: 'Camera 101 · Letto A',
    inRitardo: true,
    urgenza: 28,
    landing: { tab: 'terapia-farmacologica' },
  };
  const html = render(
    React.createElement(AdessoQueue, {
      items: [entry],
      terapie: 'ready',
      consegne: 'ready',
      anomalie: 'ready',
      onOpenTherapy() {},
      onOpenConsegne() {},
      onSelectPaziente() {},
    }),
  );
  assert.match(html, /1 in ritardo/);
  assert.doesNotMatch(html, /1 urgenti/);
  assert.match(html, /<strong class="adesso-queue__who">Paziente Test Cognome Lungo/);
  assert.match(html, /adesso-queue__location/);
  assert.match(html, /Apri terapia/);
});
test('both shell entries expose exact count; zero hidden; Note absent for both roles', () => {
  for (const ruolo of ['operatore', 'admin'] as const) {
    const html = render(
      React.createElement(Sidebar, {
        activeKey: 'consegne',
        utente: { ...user, ruolo },
        onNavigate() {},
        criticalHandovers: 12,
      }),
    );
    assert.match(html, /Consegne, 12 note senza conferma di lettura/);
    assert.match(html, /teams-sidebar__badge">12/);
    assert.doesNotMatch(html, />Note</);
  }
  const button = render(
    React.createElement(HandoverEntryButton, { count: 12, state: 'ready', onOpen() {} }),
  );
  assert.match(button, /12 consegne critiche/);
  assert.match(button, /topbar-handovers__badge/);
  assert.doesNotMatch(
    render(React.createElement(HandoverEntryButton, { count: 0, state: 'ready', onOpen() {} })),
    /class="topbar-handovers__badge"/,
  );
  assert.match(
    render(React.createElement(HandoverEntryButton, { count: null, state: 'error', onOpen() {} })),
    /conteggio non disponibile/,
  );
});
test('handover and vital missing states disclose availability without a misleading empty result', () => {
  const error = render(
    React.createElement(TurnoHandovers, {
      overview: null,
      state: 'error',
      onOpen() {},
      onRetry() {},
    }),
  );
  assert.match(error, /Consegne non disponibili/);
  assert.doesNotMatch(error, /Nessuna consegna da mostrare/);
  const vitals = render(
    React.createElement(VitalsOverview, {
      readings: [],
      state: 'ready',
      stale: false,
      onRetry() {},
      onOpenHistory() {},
    }),
  );
  assert.match(vitals, /Espandi ultimi parametri e NEWS2/);
  assert.equal((vitals.match(/>N\/A</g) ?? []).length, 6);
  assert.doesNotMatch(vitals, /non rilevato|class="vt__trend">nessuna rilevazione/i);
  assert.match(vitals, /non calcolabile/);
});
test('historical acknowledgement always shows colleague name, role and time even to acknowledger', () => {
  assert.equal(
    urgencyTraceText(
      {
        state: 'taken',
        isAuthor: false,
        canAcknowledge: false,
        takenBy: {
          operatorName: 'Medico Test',
          operatorRole: 'medico',
          acknowledgedAt: '2026-10-03T08:15:00Z',
          byMe: true,
        },
      },
      new Date('2026-10-03T10:00:00Z'),
    ),
    'Letta e compresa da Medico Test (medico) alle 10:15 · priorità originale: urgente',
  );
});
test('mixed notifications label and count represent the same severity', () => {
  const html = render(
    React.createElement(DashboardNotificationCenter, {
      counts: { alarm: 1, warning: 2, notice: 3, total: 6 },
      sections: [],
      compact: true,
    }),
  );
  assert.match(html, /<span>Allarmi<\/span><strong>1<\/strong>/);
  assert.match(html, /1 allarmi, 2 attenzioni, 3 avvisi/);
});
