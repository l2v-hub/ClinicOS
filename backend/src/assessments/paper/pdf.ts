// Paper-identical A4 layout of a finalized scale: header band / title, patient box, the paper's
// option table with every option printed and the selected one ticked, total, bands box, signature.
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';
import type { PatientIdentityDto } from '../../patients/operational-identity.js';
import type { PaperBand, PaperItem, PaperScale, PaperTone } from './definitions.js';
import type { PaperMeasurements, PaperResult } from './engine.js';

export interface PaperPrintData {
  scale: PaperScale;
  patient: PatientIdentityDto;
  authorName: string;
  assessedAt: string;
  selected: Record<string, number | boolean | null>;
  result: PaperResult;
  measurements: PaperMeasurements | null;
  notes: string;
  correction: { reason: string; previous: string | null } | null;
  /** Snapshot description of each selected option (printed instead of the definition text). */
  selectedText?: Record<string, string>;
}
export class PaperPdfError extends Error {
  constructor(public code: string) {
    super(code);
  }
}
export interface PaperFonts {
  regular: PDFFont;
  bold: PDFFont;
  /** Validates and normalizes text for the embedded fonts (throws on unsupported glyphs). */
  text: (value: string) => string;
}

const W = 595.28,
  H = 841.89,
  M = 40,
  CW = W - 2 * M;
