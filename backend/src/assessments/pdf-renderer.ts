import { readFile } from 'node:fs/promises';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { AssessmentSnapshot, TinettiSnapshot, MnaSnapshot, Gds15Snapshot } from './types.js';
import { mnaPdfBlocks } from './mna-pdf-content.js';

const isTinettiSnapshot = (snapshot: AssessmentSnapshot): snapshot is TinettiSnapshot =>
  snapshot.form.type === 'tinetti';
const isMnaSnapshot = (snapshot: AssessmentSnapshot): snapshot is MnaSnapshot =>
  snapshot.form.type === 'mna';
const isGds15Snapshot = (snapshot: AssessmentSnapshot): snapshot is Gds15Snapshot =>
  snapshot.form.type === 'gds15';

export const ASSESSMENT_RENDERER_VERSION = 'painad-a4-v1';
export const assessmentRendererVersion = (snapshot: AssessmentSnapshot) =>
  snapshot.form.type === 'painad'
    ? ASSESSMENT_RENDERER_VERSION
    : snapshot.form.type === 'gds15'
      ? 'gds15-a4-v1'
      : snapshot.form.type === 'mna'
        ? 'mna-a4-v2'
        : snapshot.form.type === 'tinetti'
          ? 'tinetti-a4-v1'
          : 'transfers-a4-v1';
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
  const tinetti = snapshot.form.type === 'tinetti';
  const mna = isMnaSnapshot(snapshot) ? snapshot : null;
  const gds15 = isGds15Snapshot(snapshot) ? snapshot : null;
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
      gds15
        ? 'GDS-15 - Scala di depressione geriatrica'
        : mna
          ? mna.title
          : transfers
            ? 'Trasferimenti posturali e deambulazione'
            : tinetti
              ? 'Scala di Tinetti - Equilibrio e andatura'
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
      `Valutazione: ${dateTime(snapshot.assessedAt)} | ${gds15 ? 'GDS-15 italiana' : mna ? 'MNA italiana' : transfers ? 'Trasferimenti' : tinetti ? 'Tinetti' : 'PAINAD italiana'}, versione 1`,
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
  if (isGds15Snapshot(snapshot)) {
    block('Istruzioni per la somministrazione', bold, 12);
    block(snapshot.instruction);
    block('Questionario di valutazione', bold, 12);
    for (const [index, item] of snapshot.items.entries()) {
      if (y < margin + 90) newPage();
      block(`${index + 1}. ${item.label}`, bold, 10, 3);
      block(`Risposta: ${item.description} | Punti: ${item.score}`, regular, 10, 9);
    }
    if (y < margin + 100) newPage();
    block(`Totale GDS-15: ${snapshot.result.total} / 15 — ${snapshot.result.label}`, bold, 12);
    block('Interpretazione dello screening', bold, 10);
    block(snapshot.screeningNote, regular, 9);
    if (snapshot.notes) {
      if (y < margin + 80) newPage();
      block('Note', bold, 12);
      block(snapshot.notes);
    }
    if (y < margin + 100) newPage();
    block(`Fonte e versione: ${snapshot.form.version}`, bold, 10);
    block(snapshot.provenance, regular, 9);
    block('Riferimenti bibliografici', bold, 10);
    block(snapshot.reference, regular, 9);
  } else if (isMnaSnapshot(snapshot)) {
    for (const entry of mnaPdfBlocks(snapshot)) {
      if (y < margin + (entry.keepSpace ?? 50)) newPage();
      block(entry.text, entry.bold ? bold : regular, entry.size ?? 10, entry.gap ?? 7);
    }
  } else if ('sections' in snapshot) {
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
  } else if (isTinettiSnapshot(snapshot)) {
    for (const group of ['balance', 'gait'] as const) {
      if (y < margin + 100) newPage();
      block(
        group === 'balance' ? 'Equilibrio (massimo 16 punti)' : 'Andatura (massimo 12 punti)',
        bold,
        12,
      );
      for (const [index, item] of snapshot.items.entries()) {
        if (item.group !== group) continue;
        if (y < margin + 80) newPage();
        block(`${index + 1}. ${item.label} - ${item.score} punti`, bold, 10, 2);
        block(item.description, regular, 10, 7);
      }
      block(
        `${group === 'balance' ? 'Equilibrio' : 'Andatura'}: ${snapshot.result[group]} / ${group === 'balance' ? 16 : 12}`,
        bold,
        10,
      );
    }
    if (y < margin + 90) newPage();
    block(`Totale Tinetti: ${snapshot.result.total} / 28 - ${snapshot.result.label}`, bold, 12);
    block(
      'Fasce: 0-18 Alto rischio cadute; 19-23 Rischio moderato; 24-28 Basso rischio.',
      regular,
      9,
    );
    if (snapshot.notes) {
      if (y < margin + 80) newPage();
      block('Note', bold, 12);
      block(snapshot.notes);
    }
    block(`Fonte: ${snapshot.provenance} Versione italiana 1.`, regular, 9);
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
    gds15
      ? 'GDS-15 - Valutazione finalizzata'
      : mna
        ? mna.title + ' - Valutazione finalizzata'
        : transfers
          ? 'Trasferimenti posturali - Scheda finalizzata'
          : tinetti
            ? 'Tinetti - Valutazione finalizzata'
            : 'PAINAD - Valutazione finalizzata',
  );
  doc.setProducer(`ClinicOS ${assessmentRendererVersion(snapshot)}`);
  doc.setKeywords([
    snapshot.form.version,
    snapshot.form.sourceSha256,
    ...('referenceSha256' in snapshot.form ? [snapshot.form.referenceSha256] : []),
    ...(snapshot.predecessorId ? [snapshot.predecessorId] : []),
  ]);
  doc.setCreationDate(new Date(snapshot.finalizedAt));
  doc.setModificationDate(new Date(snapshot.finalizedAt));
  const bytes = Buffer.from(await doc.save());
  if (bytes.length > 15 * 1024 * 1024) throw new AssessmentPdfError('assessment_pdf_too_large');
  return bytes;
}
