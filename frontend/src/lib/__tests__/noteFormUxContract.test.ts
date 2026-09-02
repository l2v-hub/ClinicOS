import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const form = readFileSync(
  new URL('../../components/shared/NoteCreateForm.tsx', import.meta.url),
  'utf8',
);
const styles = readFileSync(
  new URL('../../components/shared/NoteCreateForm.css', import.meta.url),
  'utf8',
);
const page = readFileSync(
  new URL('../../components/shared/NotesPage.tsx', import.meta.url),
  'utf8',
);
const app = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
const types = readFileSync(new URL('../../types.ts', import.meta.url), 'utf8');

test('new note is a semantic, explicit and bounded form', () => {
  assert.match(form, /<form[\s\S]*id="nuova-nota-panel"/);
  assert.match(form, /aria-labelledby="new-note-title"/);
  assert.match(form, /aria-busy=\{saving\}/);
  assert.match(form, /onSubmit=\{submit\}/);
  assert.match(form, /<fieldset/);
  assert.match(form, /htmlFor="note-recipient"/);
  assert.match(form, /id="note-recipient"/);
  assert.match(form, /<option value="">Seleziona destinatario<\/option>/);
  assert.match(form, /htmlFor="note-message"/);
  assert.match(form, /id="note-message"/);
  assert.match(form, /maxLength=\{4000\}/);
  assert.match(form, /aria-describedby="note-message-counter"/);
  assert.match(form, /type="submit"/);
  assert.match(form, /disabled=\{!canSubmit\}/);
  assert.match(form, /finally/);
  assert.match(form, /role="alert"/);
  assert.doesNotMatch(form, /style=\{/);
});

test('note creation uses shared patient identity and server-owned fields stay out of input', () => {
  assert.match(form, /<PatientCombobox/);
  assert.match(form, /patient\?\.id/);
  assert.match(types, /export interface NewNotaInput/);
  assert.match(app, /async function addNota\(n: NewNotaInput\)/);
  assert.doesNotMatch(form, /autoreId:/);
  assert.doesNotMatch(form, /autoreNome:/);
  assert.doesNotMatch(form, /destinatarioNome:/);
  assert.doesNotMatch(form, /pazienteNome:/);
  assert.doesNotMatch(form, /stato:/);
  assert.match(page, /<NoteCreateForm/);
});

test('note editor follows the handover responsive hierarchy without horizontal scrolling', () => {
  assert.match(styles, /grid-template-columns:\s*repeat\(12,/);
  assert.match(styles, /@media \(max-width: 900px\)/);
  assert.match(styles, /grid-template-columns:\s*repeat\(2,/);
  assert.match(styles, /@media \(max-width: 639px\)/);
  assert.match(styles, /grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(styles, /min-height:\s*44px/);
  assert.doesNotMatch(styles, /overflow-x:\s*(?:auto|scroll)/);
});
