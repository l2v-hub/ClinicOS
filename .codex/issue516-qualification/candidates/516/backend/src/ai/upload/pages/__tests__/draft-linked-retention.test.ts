import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { afterEach, before, test } from 'node:test';

let prisma: typeof import('../../../../lib/prisma.js').prisma;
let cleanup: typeof import('../cleanup.js');
let getPageJob: typeof import('../repository.js').getPageJob;
let verifiedBytes: typeof import('../pdf.js').verifiedBytes;
let original: Record<string, unknown>;
let sourceBytes: Buffer;

before(async () => {
  // Every database boundary below is replaced in this isolated test process.
  // A missed replacement must fail locally, never reach an application database.
  process.env.DATABASE_URL = 'postgresql://unit:unit@127.0.0.1:1/retention_no_db';
  process.env.AI_PROVIDER = 'mock';
  ({ prisma } = await import('../../../../lib/prisma.js'));
  cleanup = await import('../cleanup.js');
  ({ getPageJob } = await import('../repository.js'));
  ({ verifiedBytes } = await import('../pdf.js'));
  const { PDFDocument } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  pdf.addPage().drawText('Synthetic retention source');
  sourceBytes = Buffer.from(await pdf.save());
  original = Object.fromEntries(
    [
      '$transaction',
      '$queryRaw',
      'importJob',
      'patientIntakeDraft',
      'importDocument',
      'importProcessingUnit',
      'importMutation',
    ].map((key) => [key, Reflect.get(prisma, key)]),
  );
});

afterEach(() => {
  Object.assign(prisma, original);
});

const NOW = new Date('2030-01-02T12:00:00.000Z');
const EXPIRED_AT = new Date('2030-01-02T10:00:00.000Z');

function fixture(draftStatus: string | null = 'draft', jobStatus = 'review_ready') {
  const page = {
    id: 'retention-page',
    documentId: 'retention-document',
    sourcePageNumber: 1,
    groupId: 'retention-group',
    sortOrder: 0,
  };
  const manifest = {
    version: 1,
    groups: [{ id: page.groupId, label: 'Synthetic letter', sortOrder: 0 }],
    pages: [page],
  };
  const source = {
    manifestRevision: 1,
    resultHash: 'c'.repeat(64),
    reviewHash: 'synthetic-review',
  };
  const row = {
    id: 'retention-job',
    status: jobStatus,
    stage: 'review',
    runToken: null,
    runRevision: null,
    leaseExpiresAt: null as Date | null,
    currentFileName: null,
    startedAt: null,
    maxFiles: 30,
    maxPages: 30,
    maxTotalBytes: 1024,
    totalBytes: sourceBytes.length,
    error: null,
    model: 'mock',
    expiresAt: EXPIRED_AT,
    createdAt: new Date('2030-01-02T09:00:00.000Z'),
    manifest,
    manifestRevision: 1,
    resultData: { syntheticMarker: 'saved extraction' },
    resultSummary: { source, unresolvedConflicts: 0, reviewHash: source.reviewHash },
    documents: [
      {
        id: page.documentId,
        filename: 'synthetic-retention.pdf',
        mimeType: 'application/pdf',
        sizeBytes: sourceBytes.length,
        sha256: createHash('sha256').update(sourceBytes).digest('hex'),
        dataBase64: sourceBytes.toString('base64'),
        storagePath: '',
        pageCount: 1,
        sortOrder: 0,
        logicalDoc: null,
        status: 'completed',
        rejectReason: null,
      },
    ],
    processingUnits: [],
  };
  const state = { draftStatus, mutations: ['synthetic-receipt'], onLock: () => {} };
  const events: string[] = [];
  const draft = () =>
    state.draftStatus === null
      ? null
      : {
          id: 'retention-draft',
          status: state.draftStatus,
          source,
        };
  Object.assign(prisma, {
    $transaction: async (action: (tx: typeof prisma) => Promise<unknown>) => action(prisma),
    $queryRaw: async (
      query: { sql?: string; values?: unknown[] } | TemplateStringsArray,
      ...values: unknown[]
    ) => {
      if (Array.isArray(query)) {
        assert.match(query.join(''), /FOR UPDATE/);
        assert.equal(values[0], row.id);
        events.push('job-lock');
        state.onLock();
        return [{ id: row.id }];
      }
      const sql = query as { sql: string; values: unknown[] };
      assert.match(sql.sql, /WHERE "importJobId"=/);
      assert.deepEqual(sql.values, [row.id]);
      events.push('draft-view');
      const current = draft();
      if (!current) return [];
      // Model the actual SELECT: a test cannot invent a column the SQL omitted.
      return [
        {
          id: current.id,
          source,
          ...(sql.sql.includes('"status"') ? { status: current.status } : {}),
        },
      ];
    },
    importJob: {
      findMany: async () => [{ id: row.id }],
      findUnique: async ({
        where,
        select,
      }: {
        where: { id: string };
        select?: { documents?: { select: Record<string, boolean> } };
      }) => {
        assert.equal(where.id, row.id);
        events.push('job-read');
        if (select?.documents) {
          const fields = select.documents.select;
          return {
            ...row,
            documents: row.documents.map((document) =>
              Object.fromEntries(Object.entries(document).filter(([key]) => fields[key])),
            ),
          };
        }
        return row;
      },
      update: async ({ where, data }: { where: { id: string }; data: object }) => {
        assert.equal(where.id, row.id);
        events.push('source-cleared');
        Object.assign(row, data);
        return row;
      },
    },
    patientIntakeDraft: {
      findUnique: async ({ where }: { where: { importJobId: string } }) => {
        assert.deepEqual(where, { importJobId: row.id });
        assert.ok(events.includes('job-lock'), 'draft association must be read under the job lock');
        events.push('draft-check');
        return draft();
      },
    },
    importDocument: {
      deleteMany: async () => {
        row.documents.length = 0;
        return { count: 1 };
      },
    },
    importProcessingUnit: {
      deleteMany: async () => {
        row.processingUnits.length = 0;
        return { count: 1 };
      },
    },
    importMutation: {
      deleteMany: async () => {
        state.mutations.length = 0;
        return { count: 1 };
      },
    },
  });
  return { row, state, events };
}

