import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import type { DocumentoConsegnato } from '../../types';
import type { PatientDocumentMeta } from '../patientDocumentsPage';
import {
  buildDocumentArchive,
  documentCategory,
  filterDocumentArchive,
  normalizeDocumentType,
} from '../patientDocumentArchive';
import {
  classifyArchiveDocument,
  readArchiveDocumentContent,
  readDocumentArchive,
  saveArchiveEntry,
  uploadArchiveDocument,
  validateArchiveFile,
} from '../patientDocumentArchiveIO';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
const meta = (id = 'doc-a', patch: Partial<PatientDocumentMeta> = {}): PatientDocumentMeta => ({
  id,
  originalName: 'referto.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 20,
  documentType: 'esame',
  importJobId: null,
  createdAt: '2026-09-15T08:00:00Z',
  ...patch,
});
const record = (patch: Partial<DocumentoConsegnato> = {}): DocumentoConsegnato => ({
  id: 'record-a',
  tipo: 'esame',
  descrizione: 'Analisi sintetiche',
  dataConsegna: '2026-09-15',
  stato: 'ricevuto',
  firmatoDA: 'non_firmato',
  operatore: 'QA sintetico',
  note: '',
  ...patch,
});
const scope = (signal = new AbortController().signal) => ({
  patientId: 'patient/a',
  signal,
  getHeaders: async () => ({ 'X-Test-Scope': 'patient-a' }),
});
const page = (
  documents: PatientDocumentMeta[],
  total = documents.length,
  cursor: string | null = null,
) => ({
  documents,
  total,
  pageInfo: { hasMore: !!cursor, nextCursor: cursor, loadedCount: documents.length },
});
const pdf = () => new File(['%PDF-1.4 synthetic'], 'referto.pdf', { type: 'application/pdf' });

test('personal and clinical taxonomy preserves imported aliases', () => {
  assert.equal(documentCategory('documento_identita'), 'personali');
  assert.equal(documentCategory('consulenza'), 'visite');
  assert.equal(documentCategory('esame'), 'analisi');
  assert.equal(documentCategory('rx'), 'esami');
  assert.equal(documentCategory('discharge_import'), 'dimissioni');
  assert.equal(normalizeDocumentType('discharge_import'), 'lettera_dimissione');
  assert.equal(normalizeDocumentType('allegato'), 'altro');
  assert.equal(normalizeDocumentType('__proto__'), 'altro');
});

test('merge links by id, preserves two same-name files, legacy and archived entries', () => {
  const entries = buildDocumentArchive(
    [
      record({ patientDocumentId: 'doc-a' }),
      record({ id: 'legacy', archiviato: true }),
      record({ id: 'missing', patientDocumentId: 'missing-file' }),
    ],
    [meta(), meta('doc-b', { documentType: 'consulenza' })],
  );
  assert.equal(entries.length, 4);
  assert.equal(entries.filter((item) => item.document).length, 2);
  assert.equal(entries.find((item) => item.id === 'record:missing')?.unavailable, true);
  assert.equal(filterDocumentArchive(entries, 'tutti', '', true).length, 1);
  assert.equal(
    filterDocumentArchive(entries, 'visite', 'referto.pdf', false)[0].document?.id,
    'doc-b',
  );
});

test('remote classification is authoritative and search includes accents, provenance and notes', () => {
  const entries = buildDocumentArchive(
    [
      record({
        patientDocumentId: 'doc-a',
        provenienza: 'Unità sintetica',
        note: 'Controllo periodico',
      }),
    ],
    [meta('doc-a', { documentType: 'consulenza' })],
  );
  assert.equal(entries[0].type, 'consulenza');
  for (const query of ['unita', 'PERIODICO', 'specialistica', 'referto'])
    assert.equal(filterDocumentArchive(entries, 'visite', query, false).length, 1);
});

