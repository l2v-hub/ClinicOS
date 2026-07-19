import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sniffMime } from '../upload/mime-sniff.js';
import {
  validateFile,
  sanitizeFilename,
  sha256Hex,
  ACCEPTED_EXTENSIONS,
} from '../upload/validation.js';

// ── Minimal real magic-byte fixtures (synthetic, no real clinical data) ──────
const PDF = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.from('synthetic body')]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0, 0, 0, 0]),
  Buffer.from('WEBP'),
  Buffer.from('rest'),
]);
const ZIP_DOCX = Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4]);
const EXE = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0, 0]);
const TXT = Buffer.from('Referto sintetico di prova, nessun dato reale.\n');

const FILE_LIMIT = { maxFileBytes: 5 * 1024 * 1024 };

test('sniffMime detects real types by magic bytes', () => {
  assert.equal(sniffMime(PDF), 'application/pdf');
  assert.equal(sniffMime(PNG), 'image/png');
  assert.equal(sniffMime(JPEG), 'image/jpeg');
  assert.equal(sniffMime(WEBP), 'image/webp');
  assert.equal(sniffMime(ZIP_DOCX), 'application/zip');
  assert.equal(sniffMime(EXE), 'application/x-msdownload');
  assert.equal(sniffMime(TXT), 'text/plain');
});

test('valid PDF accepted', () => {
  const r = validateFile(
    { filename: 'dimissione.pdf', declaredMime: 'application/pdf', data: PDF },
    FILE_LIMIT,
  );
  assert.equal(r.ok, true);
  assert.equal(r.file?.mimeType, 'application/pdf');
  assert.equal(r.file?.sha256, sha256Hex(PDF));
});

test('valid image (jpg) accepted', () => {
  const r = validateFile(
    { filename: 'foto.jpg', declaredMime: 'image/jpeg', data: JPEG },
    FILE_LIMIT,
  );
  assert.equal(r.ok, true);
  assert.equal(r.file?.mimeType, 'image/jpeg');
});

test('DOCX (zip container) accepted only with doc/docx extension', () => {
  const ok = validateFile(
    { filename: 'lettera.docx', declaredMime: 'application/octet-stream', data: ZIP_DOCX },
    FILE_LIMIT,
  );
  assert.equal(ok.ok, true);
  const bareZip = validateFile(
    { filename: 'archivio.zip', declaredMime: 'application/zip', data: ZIP_DOCX },
    FILE_LIMIT,
  );
  assert.equal(bareZip.ok, false);
  assert.equal(bareZip.reason, 'extension_not_allowed');
});

test('EXE renamed to .pdf is rejected by magic bytes', () => {
  const r = validateFile(
    { filename: 'malware.pdf', declaredMime: 'application/pdf', data: EXE },
    FILE_LIMIT,
  );
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'type_not_allowed');
});

test('forged extension mismatch (pdf bytes as .png) rejected', () => {
  const r = validateFile(
    { filename: 'fake.png', declaredMime: 'image/png', data: PDF },
    FILE_LIMIT,
  );
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'extension_mismatch');
});

test('oversize file rejected', () => {
  const r = validateFile(
    { filename: 'big.pdf', declaredMime: 'application/pdf', data: PDF },
    { maxFileBytes: 4 },
  );
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'too_large');
});

test('empty file rejected', () => {
  const r = validateFile(
    { filename: 'empty.pdf', declaredMime: 'application/pdf', data: Buffer.alloc(0) },
    FILE_LIMIT,
  );
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'empty');
});

test('identical bytes produce identical sha256 (dedup key)', () => {
  const a = validateFile(
    { filename: 'a.pdf', declaredMime: 'application/pdf', data: PDF },
    FILE_LIMIT,
  );
  const b = validateFile(
    { filename: 'b.pdf', declaredMime: 'application/pdf', data: Buffer.from(PDF) },
    FILE_LIMIT,
  );
  assert.equal(a.file?.sha256, b.file?.sha256);
});

test('filename is sanitized (no path traversal)', () => {
  assert.equal(sanitizeFilename('../../etc/passwd'), 'passwd');
  assert.equal(sanitizeFilename('a/b/c.pdf'), 'c.pdf');
  assert.ok(!sanitizeFilename('x\\y\\z.png').includes('\\'));
});

test('accepted extension set covers required formats', () => {
  for (const e of ['.pdf', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.webp', '.tiff', '.heic']) {
    assert.ok(ACCEPTED_EXTENSIONS.has(e), `missing ${e}`);
  }
});
