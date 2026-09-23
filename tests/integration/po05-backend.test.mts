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

test('bounded PDF reader verifies once, preserves deterministic page bytes/order and evicts', async () => {
  const bytes = await makePdf(30),
    descriptor = {
      id: 'source',
      mimeType: 'application/pdf',
      sizeBytes: bytes.length,
      sha256: sha(bytes),
    };
  const original = { ...descriptor, dataBase64: bytes.toString('base64'), storagePath: 'missing' };
  let reads = 0;
  const reader = pdf.createPageReader(async () => {
    reads++;
    return original;
  });
  for (let n = 1; n <= 30; n++)
    assert.equal(sha(await reader.read(descriptor, n)), sha(await pdf.singlePage(original, n)));
  assert.equal(reads, 1);
  reader.clear();
  await reader.read(descriptor, 1);
  assert.equal(reads, 2);
  const m = {
    version: 1,
    groups: [{ id: 'g', label: 'Lettera', sortOrder: 0 }],
    pages: [3, 1, 2].map((n, i) => ({
      id: `p${n}`,
      documentId: 'source',
      sourcePageNumber: n,
      groupId: 'g',
      sortOrder: i,
    })),
  };
  const grouped = await PDFDocument.load(await pdf.groupPdf(m, 'g', async () => original));
  assert.deepEqual(
    grouped.getPages().map((p: any) => p.getWidth()),
    [203, 201, 202],
  );
  await assert.rejects(
    pdf.verifiedBytes({ ...original, dataBase64: Buffer.from('corrupt').toString('base64') }),
    errorCode('source_integrity'),
  );
});

test(
  'page 17 failure preserves 29 OCR checkpoints; retry performs one page and one extraction',
  async () => {
    const job = await session(30);
    let starts = 0;
    await withRuntime(
      (unit: any) => {
        if (unit.mode === 'ocr' && ++starts === 17)
          return { status: 'failed', error: { kind: 'provider_error' } };
        return {};
      },
      async (rt) => {
        await lifecycle.processPages(job.id, { expectedRevision: job.manifest.revision });
        await worker.runNextPageJob({ pollMs: 1 });
        let current = await repo.getPageJob(job.id);
        assert.equal(current.status, 'retryable_error');
        assert.equal(current.progress.completedPages, 29);
        assert.equal(current.progress.failedPages, 1);
        await lifecycle.processPages(job.id, { expectedRevision: job.manifest.revision }, true);
        await worker.runNextPageJob({ pollMs: 1 });
        current = await repo.getPageJob(job.id);
        assert.equal(current.status, 'review_ready');
        assert.equal(current.progress.completedPages, 30);
        assert.equal(current.progress.completedGroups, 1);
        assert.equal(
          rt.events.filter((e: any) => e.action === 'start' && e.mode === 'ocr').length,
          31,
        );
        assert.equal(
          rt.events.filter((e: any) => e.action === 'start' && e.mode === 'extraction').length,
          1,
        );
        const units = await prisma.importProcessingUnit.findMany({ where: { jobId: job.id } });
        assert.ok(units.every((u: any) => u.outputHash));
      },
    );
  },
  { timeout: 30000 },
);

test(
  'lost create/run/retry responses and runtime 404 recover without duplicate application units',
  async () => {
    for (const lost of ['create', 'run', 'retry', 'restart']) {
      const job = await session();
      let first = true;
      await withRuntime(
        (u: any) => {
          if (lost === 'retry' && u.mode === 'ocr' && first) {
            first = false;
            return { status: 'failed', error: { kind: 'provider_error' } };
          }
          return {};
        },
        async (rt) => {
          if (lost === 'create' || lost === 'run' || lost === 'restart')
            rt.dropNext(lost === 'restart' ? 'run' : lost);
          await lifecycle.processPages(job.id, { expectedRevision: job.manifest.revision });
          await worker.runNextPageJob({ pollMs: 1 });
          assert.equal((await repo.getPageJob(job.id)).status, 'retryable_error');
          if (lost === 'restart') rt.forgetAll();
          if (lost === 'retry') rt.dropNext('retry');
          await lifecycle.processPages(job.id, { expectedRevision: job.manifest.revision }, true);
          await worker.runNextPageJob({ pollMs: 1 });
          if (lost === 'retry') {
            assert.equal((await repo.getPageJob(job.id)).status, 'retryable_error');
            await lifecycle.processPages(job.id, { expectedRevision: job.manifest.revision }, true);
            await worker.runNextPageJob({ pollMs: 1 });
          }
          assert.equal((await repo.getPageJob(job.id)).status, 'review_ready');
          assert.equal(await prisma.importProcessingUnit.count({ where: { jobId: job.id } }), 2);
          assert.equal(
            rt.events.filter((e: any) => e.action === 'start' && e.mode === 'ocr').length,
            lost === 'retry' || lost === 'restart' ? 2 : 1,
          );
        },
      );
    }
  },
  { timeout: 30000 },
);

