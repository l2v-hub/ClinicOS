import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import test from 'node:test';

// Explicit opt-in, loopback disposable database only; never resolve a project .env target.
test(
  'archive originals survive confirmation and failures roll back on PostgreSQL',
  {
    skip: process.env.ARCHIVE_DOCUMENT_DB_TEST !== '1',
  },
  async (t) => {
    const target = new URL(process.env.DATABASE_URL ?? '');
    assert.ok(['localhost', '127.0.0.1'].includes(target.hostname));
    assert.equal(target.pathname, '/clinicos_sorting');
    const { prisma } = await import('../../lib/prisma.js');
    const { confirmJob, confirmDraft } = await import('../upload/confirm-service.js');
    const { createDraft } = await import('../../intake/draft-service.js');
    const { applyLegacyIntakeDocument } = await import('../../intake/legacy-apply.js');
    const { persistImportDocuments } = await import('../upload/import-document-archive.js');
    const { listPatientDocuments, getPatientDocumentContent } =
      await import('../upload/patient-documents.js');
    const { createTestOperator } = await import('../../test-support/operator-fixture.js');
    const runId = `TEST-ARCHIVE-${randomUUID()}`;
    const patientIds: string[] = [];
    const jobIds: string[] = [];
    const draftIds: string[] = [];
    const legacyIds: string[] = [];
    const cleanupOperator = await createTestOperator(runId, `${runId.toLowerCase()}@example.test`);
    const identity = {
      firstName: 'IntakeMock',
      lastName: 'Sintetico',
      dateOfBirth: '1970-01-01',
      phone: '+39 333 000 0000',
      codiceFiscale: 'NTKSNT70A01H501G',
    };
    async function job(bytes: Buffer[], missingLast = false) {
      const created = await prisma.importJob.create({
        data: {
          id: `${runId}-job-${jobIds.length}`,
          status: 'review_ready',
          createdById: runId,
          maxFiles: 10,
          maxTotalBytes: 1_000_000,
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
      jobIds.push(created.id);
      for (const [index, buffer] of bytes.entries()) {
        await prisma.importDocument.create({
          data: {
            id: `${created.id}-source-${index}`,
            jobId: created.id,
            filename: 'originale.pdf',
            mimeType: 'application/pdf',
            sizeBytes: buffer.length,
            sha256: createHash('sha256').update(buffer).digest('hex'),
            dataBase64:
              missingLast && index === bytes.length - 1 ? null : buffer.toString('base64'),
            storagePath: '',
            sortOrder: index,
            status: 'uploaded',
          },
        });
      }
      return created;
    }
    async function patient() {
      const id = `${runId}-patient-${patientIds.length}`;
      const created = await prisma.patient.create({
        data: {
          id,
          medicalRecordNumber: id,
          firstName: 'Synthetic',
          lastName: 'Archive',
          dateOfBirth: new Date('1970-01-01'),
          registeredById: runId,
        },
      });
      patientIds.push(id);
      return created;
    }
    const bytes = [Buffer.from('%PDF-1.4 synthetic A'), Buffer.from('%PDF-1.4 synthetic B')];
    try {
      await t.test(
        'existing patient confirmation archives every source and remains idempotent',
        async () => {
          const p = await patient();
          const j = await job(bytes);
          const payload = { patient: identity, mode: 'existing' as const, patientId: p.id };
          assert.equal((await confirmJob(j.id, payload, { id: runId })).status, 'updated');
          assert.equal((await confirmJob(j.id, payload, { id: runId })).status, 'idempotent');
          const page = await listPatientDocuments(p.id, { limit: 50 });
          assert.equal(page.total, 2);
          assert.equal(page.documents.length, 2);
          for (const [index, document] of page.documents.entries()) {
            assert.equal(document.documentType, 'discharge_import');
            assert.deepEqual(
              (await getPatientDocumentContent(p.id, document.id))?.buffer,
              bytes[index],
            );
            assert.equal(await getPatientDocumentContent('foreign-patient', document.id), null);
          }
        },
      );
      await t.test(
        'missing original rolls back existing chart update and prevents confirmed status',
        async () => {
          const p = await patient();
          await prisma.cartella.create({
            data: { patientId: p.id, data: { note: 'synthetic before' } },
          });
          const j = await job(bytes, true);
          await assert.rejects(
            confirmJob(
              j.id,
              {
                patient: identity,
                mode: 'existing',
                patientId: p.id,
                cartella: { note: 'synthetic after' },
              },
              { id: runId },
            ),
            /La conferma non è stata salvata/,
          );
          assert.deepEqual(
            (await prisma.cartella.findUniqueOrThrow({ where: { patientId: p.id } })).data,
            { note: 'synthetic before' },
          );
          assert.equal(
            (await prisma.importJob.findUniqueOrThrow({ where: { id: j.id } })).status,
            'review_ready',
          );
          assert.equal(await prisma.patientDocument.count({ where: { patientId: p.id } }), 0);
        },
      );
      await t.test(
        'new intake patient and draft confirmation roll back when a source is unavailable',
        async () => {
          const j = await job(bytes, true);
          const draft = await createDraft({
            createdById: runId,
            source: 'import',
            importJobId: j.id,
          });
          draftIds.push(draft.id);
          const before = await prisma.patient.count({ where: { registeredById: runId } });
          await assert.rejects(
            confirmDraft(draft.id, { patient: identity }, { id: runId }),
            /La conferma non è stata salvata/,
          );
          assert.equal(await prisma.patient.count({ where: { registeredById: runId } }), before);
          assert.equal(
            (await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: draft.id } })).status,
            'draft',
          );
          await prisma.importDocument.updateMany({
            where: { jobId: j.id, sortOrder: 1 },
            data: { dataBase64: bytes[1].toString('base64') },
          });
          const result = await confirmDraft(draft.id, { patient: identity }, { id: runId });
          assert.equal(result.status, 'created');
          patientIds.push(result.patient!.id);
          assert.equal((await listPatientDocuments(result.patient!.id, { limit: 50 })).total, 2);
        },
      );
      await t.test('concurrent source copies do not duplicate files', async () => {
        const p = await patient();
        const j = await job(bytes);
        await Promise.all(
          [1, 2].map(() => prisma.$transaction((tx) => persistImportDocuments(tx, p.id, j.id))),
        );
        assert.equal(await prisma.patientDocument.count({ where: { patientId: p.id } }), 2);
      });
      await t.test(
        'legacy apply persists the original in the canonical list and rolls back corrupt bytes',
        async () => {
          const p = await patient();
          for (const valid of [true, false]) {
            const original = await prisma.patientIntakeDocument.create({
              data: {
                id: `${runId}-legacy-${legacyIds.length}`,
                fileName: 'legacy-synthetic.pdf',
                fileType: 'application/pdf',
                fileData: valid
                  ? bytes[0].toString('base64')
                  : Buffer.from('invalid synthetic').toString('base64'),
                status: 'extracted',
                createdAt: new Date('2026-01-01T00:00:00Z'),
              },
            });
            legacyIds.push(original.id);
            const apply = () =>
              prisma.$transaction((tx) =>
                applyLegacyIntakeDocument(tx, { documentId: original.id, patientId: p.id }),
              );
            if (valid) {
              assert.equal(await apply(), 'applied');
              assert.equal(await apply(), 'unavailable');
              const archived = await listPatientDocuments(p.id, { limit: 50 });
              assert.equal(archived.total, 1);
              assert.equal(archived.documents[0].documentType, 'lettera_dimissione');
              assert.equal(archived.documents[0].createdAt, original.createdAt.toISOString());
              assert.deepEqual(
                (await getPatientDocumentContent(p.id, archived.documents[0].id))?.buffer,
                bytes[0],
              );
              assert.equal(
                (
                  await prisma.patientIntakeDocument.findUniqueOrThrow({
                    where: { id: original.id },
                  })
                ).fileData,
                original.fileData,
              );
            } else {
              await assert.rejects(apply(), /Originale non disponibile o non valido/);
              const unchanged = await prisma.patientIntakeDocument.findUniqueOrThrow({
                where: { id: original.id },
              });
              assert.equal(unchanged.status, 'extracted');
              assert.equal(unchanged.patientId, null);
            }
          }
        },
      );
    } finally {
      await prisma.patientIntakeDocument.deleteMany({ where: { id: { in: legacyIds } } });
      await prisma.patientIntakeDraft.deleteMany({ where: { id: { in: draftIds } } });
      await prisma.importJob.deleteMany({ where: { id: { in: jobIds } } });
      await prisma.patient.deleteMany({ where: { id: { in: patientIds } } });
      await cleanupOperator();
      await prisma.$disconnect();
    }
  },
);
