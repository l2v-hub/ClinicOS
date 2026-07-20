// backend/src/intake/__tests__/confirm-draft-guards.test.ts
// F5 #124 — clinical-safety regression guard.
// confirmDraft (the NEW import path) must enforce the SAME hard blocks confirmJob
// enforces: REQ-026 allergy-conflict block + BUG-051 section-loss block.
// Same node:test / node:assert pattern as seed-draft-from-import.test.ts.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedDraftFromImport } from '../draft-service.js';
import { confirmDraft } from '../../ai/upload/confirm-service.js';
import { prisma } from '../../lib/prisma.js';
import type { DischargeNarrativeDraft } from '../../ai/sections/narrative.js';

const NARRATIVE: DischargeNarrativeDraft = {
  schemaVersion: 'clinicos-discharge-narrative-v1',
  firstName: 'Giulia',
  lastName: 'Bianchi',
  dateOfBirth: '1962-07-14',
  placeOfBirth: '',
  sex: '',
  fiscalCode: '',
  address: '',
  phone: '',
  email: '',
  allergyStatus: 'conflicting',
  allergiesText: 'Penicillina (contrastante)',
  diagnosisText: '',
  anamnesisText: '',
  hospitalCourseText: '',
  consultationsText: '',
  imagingDiagnosticsText: '',
  proceduresAndInterventionsText: '',
  therapyText: '',
  adviceAndFollowUpText: '',
  unmappedText: '',
  boldTags: [],
  sourceReferences: [],
  missingSections: [],
  warnings: [],
};

const JOB_DEFAULTS = {
  maxFiles: 5,
  maxTotalBytes: 10 * 1024 * 1024,
  expiresAt: new Date(Date.now() + 86_400_000),
};

const PATIENT = {
  firstName: 'Giulia',
  lastName: 'Bianchi',
  dateOfBirth: '1962-07-14',
  // #294: CF sintetico valido — obbligatorio per ogni creazione paziente.
  codiceFiscale: 'BNCGLI62L54H501N',
};

test('confirmDraft: BLOCKS on allergy conflict; SUCCEEDS with confirmAllergyConflict', async () => {
  // Import job whose sections pass flags allergies as 'conflicting' (REQ-026 trigger).
  const job = await prisma.importJob.create({
    data: {
      ...JOB_DEFAULTS,
      status: 'extracted',
      resultData: {
        _narrative: NARRATIVE,
        _sections: { allergies: { status: 'conflicting' } },
      } as object,
    },
  });

  const draft = await seedDraftFromImport(job.id);
  let createdPatientId: string | undefined;

  try {
    // 1) Without override → hard block with the REQ-026 message.
    await assert.rejects(
      () => confirmDraft(draft.id, { patient: PATIENT }),
      (err: Error) => {
        assert.ok(
          err.message.includes('allergie contrastanti'),
          `Expected allergy-conflict block, got: ${err.message}`,
        );
        return true;
      },
    );

    // Draft must still be 'draft' — nothing persisted.
    const afterBlock = await prisma.patientIntakeDraft.findUnique({ where: { id: draft.id } });
    assert.equal(afterBlock?.status, 'draft', 'draft must remain unconfirmed after block');

    // 2) With explicit override → patient is created.
    const res = await confirmDraft(draft.id, { patient: PATIENT, confirmAllergyConflict: true });
    assert.equal(res.status, 'created', `Expected created, got: ${res.status}`);
    assert.ok(res.patient?.id, 'created patient must have an id');
    createdPatientId = res.patient?.id;
  } finally {
    if (createdPatientId) {
      await prisma.cartella.deleteMany({ where: { patientId: createdPatientId } }).catch(() => {});
      await prisma.patient.delete({ where: { id: createdPatientId } }).catch(() => {});
    }
    await prisma.importAudit.deleteMany({ where: { jobId: job.id } }).catch(() => {});
    await prisma.patientIntakeDraft.deleteMany({ where: { importJobId: job.id } }).catch(() => {});
    await prisma.importJob.delete({ where: { id: job.id } }).catch(() => {});
  }
});
