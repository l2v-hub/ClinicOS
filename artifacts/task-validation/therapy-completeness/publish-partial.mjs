import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gh } from './github.mjs';
const root = 'artifacts/task-validation/therapy-completeness';
const source = '89888589ef1fcce8f200899aa07413c8bcb70325';
const proof = process.argv[2];
assert.match(proof || '', /^[a-f0-9]{40}$/);
const git = args => execFileSync('git', args, { encoding: 'utf8', windowsHide: true }).trim();
assert.equal(git(['rev-parse', 'HEAD']), proof);
assert.equal(git(['branch', '--show-current']), 'codex/therapy-completeness');
assert.equal(git(['diff', '--name-only', source, '--', 'frontend/src', 'backend/src']), '');
const policy = JSON.parse(readFileSync(root + '/policy-receipt.json', 'utf8'));
assert.equal(policy.applicationCommit, source);
assert.equal(policy.mainMayBeChanged, false);
assert.equal(policy.issue432MayBeClosed, false);
const seal = JSON.parse(readFileSync(root + '/publication-manifest.json', 'utf8'));
assert.equal(seal.applicationCommit, source);
assert.deepEqual(seal.findings, []);
assert.equal(seal.canonicalIndexBytesScanned, true);
const remote = JSON.parse(gh(['api', 'repos/l2v-hub/ClinicOS/git/ref/heads/codex/therapy-completeness']));
assert.equal(remote.object.sha, proof);
const main = JSON.parse(gh(['api', 'repos/l2v-hub/ClinicOS/git/ref/heads/main']));
assert.equal(main.object.sha, policy.sourceBase);
const issue = JSON.parse(gh(['api', 'repos/l2v-hub/ClinicOS/issues/432']));
assert.equal(issue.state, 'open');
const qa = root + '/independent-qa/reconciliation/browser-final/test-results/';
const images = [
  ['Fonte estratta sintetica, mobile', qa + 'reconciliation-mobile-extr-95585-w-after-browser-only-reload/mobile-extracted-source.png'],
  ['Varianti estratte distinte nelle proposte, desktop', qa + 'reconciliation-desktop-pro-2277c--not-fabricated-source-text/desktop-proposal-source.png'],
];
const verified = [];
for (const [label, path] of images) {
  const url = `https://raw.githubusercontent.com/l2v-hub/ClinicOS/${proof}/${path}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, 'Pinned screenshot unavailable');
  assert.match(response.headers.get('content-type') || '', /image\/png/);
  const bytes = Buffer.from(await response.arrayBuffer());
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  assert.equal(sha256, createHash('sha256').update(readFileSync(path)).digest('hex'));
  assert.equal(sha256, seal.files.find(file => file.path === path)?.gitBlobSha256);
  verified.push({ label, path, url, sha256, status: response.status });
}
const marker = `<!-- therapy432-partial-${source} -->`;
const link = path => `https://github.com/l2v-hub/ClinicOS/blob/${proof}/${root}/${path}`;
const body = `${marker}
Correzione **PARZIALE, verificata localmente — NON rilasciata in produzione**.

Codice applicativo: [${source.slice(0, 8)}](https://github.com/l2v-hub/ClinicOS/commit/${source}); prove immutabili: [${proof.slice(0, 8)}](https://github.com/l2v-hub/ClinicOS/tree/${proof}/${root}). Le schermate sono esclusivamente sintetiche, non pazienti o documenti reali.

Le voci estratte che non compaiono nel testo riconosciuto restano visibili e da verificare, con varianti/occorrenze distinte, fonte protetta e campi clinici non precompilati automaticamente. Revisione, proposte e riepilogo distinguono testo originale da estrazione. Esclusioni e correzioni sopravvivono al refresh; le righe mancanti o non verificate non possono sparire dalla conferma. Nessun automatismo di dosaggio o certificazione di completezza OCR.

QA indipendente sul commit esatto:67backend,26frontend,10adversarial,1servizio con persistenza simulata e6prove browser desktop/mobile PASS; tipi/build/scansione segreti PASS.134 artefatti indipendenti con10PNG,6tracce e6video.

**Gate: FAILED VALIDATION.** Suite frontend completa1314:1302PASS e12fallimenti già presenti nel baseline, nessuno nuovo; non sono derogati. Persistenza reale DB, deployment e vecchie bozze legacy non verificati/riparati retroattivamente. Le prove del piano/calendario storico mantengono i propri commit, non sono ricertificate dalle nuove6prove di importazione. Issue lasciata OPEN; nessun merge/deploy di questo candidato.

[Rapporto completo](${link('validation-report.md')}) · [QA indipendente](${link('independent-qa/reconciliation/validation-report.md')}) · [Manifest134 artefatti](${link('independent-qa/reconciliation/artifact-manifest.json')}) · [Confronto regressioni](${link('reconciliation-final-regression/comparison.json')}) · [Privacy seal](${link('publication-manifest.json')})

${verified.map(item => `![${item.label}](${item.url})`).join('\n\n')}`;
const comments = JSON.parse(gh(['api', 'repos/l2v-hub/ClinicOS/issues/432/comments', '--paginate']));
const prior = comments.find(comment => comment.body.includes(marker));
if (prior) assert.equal(prior.body, body, 'Do not replace prior proof comment');
const comment = prior || JSON.parse(gh(['api', '--method', 'POST', 'repos/l2v-hub/ClinicOS/issues/432/comments', '-f', 'body=' + body]));
const confirmed = JSON.parse(gh(['api', `repos/l2v-hub/ClinicOS/issues/comments/${comment.id}`]));
assert.equal(confirmed.body, body);
assert.equal(JSON.parse(gh(['api', 'repos/l2v-hub/ClinicOS/issues/432'])).state, 'open');
assert.equal(JSON.parse(gh(['api', 'repos/l2v-hub/ClinicOS/git/ref/heads/main'])).object.sha, policy.sourceBase);
writeFileSync(root + '/partial-publication-receipt.json', JSON.stringify({ source, proof, url: confirmed.html_url, screenshots: verified,
  decision: 'PARTIAL EVIDENCE ONLY; FAILED VALIDATION; NO PRODUCTION PROMOTION', issueState: 'open', mainUnchanged: true, at: new Date().toISOString() }, null, 2));
console.log(JSON.stringify({ source, proof, url: confirmed.html_url, screenshotsVerified: verified.length, issueState: 'open', productionRelease: false }));