test('an open saved draft keeps its source, pages and receipts across temporary TTL', async () => {
  const f = fixture();
  const before = structuredClone(f.row);
  assert.equal(await cleanup.expirePageSessions(NOW), 0);
  assert.deepEqual(f.row, before);
  assert.equal(f.state.mutations.length, 1);
  assert.deepEqual(
    await verifiedBytes(f.row.documents[0]),
    sourceBytes,
    'page sessions keep verified database source bytes even without a filesystem path',
  );
  assert.ok(f.events.indexOf('job-lock') < f.events.indexOf('draft-check'));
});

test('a draft linked while the expiry candidate waits for its job lock protects the source', async () => {
  const f = fixture(null);
  f.state.onLock = () => {
    f.state.draftStatus = 'draft';
  };
  assert.equal(await cleanup.expirePageSessions(NOW), 0);
  assert.equal(f.row.documents.length, 1);
  assert.equal(f.row.status, 'review_ready');
});

for (const status of [null, 'confirmed', 'abandoned']) {
  test(`temporary expiry still clears a source without an open draft (${status ?? 'unlinked'})`, async () => {
    const f = fixture(status);
    assert.equal(await cleanup.expirePageSessions(NOW), 1);
    assert.equal(f.row.status, 'expired');
    assert.equal(f.row.documents.length, 0);
    assert.equal(f.state.mutations.length, 0);
  });
}

test('a draft completed before job lock acquisition no longer suppresses temporary expiry', async () => {
  const f = fixture();
  f.state.onLock = () => {
    f.state.draftStatus = 'confirmed';
  };
  assert.equal(await cleanup.expirePageSessions(NOW), 1);
  assert.equal(f.row.status, 'expired');
});

test('the existing processing lease guard still protects an in-flight extraction', async () => {
  const f = fixture(null, 'processing_pages');
  f.row.leaseExpiresAt = new Date('2030-01-02T13:00:00.000Z');
  assert.equal(await cleanup.expirePageSessions(NOW), 0);
  assert.equal(f.row.documents.length, 1);
});

test('explicit discard retains its existing cleanup behavior even for an open draft', async () => {
  const f = fixture();
  await cleanup.clearPageSession(prisma, f.row.id, 'cancelled');
  assert.equal(f.row.status, 'cancelled');
  assert.equal(f.row.documents.length, 0);
});

test('the real job view omits temporary expiry for a present source saved in an open draft', async () => {
  const f = fixture();
  const view = await getPageJob(f.row.id);
  assert.equal(view.expiresAt, undefined);
  assert.equal(view.status, 'review_ready');
  assert.equal(view.documents.length, 1);
  assert.equal(view.manifest.pages.length, 1);
  assert.equal(view.review.draftId, 'retention-draft');
  assert.equal(view.review.draftSourceIsCurrent, true);
});

for (const status of [null, 'confirmed', 'abandoned']) {
  test(`the real job view keeps the temporary deadline when no open draft protects it (${status ?? 'unlinked'})`, async () => {
    const f = fixture(status);
    assert.equal((await getPageJob(f.row.id)).expiresAt, EXPIRED_AT.toISOString());
  });
}

for (const terminal of ['expired', 'cancelled', 'confirmed']) {
  test(`a real ${terminal} legacy source is never presented as recovered by its open draft`, async () => {
    const f = fixture('draft', terminal);
    f.row.documents.length = 0;
    f.row.manifest.pages.length = 0;
    f.row.manifest.groups.length = 0;
    const view = await getPageJob(f.row.id);
    assert.equal(view.status, terminal);
    assert.equal(view.expiresAt, EXPIRED_AT.toISOString());
    assert.equal(view.documents.length, 0);
    assert.equal(view.manifest.pages.length, 0);
    assert.equal(await cleanup.expirePageSessions(NOW), 0);
  });
}