test('attempt mismatch, disguised truncation and invalid extraction schema never complete', async () => {
  for (const scenario of ['attempt', 'truncated', 'schema']) {
    const job = await session();
    await withRuntime(
      (u: any) =>
        scenario === 'attempt'
          ? { resultOverrides: { attempt: u.attempt - 1 } }
          : scenario === 'truncated'
            ? { finish_reason: 'length', truncated: false }
            : u.mode === 'extraction'
              ? { data: { anagrafica: { sesso: 'X' }, cartella: { farmaci: 'invalid' } } }
              : {},
      async () => {
        await lifecycle.processPages(job.id, { expectedRevision: job.manifest.revision });
        await worker.runNextPageJob({ pollMs: 1 });
        const current = await repo.getPageJob(job.id);
        assert.equal(current.status, 'retryable_error');
        const failed = await prisma.importProcessingUnit.findFirstOrThrow({
          where: { jobId: job.id, status: 'failed' },
        });
        assert.equal(
          failed.errorCode,
          scenario === 'attempt'
            ? 'runtime_contract'
            : scenario === 'truncated'
              ? 'output_truncated'
              : 'extraction_schema',
        );
        assert.equal(failed.result, null);
        assert.equal(
          (await prisma.importJob.findUniqueOrThrow({ where: { id: job.id } })).resultData,
          null,
        );
        if (scenario === 'truncated')
          await assert.rejects(
            lifecycle.processPages(job.id, { expectedRevision: job.manifest.revision }, true),
            errorCode('requires_new_input'),
          );
      },
    );
  }
});

test('only expired leases are reclaimed; concurrent workers claim once and stale run cannot persist', async () => {
  const job = await session(2);
  let release: () => void = () => {};
  const blocked = new Promise<void>((r) => (release = r));
  let running = false;
  await withRuntime(
    async (u: any) => {
      if (u.mode === 'ocr') {
        running = true;
        await blocked;
      }
      return {};
    },
    async (rt) => {
      await lifecycle.processPages(job.id, { expectedRevision: job.manifest.revision });
      const first = worker.runNextPageJob({ pollMs: 1 });
      await waitFor(async () => running);
      assert.equal(await worker.runNextPageJob({ pollMs: 1 }), false);
      assert.equal(await worker.reclaimPageRuns(), 0);
      await lifecycle.reopenPages(job.id, { expectedRevision: job.manifest.revision });
      release();
      await first;
      assert.equal((await repo.getPageJob(job.id)).status, 'uploaded');
      assert.equal(
        await prisma.importProcessingUnit.count({ where: { jobId: job.id, status: 'completed' } }),
        0,
      );
      assert.equal(rt.events.filter((e: any) => e.action === 'start').length, 1);
    },
  );
  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      status: 'processing_pages',
      runToken: 'expired',
      runRevision: job.manifest.revision,
      leaseExpiresAt: new Date(Date.now() - 1000),
    },
  });
  assert.equal(await worker.reclaimPageRuns(), 1);
  await lifecycle.cancelPages(job.id);
});

test('duplicate/rejected replay and identical manifest preserve ready revision, source and token', async () => {
  const job = await session();
  await resultFor(job);
  const document = await prisma.importDocument.findFirstOrThrow({ where: { jobId: job.id } });
  const meta = {
    requestId: randomUUID(),
    expectedRevision: job.manifest.revision,
    groupId: job.manifest.groups[0].id,
    items: [{ clientFileId: randomUUID() }],
  };
  const file = {
    filename: document.filename,
    declaredMime: document.mimeType,
    data: Buffer.from(document.dataBase64, 'base64'),
  };
  const before = await prisma.importJob.findUniqueOrThrow({ where: { id: job.id } });
  for (let n = 0; n < 2; n++) {
    const reply = await uploads.addPageFiles(job.id, [file], meta);
    assert.equal(reply.outcomes[0].status, 'duplicate');
    assert.equal(reply.job.status, 'review_ready');
    assert.equal(reply.job.manifest.revision, before.manifestRevision);
  }
  const same = await lifecycle.editManifest(job.id, {
    requestId: randomUUID(),
    expectedRevision: job.manifest.revision,
    groups: job.manifest.groups,
    pages: job.manifest.pages,
  });
  assert.equal(same.status, 'review_ready');
  const invalidMeta = { ...meta, requestId: randomUUID() };
  await uploads.addPageFiles(job.id, [{ ...file, data: Buffer.from('invalid1') }], invalidMeta);
  await assert.rejects(
    uploads.addPageFiles(job.id, [{ ...file, data: Buffer.from('invalid2') }], invalidMeta),
    errorCode('idempotency_conflict'),
  );
});
