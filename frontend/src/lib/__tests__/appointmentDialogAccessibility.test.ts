import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppointmentForm } from '../../components/shared/AppointmentForm';

Object.assign(globalThis, { React });

const appointmentForm = readFileSync(
  new URL('../../components/shared/AppointmentForm.tsx', import.meta.url),
  'utf8',
);

test('shared appointment form uses the keyboard-safe dialog surface', () => {
  assert.match(appointmentForm, /<AccessibleDialogSurface/);
  assert.match(appointmentForm, /labelledBy=\{titleId\}/);
  assert.match(appointmentForm, /onClose=\{onCancel\}/);
  assert.match(appointmentForm, /dismissible=\{!saving\}/);
  assert.match(appointmentForm, /id=\{titleId\}/);
  assert.match(appointmentForm, /aria-label="Chiudi"/);
  assert.match(appointmentForm, /data-dialog-initial-focus/);
  assert.match(appointmentForm, /disabled=\{saving\}/);
  assert.match(appointmentForm, /catch \{/);
  assert.match(appointmentForm, /finally \{\s*setSaving\(false\)/);
  assert.doesNotMatch(appointmentForm, /className="modal-overlay"/);
});

const props = {
  data: '2026-10-09',
  ora: '14:00',
  operatoreId: 'QA-OP-405',
  operatori: [],
  onSave: async () => null,
  onCancel: () => {},
};
const render = (count = 1) =>
  renderToStaticMarkup(
    React.createElement(
      React.Fragment,
      {},
      ...Array.from({ length: count }, (_, index) =>
        React.createElement(AppointmentForm, { ...props, key: index }),
      ),
    ),
  );

test('every create field has one visible associated label, not placeholder-only naming', () => {
  const html = render();
  const labels = [...html.matchAll(/<label[^>]*for="([^"]+)"[^>]*>([\s\S]*?)<\/label>/g)];
  assert.deepEqual(
    labels.map((match) => match[2].replace(/<span[^>]*>[\s\S]*?<\/span>/g, '').trim()),
    [
      'Paziente',
      'Data',
      'Ora',
      'Durata',
      'Tipo intervento',
      'Priorità',
      'Operatore',
      'Camera (opz.)',
      'Stato',
      'Note cliniche',
    ],
  );
  for (const match of labels) {
    const controls = [...html.matchAll(/<(?:input|select|textarea)\b[^>]*\sid="([^"]+)"/g)].filter(
      (control) => control[1] === match[1],
    );
    assert.equal(controls.length, 1, match[2]);
  }
});
test('multiple appointment forms use unique control, help and title ids', () => {
  const html = render(2);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  const labels = [...html.matchAll(/for="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(labels).size, labels.length);
  const headings = [...html.matchAll(/aria-labelledby="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(headings.length, 2);
  assert.equal(new Set(headings).size, 2);
  headings.forEach((id) => assert.ok(ids.includes(id)));
});
test('save error is announced and described by dialog and save control, not attributed to arbitrary fields', () => {
  assert.match(appointmentForm, /describedBy=\{saveError \? errorId : undefined\}/);
  assert.match(appointmentForm, /aria-describedby=\{saveError \? errorId : undefined\}/);
  assert.match(appointmentForm, /id=\{errorId\}/);
  assert.match(appointmentForm, /role="alert"/);
  assert.doesNotMatch(appointmentForm, /aria-invalid=\{.*saveError/);
});
