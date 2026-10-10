import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const root='artifacts/task-validation/428-operator-role',read=p=>JSON.parse(readFileSync(root+'/'+p,'utf8').replace(/^\uFEFF/,'')),final=process.argv[2]==='final';
const gate=read('release-gate-receipt.json'),deploy=read('deployment-receipt.json'),online=read('compiled-online/online-receipt.json'),ci=read('ci-comparison.json');
for(const r of [deploy,online,ci])assert.equal(r.applicationCommit,gate.applicationCommit);assert.equal(online.cases,56);assert.equal(gate.rootIndependentRerun,56);assert.deepEqual(ci.newFailureNames,[]);assert.equal(ci.frontendSecretScanConclusion,'success');assert.equal(deploy.backend.changed,true);assert.equal(deploy.backend.actualCheckoutSha,gate.applicationCommit);assert.equal(deploy.backend.railwayStatus,'SUCCESS');
let publicProof='Pinned public HTTP/hash proof still pending; issue remains open.';
if(final){const pub=read('public-preverification.json');assert.equal(pub.applicationCommit,gate.applicationCommit);assert.ok(pub.images.length>=3&&pub.images.every(i=>i.http===200));publicProof=`Pinned public proof ${pub.proofCommit}: ${pub.images.length} PNG HTTP200/raw SHA verified. Final publisher must recheck exact final proof/issue body/actor before closure.`;assert.ok(readFileSync(root+'/visual-review.md','utf8').includes('ACTUAL PIXELS INSPECTED'));}
writeFileSync(root+'/validation-report.md',`# #428 — Professional role presentation

## Final Decision
${final?'CLOSED — VERIFIED':'IMPLEMENTED — NOT VERIFIED'}

Application ${gate.applicationCommit}. Vercel ${deploy.vercel.id} READY exact meta/gitSource SHA and production alias; HTML/JS/CSS HTTP200 hashes unchanged before/after ${online.cases} compiled browser groups. Pertinent backend workflow ${deploy.backend.runId} exact checkout/uploadID, Railway ${deploy.backend.railwayDeploymentId} SUCCESS/image digest and health200. No schema/migration change; no production patient test writes.

## Original acceptance criteria

| Criterion | Result | Actual evidence |
|---|---|---|
| AC1 Dashboard/table role information agrees or clearly explains difference | PASS | Shared presentation and qualification; professional function explicitly distinct from access permissions; desktop/mobile16-value matrix exact match |
| AC2 No blank hides missing/legacy | PASS | Explicit missing/unknown labels and verification button; both real DTOs null→empty string, never fake Medico; retained exact native editor option |
| AC3 Explicit consistent legacy/normalized names | PASS | Standard3 and legacy6 mapped; case/space normalized for display only, custom values uncertain and React-escaped; literal XSS sentinel creates0 image nodes |
| AC4 No automatic role/authorization changes | PASS | Open/cancel0writes,12 unrelated browser PUTs omit ruolo,2 explicit selections only; fresh isolated actual API GET/PUT preserves null/raw professional value, User.role and policy snapshots |

## Independent quality gate and root replay

NEW independent QA2 on isolated C:/w-428-qa2: original issue/empty comments and all12-file diff reviewed. Immutable ${gate.immutableQaFiles} files, manifest ${gate.qaManifestSha256}, READY FOR CODEX QA. Candidate56 groups =50 workflow +6 visible editor, repeated root and compiled with byte-identical frozen recipes. Before-wire fixtures/native selectors only; no injected DOM or UI replica. Baseline accepted7680 separately demonstrates mismatch/legacy first option in2 actual SPA groups, not counted as candidate PASS. Actual form screenshots use editor01 after only native scrolling; older retained-editor captures outside desktop inner scroll are historical, not visual proof.

Root and QA ${gate.sourceFiles} physical application inputs unchanged before/after, clean app state, raw root ${gate.sourceSha256}; QA raw ${gate.independentRawSourceSha256}. Root checked BOTH physical checkouts against actual immutable Git blobs, strict UTF8 CRLF→LF allowance only. Owned browsers/servers/PIDs closed; ports7528/7529 free and synthetic PostgreSQL processes absent. No two application writers; dirty primary/native launchers untouched.

Types FE/BE, tsc-b, actual Vite React compiler, frontend src/dist secrets PASS. Focused45/45 each. Full1292:1280 PASS/12 exact named accepted failures/0new, not globally green. Native scanner exactly12 changed paths baseline/candidate0 findings, not global CVE certification. Actual DB4/4 PASS each, own new loopback/test cluster with mandatory data_directory ownership validation before writes;57 existing migration hashes. Separate no-opt-in/backend-cwd proof4 SKIP/0 executed writes, not substituted for persistence proof; shared CI safely skips this isolated suite. Browser reload mock transport is not real DB persistence.

CI ${ci.candidateRun}: ${ci.candidateConclusion==='success'?'success': 'exact single accepted422 failure and Backend unit tests stage; downstream skipped, not claimed passing'}. Secret scan ${ci.frontendSecretScanRun} success; ci-comparison.json authoritative. No workflow/auth/permission/dependency/config/schema modification.

## Artifacts, retained failures and limits

independent-qa, root-rerun and compiled-online browser-plan.json enumerate successful screenshots/trace ZIP/video/raw assertions/HTML receipt. HTML explicitly Playwright-library assertion receipt, not native Test reporter. All auth/facility/API requests intercepted BEFORE wire; only deployment static GET goes to production. Six visible-form groups0writes; workflow14 permitted synthetic mock PUTs (12 omitted unchanged role/2 explicit professional selections), zero unauthorized/external/console/page/HTTP errors. Actual PostgreSQL persistence only local synthetic cluster. No original clinical photos/real patient data or hardware/AT/clinical signoff claims.

All failed attempts preserved: initial db01 extra denial-cache assertion; initial commands01 static icon extraction assumption; superseded5b candidate and stopped QA1 before execution; independent browser01 missing operators.page fixture, browser02 native re-login omission. Corrected fixture/structural checks without weakening application requirements; complete immutable failed bundles/recipes retained. The pre-existing outer capability-gate denial cache gap is source-bound unchanged: denied401/403 omit header, not a no-store pass. Successful operator responses assert private,no-store. Native narrow select may truncate long option text; exact selected option/value and full table/card label verified, not a global form layout redesign.

${publicProof}

Canonical staged Git blobs/configured credential values/expanded ZIP members checked before publication, publication-manifest.json authoritative. Root release policy follows direct human authorization, no fabricated Ruflo lease. Blocked405/408/410/416 source excluded from accepted release; audit429 requires external human/device/clinical acceptance.
`);console.log(final?'Final report verified; exact final public/closure gate remains':'Honest prepublication report; public proof pending');
