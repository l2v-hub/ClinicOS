import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { prisma } from '../../lib/prisma.js';
import { createAssessment, finalizeAssessment, getAssessment } from '../service.js';
import {
  claimAssessmentPdf,
  completeAssessmentPdf,
  failAssessmentPdf,
  retryAssessmentPdf,
} from '../pdf-service.js';
import { renderAssessmentPdf } from '../pdf-renderer.js';
import { actor, patient, input, seed } from './fixture.js';
before(seed);
after(() => prisma.$disconnect());
async function finalized() {
  const created = await createAssessment(patient, input(), actor);
  return (
    await finalizeAssessment(
      patient,
      created.assessment.id,
      { requestId: randomUUID(), expectedVersion: 1 },
      actor,
    )
  ).assessment;
}
async function tinyPdf() {
  const doc = await PDFDocument.create();
  doc.addPage();
  return Buffer.from(await doc.save());
}
test('PDF failure preserves the final and concurrent retries archive exactly one immutable document', async () => {
  const final = await finalized();
  const failed = await retryAssessmentPdf(patient, final.id, actor, async () => {
    throw new Error('synthetic render failure');
  });
  assert.equal(failed.status, 'final');
  assert.equal(failed.pdf!.status, 'failed');
  assert.equal(failed.version, 2);
  assert.equal(failed.updatedAt, final.updatedAt);
  let calls = 0;
  const bytes = await tinyPdf();
  await Promise.all(
    Array.from({ length: 6 }, () =>
      retryAssessmentPdf(patient, final.id, actor, async () => {
        calls++;
        return bytes;
      }),
    ),
  );
  const ready = await getAssessment(patient, final.id, actor);
  assert.equal(ready.pdf!.status, 'ready');
  assert.equal(calls, 1);
  assert.equal(await prisma.patientDocument.count({ where: { assessmentId: final.id } }), 1);
  assert.equal(
    (await retryAssessmentPdf(patient, final.id, actor)).pdf!.documentId,
    ready.pdf!.documentId,
  );
  await assert.rejects(
    prisma.patientDocument.update({
      where: { id: ready.pdf!.documentId! },
      data: { documentType: 'altro' },
    }),
  );
  await assert.rejects(prisma.patientDocument.delete({ where: { id: ready.pdf!.documentId! } }));
});
test('expired lease is recoverable and late success/failure tokens cannot overwrite the new attempt', async () => {
  const final = await finalized(),
    now = new Date();
  const old = await claimAssessmentPdf(patient, final.id, actor, () => now, 10);
  assert(old);
  assert.equal(
    await claimAssessmentPdf(patient, final.id, actor, () => new Date(now.getTime() + 5)),
    null,
  );
  const current = await claimAssessmentPdf(
    patient,
    final.id,
    actor,
    () => new Date(now.getTime() + 20),
  );
  assert(current);
  const bytes = await tinyPdf(),
    later = new Date(now.getTime() + 25);
  assert.equal(await completeAssessmentPdf(old, bytes, actor, () => later), false);
  assert.equal(await failAssessmentPdf(old, actor, new Error('late'), () => later), false);
  assert.equal(await completeAssessmentPdf(current, bytes, actor, () => later), true);
  assert.equal(await completeAssessmentPdf(old, bytes, actor, () => later), false);
  assert.equal(await prisma.patientDocument.count({ where: { assessmentId: final.id } }), 1);
});
async function afterPatientLockWait<T>(action: () => Promise<T>, advanceClock: () => void) {
  let acquired!: () => void, release!: () => void;
  const locked = new Promise<void>((ok) => {
    acquired = ok;
  });
  const gate = new Promise<void>((ok) => {
    release = ok;
  });
  const blocker = prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Patient" WHERE id=${patient} FOR UPDATE`;
    acquired();
    await gate;
  });
  await locked;
  const pending = action();
  // Observe a real blocked FOR SHARE, not merely a scheduled promise.
  try {
    const deadline = Date.now() + 2500;
    while (true) {
      const [{ waiting }] = await prisma.$queryRaw<Array<{ waiting: boolean }>>`
        SELECT EXISTS(SELECT 1 FROM pg_stat_activity
          WHERE datname=current_database() AND wait_event_type='Lock'
            AND query LIKE '%FOR SHARE OF p%') AS waiting`;
      if (waiting) break;
      assert(Date.now() < deadline, 'PDF operation did not wait for the patient lock');
      await new Promise((ok) => setTimeout(ok, 20));
    }
    advanceClock();
  } finally {
    release();
    await blocker;
  }
  return pending;
}

