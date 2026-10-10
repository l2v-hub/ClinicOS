import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {verifyCanonical,verifyCoverage,verifyLocalPinned} from './canonical-blobs.mjs';
const root='artifacts/task-validation/423-document-empty-state',read=p=>JSON.parse(readFileSync(root+'/'+p,'utf8').replace(/^\uFEFF/,'')),app=read('frozen-source.json').applicationCommit,branch='codex/bug-423-document-empty-state',sha=b=>createHash('sha256').update(b).digest('hex');
const configured=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8')).env;
const git=args=>{const r=spawnSync('git',args,{encoding:'utf8',maxBuffer:100e6,windowsHide:true});assert.equal(r.status,0,'Proof check failed safely');return r.stdout.trim();};
const gh=args=>{const r=spawnSync('gh',args,{encoding:'utf8',maxBuffer:30e6,windowsHide:true,env:{...process.env,GH_TOKEN:configured.GITHUB_TOKEN||configured.GH_TOKEN}});assert.equal(r.status,0,'GitHub operation failed safely');return r.stdout.trim();};
const proof=git(['rev-parse','HEAD']),publication=read('publication-manifest.json'),gate=read('release-gate-receipt.json'),deploy=read('deployment-receipt.json'),online=read('compiled-online/online-receipt.json'),ci=read('ci-comparison.json');
verifyCoverage(publication.files,proof);verifyLocalPinned(['publication-manifest.json','frozen-source.json','validation-report.md','release-gate-receipt.json','deployment-receipt.json','compiled-online/online-receipt.json','ci-comparison.json','public-images.json','original-issue.json','visual-review.md'],proof);
assert.match(git(['show',proof+':'+root+'/validation-report.md']),/## Final Decision\s+CLOSED — VERIFIED(?:\s|$)/);
for(const r of [publication,gate,deploy,online,ci])assert.equal(r.applicationCommit,app);
assert.equal(online.cases,gate.rootIndependentRerun);assert.equal(gate.originalCriteriaPassed,4);assert.equal(publication.originalIndependentManifestFrozen,true);
assert.equal(deploy.decision,'VERIFIED RELEASE');assert.equal(deploy.vercel.state,'READY');assert.equal(deploy.vercel.githubCommitSha,app);assert.equal(deploy.vercel.gitSourceSha,app);
assert.equal(deploy.backend.changed,false);assert.equal(deploy.backend.retainedApplication,'3cd984a5a40f1fe5cdc368dbcc4bb629bd6d1510');assert.equal(deploy.backend.healthHttp,200);
assert.equal(git(['diff','--name-only','3cd984a5a40f1fe5cdc368dbcc4bb629bd6d1510',app,'--','backend']),'');
assert.deepEqual(ci.newFailureNames,[]);assert.equal(ci.frontendSecretScanConclusion,'success');
assert.match(git(['ls-remote','origin','refs/heads/'+branch]),new RegExp('^'+proof+'\\s'));assert.match(git(['ls-remote','origin','refs/heads/main']),new RegExp('^'+app+'\\s'));
assert.ok(git(['diff','--name-only',app,proof]).split('\n').every(p=>p.startsWith(root+'/')));verifyCanonical(publication.files,proof);
const raw=`https://raw.githubusercontent.com/l2v-hub/ClinicOS/${proof}/${root}`,tree=`https://github.com/l2v-hub/ClinicOS/tree/${proof}/${root}`,images=read('public-images.json'),verified=[];
verifyLocalPinned(images.map(entry=>entry.path),proof);
for(const {label,path}of images){assert.ok(label&&path.startsWith('compiled-online/')&&!path.includes('..'));const r=await fetch(raw+'/'+path);assert.equal(r.status,200);const bytes=Buffer.from(await r.arrayBuffer());assert.equal(sha(bytes),sha(readFileSync(root+'/'+path)));verified.push({path,http:200,sha256:sha(bytes)});}assert.ok(verified.length>=3);
assert.match(readFileSync(root+'/validation-report.md','utf8'),/## Final Decision\s+CLOSED — VERIFIED(?:\s|$)/);
const check=spawnSync(process.execPath,['scripts/quality-gate/check-closure.js',root],{encoding:'utf8',windowsHide:true});assert.equal(check.status,0);writeFileSync(root+'/check-closure.log',check.stdout+check.stderr);
const original=read('original-issue.json').issue.body,issue=JSON.parse(gh(['api','repos/l2v-hub/ClinicOS/issues/423']));assert.equal(issue.body,original);assert.ok(['open','closed'].includes(issue.state));
const actor=JSON.parse(gh(['api','user'])).login;assert.ok(actor);const comments=JSON.parse(gh(['api','repos/l2v-hub/ClinicOS/issues/423/comments','--paginate','--slurp'])).flat();
const body=`CLOSED — VERIFIED. [Correzione ${app}](https://github.com/l2v-hub/ClinicOS/commit/${app}) online: Vercel ${deploy.vercel.id} READY, meta/gitSource esatti e alias verificato. HTML/JS/CSS200 e SHA invariati prima/dopo ${online.cases} gruppi sul bundle pubblicato. Backend invariato, già accettato3cd/Railway5902626b-ef72-4c31-bf09-bdd4d69cdfc0, health200; nessun nuovo deployment backend necessario.

Tutti4 criteri originali PASS:
- Archivio veramente vuoto: “Nessun documento”, indicazione del primo passo e singolo bottone Aggiungi documento; file/foto, scelta tipo, Salva spiegati.
- Categorie in dettaglio nativo inizialmente chiuso; ricerca, filtri, selezione, albero vuoto e stampa inattiva non dominano la vista.
- Tassonomia invariata:10 categorie,22 tipi caricabili in9 optgroup; PDF valutazioni generato da Moduli. Primo upload sintetico+scheda e reload verificati; caricamento/errore/ricerca senza risultati non sono falso archivio vuoto.
- Ruolo non autorizzato: spiegazione utile e riferimento a coordinatore/amministrazione. Uso delle capability esistenti upload+save e update_type separata; nessuna deduzione di privilegi dalla professione e nessuna modifica autorizzazioni.

[Nuova QA indipendente](${tree}/independent-qa/validation-report.md): ${gate.independentBrowserCases} gruppi; ${gate.immutableQaFiles} [file immutabili](${tree}/independent-qa/manifest.json), SHA ${gate.qaManifestSha256}. Root e online stesso numero e ricette byte-identiche. Baseline reale separata e tentativi preliminari falliti conservati. [Revisione dei pixel reali](${tree}/visual-review.md). Nessuna UI replica o iniezione DOM/CSS/stato.

44/44 test mirati, tipi FE/BE/tsc-b/build/secrets PASS. Regressione1297:1285PASS/12 errori nominati identici al baseline/0 nuovi, NON verde globale. Scanner nativo7 file0 nuovi finding, non audit CVE globale. ${gate.sourceFiles} sorgenti fisici immutati e legati al Git; SHA root ${gate.sourceSha256}; cross-checkout solo strictUTF8 CRLF→LF.

[CI ${ci.candidateRun}](https://github.com/l2v-hub/ClinicOS/actions/runs/${ci.candidateRun}): ${ci.candidateConclusion==='success'?'success':'stesso singolo errore backend e stesso stage della baseline422; downstream saltati, non dichiarati passanti'},0 nuovi; [confronto nominato](${tree}/ci-comparison.json). Secret scan ${ci.frontendSecretScanRun} success.

Tentativo CI1: sei ulteriori fallimenti diary-reading conservati, non sanati con una waiver. Root e revisione indipendente indicano una race tra fixture nel DB sintetico e scope di test non ripristinato dopo un’asserzione fallita; è un’inferenza, non una correzione dell’harness. Una sola ripetizione diagnostica dello stesso sorgente, tentativo ${ci.candidateAttempt}, confrontata contro la baseline originale. [Fallimento iniziale e analisi](${tree}/ci-first-failure-analysis.md), [estratti provider](${tree}/ci-unexpected-failures.json); nessun retry finché verde, modifica test/workflow o certificazione CI globale.

Proof ${proof}: [report](${tree}/validation-report.md), [gate](${tree}/release-gate-receipt.json), [deployment](${tree}/deployment-receipt.json), [online](${tree}/compiled-online/online-receipt.json), [manifest canonicale/credenziali/ZIP](${tree}/publication-manifest.json), [risultati/trace/video](${tree}/compiled-online). HTML è receipt di asserzioni Playwright-library, non report runner nativo. API intercettate PRIMA rete, solo asset statici GET online; salvataggio/reload browser è mock sintetico, non persistenza PostgreSQL reale. Zero scritture pazienti reali/PHI. Nessuna certificazione hardware/AT/sole diretto/touch-guanti o accettazione clinica audit429.

${images.map(({label,path})=>`### ${label}\n![423 ${label}](${raw}/${path})`).join('\n\n')}`;
assert.ok(comments.every(c=>c.user?.login===actor&&c.body===body),'New issue comments require acceptance rereview before publication');
let comment=comments.find(c=>c.user?.login===actor&&c.body===body);if(issue.state==='closed')assert.ok(comment,'Already-closed outcome requires exact authorized proof comment');
writeFileSync(root+'/github-publication-policy.json',JSON.stringify({decision:'AUTHORIZED EXACT PINNED COMMENT AND VERIFIED ISSUE CLOSURE',authority:'Direct human authorization plus independent/root/deployed/CI/publicproof gates',applicationCommit:app,proofCommit:proof,verifiedImages:verified,actor,productionPatientTestMutations:0,at:new Date().toISOString()},null,2));
if(!comment)comment=JSON.parse(gh(['api','repos/l2v-hub/ClinicOS/issues/423/comments','--method','POST','-f',`body=${body}`]));assert.equal(comment.body,body);assert.equal(comment.user?.login,actor);
if(issue.state==='open')gh(['issue','close','423','--repo','l2v-hub/ClinicOS','--reason','completed']);
const fresh=JSON.parse(gh(['api','repos/l2v-hub/ClinicOS/issues/423']));assert.equal(fresh.state,'closed');assert.equal(fresh.body,original);
const receipt={applicationCommit:app,proofCommit:proof,proofBranch:branch,githubProof:comment.html_url,state:fresh.state,canonicalHashesVerified:publication.files.length,images:verified,secretChecks:publication.secretChecks,zipEntriesChecked:publication.zipEntriesChecked,decision:'CLOSED — VERIFIED',productionPatientTestMutations:0,at:new Date().toISOString()};
writeFileSync(root+'/github-publication-receipt.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
