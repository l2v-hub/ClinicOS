import { readFile } from 'node:fs/promises';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { AssessmentSnapshot } from './types.js';

export const ASSESSMENT_RENDERER_VERSION = 'painad-a4-v1';
export const assessmentRendererVersion = (snapshot: AssessmentSnapshot) =>
  snapshot.form.type === 'painad' ? ASSESSMENT_RENDERER_VERSION : 'transfers-a4-v1';
export class AssessmentPdfError extends Error {
  constructor(public code: string) {
    super(code);
  }
}
const width = 595.28,
  height = 841.89,
  margin = 44,
  contentWidth = width - margin * 2;
const dateTime = (value: string) =>
  new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
let fontBytes: Promise<[Buffer, Buffer]> | undefined;
function fonts() {
  return (fontBytes ??= Promise.all([
    readFile(new URL('./fonts/NotoSans-Regular.ttf', import.meta.url)),
    readFile(new URL('./fonts/NotoSans-Bold.ttf', import.meta.url)),
  ]).catch((error) => {
    fontBytes = undefined;
    throw error;
  }));
}
export async function renderAssessmentPdf(snapshot: AssessmentSnapshot): Promise<Buffer> {
  const transfers = snapshot.form.type === 'postural_transfers';
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [regularBytes, boldBytes] = await fonts();
  const [regular, bold] = await Promise.all([
    doc.embedFont(regularBytes, { subset: true }),
    doc.embedFont(boldBytes, { subset: true }),
  ]);
  const supported = new Set(regular.getCharacterSet());
  const supportedBold = new Set(bold.getCharacterSet());
  const text = (value: string) => {
    for (const character of value) {
      const point = character.codePointAt(0)!;
      if (
        !['\n', '\r', '\t'].includes(character) &&
        (!supported.has(point) || !supportedBold.has(point))
      )
        throw new AssessmentPdfError('assessment_pdf_unsupported_glyph');
    }
    return value.replace(/\r\n?/g, '\n').replace(/\t/g, '    ');
  };
  const lines = (value: string, font: PDFFont, size: number, available = contentWidth) => {
    const output: string[] = [];
    for (const paragraph of text(value).split('\n')) {
      let line = '';
      for (const word of paragraph.split(/ +/)) {
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) <= available) {
          line = next;
          continue;
        }
        if (line) output.push(line);
        line = '';
        for (const character of word) {
          if (line && font.widthOfTextAtSize(line + character, size) > available) {
            output.push(line);
            line = '';
          }
          line += character;
        }
      }
      output.push(line);
    }
    return output;
  };
  let page: PDFPage,
    y = 0;
  const patientName = `${snapshot.patient.lastName} ${snapshot.patient.firstName}`.trim();
  const headerName = lines(patientName, bold, 10);
  // Never clip an identity that cannot fit a repeated page header.
  if (headerName.length > 10) throw new AssessmentPdfError('assessment_pdf_identity_too_long');
  const newPage = () => {
    if (doc.getPageCount() >= 30) throw new AssessmentPdfError('assessment_pdf_too_long');
    page = doc.addPage([width, height]);
    y = height - margin;
    page.drawText(
      transfers
        ? 'Trasferimenti posturali e deambulazione'
        : 'PAINAD - Valutazione del dolore non verbale',
      {
        x: margin,
        y,
        size: 14,
        font: bold,
        color: rgb(0.1, 0.2, 0.3),
      },
    );
    y -= 23;
    for (const line of headerName) {
      page.drawText(line, { x: margin, y, size: 10, font: bold });
      y -= 14;
    }
    page.drawText(
      `Valutazione: ${dateTime(snapshot.assessedAt)} | ${transfers ? 'Trasferimenti' : 'PAINAD italiana'}, versione 1`,
      {
        x: margin,
        y,
        size: 9,
        font: regular,
      },
    );
    y -= 18;
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.6,
      color: rgb(0.65, 0.7, 0.75),
    });
    y -= 22;
  };
  const block = (value: string, font = regular, size = 10, gap = 9) => {
    const wrapped = lines(value, font, size);
    for (const line of wrapped) {
      if (y < margin + 34) newPage();
      page.drawText(line, { x: margin, y, size, font, color: rgb(0.1, 0.13, 0.16) });
      y -= size * 1.45;
    }
    y -= gap;
  };
  newPage();
  const birth = snapshot.patient.dateOfBirth?.split('-').reverse().join('/') ?? 'Non disponibile';
  block(
    `Data di nascita: ${birth}\nCodice fiscale: ${snapshot.patient.codiceFiscale ?? 'Non disponibile'}`,
  );
  const location = snapshot.patient.location;
  block(
    `Camera: ${location.room ?? (location.status === 'unavailable' ? 'Non disponibile' : 'Non assegnata')} | Letto: ${location.bed ?? 'Non disponibile'}\nPosizione alla data: ${location.asOf} (Europe/Rome)`,
  );
  block(
    `Operatore: ${snapshot.author.name}\nRegistrazione: ${dateTime(snapshot.createdAt)}\nFinalizzazione: ${dateTime(snapshot.finalizedAt)}`,
  );
  if (snapshot.predecessorId)
    block(
      `Rettifica della valutazione${snapshot.predecessor ? ` del ${dateTime(snapshot.predecessor.assessedAt)}, di ${snapshot.predecessor.authorName}` : ' precedente'}\nMotivo: ${snapshot.correctionReason}`,
    );
  if ('sections' in snapshot) {
    for (const section of snapshot.sections) {
      if (y < margin + 100) newPage();
      block(section.label, bold, 12);
      for (const row of section.rows) {
        if (y < margin + 70) newPage();
        block(section.id === 'notes' ? row.value : `${row.label}: ${row.value}`, regular, 10, 7);
      }
    }
    block(
      'Fonte: Trasferimenti posturali e deambulazione degli ospiti, allegato del 22/09/2026. Versione italiana 1.',
      regular,
      9,
    );
    if (y < margin + 110) newPage();
    for (const label of snapshot.signatureLabels)
      block(`${label}: ____________________________________`, regular, 10, 20);
  } else {
    block('Griglia di valutazione osservazionale', bold, 12);
    for (const [index, item] of snapshot.items.entries()) {
      if (y < margin + 100) newPage();
      block(`${index + 1}. ${item.label} - ${item.score} punti`, bold, 10, 2);
      block(item.description);
    }
    if (y < margin + 115) newPage();
    block(`Totale PAINAD: ${snapshot.result.total} / 10 - ${snapshot.result.label}`, bold, 12);
    block(
      'Fasce della fonte: 0 nessun dolore rilevato; 1-3 lieve; 4-6 moderato; 7-10 severo.',
      regular,
      9,
    );
    block(`Indicazione della fonte: ${snapshot.interpretation}`, regular, 9);
    block(
      'Le indicazioni della fonte richiedono valutazione clinica. Questa scheda non genera diagnosi o trattamenti automatici.',
      regular,
      9,
    );
    block('Fonte: Scala PAINAD, allegato del 22/09/2026. Versione italiana 1.', regular, 9);
  }
  const pages = doc.getPages();
  pages.forEach((sheet, index) =>
    sheet.drawText(`Valutazione finalizzata | Pagina ${index + 1} di ${pages.length}`, {
      x: margin,
      y: 25,
      size: 8,
      font: regular,
      color: rgb(0.35, 0.4, 0.45),
    }),
  );
  doc.setTitle(
    transfers ? 'Trasferimenti posturali - Scheda finalizzata' : 'PAINAD - Valutazione finalizzata',
  );
  doc.setProducer(`ClinicOS ${assessmentRendererVersion(snapshot)}`);
  doc.setKeywords([
    snapshot.form.version,
    snapshot.form.sourceSha256,
    ...(snapshot.predecessorId ? [snapshot.predecessorId] : []),
  ]);
  doc.setCreationDate(new Date(snapshot.finalizedAt));
  doc.setModificationDate(new Date(snapshot.finalizedAt));
  const bytes = Buffer.from(await doc.save());
  if (bytes.length > 15 * 1024 * 1024) throw new AssessmentPdfError('assessment_pdf_too_large');
  return bytes;
}
