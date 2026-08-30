import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const surface = readFileSync(
  new URL('../../components/shared/AccessibleDialogSurface.tsx', import.meta.url),
  'utf8',
);
const confirmDialog = readFileSync(
  new URL('../../components/shared/ConfirmDialog.tsx', import.meta.url),
  'utf8',
);

test('shared surface supports alert dialogs without changing its dialog default', () => {
  assert.match(surface, /dialogRole\?: 'dialog' \| 'alertdialog'/);
  assert.match(surface, /dialogRole = 'dialog'/);
  assert.match(surface, /role=\{dialogRole\}/);
});

test('confirmations inherit stack-safe focus, dismissal and restore behavior', () => {
  assert.match(confirmDialog, /<AccessibleDialogSurface/);
  assert.match(confirmDialog, /labelledBy=\{titleId\}/);
  assert.match(confirmDialog, /describedBy=\{messageId\}/);
  assert.match(confirmDialog, /dialogRole="alertdialog"/);
  assert.match(confirmDialog, /dismissible=\{!busy\}/);
  assert.match(confirmDialog, /data-dialog-initial-focus/);
  assert.match(confirmDialog, /const dialogId = useId\(\)/);
  assert.doesNotMatch(confirmDialog, /className="modal-overlay"/);
  assert.doesNotMatch(confirmDialog, /addEventListener/);
  assert.doesNotMatch(confirmDialog, /confirmRef/);
});
