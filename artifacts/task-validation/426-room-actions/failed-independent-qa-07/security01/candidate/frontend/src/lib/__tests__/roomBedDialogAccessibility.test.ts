import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const roomsManagement = readFileSync(
  new URL('../../components/admin/RoomsManagement.tsx', import.meta.url),
  'utf8',
);
const bedDialog = readFileSync(new URL('../../components/admin/BedEditDialog.tsx', import.meta.url), 'utf8');
const editorSource = roomsManagement + bedDialog;

test('bed editing uses the shared keyboard-safe dialog and a single-flight save', () => {
  assert.match(editorSource, /<AccessibleDialogSurface/);
  assert.match(editorSource, /labelledBy="bed-edit-dialog-title"/);
  assert.match(editorSource, /dismissible=\{!bedSaving\}/);
  assert.match(editorSource, /id="bed-edit-dialog-title"/);
  assert.match(bedDialog, /aria-label=\{`Chiudi \$\{title\}`\}/);
  assert.match(bedDialog, /bedEditName\(target\.label, target\.roomNumber\)/);
  assert.match(editorSource, /data-dialog-initial-focus/);
  assert.match(editorSource, /htmlFor="bed-edit-status"/);
  assert.match(editorSource, /htmlFor="bed-edit-notes"/);
  assert.match(roomsManagement, /if \(!lettoEdit \|\| bedSaveInFlight\.current\) return/);
  assert.match(roomsManagement, /bedSaveInFlight\.current = true/);
  assert.match(
    roomsManagement,
    /finally \{\s*bedSaveInFlight\.current = false;\s*setBedSaving\(false\)/,
  );
  assert.match(editorSource, /disabled=\{bedSaving\}/);
  assert.equal(editorSource.match(/disabled=\{bedSaving\}/g)?.length, 5);
  assert.match(editorSource, /bedSaving \? 'Salvataggio…' : 'Salva'/);
});
