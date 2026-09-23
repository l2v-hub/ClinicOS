import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import {
  actor,
  PDFDocument,
  prisma,
  uploads,
  lifecycle,
  worker,
  repo,
  pdf,
  review,
  drafts,
  mutations,
  archive,
  confirm,
  cleanup,
  sha,
  errorCode,
  makePdf,
  session,
  withRuntime,
  waitFor,
  resultFor,
  twoGroups,
} from '../fixtures/po05-backend.mts';

test('native PostgreSQL concurrent draft/job confirmations share one patient for legacy and page sessions', async () => {
  for (const pageSession of [false, true]) {
    const job = await session();
    let result;
    if (pageSession) result = await resultFor(job);
    else
      await prisma.importJob.update({
        where: { id: job.id },
        data: { manifest: null, maxPages: null, status: 'review_ready' },
      });
    const draft = pageSession
      ? await drafts.seedDraftFromImport(job.id, { createdById: actor.id })
      : await prisma.patientIntakeDraft.create({
          data: { importJobId: job.id, createdById: actor.id, data: {} },
        });
    const payload = {
      patient: { firstName: 'Persona', lastName: `Concorrente${randomUUID()}` },
      ...(result ? { _importSource: result._source } : {}),
    };
    const replies = await Promise.all([
      confirm.confirmJob(job.id, payload, actor),
      confirm.confirmDraft(draft.id, payload, actor),
      confirm.confirmJob(job.id, payload, actor),
    ]);
    assert.equal(replies.filter((r: any) => r.status === 'created').length, 1);
    assert.equal(new Set(replies.map((r: any) => r.patient.id)).size, 1);
    assert.equal(
      await prisma.patientDocument.count({ where: { patientId: replies[0].patient.id } }),
      pageSession ? 2 : 1,
    );
  }
});

test('conflict defer cannot prescribe; selecting a candidate never imports the other therapy', async () => {
  const job = await twoGroups(await session(2));
  const [a, b] = job.manifest.groups.map((g: any) => g.id);
  const raw = {
    [a]: '## TERAPIA\nTESTDRUG 10 MG (OS) 1 Cpr ore 08:00',
    [b]: '## TERAPIA\nTESTDRUG 20 MG (OS) 1 Cpr ore 08:00',
  };
  const full = {
    [a]: { anagrafica: {}, cartella: { farmaci: [{ nome: 'TESTDRUG', dosaggio: '10 MG' }] } },
    [b]: { anagrafica: {}, cartella: { farmaci: [{ nome: 'TESTDRUG', dosaggio: '20 MG' }] } },
  };
  let result = await resultFor(job, raw, full);
  await assert.rejects(
    drafts.seedDraftFromImport(job.id, { createdById: actor.id }),
    errorCode('unresolved_conflicts'),
  );
  const conflict = result._conflicts[0];
  await review.saveReview(job.id, {
    ...result._source,
    decisions: [{ conflictId: conflict.id, action: 'defer' }],
  });
  let draft = await drafts.seedDraftFromImport(job.id, { createdById: actor.id });
  assert.equal(draft.version, 0);
  assert.equal(draft.data.terapiaImport.length, 2);
  assert.ok(
    draft.data.terapiaImport.every((r: any) => r.excludedFromConfirm && r.conflictDeferred),
  );
  const rows = structuredClone(draft.data.terapiaImport);
  rows[0].excludedFromConfirm = false;
  await assert.rejects(
    drafts.patchDraft(draft.id, { expectedDraftVersion: 0, terapiaImport: rows }),
    errorCode('conflict_deferred'),
  );
  await review.saveReview(job.id, {
    ...result._source,
    decisions: [
      { conflictId: conflict.id, action: 'select', candidateId: conflict.candidates[0].id },
    ],
  });
  await assert.rejects(
    confirm.confirmDraft(
      draft.id,
      { patient: { firstName: 'Persona', lastName: 'Conflitto' } },
      actor,
    ),
    errorCode('import_review_outdated'),
  );
  draft = await mutations.refreshImportDraft(draft.id, {
    requestId: randomUUID(),
    expectedDraftVersion: 0,
    ...result._source,
  });
  assert.equal(draft.data.terapiaImport.filter((r: any) => r.conflictDeferred).length, 1);
  const source = await import('../../backend/src/ai/upload/pages/draft-source.js');
  const deferred = structuredClone(result);
  deferred._review = {
    decisions: [{ conflictId: conflict.id, action: 'defer' }],
    unresolvedConflictIds: [],
  };
  for (const group of deferred._groups)
    group._narrative.therapyText = 'UNMAPPEDNAME 10 MG (OS) 1 Cpr ore 08:00';
  const conservative = source.pageTherapyRows(deferred);
  assert.equal(conservative.length, 1);
  assert.equal(conservative[0].excludedFromConfirm, true);
});

