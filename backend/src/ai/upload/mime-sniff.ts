// Real MIME sniffing by magic bytes (REQ-014 / REQ-019).
//
// We do NOT trust the client-provided Content-Type or the file extension.
// A forged ".pdf" that is actually a ZIP/EXE must be detected here and rejected.
// Dependency-free: covers exactly the formats the import flow accepts.

export type SniffedType =
  | 'application/pdf'
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/tiff'
  | 'image/heic'
  | 'text/plain'
  | 'application/zip' // DOCX is a ZIP container; also catches forged archives
  | 'application/x-msdownload' // EXE / DLL
  | 'application/octet-stream'; // unknown

function startsWith(buf: Buffer, bytes: number[], offset = 0): boolean {
  if (buf.length < offset + bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buf[offset + i] !== bytes[i]) return false;
  }
  return true;
}

function asciiAt(buf: Buffer, offset: number, text: string): boolean {
  return buf.slice(offset, offset + text.length).toString('latin1') === text;
}

/** Detect the real type from the leading bytes. Returns octet-stream when unknown. */
export function sniffMime(buf: Buffer): SniffedType {
  // EXE / DLL — "MZ"
  if (startsWith(buf, [0x4d, 0x5a])) return 'application/x-msdownload';
  // PDF — "%PDF"
  if (startsWith(buf, [0x25, 0x50, 0x44, 0x46])) return 'application/pdf';
  // PNG
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  // JPEG
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  // WEBP — "RIFF"...."WEBP"
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && asciiAt(buf, 8, 'WEBP')) return 'image/webp';
  // TIFF — II*\0 or MM\0*
  if (startsWith(buf, [0x49, 0x49, 0x2a, 0x00]) || startsWith(buf, [0x4d, 0x4d, 0x00, 0x2a])) {
    return 'image/tiff';
  }
  // HEIC/HEIF — ....ftyp(heic|heif|heix|mif1)
  if (asciiAt(buf, 4, 'ftyp')) {
    const brand = buf.slice(8, 12).toString('latin1');
    if (['heic', 'heix', 'heif', 'mif1', 'hevc'].includes(brand)) return 'image/heic';
  }
  // ZIP container (DOCX, but also generic zip) — "PK\x03\x04"
  if (startsWith(buf, [0x50, 0x4b, 0x03, 0x04])) return 'application/zip';
  // Plain text heuristic: printable / common whitespace only in the sample.
  if (looksLikeText(buf)) return 'text/plain';
  return 'application/octet-stream';
}

function looksLikeText(buf: Buffer): boolean {
  const sample = buf.slice(0, 512);
  if (sample.length === 0) return false;
  for (const b of sample) {
    // allow tab(9) lf(10) cr(13) and printable 0x20-0x7E plus high bytes (UTF-8)
    if (b === 9 || b === 10 || b === 13) continue;
    if (b >= 0x20) continue;
    return false; // control byte -> binary
  }
  return true;
}
