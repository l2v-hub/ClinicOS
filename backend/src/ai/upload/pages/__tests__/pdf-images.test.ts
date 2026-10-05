import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { PDFDocument } from 'pdf-lib';
import { pageCount, groupPdf } from '../pdf.js';
import { ImportSessionError, type Manifest } from '../model.js';

for (const [extension, mime] of [
  ['jpg', 'image/jpeg'],
  ['png', 'image/png'],
] as const) {
  test(`${mime} imports a valid image from a nonzero Buffer offset and composes its page`, async () => {
    const fixture = await readFile(
      new URL(`../../../../../../tests/fixtures/import-page.${extension}`, import.meta.url),
    );
    const backing = Buffer.alloc(fixture.length + 32, 0x11);
    fixture.copy(backing, 16);
    const bytes = backing.subarray(16, 16 + fixture.length);
    assert.equal(bytes.byteOffset, 16);
    assert.equal(await pageCount(bytes, mime), 1);
    const original = {
      id: 'synthetic-image',
      mimeType: mime,
      sizeBytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      dataBase64: bytes.toString('base64'),
      storagePath: '',
    };
    const manifest: Manifest = {
      version: 1,
      groups: [{ id: 'letter', label: 'Synthetic letter', sortOrder: 0 }],
      pages: [
        {
          id: 'page',
          documentId: original.id,
          groupId: 'letter',
          sortOrder: 0,
          sourcePageNumber: 1,
        },
      ],
    };
    const pdf = await PDFDocument.load(await groupPdf(manifest, 'letter', async () => original));
    assert.equal(pdf.getPageCount(), 1);
    assert.deepEqual(pdf.getPage(0).getSize(), { width: 64, height: 64 });
    assert.deepEqual(bytes, fixture, 'source image bytes remain unchanged');
  });
}

test('malformed JPEG and PNG remain explicitly rejected', async () => {
  for (const mime of ['image/jpeg', 'image/png']) {
    await assert.rejects(
      pageCount(Buffer.from('not an image'), mime),
      (error: unknown) =>
        error instanceof ImportSessionError &&
        error.status === 422 &&
        error.code === 'invalid_document',
    );
  }
});
