import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
const folder = resolve('artifacts/task-validation/po-16-giro/backend');
const original = 'C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/artifacts/task-validation/po-15-catalogo';
const target = resolve(folder, 'legacy-v1');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const stateBytes = await readFile(resolve(original, 'preview/synthetic-state.json'));
const state = JSON.parse(stateBytes);
const docs = state.documents.filter(row => row.sourceManifest?.rendererVersion === 'mna-a4-v1');
assert.equal(docs.length, 1);
const document = docs[0], assessment = state.assessments.find(row => row.id === document.assessmentId);
assert.equal(document.id, 'ce59b368-17d9-48c2-bec2-cbf47f621496');
assert.equal(assessment.id, '9df3410f-ddc4-4da6-bc27-888d79e36bff');
assert.equal(assessment.status, 'final'); assert.equal(assessment.pdfStatus, 'ready');
assert.equal(assessment.patientId, document.patientId);
assert.equal(document.sourceManifest.snapshotSha256, assessment.snapshotSha256);
const ordered = value => Array.isArray(value) ? value.map(ordered) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])])) : value;
assert.equal(sha(JSON.stringify(ordered(assessment.finalSnapshot))), assessment.snapshotSha256);
const pdfOriginal = resolve(original, 'qa-evidence/pdfs', document.id + '.pdf');
const pdfBytes = await readFile(pdfOriginal);
assert.equal(pdfBytes.length, document.sizeBytes); assert.equal(sha(pdfBytes), document.sha256);
await mkdir(target, { recursive: true });
await writeFile(resolve(target, 'source-state.snapshot.json'), stateBytes);
await writeFile(resolve(target, 'mna-ready-v1.pdf'), pdfBytes);
await writeFile(resolve(target, 'state.json'), JSON.stringify({ assessment, document }, null, 2) + '\n');
const bin = 'C:/Users/Claudio/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin';
const info = execFileSync(resolve(bin, 'pdfinfo.exe'), [resolve(target, 'mna-ready-v1.pdf')], { encoding: 'utf8', windowsHide: true });
const pages = Number(info.match(/^Pages:\s+(\d+)$/m)?.[1]);
assert(pages > 0); assert.match(info, /Producer:\s+ClinicOS mna-a4-v1/);
const text = execFileSync('C:/Program Files/Git/mingw64/bin/pdftotext.exe', ['-enc', 'UTF-8', '-layout', resolve(target, 'mna-ready-v1.pdf'), '-'], { encoding: 'utf8', windowsHide: true });
assert.match(text, /1 punti/);
await writeFile(resolve(target, 'pdfinfo.txt'), info);
await writeFile(resolve(target, 'text.txt'), text);
execFileSync(resolve(bin, 'pdftoppm.exe'), ['-r', '100', '-png', resolve(target, 'mna-ready-v1.pdf'), resolve(target, 'page')], { windowsHide: true });
const names = ['source-state.snapshot.json', 'state.json', 'mna-ready-v1.pdf', 'pdfinfo.txt', 'text.txt', ...Array.from({ length: pages }, (_, index) => `page-${index + 1}.png`)];
const files = await Promise.all(names.map(async name => { const bytes = await readFile(resolve(target, name)); return { path: 'legacy-v1/' + name, bytes: bytes.length, sha256: sha(bytes) }; }));
await writeFile(resolve(folder, 'legacy-v1-provenance.json'), JSON.stringify({
  originalState: { path: resolve(original, 'preview/synthetic-state.json'), sha256: sha(stateBytes), bytes: stateBytes.length, byteIdenticalSnapshot: true },
  originalPdf: { path: pdfOriginal, sha256: sha(pdfBytes), bytes: pdfBytes.length, byteIdenticalSnapshot: true },
  assessmentId: assessment.id, documentId: document.id, patientId: document.patientId,
  snapshotSha256: assessment.snapshotSha256, canonicalSnapshotHashVerified: true, pdfStatus: 'ready', rendererVersion: 'mna-a4-v1', pages,
  fixtureOrigin: 'Actual synthetic PO15 database records and exported archived PDF supplied by root; no PDF regenerated or clinical state recalculated.',
  baselineFinding: 'Existing archived PDF contains 1 punti. This archived v1 must remain unchanged; corrected text is only for newly generated v2 documents.',
  visualInspectionPending: true, databaseConnected: false, applicationSourceChanged: false, files,
}, null, 2) + '\n');
console.log(JSON.stringify({ prepared: true, pages, documentId: document.id, pdfSha256: sha(pdfBytes), snapshotSha256: assessment.snapshotSha256, stateSha256: sha(stateBytes) }));