test('PDF claim and callbacks read the clock after database lock waits', async () => {
  const final = await finalized();
  const start = new Date(),
    later = new Date(start.getTime() + 120_000);
  let current = start,
    reads = 0;
  const clock = () => {
    reads++;
    return current;
  };
  const advance = () => {
    assert.equal(reads, 0, 'clock must not be read before acquiring the lock');
    current = later;
  };
  const fresh = await afterPatientLockWait(
    () => claimAssessmentPdf(patient, final.id, actor, clock),
    advance,
  );
  assert(fresh);
  const [lease] = await prisma.$queryRaw<Array<{ milliseconds: number }>>`
    SELECT (extract(epoch FROM "pdfLeaseUntil") * 1000)::float8 AS milliseconds
    FROM "PatientAssessment" WHERE id=${final.id}`;
  assert.equal(lease.milliseconds, later.getTime() + 60_000);
  const expiredAt = new Date(later.getTime() + 120_000);
  const bytes = await tinyPdf();
  for (const action of [
    () => completeAssessmentPdf(fresh, bytes, actor, clock),
    () => failAssessmentPdf(fresh, actor, new Error('late'), clock),
  ]) {
    current = later;
    reads = 0;
    assert.equal(
      await afterPatientLockWait(action, () => {
        assert.equal(reads, 0);
        current = expiredAt;
      }),
      false,
    );
  }
  const persisted = await getAssessment(patient, final.id, actor);
  assert.equal(persisted.pdf!.status, 'pending');
  assert.equal(await prisma.patientDocument.count({ where: { assessmentId: final.id } }), 0);
});

test('renderer preserves Unicode and long text, emits readable PDF metadata and rejects unsupported glyphs', async () => {
  const final = await finalized(),
    snapshot = final.finalSnapshot!;
  const normal = await renderAssessmentPdf(snapshot);
  const long = structuredClone(snapshot);
  long.patient.firstName = 'Élodie '.repeat(10);
  long.patient.lastName = 'Παπαδόπουλος';
  long.predecessorId = randomUUID();
  long.predecessor = {
    id: long.predecessorId,
    assessedAt: snapshot.assessedAt,
    authorName: 'Zoë D’Àngelo',
  };
  long.correctionReason = 'Verifica documentata della valutazione: parole lunghe '
    .repeat(17)
    .slice(0, 1000);
  long.items[0].description = 'Descrizione lunga senza tagli. '.repeat(100);
  const expanded = await renderAssessmentPdf(long);
  const parsed = await PDFDocument.load(expanded);
  assert(parsed.getPageCount() > 1);
  assert(parsed.getKeywords()!.includes(snapshot.form.sourceSha256));
  const artifact = resolve('artifacts/task-validation/po-10-painad/backend/pdf-qa');
  await mkdir(artifact, { recursive: true });
  await writeFile(resolve(artifact, 'painad-normal.pdf'), normal);
  await writeFile(resolve(artifact, 'painad-long.pdf'), expanded);
  const invalid = structuredClone(snapshot);
  invalid.patient.firstName = '𓀀';
  await assert.rejects(
    renderAssessmentPdf(invalid),
    (error: any) => error.code === 'assessment_pdf_unsupported_glyph',
  );
});
