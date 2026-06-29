// backend/src/intake/__tests__/seed-draft-from-import.test.ts
// TDD: Task 1 — F5 #124 seed import draft from extraction job.
// Uses the same node:test / node:assert pattern as intake-draft.test.ts.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedDraftFromImport } from '../draft-service.js';
import { prisma } from '../../lib/prisma.js';
import type { DischargeNarrativeDraft } from '../../ai/sections/narrative.js';

const NARRATIVE: DischargeNarrativeDraft = {
  schemaVersion: 'clinicos-discharge-narrative-v1',
  firstName: 'Mario',
  lastName: 'Rossi',
  dateOfBirth: '1950-03-02',
  placeOfBirth: '',
  sex: '',
  fiscalCode: '',
  address: '',
  phone: '',
  email: '',
  allergyStatus: 'present',
  allergiesText: 'Penicillina',
  diagnosisText: 'Scompenso cardiaco',
  anamnesisText: 'Iperteso',
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

// Shared minimal ImportJob fields (required by the schema).
const JOB_DEFAULTS = {
  maxFiles: 5,
  maxTotalBytes: 10 * 1024 * 1024,
  expiresAt: new Date(Date.now() + 86_400_000), // 24h from now
};

test('seedDraftFromImport: creates draft seeded from narrative', async () => {
  // Create a minimal ImportJob with the required resultData shape.
  const job = await prisma.importJob.create({
    data: {
      ...JOB_DEFAULTS,
      status: 'extracted',
      resultData: { _narrative: NARRATIVE, _sections: null } as object,
    },
  });

  try {
    const draft = await seedDraftFromImport(job.id);

    // source and importJobId
    assert.equal(draft.source, 'import');
    assert.equal(draft.importJobId, job.id);

    // anagrafica demographics
    const data = draft.data as Record<string, unknown>;
    const ana = data.anagrafica as Record<string, unknown>;
    assert.equal(ana.firstName, 'Mario');
    assert.equal(ana.lastName, 'Rossi');
    assert.equal(ana.dateOfBirth, '1950-03-02');

    // diagnosi — DiagnosisEditor reads Diagnosi[]; assert exact descrizione.
    const diagnosi = data.diagnosi as Array<Record<string, unknown>>;
    assert.ok(Array.isArray(diagnosi) && diagnosi.length === 1, 'diagnosi is single-item array');
    assert.equal(diagnosi[0].descrizione, 'Scompenso cardiaco');
    assert.equal(diagnosi[0].tipo, 'principale');
    assert.equal(diagnosi[0].stato, 'attiva');

    // anamnesi — AnamnesisEditor reads value[key]; assert the exact seeded key.
    const anamnesi = data.anamnesi as Record<string, unknown>;
    assert.equal(anamnesi.patologicaProssima, 'Iperteso');

    // allergie — AllergiesEditor reads AllergiaItem[]; assert exact allergene content.
    const allergie = data.allergie as Array<Record<string, unknown>>;
    assert.ok(Array.isArray(allergie) && allergie.length === 1, 'allergie is single-item array');
    assert.equal(allergie[0].allergene, 'Penicillina');

    // lossless narrative stashed verbatim for confirm-service.
    assert.deepEqual(data._narrative, NARRATIVE);

    // _importedFields lists seeded section keys.
    const imported = data._importedFields as string[];
    assert.ok(Array.isArray(imported));
    assert.ok(imported.includes('anagrafica'));
    assert.ok(imported.includes('diagnosi'));
    assert.ok(imported.includes('anamnesi'));
    assert.ok(imported.includes('allergie'));

    // Idempotency: calling again with the same jobId returns the SAME draft (no second row).
    const draft2 = await seedDraftFromImport(job.id);
    assert.equal(draft2.id, draft.id, 'second call must return same draft id (idempotent)');
  } finally {
    // Cleanup: delete draft (if any) then job.
    await prisma.patientIntakeDraft.deleteMany({ where: { importJobId: job.id } }).catch(() => {});
    await prisma.importJob.delete({ where: { id: job.id } }).catch(() => {});
  }
});

test('seedDraftFromImport: does NOT seed allergie when allergyStatus is explicitly_absent', async () => {
  // A "nessuna allergia nota" discharge has allergiesText but status explicitly_absent.
  // Seeding a real allergy row would create a FALSE clinical record — must be guarded.
  const absentNarrative: DischargeNarrativeDraft = {
    ...NARRATIVE,
    allergyStatus: 'explicitly_absent',
    allergiesText: 'Nessuna allergia nota',
  };
  const job = await prisma.importJob.create({
    data: {
      ...JOB_DEFAULTS,
      status: 'extracted',
      resultData: { _narrative: absentNarrative, _sections: null } as object,
    },
  });

  try {
    const draft = await seedDraftFromImport(job.id);
    const data = draft.data as Record<string, unknown>;

    // No allergy row seeded.
    assert.equal(data.allergie, undefined, 'allergie must NOT be seeded when explicitly_absent');
    const imported = data._importedFields as string[];
    assert.ok(!imported.includes('allergie'), 'allergie must not be in _importedFields');

    // But the status + text are still preserved verbatim in _narrative for the UI.
    const narrative = data._narrative as Record<string, unknown>;
    assert.equal(narrative.allergyStatus, 'explicitly_absent');
    assert.equal(narrative.allergiesText, 'Nessuna allergia nota');
  } finally {
    await prisma.patientIntakeDraft.deleteMany({ where: { importJobId: job.id } }).catch(() => {});
    await prisma.importJob.delete({ where: { id: job.id } }).catch(() => {});
  }
});

test('seedDraftFromImport: throws when job has no _narrative', async () => {
  const job = await prisma.importJob.create({
    data: {
      ...JOB_DEFAULTS,
      status: 'extracted',
      resultData: { _sections: null } as object, // no _narrative
    },
  });

  try {
    await assert.rejects(
      () => seedDraftFromImport(job.id),
      (err: Error) => {
        assert.ok(err.message.includes('_narrative'), `Expected "_narrative" in error: ${err.message}`);
        return true;
      },
    );
  } finally {
    await prisma.importJob.delete({ where: { id: job.id } }).catch(() => {});
  }
});
