import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const surface = readFileSync(
  new URL('../../components/shared/AccessibleDialogSurface.tsx', import.meta.url),
  'utf8',
);
const intake = readFileSync(
  new URL('../../components/shared/intake/IntakeWorkspace.tsx', import.meta.url),
  'utf8',
);

test('only the topmost shared dialog owns keyboard events', () => {
  assert.match(surface, /const dialogStack: HTMLDivElement\[\] = \[\]/);
  assert.match(surface, /dialogStack\.push\(dialog\)/);
  assert.match(surface, /dialogStack\.at\(-1\) !== dialog/);
  assert.match(surface, /dialogStack\.lastIndexOf\(dialog\)/);
  assert.match(surface, /dialogStack\.splice\(stackIndex, 1\)/);
});

test('patient intake participates in the shared dialog stack and protects submission', () => {
  assert.match(intake, /<AccessibleDialogSurface/);
  assert.match(intake, /labelledBy="patient-intake-dialog-title"/);
  assert.match(intake, /dismissible=\{!submitting\}/);
  assert.match(intake, /closeOnOverlay=\{false\}/);
  assert.match(intake, /surfaceClassName="modal-card"/);
  assert.match(intake, /id="patient-intake-dialog-title"/);
  assert.match(intake, /data-dialog-initial-focus/);
  assert.doesNotMatch(intake, /className="modal-overlay"/);
});
