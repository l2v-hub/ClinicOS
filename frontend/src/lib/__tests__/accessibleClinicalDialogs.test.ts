import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dialogSurface = readFileSync(
  new URL('../../components/shared/AccessibleDialogSurface.tsx', import.meta.url),
  'utf8',
);
const patientDetail = readFileSync(
  new URL('../../components/operator/PatientDetail.tsx', import.meta.url),
  'utf8',
);

const clinicalDialogs = ['diagnosi', 'farmaci', 'parametri', 'consegne', 'allergie', 'camera'];

test('shared clinical dialog surface owns keyboard focus and restores its trigger', () => {
  assert.match(dialogSurface, /role="dialog"/);
  assert.match(dialogSurface, /aria-modal="true"/);
  assert.match(dialogSurface, /aria-labelledby=\{labelledBy\}/);
  assert.match(dialogSurface, /aria-describedby=\{describedBy\}/);
  assert.match(dialogSurface, /event\.key === 'Escape'/);
  assert.match(dialogSurface, /event\.key !== 'Tab'/);
  assert.match(dialogSurface, /getClientRects\(\)\.length > 0/);
  assert.match(dialogSurface, /data-dialog-initial-focus/);
  assert.match(dialogSurface, /trigger\?\.isConnected/);
  assert.match(dialogSurface, /trigger\.focus\(\)/);
  assert.match(dialogSurface, /dismissibleRef\.current/);
  assert.match(dialogSurface, /onCloseRef\.current\(\)/);
  assert.match(dialogSurface, /event\.target === event\.currentTarget/);
});

test('all PatientDetail clinical cards use the accessible dialog contract', () => {
  assert.equal(patientDetail.match(/<AccessibleDialogSurface/g)?.length, clinicalDialogs.length);
  assert.equal(patientDetail.match(/data-dialog-initial-focus/g)?.length, clinicalDialogs.length);
  assert.doesNotMatch(patientDetail, /className="modal-overlay"/);

  for (const dialog of clinicalDialogs) {
    assert.match(patientDetail, new RegExp(`labelledBy="patient-${dialog}-dialog-title"`));
    assert.match(patientDetail, new RegExp(`describedBy="patient-${dialog}-dialog-description"`));
    assert.match(patientDetail, new RegExp(`id="patient-${dialog}-dialog-title"`));
    assert.match(patientDetail, new RegExp(`id="patient-${dialog}-dialog-description"`));
  }

  assert.match(patientDetail, /aria-label="Chiudi"/);
  assert.match(patientDetail, /\{showInvioPS && \(/);
  assert.match(patientDetail, /<InvioPSModal/);
});
