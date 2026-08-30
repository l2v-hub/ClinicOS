import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appointmentForm = readFileSync(
  new URL('../../components/shared/AppointmentForm.tsx', import.meta.url),
  'utf8',
);

test('shared appointment form uses the keyboard-safe dialog surface', () => {
  assert.match(appointmentForm, /<AccessibleDialogSurface/);
  assert.match(appointmentForm, /labelledBy="appointment-dialog-title"/);
  assert.match(appointmentForm, /onClose=\{onCancel\}/);
  assert.match(appointmentForm, /dismissible=\{!saving\}/);
  assert.match(appointmentForm, /id="appointment-dialog-title"/);
  assert.match(appointmentForm, /aria-label="Chiudi"/);
  assert.match(appointmentForm, /data-dialog-initial-focus/);
  assert.match(appointmentForm, /disabled=\{saving\}/);
  assert.match(appointmentForm, /catch \{/);
  assert.match(appointmentForm, /finally \{\s*setSaving\(false\)/);
  assert.doesNotMatch(appointmentForm, /className="modal-overlay"/);
});
