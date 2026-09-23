import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const { PDFDocument, StandardFonts } = createRequire(resolve('backend/package.json'))('pdf-lib');
const output = resolve('artifacts/task-validation/po-05-scansioni-lunghe/fixtures');
await mkdir(output, { recursive: true });
async function document(numbers, name) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const number of numbers) {
    const page = pdf.addPage([595, 842]);
    page.drawText(`CLINICOS - DOCUMENTO SINTETICO - PAGINA ${number}`, { font, x: 35, y: 785, size: 13 });
    page.drawText('Nessun dato personale. Prova tecnica di lettura e ordinamento.', { font, x: 35, y: 748, size: 10 });
    for (let row = 1; row <= 20; row++) page.drawText(`Pagina ${number}, riga ${row}: contenuto di prova da conservare integralmente.`, { font, x: 35, y: 715 - row * 27, size: 10 });
    page.drawText(`FINE PAGINA ${number}`, { font, x: 35, y: 55, size: 12 });
  }
  await writeFile(resolve(output, name), await pdf.save());
}
await document(Array.from({ length: 30 }, (_, i) => i + 1), 'trenta-pagine.pdf');
await document(Array.from({ length: 31 }, (_, i) => i + 1), 'trentuno-pagine.pdf');
for (let group = 0; group < 3; group++) await document(Array.from({ length: 10 }, (_, i) => group * 10 + i + 1), `lettera-${group + 1}-dieci-pagine.pdf`);
for (let page = 1; page <= 30; page++) await document([page], `pagina-${String(page).padStart(2, '0')}.pdf`);
await document([99], 'sostituzione-pagina.pdf');
console.log('Created 36 synthetic PDFs for PO05 browser/route validation');