test('refresh preserves edits, makes changed rows stale, CAS/replay protects autosave and proposals add once', async () => {
  const job = await session(),
    g = job.manifest.groups[0].id;
  const original = 'TESTDRUG 10 MG (OS) 1 Cpr ore 08:00';
  let result = await resultFor(job, { [g]: `## TERAPIA\n${original}` });
  let draft = await drafts.seedDraftFromImport(job.id, { createdById: actor.id });
  const savedRows = draft.data.terapiaImport.map((r: any) => ({
    ...r,
    stato: 'ok',
    reviewedTherapy: { farmacoNome: 'Nome corretto manualmente' },
  }));
  draft = await drafts.patchDraft(draft.id, {
    expectedDraftVersion: 0,
    anagrafica: { firstName: 'Corretto', lastName: 'Manuale' },
    terapia: [{ farmacoNome: 'MANUAL' }],
    terapiaImport: savedRows,
  });
  result = await resultFor(job, {
    [g]: `## TERAPIA\n${original}\nNEWDRUG 5 MG (OS) 1 Cpr ore 12:00`,
  });
  const body = { requestId: randomUUID(), expectedDraftVersion: draft.version, ...result._source };
  draft = await mutations.refreshImportDraft(draft.id, body);
  assert.deepEqual(draft.data.anagrafica, { firstName: 'Corretto', lastName: 'Manuale' });
  assert.equal(draft.data.terapia[0].farmacoNome, 'MANUAL');
  assert.equal(
    draft.data.terapiaImport[0].reviewedTherapy.farmacoNome,
    'Nome corretto manualmente',
  );
  assert.equal(draft.data.terapiaImport[0].sourceOutdated, true);
  assert.equal(draft.data.terapiaImport[0].stato, 'da_verificare');
  assert.equal(draft.data._importProposals.length, 1);
  assert.equal((await mutations.refreshImportDraft(draft.id, body)).version, draft.version);
  await assert.rejects(
    drafts.patchDraft(draft.id, { expectedDraftVersion: 1, anagrafica: { firstName: 'Stale' } }),
    errorCode('draft_version_conflict'),
  );
  const proposal = draft.data._importProposals[0];
  const decide = { requestId: randomUUID(), expectedDraftVersion: draft.version, action: 'add' };
  draft = await mutations.decideImportProposal(draft.id, proposal.id, decide);
  assert.equal(draft.data.terapiaImport.length, 2);
  assert.equal(
    (await mutations.decideImportProposal(draft.id, proposal.id, decide)).version,
    draft.version,
  );
  const verified = structuredClone(draft.data.terapiaImport);
  verified[0] = {
    ...verified[0],
    sourceOutdated: false,
    sourceReviewHash: result._source.resultHash,
    stato: 'ok',
  };
  const patch = { expectedDraftVersion: draft.version, terapiaImport: verified };
  const next = await drafts.patchDraft(draft.id, patch);
  assert.equal((await drafts.patchDraft(draft.id, patch)).version, next.version);
  const races = await Promise.allSettled([
    drafts.patchDraft(draft.id, {
      expectedDraftVersion: next.version,
      anagrafica: { firstName: 'One' },
    }),
    drafts.patchDraft(draft.id, {
      expectedDraftVersion: next.version,
      anagrafica: { firstName: 'Two' },
    }),
  ]);
  assert.equal(races.filter((r) => r.status === 'fulfilled').length, 1);
  const conflict = races.find((r) => r.status === 'rejected') as PromiseRejectedResult;
  assert.equal(conflict.reason.code, 'draft_version_conflict');
  assert.ok(conflict.reason.details.draft);
});

