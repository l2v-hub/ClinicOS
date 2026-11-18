// La bozza d'ingresso resta una sola finché l'ingresso non si conclude: la sessione documenti a
// cui è collegata non scade mentre la bozza è aperta. Prima scadeva dopo 60 minuti di inattività,
// la bozza non si poteva più riprendere e l'unica strada era una nuova importazione, cioè una
// seconda bozza dello stesso paziente a ogni riapertura.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { expirePageSessions } from '../../ai/upload/pages/cleanup.js';
import { abandonDraft } from '../draft-service.js';

const run = randomUUID().slice(0, 8);
const OPERATOR = `op-retention-${run}`;
const jobIds: string[] = [];
const draftIds: string[] = [];

async function expiredSession(label: string) {
  const job = await prisma.importJob.create({
    data: {
      status: 'review_ready',
      maxFiles: 10,
      maxTotalBytes: 1_000_000,
      totalBytes: 12,
      createdById: OPERATOR,
      manifest: { version: 1, groups: [], pages: [] },
      resultData: { _narrative: { firstName: label } },
      // Inattiva da oltre un'ora: per il vecchio comportamento era da eliminare.
      expiresAt: new Date(Date.now() - 2 * 60 * 60_000),
      documents: {
        create: {
          filename: `${label}.pdf`,
          mimeType: 'application/pdf',
          sizeBytes: 12,
          sha256: `${label}-${run}`,
          storagePath: '',
          dataBase64: Buffer.from(`synthetic ${label}`).toString('base64'),
        },
      },
    },
  });
  jobIds.push(job.id);
  return job;
}

async function draftFor(jobId: string, status = 'draft') {
  const draft = await prisma.patientIntakeDraft.create({
    data: {
      status,
      source: 'import',
      createdById: OPERATOR,
      importJobId: jobId,
      data: { anagrafica: { lastName: `Retention${run}`, firstName: 'Bozza' } },
    },
  });
  draftIds.push(draft.id);
  return draft;
}

const sessionOf = (id: string) =>
  prisma.importJob.findUniqueOrThrow({
    where: { id },
    select: { status: true, resultData: true, _count: { select: { documents: true } } },
  });

after(async () => {
  await prisma.patientIntakeDraft.deleteMany({ where: { id: { in: draftIds } } });
  await prisma.importJob.deleteMany({ where: { id: { in: jobIds } } });
});

test('la sessione di una bozza aperta non scade; senza bozza aperta scade come prima', async () => {
  const withOpenDraft = await expiredSession('aperta');
  const withoutDraft = await expiredSession('senza');
  const withArchivedDraft = await expiredSession('archiviata');
  const open = await draftFor(withOpenDraft.id);
  await draftFor(withArchivedDraft.id, 'abandoned');

  await expirePageSessions();

  // Bozza aperta: sessione, risultato e documenti intatti → «Riprendi bozza» riapre la stessa.
  const kept = await sessionOf(withOpenDraft.id);
  assert.equal(kept.status, 'review_ready');
  assert.ok(kept.resultData, 'il risultato della revisione resta disponibile');
  assert.equal(kept._count.documents, 1);
  assert.equal(
    (await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: open.id } })).status,
    'draft',
  );

  // Nessuna bozza, o bozza già archiviata: i documenti temporanei spariscono come sempre.
  for (const job of [withoutDraft, withArchivedDraft]) {
    const expired = await sessionOf(job.id);
    assert.equal(expired.status, 'expired', job.id);
    assert.equal(expired.resultData, null);
    assert.equal(expired._count.documents, 0);
  }

  // Ripetere la pulizia non cambia nulla: la bozza resta riapribile a tempo indeterminato.
  await expirePageSessions();
  assert.equal((await sessionOf(withOpenDraft.id)).status, 'review_ready');
});

test('i documenti seguono la bozza: «Elimina bozza» li rimuove subito', async () => {
  const job = await expiredSession('eliminata');
  const draft = await draftFor(job.id);
  await expirePageSessions();
  assert.equal(
    (await sessionOf(job.id))._count.documents,
    1,
    'conservati finché la bozza è aperta',
  );

  await abandonDraft(draft.id);
  const closed = await sessionOf(job.id);
  assert.equal(closed.status, 'cancelled');
  assert.equal(closed._count.documents, 0);
  assert.equal(closed.resultData, null);
});
