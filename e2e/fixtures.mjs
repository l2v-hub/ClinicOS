// Synthetic fixtures for the AI import E2E gate (REQ-020).
// 100% synthetic — no real patient data, no secrets. Magic bytes are valid so the
// backend MIME sniffer accepts the allowed ones and rejects the invalid one.
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

export const FIXTURES = {
  // Valid discharge-letter PDF (synthetic text).
  pdf: Buffer.concat([
    Buffer.from('%PDF-1.4\n'),
    Buffer.from('Lettera di dimissione sintetica — paziente di test, nessun dato reale.\n'),
    Buffer.from('%%EOF'),
  ]),
  // Valid JPEG header (photo of a document).
  jpg: Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0,
  ]),
  // Valid PNG header (second page photo).
  png: Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52,
  ]),
  // Plain-text note (incomplete document).
  txt: Buffer.from('Nota sintetica incompleta: nessun campo obbligatorio presente.\n'),
  // Invalid: EXE renamed to .pdf — must be rejected.
  invalidExe: Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]),
};

/** Write fixtures to disk and return their paths (for Playwright setInputFiles). */
export function writeFixtures(dir) {
  mkdirSync(dir, { recursive: true });
  const paths = {
    pdf: resolve(dir, 'dimissione-sintetica.pdf'),
    jpg: resolve(dir, 'foto-documento.jpg'),
    png: resolve(dir, 'pagina-2.png'),
    txt: resolve(dir, 'nota-incompleta.txt'),
    invalidExe: resolve(dir, 'non-ammesso.pdf'),
  };
  writeFileSync(paths.pdf, FIXTURES.pdf);
  writeFileSync(paths.jpg, FIXTURES.jpg);
  writeFileSync(paths.png, FIXTURES.png);
  writeFileSync(paths.txt, FIXTURES.txt);
  writeFileSync(paths.invalidExe, FIXTURES.invalidExe);
  return paths;
}
