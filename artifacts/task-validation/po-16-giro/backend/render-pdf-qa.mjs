import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const folder = resolve('artifacts/task-validation/po-16-giro/backend');
const qa = resolve(folder, 'pdf-qa'), output = resolve(qa, 'final');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const source = JSON.parse(await readFile(resolve(folder, 'source-manifest.json'), 'utf8'));
const tests = JSON.parse(await readFile(resolve(folder, 'consolidated-tests.json'), 'utf8'));
assert(tests.databaseClosed && tests.passed === 15 && tests.failed === 0 && tests.priorProductionAndOtherTestInputsByteIdentical);
assert.equal(source.inputTreeSha256, tests.currentInputTreeSha256);
const bin = 'C:/Users/Claudio/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin';
await mkdir(output, { recursive: true });
const rendered = [], files = [];
for (const name of ['mna-v2-half-point', 'mna-full-normal', 'mna-full-long', 'mna-screening-partial']) {
  const input = resolve(qa, name + '.pdf');
  const info = execFileSync(resolve(bin, 'pdfinfo.exe'), [input], { encoding: 'utf8', windowsHide: true });
  assert.match(info, /Producer:\s+ClinicOS mna-a4-v2/);
  const pages = Number(info.match(/^Pages:\s+(\d+)$/m)?.[1]); assert(pages > 0);
  const text = execFileSync('C:/Program Files/Git/mingw64/bin/pdftotext.exe', ['-enc', 'UTF-8', '-layout', input, '-'], { encoding: 'utf8', windowsHide: true });
  assert(!/ — 1 punti\b/.test(text));
  if (name !== 'mna-screening-partial') { assert(text.includes('IMC: 25 kg/m²')); assert(text.includes('1 punto')); }
  if (name === 'mna-v2-half-point') assert(text.includes('Totale MNA: 27,5 / 30'));
  await writeFile(resolve(output, name + '.txt'), text);
  execFileSync(resolve(bin, 'pdftoppm.exe'), ['-r', '100', '-png', input, resolve(output, name)], { windowsHide: true });
  const names = [name + '.pdf', name + '.snapshot.json', 'final/' + name + '.txt', ...Array.from({ length: pages }, (_, i) => `final/${name}-${i + 1}.png`)];
  for (const path of names) { const bytes = await readFile(resolve(qa, path)); files.push({ path, bytes: bytes.length, sha256: sha(bytes) }); }
  rendered.push({ name, pages, producer: 'ClinicOS mna-a4-v2',
    generatedUnderInputTreeSha256: name === 'mna-v2-half-point' ? tests.currentInputTreeSha256 : tests.priorInputTreeSha256,
    productionAndRelevantTestSourcesMatchFrozenTree: true });
}
await writeFile(resolve(qa, 'rendered-pages.json'), JSON.stringify({ sourceManifestSha256: sha(await readFile(resolve(folder, 'source-manifest.json'))), sourceTreeSha256: source.inputTreeSha256,
  renderedAt: new Date().toISOString(), files, rendered, totalPages: rendered.reduce((sum, row) => sum + row.pages, 0), visualInspectionPending: true }, null, 2) + '\n');
console.log(JSON.stringify({ rendered: rendered.length, pages: rendered.reduce((sum, row) => sum + row.pages, 0), files: files.length, specs: rendered }));
