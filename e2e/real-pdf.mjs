// Build a VALID single-page PDF (correct xref offsets) with synthetic text.
// Used to verify real Gemini document extraction. No real patient data.
export function buildSyntheticPdf(lines) {
  const text = lines
    .map((l, i) => `BT /F1 12 Tf 72 ${740 - i * 20} Td (${l.replace(/[()\\]/g, '\\$&')}) Tj ET`)
    .join('\n');
  const objs = [];
  objs[1] = '<</Type/Catalog/Pages 2 0 R>>';
  objs[2] = '<</Type/Pages/Kids[3 0 R]/Count 1>>';
  objs[3] =
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>';
  objs[4] = `<</Length ${text.length}>>\nstream\n${text}\nendstream`;
  objs[5] = '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>';

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  for (let i = 1; i <= 5; i++) {
    offsets[i] = pdf.length;
    pdf += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xrefStart = pdf.length;
  pdf += 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<</Size 6/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}