test('complete metadata pagination finds a document beyond first page without content reads', async () => {
  const calls: string[] = [];
  globalThis.fetch = async (url, init) => {
    calls.push(String(url));
    assert.equal(init?.cache, 'no-store');
    assert.equal(new Headers(init?.headers).get('X-Test-Scope'), 'patient-a');
    return Response.json(
      calls.length === 1
        ? page(
            Array.from({ length: 50 }, (_, i) => meta(`doc-${i}`)),
            51,
            'cursor-a',
          )
        : page(
            [meta('last', { originalName: 'visita tardiva.pdf', documentType: 'consulenza' })],
            0,
          ),
    );
  };
  const items = await readDocumentArchive(scope());
  assert.equal(items.length, 51);
  assert.match(calls[0], /patient%2Fa\/documents\?limit=50$/);
  assert.match(calls[1], /cursor=cursor-a/);
  assert.equal(
    filterDocumentArchive(buildDocumentArchive([], items), 'visite', 'tardiva', false)[0].document
      ?.id,
    'last',
  );
});

test('rejects incomplete counts, oversized totals, malformed pages and invalid metadata', async () => {
  for (const value of [
    page([meta()], 2),
    page([], 5001),
    { ...page([meta()]), pageInfo: { loadedCount: 0, hasMore: false, nextCursor: null } },
    page([meta('x', { createdAt: 'invalid' })]),
    page(Array.from({ length: 51 }, (_, i) => meta(String(i)))),
  ]) {
    globalThis.fetch = async () => Response.json(value);
    await assert.rejects(() => readDocumentArchive(scope()));
  }
});

test('rejects repeated cursors and duplicate document ids instead of partial success', async () => {
  for (const duplicate of [true, false]) {
    let call = 0;
    globalThis.fetch = async () =>
      Response.json(page([meta(duplicate ? 'same' : String(call++))], 10, 'same-cursor'));
    await assert.rejects(() => readDocumentArchive(scope()), /caricamento|Paginazione/);
  }
});

test('metadata timeout includes pending authentication and aborted scopes never fetch', async () => {
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    return Response.json(page([]));
  };
  await assert.rejects(() =>
    readDocumentArchive({ ...scope(), getHeaders: () => new Promise(() => {}) }, 10),
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(() => readDocumentArchive(scope(controller.signal)));
  assert.equal(requests, 0);
});

test('file validation rejects unsupported, empty and oversized files', () => {
  assert.equal(validateArchiveFile(pdf()), null);
  for (const name of ['foto.jpeg', 'foto.jpg'])
    assert.equal(validateArchiveFile(new File(['jpeg'], name, { type: 'image/jpeg' })), null);
  assert.equal(validateArchiveFile(new File(['png'], 'foto.png', { type: 'image/png' })), null);
  for (const type of ['image/webp', 'image/heic', 'image/heif', 'image/gif'])
    assert.ok(validateArchiveFile(new File(['other'], 'other', { type })));
  assert.ok(validateArchiveFile(new File(['x'], 'bad.html', { type: 'text/html' })));
  assert.ok(validateArchiveFile(new File([], 'empty.pdf', { type: 'application/pdf' })));
  assert.ok(
    validateArchiveFile(
      new File([new Uint8Array(15 * 1024 * 1024 + 1)], 'large.pdf', { type: 'application/pdf' }),
    ),
  );
});

test('legacy image originals remain readable after narrowing new upload formats', async () => {
  for (const type of ['image/webp', 'image/heic', 'image/heif']) {
    globalThis.fetch = async () => new Response(new Blob(['stored original'], { type }));
    const blob = await readArchiveDocumentContent(scope(), 'legacy-image');
    assert.equal(blob.type, type);
    assert.equal(await blob.text(), 'stored original');
  }
});

test('upload sends category and original file with scoped headers', async () => {
  globalThis.fetch = async (_url, init) => {
    assert.equal(init?.method, 'POST');
    assert.ok(init?.body instanceof FormData);
    assert.equal(init.body.get('documentType'), 'esame');
    assert.equal((init.body.get('file') as File).name, 'referto.pdf');
    return Response.json({ document: meta() }, { status: 201 });
  };
  assert.equal((await uploadArchiveDocument(scope(), pdf(), 'esame')).id, 'doc-a');
});

