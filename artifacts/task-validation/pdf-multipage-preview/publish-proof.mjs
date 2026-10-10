import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gh } from './github.mjs';
const root = 'artifacts/task-validation/pdf-multipage-preview';
const app = '30f0b14d63ae69acec66cd82dcaee1d0abbb1cf6';
const json = name => JSON.parse(readFileSync(root + '/' + name + '.json', 'utf8'));
const git = args => { const r = spawnSync('git', args, { windowsHide: true, maxBuffer: 500e6 }); assert.equal(r.status, 0); return r.stdout; };
const proof = git(['rev-parse', 'HEAD']).toString().trim();
assert.notEqual(proof, app);
git(['merge-base', '--is-ancestor', app, proof]);
const changes = git(['diff', '--name-only', app, proof]).toString().trim().split('\n');
assert.ok(changes.length > 100 && changes.every(p => p.startsWith(root + '/')));
const refs = git(['ls-remote', 'origin', 'refs/heads/main', 'refs/heads/codex/pdf-multipage-preview']).toString();
assert.ok(refs.includes(app + '\trefs/heads/main') && refs.includes(proof + '\trefs/heads/codex/pdf-multipage-preview'));
for (const name of ['release-gate', 'source-binding', 'deployment-receipt', 'ci-comparison']) assert.equal(json(name).applicationCommit, app);
const online = json('compiled-online/online-receipt');
assert.equal(online.applicationCommit, app); assert.equal(online.scenarios, 4); assert.equal(online.rasterComparisons, 24); assert.equal(online.productionPatientTestMutations, 0);
assert.equal(json('ci-comparison').newFailureNames.length, 0);
assert.match(readFileSync(root + '/validation-report.md', 'utf8'), /CLOSED — VERIFIED/);
const manifest = json('publication-manifest'); assert.equal(manifest.applicationCommit, app); assert.equal(manifest.findings.length, 0);
const tracked = git(['ls-tree', '-r', '--name-only', proof, '--', root]).toString().trim().split('\n');
assert.deepEqual(tracked.sort(), [...manifest.files.map(f => f.path), root + '/publication-manifest.json'].sort());
const blobs = spawnSync('git', ['cat-file', '--batch'], { input: manifest.files.map(f => proof + ':' + f.path).join('\n') + '\n', windowsHide: true, maxBuffer: 500e6 }); assert.equal(blobs.status, 0);
let at = 0;
for (const f of manifest.files) {
  const end = blobs.stdout.indexOf(10, at), header = blobs.stdout.subarray(at, end).toString().split(' '); assert.equal(header[1], 'blob');
  at = end + 1; const bytes = blobs.stdout.subarray(at, at + Number(header[2])); at += bytes.length; assert.equal(blobs.stdout[at++], 10);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), f.gitBlobSha256);
}
assert.equal(at, blobs.stdout.length);
const images = [];
for (const [label, path] of [
  ['Desktop: quattro pagine originali', 'compiled-online/browser-v2-fidelity/desktop-four-original-pages.png'],
  ['Desktop: pagina originale 4', 'compiled-online/browser-v2-fidelity/desktop-page-4.png'],
  ['Mobile emulato: pagina originale 4', 'compiled-online/browser-v2-fidelity/mobile-page-4.png'],
]) {
  const url = `https://raw.githubusercontent.com/l2v-hub/ClinicOS/${proof}/${root}/${path}`;
  const response = await fetch(url); assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /image\/png/);
  const bytes = Buffer.from(await response.arrayBuffer()), hash = createHash('sha256').update(bytes).digest('hex');
  assert.equal(hash, manifest.files.find(f => f.path === root + '/' + path).gitBlobSha256);
  images.push({ label, url, sha256: hash, http: response.status });
}
const initial = json('issue').issue;
const issue = JSON.parse(gh(['api', 'repos/l2v-hub/ClinicOS/issues/430']));
assert.equal(issue.body, initial.body); assert.equal(issue.title, initial.title);
const link = path => `https://github.com/l2v-hub/ClinicOS/blob/${proof}/${root}/${path}`;
const body = `Correzione pubblicata e verificata: tutte e quattro le pagine della fixture sintetica sono visibili nelle miniature e nelle anteprime ingrandite, anche dopo riordino e ripresa.

AC1–AC5 soddisfatti. Commit applicativo: ${app}. Deployment READY: dpl_2ogtCyTFEqnxw11J99QHtv3kUJD3 su https://clinicos-eosin.vercel.app. Prove immutabili: ${proof}.

QA indipendente; test mirati root18/18 e QA13/13; tipi/build e secrets scan PASS. Quattro scenari responsive sulla SPA realmente pubblicata, 24 confronti raster e154 asset HTTP200/SHA/MIME. CSP invariata, decoder e fallback same-origin.

Limiti espliciti: suite frontend1287/1299 con12 identici errori preesistenti; CI Import Gate mantiene l'unico errore backend già presente sulla baseline e salta i job successivi, senza nuovi errori nominati. Non è una CI globalmente verde. Nessun documento/sessione reale o paziente modificato; mobile emulato, non verifica su dispositivi fisici. Nessuna promessa sulla completezza OCR o su ogni codifica PDF.

[Report e acceptance criteria](${link('validation-report.md')}) · [QA indipendente](${link('independent-qa/validation-report.md')}) · [Report Playwright nativo](${link('independent-qa/playwright-report/index.html')}) · [CI baseline comparison](${link('ci-comparison.json')}) · [Deployment](${link('deployment-receipt.json')}) · [Prova online](${link('compiled-online/online-receipt.json')}) · [Manifest privacy/Git bytes](${link('publication-manifest.json')})

Screenshot esclusivamente sintetici, verificati pubblicamente HTTP200 e SHA256 prima di questo commento:

${images.map(i => `![${i.label}](${i.url})`).join('\n\n')}

Per provare: ricaricare con Ctrl+Shift+R e riaprire l'importazione già salvata, finché la sessione è disponibile. Non occorre ricaricare il documento per questa correzione.`;
const comments = JSON.parse(gh(['api', 'repos/l2v-hub/ClinicOS/issues/430/comments', '--paginate']));
assert.ok(comments.length === 0 || (comments.length === 1 && comments[0].body === body), 'Unexpected issue comments; inspect before mutation');
let comment = comments[0];
if (!comment) { assert.equal(issue.state, 'open'); comment = JSON.parse(gh(['api', 'repos/l2v-hub/ClinicOS/issues/430/comments', '-f', 'body=' + body])); }
assert.equal(comment.body, body);
if (issue.state === 'open') gh(['issue', 'close', '430', '--repo', 'l2v-hub/ClinicOS', '--reason', 'completed']);
const closed = JSON.parse(gh(['api', 'repos/l2v-hub/ClinicOS/issues/430'])); assert.equal(closed.state, 'closed'); assert.equal(closed.state_reason, 'completed'); assert.equal(closed.body, initial.body);
const published = JSON.parse(gh(['api', 'repos/l2v-hub/ClinicOS/issues/430/comments', '--paginate'])); assert.ok(published.some(c => c.id === comment.id && c.body === body));
writeFileSync(root + '/github-publication-receipt.json', JSON.stringify({ applicationCommit: app, proofCommit: proof, issue: closed.html_url, state: closed.state, comment: comment.html_url, images, canonicalManifestVerified: true, decision: 'AUTHORIZED EVIDENCE PUBLICATION AND VERIFIED CLOSURE', productionPatientTestMutations: 0, at: new Date().toISOString() }, null, 2));
console.log(JSON.stringify({ issue: closed.html_url, comment: comment.html_url, state: closed.state, verifiedPublicImages: images.length }));
