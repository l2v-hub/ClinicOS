import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import InvioPSModal, { EmergencyReasonField, EmergencySourceNotice } from '../InvioPSModal';
import { setCurrentOperator } from '../../../lib/operatorSession';
import { setSessionCapabilities } from '../../../lib/capabilities';
import type { Paziente, CartellaPaziente } from '../../../types';
const patient = { id: 'synthetic-ps', firstName: 'Persona', lastName: 'Sintetica' } as Paziente;
function chart(label: string): CartellaPaziente {
  return {
    pazienteId: patient.id,
    allergie: [],
    diagnosi: [],
    anamnesi: {},
    indicatoriRischio: [],
    parametriVitali: [
      {
        id: 'critical',
        etichetta: label,
        valore: '88',
        unita: '%',
        stato: 'critico',
        rilevato: new Date().toISOString(),
      },
    ],
  } as unknown as CartellaPaziente;
}

test('unverifiable and partial source notices remain visible in printable markup', () => {
  for (const state of ['unverifiable', 'partial'] as const) {
    const html = renderToStaticMarkup(
      createElement(EmergencySourceNotice, {
        source: 'diary',
        status: { state, detail: 'Fonte non disponibile.' },
      }),
    );
    assert.match(html, /non verificabile, compilare a mano/);
    assert.match(html, /data-ps-source="diary"/);
    assert.doesNotMatch(html, /no-print|Nessuna nota/);
  }
});

test('print depends only on a reason even while context loads and all read capabilities are denied', () => {
  setSessionCapabilities({});
  try {
    const html = renderToStaticMarkup(
      createElement(InvioPSModal, {
        paziente: patient,
        cartella: chart('SpO₂'),
        onClose: () => {},
      }),
    );
    const print = html.match(/<button[^>]*data-invio-ps-print[^>]*>/)![0];
    assert.doesNotMatch(print, /disabled/);
    assert.match(html, /Fonte non verificabile, compilare a mano/);
    assert.doesNotMatch(html, /assenza di dosi verificata|Nessuna terapia attiva registrata/);
  } finally {
    setSessionCapabilities(null);
  }
});

test('12000 pasted characters survive the textarea change and printable field without maxLength', () => {
  const reason = 'a'.repeat(12000);
  let changed = '';
  const element = EmergencyReasonField({
    reason,
    disabled: false,
    onChange: (value) => {
      changed = value;
    },
  });
  const textarea = element.props.children.find(
    (child: { type?: string }) => child?.type === 'textarea',
  );
  textarea.props.onChange({ target: { value: reason } });
  assert.equal(changed, reason);
  assert.equal(textarea.props.value.length, 12000);
  assert.equal(textarea.props.maxLength, undefined);
  const html = renderToStaticMarkup(element);
  assert.ok(html.includes(`>${reason}</textarea>`));
  assert.ok(html.includes(`>${reason}</p>`));
  assert.match(html, /role="alert" data-ps-reason-limit/);
  assert.match(html, /limite di 2000 caratteri/);
});

test('an over-limit reason remains fully printable and disables only new PS registration', () => {
  setCurrentOperator({ id: 'synthetic-operator', role: 'infermiere' });
  try {
    const label = 'a'.repeat(12000);
    const html = renderToStaticMarkup(
      createElement(InvioPSModal, {
        paziente: patient,
        cartella: chart(label),
        onClose: () => {},
        onTemporaryPsExit: async () => {
          throw new Error('Printing must never write');
        },
      }),
    );
    assert.ok(html.includes(label));
    assert.match(html, /data-ps-reason-limit/);
    assert.match(html, /data-ps-exit-submit="true" disabled=""/);
    assert.doesNotMatch(html.match(/<button[^>]*data-invio-ps-print[^>]*>/)![0], /disabled/);
  } finally {
    setCurrentOperator(null);
  }
});
