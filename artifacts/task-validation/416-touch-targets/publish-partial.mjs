import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root='artifacts/task-validation/416-touch-targets',baseline='0d7adc361b92c8466655d9ed830d2b87bbd0f419';
const git=args=>{const r=spawnSync('git',args,{maxBuffer:100*1024*1024});assert.equal(r.status,0,`Git verification failed: ${args[0]}`);return r.stdout;};
const proof=git(['rev-parse','HEAD']).toString().trim();assert.match(proof,/^[a-f0-9]{40}$/);
assert.equal(git(['branch','--show-current']).toString().trim(),'codex/416-qa-evidence');
const changed=git(['diff','--name-only',baseline,proof]).toString().trim().split('\n');
assert.ok(changed.length>1&&changed.every(p=>p.startsWith(root+'/')),'Evidence branch must contain no application change');
assert.equal(git(['ls-remote','origin','refs/heads/main']).toString().split(/\s+/)[0],baseline,'Accepted production source must not contain416 candidate');
assert.equal(git(['ls-remote','origin','refs/heads/codex/416-qa-evidence']).toString().split(/\s+/)[0],proof);
const manifest=JSON.parse(readFileSync(root+'/publication-manifest.json','utf8'));
assert.equal(manifest.applicationReleased,false);assert.equal(manifest.issueMustRemainOpen,true);
for(const f of manifest.files){const bytes=git(['show',`${proof}:${f.path}`]);assert.equal(createHash('sha256').update(bytes).digest('hex'),f.gitBlobSha256,`Canonical published artifact changed: ${f.path}`);}
const env=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8')).env;
const headers={Authorization:`Bearer ${env.GITHUB_TOKEN||env.GH_TOKEN}`,Accept:'application/vnd.github+json','Content-Type':'application/json'};
const api='https://api.github.com/repos/l2v-hub/ClinicOS/issues/416';
const original=await fetch(api,{headers});assert.equal(original.status,200);assert.equal((await original.json()).state,'open');
const fileUrl=p=>`https://github.com/l2v-hub/ClinicOS/blob/${proof}/${root}/${p}`;
const imagePaths=['root-rerun/browser/screenshots/desktop-roster.png','root-rerun/browser/screenshots/desktop-modules.png','root-rerun/browser/screenshots/supervisor-desktop-rooms.png'];
const images=[];
for(const path of imagePaths){const full=root+'/'+path,url=`https://raw.githubusercontent.com/l2v-hub/ClinicOS/${proof}/${full}`;const r=await fetch(url);assert.equal(r.status,200);const raw=Buffer.from(await r.arrayBuffer());const expected=manifest.files.find(f=>f.path===full);assert.ok(expected);assert.equal(createHash('sha256').update(raw).digest('hex'),expected.gitBlobSha256);images.push({path,url,http:200,sha256:expected.gitBlobSha256});}
const body=`## BLOCKED — evidenze software parziali, nessuna chiusura

La correzione candidata ${manifest.applicationCommit} è conservata isolata. **Non è stata pubblicata nell'app online** e non è inclusa in main: rimane la versione accettata #415 ${baseline}.

Obiettivo di design 44×44 CSS px, non una classificazione automatica di ogni controllo da 36 px come errore WCAG AA. Controlli condivisi in Pazienti/cartella/Moduli/Posti letto più grandi, aree ricerca/Cancella separate, distanza fra azioni adiacenti, testo Stampa/Invio in PS/Nuova compilazione, focus visibile e margine misurato della testata mobile. Nessuna modifica clinica, API, autorizzazioni o dati reali.

AC1/AC2/AC4: prove software sintetiche nel [report](${fileUrl('validation-report.md')}); verifica QA indipendente e riesecuzione dell'integrazione documentate. **AC3 NON VERIFICATO:** serve il dispositivo touch previsto, uso realistico con mani/guanti e un riscontro umano collegato allo stesso candidato. L'emulazione browser non sostituisce questo criterio. Issue lasciata APERTA; nessuna certificazione hardware o clinica.

[Candidato come patch immutabile](${fileUrl('candidate.patch')}) · [QA indipendente](${fileUrl('independent/validation-report.md')}) · [Manifest/hash e scansione credenziali](${fileUrl('publication-manifest.json')}) · [Decisione di pubblicazione solo prove](${fileUrl('partial-publication-decision.json')}) · [Risultati browser e valori](${fileUrl('root-rerun/browser/test-results/results.json')}) · [Geometrie/hit test](${fileUrl('root-rerun/browser/test-results/geometry.json')}) · [Trace](${fileUrl('root-rerun/browser/desktop-trace.zip')}) · [Video](${fileUrl('root-rerun/browser/video/desktop.webm')}) · [Report HTML](${fileUrl('root-rerun/browser/playwright-report/index.html')})

Build/tipi/scansione source/dist e 66 test mirati + 4 SSR supplementari PASS. Suite completa: 1219 test, 1207 PASS e 12 errori identici al baseline, zero nuovi: nessuna dichiarazione di suite globale verde. Scansione ampia: 481 segnalazioni preesistenti, 7 sulle dipendenze e zero nelle parti modificate; limiti dettagliati nei report. Tutte le schermate usano dati sintetici, zero scritture di test sui pazienti online.

${images.map(i=>`![416 risultato sintetico — ${i.path}](${i.url})`).join('\n\n')}`;
const comment=await fetch(api+'/comments',{method:'POST',headers,body:JSON.stringify({body})});assert.equal(comment.status,201);const posted=await comment.json();
const labels=await fetch(api+'/labels',{method:'POST',headers,body:JSON.stringify({labels:['status-blocked']})});assert.equal(labels.status,200);
const checked=await fetch(api,{headers});assert.equal(checked.status,200);const state=await checked.json();assert.equal(state.state,'open');assert.ok(state.labels.some(l=>l.name==='status-blocked'));
writeFileSync(root+'/github-partial-publication-receipt.json',JSON.stringify({proofCommit:proof,candidate:manifest.applicationCommit,applicationReleased:false,acceptedApplication:baseline,decision:'BLOCKED original AC3 physical device',issueState:state.state,commentUrl:posted.html_url,images,canonicalArtifactHashesVerified:manifest.files.length,secretChecks:manifest.secretChecks,zipEntriesChecked:manifest.zipEntriesChecked,checkedAt:new Date().toISOString()},null,2));
console.log(JSON.stringify({issueState:state.state,commentUrl:posted.html_url,applicationReleased:false,proofCommit:proof}));
