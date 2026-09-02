import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const inlineEditor = readFileSync(
  new URL('../../components/shared/InlineEditableField.tsx', import.meta.url),
  'utf8',
);
const intake = readFileSync(
  new URL('../../components/operator/cartella/PresaInCaricoTab.tsx', import.meta.url),
  'utf8',
);
const styles = readFileSync(new URL('../../app-additions.css', import.meta.url), 'utf8');
const patientStyles = readFileSync(
  new URL('../../components/operator/PatientRecordData.css', import.meta.url),
  'utf8',
);

test('inline key-value editing uses one accessible whole-row trigger', () => {
  assert.match(inlineEditor, /className=\{`pic-row inline-edit-row/);
  assert.match(inlineEditor, /aria-label=\{`Modifica \$\{label\}/);
  assert.match(inlineEditor, /ref=\{triggerRef\}/);
  assert.match(inlineEditor, /triggerRef\.current\?\.focus\(\)/);
  assert.match(styles, /\.inline-edit-row:hover,[\s\S]*?\.inline-edit-row:focus-visible/);
  assert.match(styles, /box-shadow: inset 0 0 0 2px/);
  assert.match(patientStyles, /\.inline-edit-row:is\(:hover, :focus-visible\)/);
  assert.match(patientStyles, /\.pic-row--danger:is\(:hover, :focus-visible\)/);
});

test('inline editor supports compact date/time and keyboard save or cancel', () => {
  assert.match(
    inlineEditor,
    /InlineFieldType =\s*[\s\S]*?'date'[\s\S]*?'time'[\s\S]*?'datetime-local'/,
  );
  assert.match(inlineEditor, /e\.key === 'Escape'[\s\S]*?cancel\(\)/);
  assert.match(inlineEditor, /type === 'textarea'[\s\S]*?e\.ctrlKey \|\| e\.metaKey/);
  assert.match(inlineEditor, /aria-invalid=\{!!error\}/);
  assert.match(inlineEditor, /role="alert"/);
});

test('presa in carico exposes direct editing for fields previously locked behind the long form', () => {
  for (const field of [
    'documentiRicevuti',
    'documentiMancanti',
    'materialeConsegnato',
    'operatore',
    'sigla',
    'note',
  ]) {
    assert.match(intake, new RegExp(`onSave=\\{\\(v\\) => saveField\\(\\{ ${field}:`));
  }
  assert.match(intake, /label="Data \/ Ora"[\s\S]*?type="datetime-local"/);
  assert.match(intake, /saveField\(\{ dataIngresso, oraIngresso \}\)/);
  assert.match(intake, /label="Camera \/ Letto"[\s\S]*?v\.split\('\/'\)/);
  assert.match(intake, /saveField\(\{ camera: camera\.trim\(\), letto:/);
  assert.match(intake, /tone=\{safePic\.documentiMancanti \? 'danger' : 'default'\}/);
});