test('content retrieval uses exact id, not duplicate filename, and rejects invalid content', async () => {
  globalThis.fetch = async (url) => {
    assert.match(String(url), /documents\/doc-b\/content$/);
    return new Response('%PDF synthetic B', { headers: { 'Content-Type': 'application/pdf' } });
  };
  assert.equal(
    await (await readArchiveDocumentContent(scope(), 'doc-b')).text(),
    '%PDF synthetic B',
  );
  globalThis.fetch = async () =>
    new Response('<html>error</html>', { headers: { 'Content-Type': 'text/html' } });
  await assert.rejects(() => readArchiveDocumentContent(scope(), 'doc-b'), /Contenuto/);
});

test('classification patches only category and validates server identity and category', async () => {
  globalThis.fetch = async (url, init) => {
    assert.match(String(url), /doc-a$/);
    assert.equal(init?.method, 'PATCH');
    assert.deepEqual(JSON.parse(String(init?.body)), { documentType: 'consulenza' });
    return Response.json({ document: meta('doc-a', { documentType: 'consulenza' }) });
  };
  assert.equal(
    (await classifyArchiveDocument(scope(), 'doc-a', 'consulenza')).documentType,
    'consulenza',
  );
  globalThis.fetch = async () => Response.json({ document: meta('foreign') });
  await assert.rejects(() => classifyArchiveDocument(scope(), 'doc-a', 'esame'), /Risposta/);
});

test('previously imported TIFF, text and DOCX originals and files over new upload size remain downloadable', async () => {
  for (const type of ['image/tiff', 'text/plain; charset=utf-8', 'application/zip']) {
    globalThis.fetch = async () =>
      new Response('synthetic original', { headers: { 'Content-Type': type } });
    assert.equal((await readArchiveDocumentContent(scope(), 'legacy')).size, 18);
  }
  globalThis.fetch = async () =>
    new Response(new Uint8Array(16 * 1024 * 1024), {
      headers: { 'Content-Type': 'application/pdf' },
    });
  assert.equal(
    (await readArchiveDocumentContent(scope(), 'large-original')).size,
    16 * 1024 * 1024,
  );
});

test('metadata failure retains upload; retry reuses same id and can change category', async () => {
  let stored: PatientDocumentMeta | null = null;
  let uploads = 0;
  let persists = 0;
  let classifications = 0;
  const order: string[] = [];
  const deps = {
    upload: async () => {
      uploads++;
      order.push('upload');
      return meta();
    },
    classify: async (id: string, type: string) => {
      classifications++;
      return meta(id, { documentType: type });
    },
    remember: (item: PatientDocumentMeta) => {
      order.push('remember');
      stored = item;
    },
    persist: async (records: DocumentoConsegnato[]) => {
      order.push('persist');
      persists++;
      assert.equal(records.length, 1);
      assert.equal(records[0].patientDocumentId, 'doc-a');
      return persists > 1;
    },
  };
  await assert.rejects(
    () =>
      saveArchiveEntry(
        { record: record(), records: [], file: pdf(), stored, signal: scope().signal },
        deps,
      ),
    /File conservato/,
  );
  assert.deepEqual(order, ['upload', 'remember', 'persist']);
  await saveArchiveEntry(
    {
      record: record({ tipo: 'consulenza' }),
      records: [record()],
      file: null,
      stored,
      signal: scope().signal,
    },
    deps,
  );
  assert.equal(uploads, 1);
  assert.equal(persists, 2);
  assert.equal(classifications, 1);
});

test('failed upload and aborted write do not persist or remember in stale workspace', async () => {
  let writes = 0;
  const controller = new AbortController();
  const deps = {
    upload: async () => {
      controller.abort();
      return meta();
    },
    classify: async () => meta(),
    remember: () => {
      writes++;
    },
    persist: async () => {
      writes++;
      return true;
    },
  };
  await assert.rejects(() =>
    saveArchiveEntry(
      { record: record(), records: [], file: pdf(), stored: null, signal: controller.signal },
      deps,
    ),
  );
  assert.equal(writes, 0);
  await assert.rejects(() =>
    saveArchiveEntry(
      { record: record(), records: [], file: pdf(), stored: null, signal: scope().signal },
      {
        ...deps,
        upload: async () => {
          throw new Error('upload failed');
        },
      },
    ),
  );
  assert.equal(writes, 0);
});