test('reordering equal therapies across groups preserves one reviewed row and creates no proposal', async () => {
  let job = await twoGroups(await session(2));
  const raw = Object.fromEntries(
    job.manifest.groups.map((g: any) => [g.id, '## TERAPIA\nTESTDRUG 10 MG (OS) 1 Cpr ore 08:00']),
  );
  await resultFor(job, raw);
  let draft = await drafts.seedDraftFromImport(job.id, { createdById: actor.id });
  assert.equal(draft.data.terapiaImport.length, 1);
  draft = await drafts.patchDraft(draft.id, {
    expectedDraftVersion: 0,
    terapiaImport: draft.data.terapiaImport.map((r: any) => ({
      ...r,
      stato: 'ok',
      reviewedTherapy: { farmacoNome: 'TESTDRUG' },
    })),
  });
  job = await lifecycle.editManifest(job.id, {
    requestId: randomUUID(),
    expectedRevision: job.manifest.revision,
    groups: [...job.manifest.groups].reverse().map((g: any, i: number) => ({ ...g, sortOrder: i })),
    pages: job.manifest.pages,
  });
  const result = await resultFor(job, raw);
  draft = await mutations.refreshImportDraft(draft.id, {
    requestId: randomUUID(),
    expectedDraftVersion: draft.version,
    ...result._source,
  });
  assert.equal(draft.data.terapiaImport.length, 1);
  assert.equal(draft.data.terapiaImport[0].stato, 'ok');
  assert.equal(draft.data.terapiaImport[0].sourceOutdated, false);
  assert.equal(draft.data._importProposals.length, 0);
});

test('archive binds prepared sources, atomically stores original/group PDFs, replay creates no duplicates', async () => {
  const job = await twoGroups(await session(2));
  const result = await resultFor(job);
  const draft = await drafts.seedDraftFromImport(job.id, { createdById: actor.id });
  const prepared = await archive.preparePageArchive({ draftId: draft.id }, actor);
  const before = await prisma.patient.count();
  const row = await prisma.importJob.findUniqueOrThrow({ where: { id: job.id } });
  assert.throws(
    () =>
      archive.assertPreparedPageArchive(
        { ...row, manifestRevision: row.manifestRevision + 1 },
        draft.data,
        prepared,
      ),
    errorCode('import_review_outdated'),
  );
  const payload = {
    patient: { firstName: 'Persona', lastName: `Archivio${randomUUID()}` },
    _importSource: result._source,
  };
  const confirmed = await confirm.confirmDraft(draft.id, payload, actor);
  assert.equal(confirmed.status, 'created');
  assert.equal(await prisma.patient.count(), before + 1);
  const archived = await prisma.patientDocument.findMany({
    where: { patientId: confirmed.patient.id },
    orderBy: { sortOrder: 'asc' },
  });
  assert.equal(archived.length, 3);
  assert.equal(archived.filter((d: any) => d.sourceManifest.kind === 'group').length, 2);
  for (const doc of archived) {
    assert.equal(sha(Buffer.from(doc.dataBase64, 'base64')), doc.sha256);
    assert.equal(doc.sourceManifest.resultHash, result._source.resultHash);
  }
  assert.equal((await confirm.confirmDraft(draft.id, payload, actor)).status, 'idempotent');
  assert.equal(
    await prisma.patientDocument.count({ where: { patientId: confirmed.patient.id } }),
    3,
  );
  const corrupt = await session();
  await resultFor(corrupt);
  const invalid = await drafts.seedDraftFromImport(corrupt.id, { createdById: actor.id });
  await prisma.importDocument.updateMany({
    where: { jobId: corrupt.id },
    data: { dataBase64: 'Y29ycnVwdA==' },
  });
  const count = await prisma.patient.count();
  await assert.rejects(
    confirm.confirmDraft(
      invalid.id,
      { patient: { firstName: 'Persona', lastName: 'Rollback' } },
      actor,
    ),
    errorCode('source_integrity'),
  );
  assert.equal(await prisma.patient.count(), count);
  assert.equal((await drafts.getDraft(invalid.id)).status, 'draft');
});

