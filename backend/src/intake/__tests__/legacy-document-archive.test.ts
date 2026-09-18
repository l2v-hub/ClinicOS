import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LegacyDocumentArchiveError,
  persistLegacyIntakeDocument,
  type LegacyArchiveClient,
  type LegacyArchiveSource,
} from '../legacy-document-archive.js';

const source: LegacyArchiveSource = {
  id: 'legacy-a',
  fileName: 'originale-sintetico.pdf',
  fileType: 'application/pdf',
  fileData: Buffer.from('%PDF-1.4 synthetic legacy original').toString('base64'),
  createdAt: new Date('2026-01-01T10:00:00Z'),
};

test('legacy copy is idempotent and preserves bytes, source date and existing classification', async () => {
  let row: Parameters<LegacyArchiveClient['patientDocument']['upsert']>[0]['create'] | null = null;
  const client: LegacyArchiveClient = {
    patientDocument: {
      async upsert(input) {
        row ??= input.create;
        return { patientId: row.patientId };
      },
    },
  };
  await persistLegacyIntakeDocument(client, source, 'patient-a');
  assert.equal(row!.id, 'legacy-intake-legacy-a');
  assert.equal(row!.dataBase64, source.fileData);
  assert.equal(row!.createdAt, source.createdAt);
  assert.equal(row!.documentType, 'lettera_dimissione');
  row!.documentType = 'referto';
  await persistLegacyIntakeDocument(client, source, 'patient-a');
  assert.equal(row!.documentType, 'referto');
  await assert.rejects(
    persistLegacyIntakeDocument(client, source, 'patient-b'),
    LegacyDocumentArchiveError,
  );
  assert.equal(row!.patientId, 'patient-a');
});

test('invalid legacy bytes, MIME mismatch and oversized sources cannot be linked as files', async () => {
  let writes = 0;
  const client: LegacyArchiveClient = {
    patientDocument: {
      async upsert() {
        writes++;
        return { patientId: 'patient-a' };
      },
    },
  };
  for (const patch of [
    { fileData: '' },
    { fileData: Buffer.from('<html>synthetic</html>').toString('base64') },
    { fileData: source.fileData + '!' },
    { fileType: 'image/png' },
    { fileData: Buffer.alloc(5 * 1024 * 1024 + 1).toString('base64') },
  ]) {
    await assert.rejects(
      persistLegacyIntakeDocument(client, { ...source, ...patch }, 'patient-a'),
      LegacyDocumentArchiveError,
    );
  }
  assert.equal(writes, 0);
});
