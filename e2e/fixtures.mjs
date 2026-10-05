// Synthetic fixtures for the AI import E2E gate (REQ-020).
// 100% synthetic — no real patient data, no secrets. Valid documents can be decoded
// by the page scanner as well as accepted by the backend MIME sniffer.
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';

const document = await PDFDocument.create();
document
  .addPage([595, 842])
  .drawText('Documento sintetico di test - nessun dato reale.', { x: 40, y: 780, size: 12 });

export const FIXTURES = {
  // Valid discharge-letter PDF (synthetic text).
  pdf: Buffer.from(await document.save()),
  // Complete 64x64 white synthetic page images, including codec data and terminators.
  jpg: Buffer.from(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCABAAEADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//2Q==',
    'base64',
  ),
  png: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAfElEQVR4nNXOQREAIADDsFL/nocIHlyjIGcbZRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncf4OvLpyqgN9ZSiDcwAAAABJRU5ErkJggg==',
    'base64',
  ),
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