test('cleanup removes temporary PHI and receipts, preserves draft, and skips active leases', async () => {
  const job = await session();
  await resultFor(job);
  const draft = await drafts.seedDraftFromImport(job.id, { createdById: actor.id });
  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      expiresAt: new Date(Date.now() - 10000),
      status: 'processing_pages',
      runToken: 'active',
      runRevision: job.manifest.revision,
      leaseExpiresAt: new Date(Date.now() + 60000),
    },
  });
  assert.equal(await cleanup.expirePageSessions(), 0);
  await lifecycle.cancelPages(job.id);
  const row = await prisma.importJob.findUniqueOrThrow({ where: { id: job.id } });
  assert.equal(row.resultData, null);
  assert.equal(row.resultSummary, null);
  assert.equal(row.runToken, null);
  assert.deepEqual(row.manifest, { version: 1, groups: [], pages: [] });
  assert.equal(await prisma.importMutation.count({ where: { jobId: job.id } }), 0);
  assert.ok(await drafts.getDraft(draft.id));
  const expiring = await session();
  await prisma.importJob.update({
    where: { id: expiring.id },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  assert.equal(await cleanup.expirePageSessions(), 1);
  assert.equal((await repo.getPageJob(expiring.id)).status, 'expired');
  const renewed = await session();
  await prisma.importJob.update({
    where: { id: renewed.id },
    data: { expiresAt: new Date(Date.now() + 1000) },
  });
  await lifecycle.reopenPages(renewed.id, { expectedRevision: renewed.manifest.revision });
  assert.ok(
    (await prisma.importJob.findUniqueOrThrow({ where: { id: renewed.id } })).expiresAt.getTime() >
      Date.now() + 50000,
  );
});

test('an archive ID collision rolls back patient and document writes inside the confirmation transaction', async () => {
  const job = await session();
  const result = await resultFor(job);
  const draft = await drafts.seedDraftFromImport(job.id, { createdById: actor.id });
  const source = await prisma.importDocument.findFirstOrThrow({ where: { jobId: job.id } });
  const other = await prisma.patient.create({
    data: {
      firstName: 'Archivio',
      lastName: 'Preesistente',
      medicalRecordNumber: randomUUID(),
      registeredById: actor.id,
    },
  });
  await prisma.patientDocument.create({
    data: {
      id: `import-${source.id}`,
      patientId: other.id,
      originalName: 'collisione.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1,
      sha256: 'different',
      dataBase64: 'YQ==',
    },
  });
  const patients = await prisma.patient.count(),
    documents = await prisma.patientDocument.count();
  await assert.rejects(
    confirm.confirmDraft(
      draft.id,
      {
        patient: { firstName: 'Persona', lastName: 'AtomicRollback' },
        _importSource: result._source,
      },
      actor,
    ),
    errorCode('archive_conflict'),
  );
  assert.equal(await prisma.patient.count(), patients);
  assert.equal(await prisma.patientDocument.count(), documents);
  assert.equal((await drafts.getDraft(draft.id)).status, 'draft');
  assert.equal(
    (await prisma.importJob.findUniqueOrThrow({ where: { id: job.id } })).createdPatientId,
    null,
  );
});
