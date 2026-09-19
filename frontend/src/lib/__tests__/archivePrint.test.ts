import assert from 'node:assert/strict';
import test from 'node:test';
import { archivePrintUnavailable, selectedArchiveDocuments, prepareArchivePrint, ARCHIVE_PRINT_LIMITS } from '../archivePrint';
import { buildDocumentArchive } from '../patientDocumentArchive';
import type { PatientDocumentMeta } from '../patientDocumentsPage';
import type { ArchivePrintDependencies } from '../archivePrint';

const meta = (id: string, patch: Partial<PatientDocumentMeta> = {}): PatientDocumentMeta => ({
  id, originalName: id + '.pdf', mimeType: 'application/pdf', sizeBytes: 12,
  documentType: 'esame', createdAt: '2026-09-19T08:00:00Z', importJobId: null, ...patch,
});
const pdf = () => new Blob(['%PDF synthetic'], { type: 'application/pdf' });
const page = () => ({ blob: new Blob(['page'], { type: 'image/png' }), width: 500, height: 700 });
const deps = (patch: Partial<ArchivePrintDependencies> = {}): ArchivePrintDependencies => ({
  read: async () => pdf(),
  render: async function* () { yield page(); },
  ...patch,
});
const signal = () => new AbortController().signal;

test('selection uses exact IDs, stable archive order, dedupes linked records and excludes missing/unsupported files', () => {
  const files = [meta('a'), meta('b', { originalName: 'a.pdf' }), meta('zip', { mimeType: 'application/zip' })];
  const entries = buildDocumentArchive([], files);
  const duplicate = { ...entries[0], id: 'another-record' };
  const selected = selectedArchiveDocuments([...entries, duplicate], new Set(['a', 'b', 'zip']));
  assert.deepEqual(selected.map((item) => item.id), ['a', 'b']);
  assert.match(archivePrintUnavailable({ ...entries[0], document: undefined, unavailable: true }), /non disponibile/);
  assert.match(archivePrintUnavailable({ ...entries[0], document: undefined, unavailable: false }), /Nessun file/);
  assert.match(archivePrintUnavailable(entries.find((entry) => entry.document?.id === 'zip')!), /PDF/);
});

test('prepares only chosen unique files and preserves every PDF page then image in source order', async () => {
  const calls: string[] = [];
  const updates: number[] = [];
  const selected = [meta('pdf'), meta('image', { mimeType: 'image/jpeg' }), meta('pdf')];
  const pages = await prepareArchivePrint(selected, signal(), deps({
    read: async (id) => { calls.push(id); return id === 'pdf' ? pdf() : new Blob(['image'], { type: 'image/jpeg' }); },
    render: async function* (blob) { yield page(); if (blob.type === 'application/pdf') yield page(); },
  }), (completed) => updates.push(completed));
  assert.deepEqual(calls, ['pdf', 'image']);
  assert.deepEqual(pages.map((item) => [item.documentName, item.pageNumber]), [['pdf.pdf', 1], ['pdf.pdf', 2], ['image.pdf', 1]]);
  assert.equal(updates.at(-1), 2);
});

test('rejects invalid/empty/oversized selections before any content read', async () => {
  let reads = 0;
  for (const documents of [
    [], Array.from({ length: 21 }, (_, i) => meta(String(i))),
    [meta('zip', { mimeType: 'application/zip' })], [meta('zero', { sizeBytes: 0 })],
    [meta('large', { sizeBytes: ARCHIVE_PRINT_LIMITS.bytes + 1 })],
  ]) await assert.rejects(() => prepareArchivePrint(documents, signal(), deps({ read: async () => { reads++; return pdf(); } })));
  assert.equal(reads, 0);
});

test('actual response MIME is revalidated and empty payload is rejected', async () => {
  for (const blob of [new Blob(['<script>'], { type: 'text/html' }), new Blob([], { type: 'application/pdf' })])
    await assert.rejects(() => prepareArchivePrint([meta('a')], signal(), deps({ read: async () => blob })), /Nessun documento è stato stampato/);
});

test('a middle read failure prevents any partial result and stops remaining reads', async () => {
  const calls: string[] = [];
  await assert.rejects(() => prepareArchivePrint([meta('a'), meta('b'), meta('c')], signal(), deps({
    read: async (id) => { calls.push(id); if (id === 'b') throw new Error('Non disponibile'); return pdf(); },
  })), /b.pdf.*Non disponibile.*Nessun documento/);
  assert.deepEqual(calls, ['a', 'b']);
});

test('abort during read never starts rendering or fetches another file', async () => {
  const controller = new AbortController();
  let renders = 0;
  await assert.rejects(() => prepareArchivePrint([meta('a'), meta('b')], controller.signal, deps({
    read: async () => { controller.abort(); return pdf(); },
    render: async function* () { renders++; yield page(); },
  })), { name: 'AbortError' });
  assert.equal(renders, 0);
});

test('abort between rendered pages closes the generator without a printable result', async () => {
  const controller = new AbortController();
  let closed = false;
  await assert.rejects(() => prepareArchivePrint([meta('a')], controller.signal, deps({
    render: async function* () {
      try { yield page(); controller.abort(); yield page(); } finally { closed = true; }
    },
  })), { name: 'AbortError' });
  assert.equal(closed, true);
});

test('page and pixel limits reject entire batch and dispose renderer generator', async () => {
  let closed = 0;
  for (const hugePixels of [true, false])
    await assert.rejects(() => prepareArchivePrint([meta('a')], signal(), deps({
      render: async function* () {
        try {
          for (let i = 0; i < 41; i++) yield hugePixels ? { ...page(), width: 100_000, height: 100_000 } : page();
        } finally { closed++; }
      },
    })), /Troppi contenuti/);
  assert.equal(closed, 2);
});

test('empty, corrupt and invalid-dimension rendered documents cannot be printed', async () => {
  for (const render of [
    async function* () {},
    async function* () { throw new Error('PDF protetto'); yield page(); },
    async function* () { yield { ...page(), width: NaN }; },
  ]) await assert.rejects(() => prepareArchivePrint([meta('a')], signal(), deps({ render })), /Nessun documento è stato stampato/);
});

test('actual aggregate bytes are bounded even if metadata understates file sizes', async () => {
  const blob = new Blob([new Uint8Array(26 * 1024 * 1024)], { type: 'application/pdf' });
  await assert.rejects(() => prepareArchivePrint([meta('a'), meta('b')], signal(), deps({
    read: async () => blob,
  })), /limite complessivo/);
});
