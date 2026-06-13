// REQ-014 integration smoke: boots the Express app against the local DB and
// exercises the import-job lifecycle with synthetic files (no real clinical data).
// Run: node ../node_modules/tsx/dist/cli.mjs scripts/jobs-smoke.mts
import assert from 'node:assert/strict';
import app from '../src/app.js';

const PDF = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.from('synthetic discharge letter A')]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8]);
const EXE = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 9, 9, 9, 9]);

const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const { port } = server.address() as { port: number };
const base = `http://127.0.0.1:${port}/ai/extraction/jobs`;
// REQ-019: import endpoints require an operator role header.
const OP = { 'X-Operator-Id': 'op-smoke', 'X-Operator-Role': 'operatore' };
const af = (url: string, opts: RequestInit = {}) =>
  fetch(url, { ...opts, headers: { ...OP, ...(opts.headers as Record<string, string> ?? {}) } });

function form(files: { name: string; buf: Buffer; type: string }[]) {
  const fd = new FormData();
  for (const f of files) fd.append('files', new Blob([f.buf], { type: f.type }), f.name);
  return fd;
}

try {
  // 1. Create job with PDF + JPG + a duplicate PDF + an EXE (rejected). 4 sent.
  let res = await af(base, {
    method: 'POST',
    body: form([
      { name: 'dimissione.pdf', buf: PDF, type: 'application/pdf' },
      { name: 'foto.jpg', buf: JPG, type: 'image/jpeg' },
      { name: 'dimissione-copia.pdf', buf: PDF, type: 'application/pdf' }, // duplicate bytes
      { name: 'virus.pdf', buf: EXE, type: 'application/pdf' }, // forged exe
    ]),
  });
  assert.equal(res.status, 201, 'create job 201');
  let body = await res.json();
  const jobId = body.job.id;
  const outcomes = body.outcomes as { filename: string; status: string }[];
  const by = (n: string) => outcomes.find((o) => o.filename === n)!.status;
  assert.equal(by('dimissione.pdf'), 'accepted', 'pdf accepted');
  assert.equal(by('foto.jpg'), 'accepted', 'jpg accepted');
  assert.equal(by('dimissione-copia.pdf'), 'duplicate', 'duplicate detected');
  assert.equal(by('virus.pdf'), 'rejected', 'exe rejected');
  assert.equal(body.job.fileCount, 2, 'two valid files; invalids did not lose the valid ones');

  // 2. Status reflects 2 docs, no patient data anywhere.
  res = await af(`${base}/${jobId}`);
  body = await res.json();
  assert.equal(body.documents.length, 2);
  assert.ok(!JSON.stringify(body).includes('storagePath'), 'storagePath never exposed');

  // 3. Remove one document -> count drops, total recomputed.
  const docId = body.documents[0].id;
  res = await af(`${base}/${jobId}/files/${docId}`, { method: 'DELETE' });
  body = await res.json();
  assert.equal(body.fileCount, 1, 'one doc after delete');

  // 4. Add a new file to the same job (mixed batches).
  res = await af(`${base}/${jobId}/files`, {
    method: 'POST',
    body: form([{ name: 'pagina2.png', buf: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2]), type: 'image/png' }]),
  });
  body = await res.json();
  assert.equal(body.job.fileCount, 2, 'add-more works on existing job');

  // 4b. Logical-doc grouping (REQ-014 residual): tag an item, verify it persists.
  const someDoc = body.job.documents[0].id;
  res = await af(`${base}/${jobId}/files/${someDoc}/logical`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ logicalDoc: 'Documento 1' }),
  });
  body = await res.json();
  assert.equal(body.documents.find((d: { id: string; logicalDoc?: string }) => d.id === someDoc)?.logicalDoc, 'Documento 1', 'logicalDoc persisted');

  // 5. Process (REQ-015, mock provider) -> review_ready with a schema-valid result.
  res = await af(`${base}/${jobId}/process`, { method: 'POST' });
  body = await res.json();
  assert.equal(body.status, 'review_ready', `process -> review_ready (got ${body.status} / ${body.error ?? ''})`);
  res = await af(`${base}/${jobId}/result`);
  const result = await res.json();
  assert.equal(result.status, 'review_ready', 'result status review_ready');
  // REQ-016 merged proposal shape: { _merge, anagrafica:{field:MergedField}, cartella:{...} }
  assert.ok(result.resultData?._merge?.version, 'merged proposal has _merge.version');
  assert.ok(result.resultData?.anagrafica?.nome?.status, 'anagrafica.nome is a MergedField');
  assert.equal(result.resultData.anagrafica.nome.status, 'missing', 'mock -> empty -> missing, no invention');
  assert.ok(result.resultData.cartella.diagnosi.items, 'diagnosi is a MergedList');
  assert.ok(result.resultData._merge.documents.length >= 1, 'provenance documents present');

  // 6. Cancel -> terminal + cleanup.
  res = await af(`${base}/${jobId}/cancel`, { method: 'POST' });
  body = await res.json();
  assert.equal(body.status, 'expired', 'cancel marks terminal');
  assert.equal(body.totalBytes, 0, 'bytes cleared on cancel');

  console.log('REQ-014/015 jobs-smoke: ALL ASSERTIONS PASS');
} finally {
  server.close();
  const { prisma } = await import('../src/lib/prisma.js');
  await prisma.$disconnect();
}
