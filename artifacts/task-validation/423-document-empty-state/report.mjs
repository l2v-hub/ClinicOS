import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const root='artifacts/task-validation/423-document-empty-state',read=p=>JSON.parse(readFileSync(root+'/'+p,'utf8').replace(/^\uFEFF/,'')),final=process.argv[2]==='final';
const gate=read('release-gate-receipt.json'),deploy=read('deployment-receipt.json'),online=read('compiled-online/online-receipt.json'),ci=read('ci-comparison.json');
for(const r of [deploy,online,ci])assert.equal(r.applicationCommit,gate.applicationCommit);
assert.equal(online.cases,gate.rootIndependentRerun);assert.equal(gate.originalCriteriaPassed,4);
assert.equal(deploy.decision,'VERIFIED RELEASE');assert.equal(deploy.backend.changed,false);assert.equal(deploy.backend.healthHttp,200);
assert.deepEqual(ci.newFailureNames,[]);assert.equal(ci.frontendSecretScanConclusion,'success');
let publicProof='Pinned public HTTP/hash proof pending: issue remains open.';
if(final){const pub=read('public-preverification.json');assert.equal(pub.applicationCommit,gate.applicationCommit);assert.ok(pub.images.length>=3&&pub.images.every(i=>i.http===200));assert.ok(readFileSync(root+'/visual-review.md','utf8').includes('ACTUAL PIXELS INSPECTED'));publicProof=`Public proof ${pub.proofCommit}: ${pub.images.length} actual synthetic PNGs HTTP200 with raw SHA verification. Publisher rechecks final proof and unchanged original issue before closure.`;}
writeFileSync(root+'/validation-report.md',`# #423 — Archivio documenti vuoto

## Final Decision
${final?'CLOSED — VERIFIED':'IMPLEMENTED — NOT VERIFIED'}

Application ${gate.applicationCommit}; accepted baseline3cd984a5a40f1fe5cdc368dbcc4bb629bd6d1510. Vercel ${deploy.vercel.id} READY exact meta/gitSource SHA and production alias. HTML/JS/CSS200 and hashes unchanged before/after ${online.cases} compiled browser groups. Backend unchanged, retained accepted3cd/Railway5902626b-ef72-4c31-bf09-bdd4d69cdfc0 with health200; no new backend deployment required.

## Original acceptance criteria

| Original criterion | Result | Evidence |
|---|---|---|
| AC1 Empty state explains next useful step | PASS | Actual native authorized view says Nessun documento, choose type and file/photo, Save; single add opens existing form without an automatic write |
| AC2 Empty categories and inactive controls do not dominate | PASS | Ten categories initially in closed native details; empty search/filter/selection/print/tree absent; keyboard disclosure available |
| AC3 Categories remain available during first upload | PASS | Unchanged taxonomy: ten categories,22 existing manual-upload types in nine native optgroups; assessment PDF remains generated in Modules. Guarded synthetic first upload+record save and native reload transition to populated management; loading/error/filtered zero are distinct |
| AC4 Read-only role gets useful explanation and referent | PASS | Existing upload AND clinical_record.save gates, separate update_type for existing file edits; denied/missing policy explains coordinator/administration. No professional-label privilege inference, backend authorization remains authoritative |

## Independent quality gate and root replay

NEW independent QA2 C:/w-423-qa2, clean refined candidate; original four criteria and seven-path source scope reviewed. READY FOR CODEX QA; ${gate.immutableQaFiles} sealed files, manifest SHA ${gate.qaManifestSha256}. Root and compiled replay same immutable recipes: ${online.cases} groups each. Actual Vite configuration and React compiler, native selectors/interactions only, no injected application DOM/CSS/state or UI replica. Separate accepted-baseline actual SPA reproduction retained but not counted as candidate PASS.

${gate.sourceFiles} application inputs unchanged before/after QA/root; root physical SHA ${gate.sourceSha256}; independent physical SHA ${gate.independentRawSourceSha256}. Both physical trees independently bound to actual immutable Git blobs, strict UTF8 CRLF→LF only; no application dirt or new untracked app paths. Browsers and owned local servers released. Primary dirty checkout and native launchers untouched; no two application writers.

Types FE/BE, tsc-b, actual Vite build and src/dist secret scan PASS. Focused44/44 each. Full1297:1285 PASS/12 exact named baseline failures/0 new; not globally green. Native scoped scanner seven changed files baseline/candidate0 findings; not a global CVE audit. No backend/auth/schema/API/dependency/config change. Existing null capability map compatibility remains server-authoritative, available-map missing/denied fails closed.

CI ${ci.candidateRun}: ${ci.candidateConclusion==='success'?'success':'exact single accepted422 failure at Backend unit tests; downstream import tests skipped, not claimed passing'},0 new failure names. Secret scan ${ci.frontendSecretScanRun} success. Exact receipts and named comparison in ci-comparison.json.

CI attempt1 had six additional diary-reading failures, preserved in ci-unexpected-failures.json rather than waived. Root and independent read-only review support shared synthetic DB fixture interference and leaked test scope after a failed assertion; this is an inference, not a harness fix. One bounded exact-source failed-job rerun is recorded in ci-rerun-policy.json/ci-rerun-receipt.json. Final attempt ${ci.candidateAttempt} is accepted only against the original exact baseline; first failure and failed local report-generation sequence remain documented in ci-first-failure-analysis.md. No further automatic retry or global CI-green claim.

## Runtime evidence and retained failures

independent-qa, root-rerun and compiled-online plans/results enumerate screenshots, native Playwright traces/video and HTML assertion receipt. The HTML is explicitly a Playwright-library receipt, not a native runner report. All APIs/auth/facility requests intercepted before wire; production permits static GET assets only. Synthetic upload/record payloads are mocks, reload is mock-backed persistence, not actual PostgreSQL/real-patient persistence. Expected failure-path statuses are declared separately, not ignored unexpected failures.

Root TDD red and failed commands01 retained: list extraction initially imported status labels through the form and triggered transitive PDF-worker initialization in SSR. Unchanged status constant moved to a tiny shared module with original public re-export; no loader/test weakening. First QA1 found d653 unnecessarily blocked metadata-only editing without classification permission; candidate superseded and QA1 sealed as FAILED VALIDATION. Narrow three-path refinement preserves metadata edit while disabling/guarding only unauthorized category changes, confirmed by updated TDD red (initial missing CSS-loader attempt retained separately) and NEW QA2 plus root/compiled note-only save/reload. All independent preliminary transport/selector attempts and original recipes/logs retained immutably. Native headless focus revocation probe did not cause a new auth read; this is not runtime proof of live permission revocation, no injected workaround. No original clinical photos, PHI, actual credentials or real patient writes in evidence. No physical phone, assistive-technology, sunlight, touch/gloves or clinical audit429 signoff claimed.

${publicProof}

Canonical staged Git blobs, configured credential values and every expanded trace ZIP member checked before publication; publication-manifest.json authoritative. Release uses direct human authorization plus independent/root gates, not a fabricated Ruflo lease. Blocked405/408/410/416 candidates excluded from accepted main; audit429 remains dependent on original external acceptance.
`);
console.log(final?'Final verified report ready for exact public closure gate':'Honest prepublication report; issue still open');