const hex = (value: string): RGB => {
  const n = Number.parseInt(value.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
const C = {
  navy: hex('#1E3A5F'),
  ink: hex('#1F2933'),
  muted: hex('#5A6B80'),
  border: hex('#D5DEE9'),
  head: hex('#E4EAF2'),
  zebra: hex('#F5F8FB'),
  selected: hex('#DCEBFF'),
  white: rgb(1, 1, 1),
  dark: hex('#111A2E'),
  tableDark: hex('#1E293B'),
  lightBlue: hex('#EEF6FD'),
};
const TONES: Record<PaperTone, [RGB, RGB]> = {
  red: [hex('#FAD4D4'), hex('#9B2C2C')],
  yellow: [hex('#FDF3B5'), hex('#7A5B00')],
  green: [hex('#CDEFD8'), hex('#22663A')],
  blue: [hex('#DCEBFF'), hex('#1D4FC4')],
};
const dateTime = (value: string) =>
  new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
const number = (value: number, digits = 2) =>
  value.toLocaleString('it-IT', { maximumFractionDigits: digits });

/** Rows of items sharing one printed number (Tinetti 8 and 11). */
export function paperGroups(items: readonly PaperItem[]): PaperItem[][] {
  const groups: PaperItem[][] = [];
  for (const item of items) {
    const last = groups.at(-1);
    if (last && item.number && last[0].number === item.number) last.push(item);
    else groups.push([item]);
  }
  return groups;
}
export function fieldValue(data: PaperPrintData, id: string): string {
  const p = data.patient;
  const name = `${p.lastName} ${p.firstName}`.trim();
  switch (id) {
    case 'patient':
      return name;
    case 'patientCode':
      return p.codiceFiscale ? `${name} · ${p.codiceFiscale}` : name;
    case 'date':
      return dateTime(data.assessedAt);
    case 'birthDate':
      return p.dateOfBirth?.split('-').reverse().join('/') ?? 'Non disponibile';
    case 'operator':
    case 'examiner':
      return data.authorName;
    case 'ward':
      return p.location.room
        ? `Stanza ${p.location.room}${p.location.bed ? ` · Letto ${p.location.bed}` : ''}`
        : 'Non assegnata';
    case 'score':
      return `${data.result.total} / ${data.result.maximum}`;
    case 'weight':
      return data.measurements?.weightKg == null ? '—' : number(data.measurements.weightKg, 1);
    case 'height':
      return data.measurements?.heightM == null ? '—' : number(data.measurements.heightM, 2);
    default:
      return '';
  }
}

export async function drawPaperPdf(doc: PDFDocument, fonts: PaperFonts, data: PaperPrintData) {
  const { scale } = data;
  const { regular, bold } = fonts;
  const oblique = await doc.embedFont(StandardFonts.HelveticaOblique);
  const italicFont = (value: string) => {
    try {
      oblique.encodeText(value);
      return oblique;
    } catch {
      return regular;
    }
  };
  // NotoSans (embedded) has no U+2265: the only paper glyph printed as a two-character fallback.
  const t = (value: string) => fonts.text(value.replace(/≥/g, '>='));
  const wrap = (value: string, font: PDFFont, size: number, width: number) => {
    const out: string[] = [];
    for (const paragraph of t(value).split('\n')) {
      let line = '';
      for (const word of paragraph.split(/ +/)) {
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) <= width) line = next;
        else {
          if (line) out.push(line);
          line = word;
          while (font.widthOfTextAtSize(line, size) > width && line.length > 1) {
            let cut = line.length - 1;
            while (cut > 1 && font.widthOfTextAtSize(line.slice(0, cut), size) > width) cut--;
            out.push(line.slice(0, cut));
            line = line.slice(cut);
          }
        }
      }
      out.push(line);
    }
    return out;
  };
  let page!: PDFPage;
  let y = 0; // distance from the top edge
  const pages: PDFPage[] = [];
  const addPage = () => {
    if (pages.length >= 20) throw new Error('assessment_pdf_too_long');
    page = doc.addPage([W, H]);
    pages.push(page);
    y = M;
  };
  const text = (
    value: string,
    x: number,
    top: number,
    size: number,
    font: PDFFont = regular,
    color: RGB = C.ink,
  ) => page.drawText(t(value), { x, y: H - top - size, size, font, color });
  const lines = (
    value: string[],
    x: number,
    top: number,
    size: number,
    font: PDFFont = regular,
    color: RGB = C.ink,
    gap = 1.3,
  ) => value.forEach((line, index) => text(line, x, top + index * size * gap, size, font, color));
  const rect = (
    x: number,
    top: number,
    width: number,
    height: number,
    options: { fill?: RGB; border?: RGB; borderWidth?: number } = {},
  ) =>
    page.drawRectangle({
      x,
      y: H - top - height,
      width,
      height,
      ...(options.fill ? { color: options.fill } : {}),
      ...(options.border
        ? { borderColor: options.border, borderWidth: options.borderWidth ?? 0.6 }
        : {}),
    });
  const hline = (x1: number, x2: number, top: number, color = C.border, thickness = 0.6) =>
    page.drawLine({ start: { x: x1, y: H - top }, end: { x: x2, y: H - top }, thickness, color });
  const checkbox = (x: number, top: number, checked: boolean, size = 9) => {
    rect(x, top, size, size, {
      border: checked ? C.navy : C.muted,
      borderWidth: checked ? 1 : 0.7,
      ...(checked ? { fill: C.selected } : {}),
    });
    if (checked) {
      page.drawLine({
        start: { x: x + 1.8, y: H - top - size * 0.55 },
        end: { x: x + size * 0.42, y: H - top - size + 1.8 },
        thickness: 1.4,
        color: C.navy,
      });
      page.drawLine({
        start: { x: x + size * 0.42, y: H - top - size + 1.8 },
        end: { x: x + size - 1.5, y: H - top - 1.5 },
        thickness: 1.4,
        color: C.navy,
      });
    }
  };
  const ensure = (needed: number, onBreak?: () => void) => {
    if (y + needed > H - M - 18) {
      addPage();
      onBreak?.();
    }
  };
  const isSelected = (item: PaperItem, value: number | boolean) =>
    data.selected[item.key] === value;
  /** The frozen snapshot text of the chosen option wins over the definition text. */
  const optionText = (item: PaperItem, value: number | boolean, label: string) =>
    isSelected(item, value) ? (data.selectedText?.[item.key] ?? label) : label;
  const accent = hex(scale.accent);
  const bandMatches = (band: PaperBand) => band.id === data.result.band;

  // ── Header ────────────────────────────────────────────────────────────────────────────────
  addPage();
  if (scale.header === 'dark-band') {
    page.drawRectangle({ x: 0, y: H - 112, width: W, height: 112, color: C.dark });
    page.drawRectangle({ x: 0, y: H - 116, width: W, height: 4, color: accent });
    text(scale.title, M, 40, 18, bold, C.white);
    lines(wrap(scale.subtitle, regular, 9.5, CW), M, 66, 9.5, regular, hex('#CBD5E1'));
    y = 136;
  } else if (scale.header === 'band') {
    const sub = wrap(scale.subtitle, regular, 9.5, CW - 28);
    const height = 46 + sub.length * 12.5;
    rect(M, y, CW, height, { fill: C.navy });
    text(scale.title, M + 14, y + 12, 16, bold, C.white);
    lines(sub, M + 14, y + 35, 9.5, regular, hex('#DCE6F2'));
    y += height + 12;
  } else {
    const center = scale.header === 'plain-center';
    const titleLines = wrap(scale.title, bold, 19, CW - 40);
    for (const line of titleLines) {
      const width = bold.widthOfTextAtSize(t(line), 19);
      text(
        line,
        center ? (W - width) / 2 : M,
        y,
        19,
        bold,
        scale.type === 'ucla_npi_sleep' ? accent : C.navy,
      );
      y += 24;
    }
    if (scale.type !== 'ucla_npi_sleep') {
      const subFont = italicFont(scale.subtitle);
      for (const line of wrap(scale.subtitle, subFont, 9, CW)) {
        const width = subFont.widthOfTextAtSize(line, 9);
        text(line, center ? (W - width) / 2 : M, y, 9, subFont, C.muted);
        y += 12;
      }
    }
    y += 10;
  }

  // ── Patient box (paper fields + traceability). Values wrap; identity is never clipped. ──
  {
    const fields = scale.fields;
    const boxed = scale.header === 'band' || scale.header === 'dark-band';
    const colW = CW / 2 - 12;
    const prepared = fields.map((field) => {
      const label = `${field.label}:`;
      const labelW = bold.widthOfTextAtSize(t(label), 8.5) + 6;
      return { label, labelW, value: wrap(fieldValue(data, field.id), regular, 9, colW - labelW - 6) };
    });
    if (prepared.some((field) => field.value.length > 10)) throw new PaperPdfError('assessment_pdf_identity_too_long');
    const rows: Array<typeof prepared> = [];
    for (let index = 0; index < prepared.length; index += 2) rows.push(prepared.slice(index, index + 2));
    const rowHeights = rows.map((row) => 8 + Math.max(...row.map((field) => field.value.length)) * 12);
    const correction = data.correction
      ? wrap(
          `Rettifica${data.correction.previous ? ` della ${data.correction.previous}` : ''} — Motivo: ${data.correction.reason}`,
          regular,
          8.5,
          CW - 24,
        )
      : [];
    const titleH = scale.patientBoxTitle ? 22 : 0;
    const height =
      titleH + rowHeights.reduce((sum, value) => sum + value, 0) + correction.length * 11 + (boxed ? 14 : 2);
    if (y + height > H - M - 18) addPage();
    if (boxed)
      rect(M, y, CW, height, {
        fill: scale.header === 'dark-band' ? hex('#F7F9FC') : C.white,
        border: C.border,
      });
    let top = y + (boxed ? 10 : 0);
    if (scale.patientBoxTitle) {
      text(scale.patientBoxTitle, M + 12, top, 9.5, bold, C.ink);
      hline(M + 12, M + CW - 12, top + 16);
      top += titleH;
    }
    rows.forEach((row, index) => {
      row.forEach((field, column) => {
        const x = M + (boxed ? 12 : 0) + column * (colW + 12);
        text(field.label, x, top, 8.5, bold, C.ink);
        lines(field.value, x + field.labelW, top - 0.5, 9, regular, C.ink, 12 / 9);
        hline(x + field.labelW, x + colW - 6, top + rowHeights[index] - 8, C.border, 0.5);
      });
      top += rowHeights[index];
    });
    lines(correction, M + (boxed ? 12 : 0), top, 8.5, regular, C.muted, 11 / 8.5);
    y += height + 14;
  }
  if (scale.instruction) {
    const label = scale.instruction.label;
    const labelW = bold.widthOfTextAtSize(t(label), 9.5) + 3;
    const first = wrap(scale.instruction.text, regular, 9.5, CW - labelW);
    text(label, M, y, 9.5, bold);
    text(first[0], M + labelW, y, 9.5);
    const rest = wrap(first.slice(1).join(' '), regular, 9.5, CW).filter(Boolean);
    lines(rest, M, y + 12.5, 9.5);
    y += (rest.length + 1) * 12.5 + 14;
  }
  if (scale.intro) {
    const intro = wrap(scale.intro, regular, 9.5, CW);
    lines(intro, M, y, 9.5);
    y += intro.length * 12.5 + 12;
  }

  // ── Section heading ───────────────────────────────────────────────────────────────────────
  const sectionHeading = (title: string, note?: string) => {
    if (scale.sectionStyle === 'bar') {
      ensure(60);
      rect(M, y, CW, 22, { fill: accent });
      text(title, M + 10, y + 6.5, 10, bold, C.white);
      y += 26;
    } else if (scale.sectionStyle === 'rule') {
      ensure(60);
      text(title, M, y, 10.5, bold, C.ink);
      hline(M, M + CW, y + 17, accent, 1.6);
      y += 26;
    } else {
      ensure(60);
      text(title, M, y, scale.type === 'ucla_npi_sleep' ? 12.5 : 11, bold, accent);
      y += 22;
    }
    if (note) {
      const font = italicFont(note);
      const noteLines = wrap(note, font, 8.5, CW);
      lines(noteLines, M, y, 8.5, font, C.muted);
      y += noteLines.length * 11 + 6;
    }
  };

  // ── Tables per layout ─────────────────────────────────────────────────────────────────────
  const tableHeader = (widths: number[], dark = false) => {
    rect(M, y, CW, 20, { fill: dark ? C.tableDark : C.head, border: C.border });
    let x = M;
    scale.columns.forEach((column, index) => {
      text(column, x + 6, y + 6, 8.5, bold, dark ? C.white : C.ink);
      x += widths[index];
    });
    y += 20;
  };
  for (const section of scale.sections) {
    sectionHeading(section.title, section.note);
    if (scale.layout === 'table') {
      const widths = [26, 120, CW - 26 - 120 - 40 - 36, 40, 36];
      const x2 = M + widths[0] + widths[1];
      tableHeader(widths);
      let zebra = false;
      for (const group of paperGroups(section.items)) {
        const head = group[0];
        const labelLines = wrap(head.label, bold, 8.5, widths[1] - 10);
        const noteFont = head.note ? italicFont(head.note) : regular;
        const noteLines = head.note ? wrap(head.note, noteFont, 7.5, widths[1] - 10) : [];
        const labelHeight = 12 + labelLines.length * 11 + noteLines.length * 10;
        const rows = group.flatMap((item) =>
          item.options.map((option, optionIndex) => {
            const sub = optionIndex === 0 && item.subLabel ? item.subLabel : '';
            const desc = wrap(optionText(item, option.value, option.label), regular, 8.5, widths[2] - 10);
            return { item, option, sub, desc, height: Math.max(20, 9 + (desc.length + (sub ? 1 : 0)) * 11) };
          }),
        );
        const total = rows.reduce((sum, row) => sum + row.height, 0);
        if (total < labelHeight) rows[rows.length - 1].height += labelHeight - total;
        let segmentTop = y;
        let segmentRows = 0;
        const closeSegment = () => {
          if (!segmentRows) return;
          rect(M, segmentTop, widths[0] + widths[1], y - segmentTop, { border: C.border });
          rect(M, segmentTop, CW, y - segmentTop, { border: C.border });
        };
        const openSegment = () => {
          segmentTop = y;
          segmentRows = 0;
          text(head.number, M + 7, y + 6, 8.5, bold, hex('#2F6DB5'));
          lines(labelLines, M + widths[0] + 5, y + 6, 8.5, bold);
          if (noteLines.length)
            lines(noteLines, M + widths[0] + 5, y + 8 + labelLines.length * 11, 7.5, noteFont, C.muted);
        };
        rows.forEach((row, index) => {
          const needed = index === 0 ? Math.max(row.height, Math.min(total, labelHeight)) : row.height;
          if (y + needed > H - M - 18) {
            closeSegment();
            addPage();
            tableHeader(widths);
            openSegment();
          } else if (index === 0) openSegment();
          const checked = isSelected(row.item, row.option.value);
          rect(x2, y, CW - widths[0] - widths[1], row.height, {
            fill: checked ? C.selected : zebra ? C.zebra : C.white,
          });
          if (index < rows.length - 1) hline(x2, M + CW, y + row.height);
          let top = y + 6;
          if (row.sub) {
            text(row.sub, x2 + 5, top, 7.5, bold, C.muted);
            top += 11;
          }
          lines(row.desc, x2 + 5, top, 8.5);
          const pts = String(row.option.points);
          text(pts, x2 + widths[2] + (widths[3] - bold.widthOfTextAtSize(pts, 8.5)) / 2, y + 6, 8.5, bold);
          checkbox(x2 + widths[2] + widths[3] + (widths[4] - 9) / 2, y + 5.5, checked);
          zebra = !zebra;
          y += row.height;
          segmentRows++;
        });
        closeSegment();
      }
      y += 12;
    } else if (scale.layout === 'grid') {
      const widths = [100, (CW - 100 - 46) / 3, (CW - 100 - 46) / 3, (CW - 100 - 46) / 3, 46];
      tableHeader(widths, true);
      section.items.forEach((item, index) => {
        const cells = item.options.map((option) =>
          wrap(optionText(item, option.value, option.label), regular, 8.5, widths[1] - 22),
        );
        const label = wrap(`${item.number}. ${item.label}`, bold, 8.5, widths[0] - 12);
        const totalLines = Math.max(label.length, ...cells.map((cell) => cell.length));
        const score = item.options.find((option) => isSelected(item, option.value));
        // Rows taller than a page continue on the next one: text is never clipped.
        for (let start = 0, first = true; start < totalLines || first; first = false) {
          const room = Math.floor((H - M - 18 - y - 16) / 11);
          if (room < Math.min(3, totalLines - start)) {
            addPage();
            tableHeader(widths, true);
            continue;
          }
          const count = Math.min(room, totalLines - start);
          const height = Math.max(count, 1) * 11 + 16;
          rect(M, y, CW, height, { fill: index % 2 ? C.zebra : C.white, border: C.border });
          lines(label.slice(start, start + count), M + 6, y + 8, 8.5, bold);
          let x = M + widths[0];
          item.options.forEach((option, column) => {
            const checked = isSelected(item, option.value);
            if (checked) rect(x, y, widths[column + 1], height, { fill: C.selected });
            page.drawLine({ start: { x, y: H - y }, end: { x, y: H - y - height }, thickness: 0.5, color: C.border });
            if (start === 0) checkbox(x + 6, y + 8, checked);
            lines(cells[column].slice(start, start + count), x + 20, y + 8, 8.5);
            x += widths[column + 1];
          });
          page.drawLine({ start: { x, y: H - y }, end: { x, y: H - y - height }, thickness: 0.5, color: C.border });
          if (score && start === 0) text(String(score.points), x + 18, y + 8, 10, bold);
          y += height;
          start += count;
        }
      });
      y += 10;
    } else if (scale.layout === 'stacked') {
      const twoColumns = scale.columns.length === 2;
      const widths = twoColumns ? [CW * 0.3, CW * 0.7, 0] : [CW * 0.42, CW * 0.43, CW * 0.15];
      if (twoColumns) {
        rect(M, y, CW, 24, { fill: accent });
        text(scale.columns[0], M + 7, y + 8, 8.8, bold, C.white);
        text(scale.columns[1], M + widths[0] + 7, y + 8, 8.8, bold, C.white);
        y += 24;
      }
      for (const item of section.items) {
        const labelText = item.number ? `${item.number}. ${item.label}` : item.label;
        const label = wrap(labelText, bold, 8.8, widths[0] - 14);
        const noteFont = item.note ? italicFont(item.note) : regular;
        const note = item.note ? wrap(item.note, noteFont, 8.3, widths[0] - 14) : [];
        const options = item.options.map((option) =>
          wrap(`${option.value} = ${optionText(item, option.value, option.label)}`, regular, 8.8, widths[1] - 26),
        );
        const leftH = (label.length + note.length) * 11.5;
        const rightH = options.reduce((sum, option) => sum + option.length * 11.5 + 2, 0);
        const height = Math.max(leftH, rightH) + 16;
        ensure(height);
        rect(M, y, CW, height, { fill: hex('#F6FAFE'), border: C.border });
        page.drawLine({
          start: { x: M + widths[0], y: H - y },
          end: { x: M + widths[0], y: H - y - height },
          thickness: 0.5,
          color: C.border,
        });
        if (!twoColumns)
          page.drawLine({
            start: { x: M + widths[0] + widths[1], y: H - y },
            end: { x: M + widths[0] + widths[1], y: H - y - height },
            thickness: 0.5,
            color: C.border,
          });
        lines(label, M + 7, y + 8, 8.8, bold);
        if (note.length) lines(note, M + 7, y + 8 + label.length * 11.5, 8.3, noteFont, C.muted);
        let top = y + 8;
        item.options.forEach((option, index) => {
          const checked = isSelected(item, option.value);
          if (checked)
            rect(M + widths[0] + 3, top - 3, widths[1] - 6, options[index].length * 11.5 + 4, {
              fill: C.selected,
            });
          checkbox(M + widths[0] + 7, top - 0.5, checked);
          lines(options[index], M + widths[0] + 21, top, 8.8);
          top += options[index].length * 11.5 + 2;
        });
        const chosen = item.options.find((option) => isSelected(item, option.value));
        if (!twoColumns) {
          text('Punti:', M + widths[0] + widths[1] + 7, y + 8, 8.8, bold);
          text(
            chosen ? String(chosen.points) : item.dependsOn || item.group ? '—' : '',
            M + widths[0] + widths[1] + 40,
            y + 8,
            8.8,
            bold,
            accent,
          );
        }
        y += height;
      }
      if (twoColumns) {
        const band = scale.bands.find(bandMatches);
        const body = wrap(band?.text ?? '', regular, 8.8, widths[1] - 14);
        const head = `${scale.totalLabel} ${data.result.total} / ${data.result.maximum}`;
        const height = 16 + 11.5 * (1 + body.length);
        ensure(height);
        rect(M, y, CW, height, { fill: hex('#F6FAFE'), border: C.border });
        page.drawLine({
          start: { x: M + widths[0], y: H - y },
          end: { x: M + widths[0], y: H - y - height },
          thickness: 0.5,
          color: C.border,
        });
        text('Punteggio Totale', M + 7, y + 8, 8.8, bold);
        text(head, M + widths[0] + 7, y + 8, 8.8, bold, accent);
        lines(body, M + widths[0] + 7, y + 8 + 11.5, 8.8);
        y += height;
      }
      if (data.measurements) {
        const m = data.measurements;
        const parts = [
          m.bmi !== null ? `BMI calcolato: ${number(m.bmi, 1)}` : null,
          m.calfCm !== null ? `Circonferenza polpaccio: ${number(m.calfCm, 1)} cm` : null,
        ].filter(Boolean) as string[];
        if (parts.length) {
          text(parts.join(' · '), M, y + 6, 8.5, regular, C.muted);
          y += 18;
        }
      }
      y += 10;
    } else {
      // yesno (GDS)
      for (const item of section.items) {
        const label = wrap(item.label, regular, 9.5, CW - 160);
        const height = Math.max(26, label.length * 12.5 + 14);
        ensure(height);
        text(`${item.number}.`, M + 2, y + 8, 9.5, bold, hex('#2F6DB5'));
        lines(label, M + 28, y + 8, 9.5);
        item.options.forEach((option, index) => {
          const x = M + CW - 120 + index * 62;
          const checked = isSelected(item, option.value);
          checkbox(x, y + 8, checked);
          text(
            option.label,
            x + 13,
            y + 8,
            9,
            checked ? bold : regular,
            checked ? C.navy : C.muted,
          );
        });
        hline(M, M + CW, y + height);
        y += height;
      }
      y += 14;
    }
  }

  // ── Total / parts ─────────────────────────────────────────────────────────────────────────
  const drawTotals = (maxWidth: number) => {
    for (const part of data.result.parts ?? []) {
      if (part.id === 'distress') continue;
      text(`${part.label} ${part.total} / ${part.maximum}`, M, y, 10, bold, C.ink);
      y += 16;
    }
    const total = `${scale.totalLabel} ${data.result.total} / ${data.result.maximum}`;
    lines(wrap(total, bold, 11, maxWidth), M, y, 11, bold, scale.type === 'mna' ? accent : C.ink);
    y += 18;
    const distress = data.result.parts?.find((part) => part.id === 'distress');
    if (distress) {
      text(`${distress.label}: ${distress.total} / ${distress.maximum}`, M, y, 9.5, regular, C.ink);
      y += 15;
    }
  };
  const drawBands = () => {
    if (scale.bandsStyle === 'badges') {
      const rowsH = scale.bands.map(
        (band) =>
          Math.max(1, wrap(`${band.title} ${band.text}`, regular, 8.5, CW - 150).length) * 11 + 9,
      );
      const height = 30 + rowsH.reduce((a, b) => a + b, 0) + 8;
      ensure(height);
      rect(M, y, CW, height, { border: C.border });
      text(scale.bandsTitle ?? '', M + 12, y + 10, 10, bold, C.navy);
      hline(M + 12, M + CW - 12, y + 25);
      let top = y + 32;
      scale.bands.forEach((band, index) => {
        const [fill, ink] = TONES[band.tone];
        const badgeW = bold.widthOfTextAtSize(t(band.range), 8) + 12;
        if (bandMatches(band))
          rect(M + 6, top - 3, CW - 12, rowsH[index], {
            fill: hex('#EEF3FA'),
            border: C.navy,
            borderWidth: 1,
          });
        rect(M + 14, top - 1, badgeW, 14, { fill });
        text(band.range, M + 20, top + 2, 8, bold, ink);
        const body = wrap(`${band.title} ${band.text}`, regular, 8.5, CW - 150);
        text(band.title, M + 136, top + 2, 8.5, bold);
        const rest = body[0].slice(band.title.length);
        text(rest, M + 136 + bold.widthOfTextAtSize(t(band.title), 8.5), top + 2, 8.5);
        lines(body.slice(1), M + 136, top + 13, 8.5);
        top += rowsH[index];
      });
      y += height + 16;
    } else if (scale.bandsStyle === 'table') {
      ensure(40 + scale.bands.length * 30 + (scale.scoringNotes?.length ?? 0) * 13);
      if (scale.bandsTitle) {
        text(scale.bandsTitle, M, y, 11, bold, accent);
        y += 20;
      }
      for (const note of scale.scoringNotes ?? []) {
        text(note, M, y, 9, regular);
        y += 13;
      }
      if (scale.scoringNotes) y += 6;
      const widths = [CW * 0.22, CW * 0.3, CW * 0.48];
      const darkHead = scale.type === 'gds15';
      rect(M, y, CW, 20, { fill: darkHead ? hex('#2C4F7C') : C.head, border: C.border });
      scale.bandColumns?.forEach((column, index) =>
        text(
          column,
          M + 6 + widths.slice(0, index).reduce((a, b) => a + b, 0),
          y + 6,
          8.5,
          bold,
          darkHead ? C.white : C.ink,
        ),
      );
      y += 20;
      for (const band of scale.bands) {
        const textLines = wrap(band.text, regular, 8.5, widths[2] - 12);
        const height = Math.max(22, textLines.length * 11 + 10);
        rect(M, y, CW, height, {
          fill: bandMatches(band) ? C.selected : C.white,
          border: C.border,
        });
        if (bandMatches(band)) rect(M, y, 3, height, { fill: C.navy });
        text(band.range, M + 6, y + 6, 8.5, bold);
        text(band.title, M + 6 + widths[0], y + 6, 8.5);
        lines(textLines, M + 6 + widths[0] + widths[1], y + 6, 8.5);
        y += height;
      }
      y += 16;
    } else {
      ensure(30 + scale.bands.length * 15);
      if (scale.bandsTitle) {
        if (scale.sectionStyle === 'rule') {
          text(scale.bandsTitle, M, y, 10.5, bold);
          hline(M, M + CW, y + 17, accent, 1.6);
          y += 26;
        } else {
          text(scale.bandsTitle, M, y, 10.5, bold, accent);
          y += 18;
        }
      }
      const indent = 18 + Math.max(...scale.bands.map((band) => bold.widthOfTextAtSize(t(`• ${band.range}`), 8.5)));
      const bodies = scale.bands.map((band) =>
        wrap(band.text, bandMatches(band) ? bold : regular, 8.5, CW - indent - 16),
      );
      const height = bodies.reduce((sum, body) => sum + body.length * 11.5 + 3.5, 0) + 12;
      rect(M, y, CW, height, { fill: C.lightBlue, border: hex('#BFDDF5') });
      let top = y + 8;
      scale.bands.forEach((band, index) => {
        const matched = bandMatches(band);
        text(`• ${band.range}`, M + 12, top, 8.5, bold, matched ? C.navy : C.ink);
        lines(bodies[index], M + indent, top, 8.5, matched ? bold : regular, matched ? C.navy : C.ink, 1.35);
        top += bodies[index].length * 11.5 + 3.5;
      });
      y += height + 14;
    }
  };
  const drawSignature = (top: number) => {
    const x = M + CW - 200;
    text("Firma dell'Operatore / Valutatore:", x, top, 8.5, bold);
    text(data.authorName, x, top + 16, 9.5);
    hline(x, x + 200, top + 46, C.muted, 0.8);
  };

  if (scale.columns.length === 2 && scale.layout === 'stacked') {
    const distress = data.result.parts?.find((part) => part.id === 'distress');
    if (distress) {
      ensure(20);
      y += 8;
      text(`${distress.label}: ${distress.total} / ${distress.maximum}`, M, y, 9.5, bold, C.ink);
      y += 18;
    }
  } else if (scale.type === 'painad') {
    ensure(40);
    rect(M, y, CW, 30, { fill: C.lightBlue, border: hex('#BFDDF5') });
    const label = scale.totalLabel;
    const labelW = bold.widthOfTextAtSize(t(label), 11);
    text(label, M + CW - 118 - labelW, y + 9, 11, bold, accent);
    rect(M + CW - 104, y, 104, 30, { fill: C.white, border: accent, borderWidth: 1.2 });
    text(`${data.result.total} / 10`, M + CW - 72, y + 8.5, 12, bold);
    y += 44;
    drawBands();
  } else if (scale.signature) {
    drawBands();
    ensure(70);
    const top = y;
    drawTotals(CW - 230);
    drawSignature(top);
    y = Math.max(y, top + 56) + 8;
  } else if (scale.bandsStyle === 'table' && scale.type === 'gds15') {
    drawTotals(CW);
    y += 6;
    drawBands();
  } else {
    ensure(30);
    drawTotals(CW);
    y += 6;
    drawBands();
  }
  if (data.notes) {
    const noteLines = wrap(`Note: ${data.notes}`, regular, 9, CW);
    ensure(Math.min(noteLines.length, 10) * 12 + 10);
    for (const line of noteLines) {
      ensure(12);
      text(line, M, y, 9);
      y += 12;
    }
  }

  // ── Footer ────────────────────────────────────────────────────────────────────────────────
  pages.forEach((sheet, index) => {
    const footer = scale.pageNumbers
      ? `Pagina ${index + 1} di ${pages.length}`
      : scale.footer
        ? scale.footer
        : pages.length > 1
          ? `Pagina ${index + 1} di ${pages.length}`
          : '';
    if (!footer) return;
    if (scale.footer)
      sheet.drawLine({
        start: { x: M, y: 40 },
        end: { x: W - M, y: 40 },
        thickness: 0.5,
        color: C.border,
      });
    const width = regular.widthOfTextAtSize(t(footer), 7.5);
    sheet.drawText(t(footer), {
      x: (W - width) / 2,
      y: 26,
      size: 7.5,
      font: regular,
      color: hex('#8A99AD'),
    });
  });
}
