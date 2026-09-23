import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const artifact = dirname(fileURLToPath(import.meta.url));
const qa = resolve(artifact, 'pdf-qa');
const tests = JSON.parse(await readFile(resolve(artifact, 'focused-tests.json'), 'utf8'));
assert(tests.databaseClosed && tests.sourceUnchanged && tests.results.every(row => row.exitCode === 0));
const pdfinfo = 'C:/Users/Claudio/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdfinfo.exe';
const pdftotext = 'C:/Program Files/Git/mingw64/bin/pdftotext.exe';
const specifications = [
  ['transfers-normal.pdf', 'transfers-normal', 2],
  ['transfers-long.pdf', 'transfers-long', 5],
  ['painad-regression/painad-normal.pdf', 'painad-normal', 1],
  ['painad-regression/painad-long.pdf', 'painad-long', 2],
];
const groupLabels = ['Contesto', 'Mobilizzazione', 'Assistenza', 'Ausili', 'Note'];
const aidLabels = ['Carrozzina', 'Cuscino antidecubito', 'Contenzione in carrozzina', '1 antibrachiale',
  'Bastone', 'Tetrapode', '2 antibrachiali', 'Deambulatore rollator', 'Deambulatore ascellare',
  'Deambulatore con tavolo (desk)', 'Busto', 'Ginocchiera'];
const finalFiles = await readdir(resolve(qa, 'final'));
for (const [pdf, name, pages] of specifications) {
  const info = execFileSync(pdfinfo, [resolve(qa, pdf)], { encoding: 'utf8', windowsHide: true });
  assert.equal(Number(info.match(/^Pages:\s+(\d+)$/m)?.[1]), pages);
  assert.equal(finalFiles.filter(file => file.startsWith(`${name}-`) && file.endsWith('.png')).length, pages);
  const text = execFileSync(pdftotext, ['-enc', 'UTF-8', '-layout', resolve(qa, pdf), '-'],
    { encoding: 'utf8', windowsHide: true });
  const savedText = await readFile(resolve(qa, 'final', `${name}.txt`), 'utf8');
  assert.equal(text.replace(/\r\n/g, '\n'), savedText.replace(/\r\n/g, '\n'));
  if (name.startsWith('transfers')) {
    for (const label of [...groupLabels, ...aidLabels, 'Firma Fisioterapista', 'Firma Operatori']) {
      assert(text.includes(label), `Missing Transfers label: ${label}`);
    }
    assert(!/PAINAD|punteggio/i.test(text));
    if (name.endsWith('long')) {
      assert(text.includes('Παπαδόπουλος Élodie'));
      assert(/Prima riga con accenti àèìòù e Ω\.\r?\nSeconda riga conservata\./.test(text));
    }
  } else {
    assert(text.includes('Totale PAINAD: 0 / 10'));
    assert(text.includes('Valutazione del dolore non verbale'));
  }
}
const files = await Promise.all([
  ...specifications.map(row => row[0]),
  ...finalFiles.filter(file => /\.(png|txt)$/.test(file)).map(file => `final/${file}`),
].sort().map(async path => {
  const bytes = await readFile(resolve(qa, path));
  return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
}));
assert.equal(files.length, 18);
await writeFile(resolve(qa, 'visual-qa.json'), JSON.stringify({
  sourceTreeSha256: tests.sourceTreeSha256,
  recordedAt: new Date().toISOString(),
  allPagesInspected: true,
  noClippingOrOverlap: true,
  pages: { transfersNormal: 2, transfersLong: 5, painadNormal: 1, painadLong: 2 },
  observations: [
    'All 10 final PNG pages were visually inspected with view_image after the last Transfers layout refinement.',
    'Transfers normal: compact readable rows; both signature spaces remain together on page 2 with the clinical content.',
    'Transfers long: Unicode accents and Greek names remain readable; explicit note newlines survive pagination without clipping or overlap.',
    'PAINAD normal/long: previous content and score remain readable on 1/2 pages, including long correction reason and item text.',
    'Fresh PDF text extraction exactly matches the stored final extracts; all Transfers groups, 12 aids and source signature labels are present, with no PAINAD score text.',
    'Only current PDFs and final PNG/text files are bound; prior layout images outside final are excluded.',
  ],
  files,
}, null, 2) + '\n');
console.log(JSON.stringify({ visualQaRecorded: true, pageCount: 10, files: files.length, sourceTreeSha256: tests.sourceTreeSha256 }));
