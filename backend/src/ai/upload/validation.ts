// Upload validation rules for the discharge-letter import (REQ-014 / REQ-019).
// Pure, DB-free, so it is fully unit-testable.

import { createHash } from 'node:crypto';
import { basename, extname } from 'node:path';
import { sniffMime, type SniffedType } from './mime-sniff.js';

// DOCX is a ZIP container — accepted only when the extension says docx/doc.
// Bare ZIP / EXE / anything else is rejected.
export const ACCEPTED_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.heic',
]);

const SNIFF_TO_ALLOWED: Record<string, true> = {
  'application/pdf': true,
  'image/jpeg': true,
  'image/png': true,
  'image/webp': true,
  'image/tiff': true,
  'image/heic': true,
  'text/plain': true,
};

export interface IncomingFile {
  filename: string;
  declaredMime: string;
  data: Buffer;
}

export interface ValidatedFile {
  filename: string;
  /** Sanitized base name, no path segments. */
  safeName: string;
  mimeType: SniffedType;
  sizeBytes: number;
  sha256: string;
}

export type RejectReason =
  | 'empty'
  | 'extension_not_allowed'
  | 'type_not_allowed'
  | 'too_large'
  | 'extension_mismatch';

export interface FileValidationResult {
  ok: boolean;
  file?: ValidatedFile;
  reason?: RejectReason;
  message?: string;
}

/** Strip path + unsafe chars from a filename so it is safe to store/log.
 *  Keeps letters/digits/dot/hyphen/underscore/space; collapses everything else. */
export function sanitizeFilename(name: string): string {
  // Normalize Windows separators so basename behaves the same on every platform.
  const flat = name.replace(/\\/g, '/');
  const base = basename(flat)
    .replace(/[^A-Za-z0-9._ -]+/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/^[._ ]+/, '')
    .trim();
  return base.length ? base.slice(0, 200) : 'file';
}

export function sha256Hex(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

export interface PerFileLimits {
  maxFileBytes: number;
}

/** Validate a single file by extension + sniffed magic bytes + size. */
export function validateFile(file: IncomingFile, limits: PerFileLimits): FileValidationResult {
  const safeName = sanitizeFilename(file.filename);
  const ext = extname(safeName).toLowerCase();

  if (file.data.length === 0) {
    return { ok: false, reason: 'empty', message: 'File vuoto' };
  }
  if (!ACCEPTED_EXTENSIONS.has(ext)) {
    return { ok: false, reason: 'extension_not_allowed', message: `Estensione non ammessa: ${ext || '(nessuna)'}` };
  }
  if (file.data.length > limits.maxFileBytes) {
    return { ok: false, reason: 'too_large', message: 'File oltre la dimensione massima' };
  }

  const sniffed = sniffMime(file.data);
  const isDocx = ext === '.docx' || ext === '.doc';

  // DOCX must be a ZIP container; everything else must match an allowed image/pdf/text type.
  if (isDocx) {
    if (sniffed !== 'application/zip') {
      return { ok: false, reason: 'type_not_allowed', message: 'DOC/DOCX non valido' };
    }
  } else if (!SNIFF_TO_ALLOWED[sniffed]) {
    return { ok: false, reason: 'type_not_allowed', message: `Tipo reale non ammesso: ${sniffed}` };
  } else {
    // Guard against a forged extension (e.g. a .png that is really a PDF).
    const extFamily = fileFamily(ext);
    const sniffFamily = sniffFamilyOf(sniffed);
    if (extFamily && sniffFamily && extFamily !== sniffFamily) {
      return { ok: false, reason: 'extension_mismatch', message: 'Estensione non coerente col contenuto' };
    }
  }

  return {
    ok: true,
    file: {
      filename: file.filename,
      safeName,
      mimeType: isDocx ? 'application/zip' : sniffed,
      sizeBytes: file.data.length,
      sha256: sha256Hex(file.data),
    },
  };
}

type Family = 'image' | 'pdf' | 'text';

// Coarse family bucket so jpg/jpeg/png/webp/tiff are interchangeable but pdf vs image is not.
function fileFamily(ext: string): Family | null {
  const e = ext.toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.heic'].includes(e)) return 'image';
  if (e === '.pdf') return 'pdf';
  if (e === '.txt') return 'text';
  return null;
}

function sniffFamilyOf(mime: SniffedType): Family | null {
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'text/plain') return 'text';
  return null;
}
