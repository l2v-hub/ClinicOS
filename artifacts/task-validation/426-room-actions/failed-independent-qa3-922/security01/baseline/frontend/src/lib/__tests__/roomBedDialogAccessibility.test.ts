import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const roomsManagement = readFileSync(
  new URL('../../components/admin/RoomsManagement.tsx', import.meta.url),
  'utf8',
);

test('bed editing uses the shared keyboard-safe dialog and a single-flight save', () => {
  assert.match(roomsManagement, /<AccessibleDialogSurface/);
  assert.match(roomsManagement, /labelledBy="bed-edit-dialog-title"/);
  assert.match(roomsManagement, /dismissible=\{!bedSaving\}/);
  assert.match(roomsManagement, /id="bed-edit-dialog-title"/);
  assert.match(roomsManagement, /aria-label="Chiudi modifica letto"/);
  assert.match(roomsManagement, /data-dialog-initial-focus/);
  assert.match(roomsManagement, /htmlFor="bed-edit-status"/);
  assert.match(roomsManagement, /htmlFor="bed-edit-notes"/);
  assert.match(roomsManagement, /if \(!lettoEdit \|\| bedSaveInFlight\.current\) return/);
  assert.match(roomsManagement, /bedSaveInFlight\.current = true/);
  assert.match(
    roomsManagement,
    /finally \{\s*bedSaveInFlight\.current = false;\s*setBedSaving\(false\)/,
  );
  assert.match(roomsManagement, /disabled=\{bedSaving\}/);
  assert.equal(roomsManagement.match(/disabled=\{bedSaving\}/g)?.length, 5);
  assert.match(roomsManagement, /bedSaving \? 'Salvataggio…' : 'Salva'/);
});
