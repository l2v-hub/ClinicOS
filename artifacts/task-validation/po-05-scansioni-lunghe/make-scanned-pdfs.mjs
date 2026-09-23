import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const { PDFDocument } = createRequire(resolve('backend/package.json'))('pdf-lib');
const folder = resolve('artifacts/task-validation/po-05-scansioni-lunghe/fixtures/scanned');
for (const [name, start, count] of [['trenta-pagine.pdf', 1, 30], ['lettera-1.pdf', 1, 10], ['lettera-2.pdf', 11, 10], ['lettera-3.pdf', 21, 10]]) {
  const doc = await PDFDocument.create();
  for (let i = start; i < start + count; i++) {
    const image = await doc.embedJpg(await readFile(resolve(folder, `pagina-${String(i).padStart(2, '0')}.jpg`)));
    doc.addPage([595, 842]).drawImage(image, { x: 0, y: 0, width: 595, height: 842 });
  }
  const bytes = await doc.save();
  await writeFile(resolve(folder, name), bytes);
  console.log(name, bytes.length);
}
