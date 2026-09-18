import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { persistImportDocuments } from '../upload/import-document-archive.js';
import { AiExtractionError } from '../types.js';

const original = (id: string, patch = {}) => {
  const bytes = Buffer.from(`%PDF-1.4 synthetic original ${id}`);
  return {
    id,
    filename: `${id}.pdf`,
    mimeType: 'application/pdf',
    sizeBytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    dataBase64: bytes.toString('base64'),
    storagePath: '',
    sortOrder: 0,
    ...patch,
  };
};

function client(docs: ReturnType<typeof original>[], rows: any[] = []) {
  const stub = {
    importDocument: {
      async findMany(args: any) {
        assert.deepEqual(args.where, { jobId: 'job-a', status: 'uploaded' });
        return docs;
      },
    },
    patientDocument: {
      async findMany(args: any) {
        if (args.where.id?.in) {
          return rows.filter((r) => args.where.id.in.includes(r.id));
        }
        assert.deepEqual(args.select, { sha256: true });
        return rows.filter(
          (r) => r.patientId === args.where.patientId && r.importJobId === args.where.importJobId,
        );
      },
      async createMany(args: any) {
        let count = 0;
        assert.equal(args.skipDuplicates, true);
        for (const row of args.data) {
          if (!rows.some((r) => r.id === row.id)) {
            rows.push(row);
            count++;
          }
        }
        return { count };
      },
    },
  };
  return {
    tx: stub as unknown as Parameters<typeof persistImportDocuments>[0],
    rows,
  };
}

test('durable database originals archive exactly once with unchanged bytes and source order', async () => {
  const docs = [original('first'), original('second', { sortOrder: 1 })];
  const state = client(docs);
  assert.equal(await persistImportDocuments(state.tx, 'patient-a', 'job-a', 'operator-a'), 2);
  assert.equal(await persistImportDocuments(state.tx, 'patient-a', 'job-a', 'operator-a'), 2);
  assert.equal(state.rows.length, 2);
  for (const [index, row] of state.rows.entries()) {
    assert.equal(row.dataBase64, docs[index].dataBase64);
    assert.equal(row.documentType, 'discharge_import');
    assert.equal(row.createdById, 'operator-a');
    assert.equal(row.sortOrder, index);
  }
});

test('previously archived random-id original is retained without duplicate or reclassification', async () => {
  const source = original('first');
  const old = {
    id: 'old-random-id',
    patientId: 'patient-a',
    importJobId: 'job-a',
    sha256: source.sha256,
    documentType: 'referto',
  };
  const state = client([source], [old]);
  await persistImportDocuments(state.tx, 'patient-a', 'job-a');
  assert.deepEqual(state.rows, [old]);
});

test('legacy disk original is validated and retained when database copy is absent/corrupt', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'clinicos-archive-test-'));
  try {
    const source = original('disk');
    const storagePath = join(directory, 'source.pdf');
    await writeFile(storagePath, Buffer.from(source.dataBase64, 'base64'));
    for (const dataBase64 of [null, 'corrupt']) {
      const state = client([original('disk', { storagePath, dataBase64 })]);
      await persistImportDocuments(state.tx, 'patient-a', 'job-a');
      assert.equal(state.rows[0].dataBase64, source.dataBase64);
    }
  } finally {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith('clinicos-archive-test-'));
    await rm(directory, { recursive: true });
  }
});

test('a missing or corrupt original prevents all writes and returns a safe actionable error', async () => {
  for (const broken of [
    { dataBase64: null },
    { dataBase64: 'corrupt' },
    { sizeBytes: 9999 },
    { sha256: 'bad' },
  ]) {
    const state = client([original('first'), original('second', broken)]);
    await assert.rejects(
      persistImportDocuments(state.tx, 'patient-a', 'job-a'),
      (error: unknown) =>
        error instanceof AiExtractionError &&
        error.kind === 'config' &&
        /La conferma non è stata salvata/.test(error.message) &&
        !error.message.includes('second.pdf'),
    );
    assert.equal(state.rows.length, 0);
  }
});

for (const stage of ['source-query', 'existing-query', 'write', 'verify-query'] as const) {
  test(`database ${stage} failure is normalized without leaking the original message or cause`, async () => {
    const state = client([original('first')]);
    const sensitive = new Error('SYNTHETIC-PRIVATE-DB-DETAIL fileData=synthetic-private-bytes');
    const fail = async () => {
      throw sensitive;
    };
    if (stage === 'source-query') {
      state.tx.importDocument.findMany = fail as typeof state.tx.importDocument.findMany;
    } else if (stage === 'write') {
      state.tx.patientDocument.createMany = fail as typeof state.tx.patientDocument.createMany;
    } else {
      const findMany = state.tx.patientDocument.findMany;
      state.tx.patientDocument.findMany = (async (input: any) => {
        if ((stage === 'verify-query') === Boolean(input.where.id)) throw sensitive;
        return findMany(input);
      }) as typeof state.tx.patientDocument.findMany;
    }
    await assert.rejects(
      persistImportDocuments(state.tx, 'patient-a', 'job-a'),
      (error: unknown) => {
        assert.ok(error instanceof AiExtractionError);
        assert.equal(error.kind, 'config');
        assert.equal(
          error.message,
          'Impossibile archiviare tutti i documenti originali. La conferma non è stata salvata: riprova oppure carica nuovamente il file non disponibile.',
        );
        assert.notEqual(error, sensitive);
        assert.equal(error.cause, undefined);
        assert.ok(!error.stack?.includes('SYNTHETIC-PRIVATE-DB-DETAIL'));
        return true;
      },
    );
  });
}

test('an import source cannot be silently reassigned to another patient', async () => {
  const source = original('first');
  const state = client([source]);
  await persistImportDocuments(state.tx, 'patient-a', 'job-a');
  await assert.rejects(persistImportDocuments(state.tx, 'patient-b', 'job-a'), AiExtractionError);
  assert.equal(state.rows[0].patientId, 'patient-a');
});
