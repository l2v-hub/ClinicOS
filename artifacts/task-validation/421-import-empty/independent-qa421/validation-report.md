# Independent QA — issue #421
Final Decision: READY FOR CODEX QA — scoped original acceptance criteria verified with accepted baseline debt, not globally green.

Application 80b313227a9a2b9fefc0441c718b259d0d901cae; accepted baseline c00bff678dfc9845c31742bc5d0d750fbbb9603e. No application edits, commits, pushes, deployments, dependency installs, GitHub writes, backend writes, or real patient data.

## Five-phase verdict
| Phase | Result | Evidence |
|---|---|---|
| 0 Original contract | PASS: fresh original issue and comments0; own contract chronology disclosed | nonbrowser-01/original-issue.json; task-contract.md |
| 1 Diff review | PASS: exactly4frontendpaths; no correctness/security findings | pre/post receipts, original80b313... vs c00bff... diff |
| 2 Types/build/tests | PASS scoped baseline delta; raw full suite FAIL12 accepted pre-existing | nonbrowser-01/commands/*.log; command-results.json; post-run-comparison.json |
| 3 Runtime | PASS20/20 actual Vite config/React compiler; synthetic APIs intercepted before wire | browser-01, pdf-01, persistence-01 screenshot/trace/video/test-results/report |
| 4 Security | PASS scoped review and frontend source/build secret scan; evidence credential/expandedZIP scan separately sealed | commands/security-scan.log; privacy-secret-scan.json |

## Original AC mapping
| Original acceptance criterion | Independent assertion/result | Evidence |
|---|---|---|
| AC1 Explicit primary and comprehensible alternative | PASS: primary Carica documento, secondary Scansiona; ordinary camera description; Tab focus and Enter chooser; desktop1150x1004/mobile390x844nohorizontaloverflow; denial/filefallback | browser-01/screenshots/empty-desktop.png, empty-mobile.png, keyboard-enter-file-choice.png, camera-denied-file-fallback.png |
| AC2 Objectless management out of first hierarchy | PASS: no group tabs/name/reorder/removal/process/counters in globalempty; groupsalone remainempty; pending/retry/discard visible; documents-only and currentemptyletter retain management | browser-01/screenshots/preexisting-empty-groups.png, global-original-with-zero-pages.png, pending-first-upload.png, failed-first-upload-retry.png, failed-first-upload-discard.png |
| AC3 Ordinary formats and actual limits before chooser | PASS: defaultPDF/JPEG/PNG and server30pages/30files/30letters/25MiBfile+total displayed; custom7/4/3and2/5MB+PDF/PNG change display and exact accept together; no progressive jargon in empty panel | browser-01/screenshots/custom-limits-formats.png; fixture/source backend pages model/repository reviewed |
| AC4 Multipage/multiletter management after upload | PASS: multiplefiles, actual2pagePDFsource/worker/canvas+exactpage2text; newletter/rename/reorder/move/delete/preview/atomicreplacement; pending/errors/503retry/lostreply identicalmetadata+bytehash idempotency; lastpageremoval/cancel; strongerclose-reloadidentity | browser-01/screenshots/multiple-pages-letters-management.png, preview-and-replace.png, last-page-removal.png; pdf-01/screenshots/pdf-page-2-preview.png, pdf-two-page-management.png; persistence-01/screenshots/strong-close-reload-identity.png |

## Independent commands and baseline
Frontend npx-equivalent node typescript/bin/tsc --noEmit plus explicit app/config -p --noEmit --incremental false: PASS. Backend -p tsconfig --noEmit PASS.
Production Vite8.2.2 build using actual repository config/plugin-react/Babel React compiler PASS; evidence outDir replaces dist to preserve readonly shared dependency/output boundaries. This is the typecheck+production-build equivalent, not a claim that literal npm run build was executed. Existing >500kBchunk/outDir/plugin-timing warnings retained.
Focused37tests37PASS. Full1243tests1231PASS12FAIL0skipped; exact failure names equal accepted420 proof dcb78dcc2cb4b333ca9553cace6ea13c87460467. Accepted baseline1238tests1226PASS12FAIL; new5unitcases are discovered by normal fullrunner. No new or removed failures. Baseline log SHA256 e7b20377462454daabab376a97478df6c9ca2fb4d5cbceff14ea32eff16574f5. Full suite is not globally green.

## Evidence inventory and rigor
Browser20cases20PASS: initial18 + realPDF1 + strongerpersistence1; 21screenshots,20traces,20videos. Each finishedcase exact console/HTTP expectedfault comparison; no unexpected console/pageerror/HTTP/domainwrite/externalrequest.503retry cases exactlyone503+matchingresourceconsole each; lostreply exactlyoneERR_FAILED/noHTTP. All clinical endpoints are mocked before wire; no OCR/startprocess/provider/DBcalls executed.
Initial18 recipe based on root inspectedfixture and extended by4independentchallenges; full source inspection was performed independently. New PDFfixture parses exact uploadedPDF bytes with existingpdf-lib to derive2page manifest, returns correct MIME/exactoriginalbytes; no jsPDF install. Actual PDF preview uses repositoryPDF.jsworker/canvas and accessibletext.
The original18close/reload recipe could reseed opaque memory eachnavigation: preserved but insufficient alone to prove retention. Authoritative persistence-01 uses once-per-origin-context sessionStorage seedmarker; assert remembered sessionid immediatelyAFTERclose BEFOREreload, afterreload withoutreseeding, and afterreopening; verify renamedgroup/pagefilename+sourcepage and refreshedGET preserving manifestidentity.
Physical/canonicalLF pre/post checks across1469sourcefiles and rootcheckout bytecanonical comparisons unchanged throughoutall4attempts; sourceSHA39a11f430ed8992676bb666843f360cf26838bc32c52fd5fbb6eb03f03e671cb; canonicalSHA4a80fe0f0637e37d6420e0cf5fac213ee71ab8499a954d22aa1b43646e77ea4f. Scope excludes one root receipt build-font-helper (not used by QA Vitecommand), generatedcache/build/evidence, and known unrelatedlaunchers; no wholecheckoutcleanclaim.
Each attempt recipes and pre-run receipt frozen before execution, every attempted screenshot/video/trace retained. No runtime assertion failure occurred in these QA attempts. Original issue fresh read safe token adapter; direct initialgh attempt unauthenticated and retained diagnostics. Ownsummarycontract written after initial18/PDF, before supplementalstrongrun; rootvalidcontract reviewed beforeinitialruns.

## Security checklist
Secrets: frontend source+actual compiledbuild scanner0; expanded owntraceZIP/configuredcredential-value scan required in immutablemanifest.
PHI: synthetic nurse/patient labels and anonymousPDF/PNGonly; screenshots visually inspected; norealpatientvalues.
Logging: synthetic identity and uploadmanifest metadata/hashedbytes only in protectedQAevidence; noactualclinicalvalues/credentials.
Input: MIMEadvertisement exact serveracceptedlist; existinguploadqueue/revision/idempotency unchanged, focusedfailurepaths PASS. No newendpoint/input-policy claim.
AuthZ: existing whole-import capability gates unchanged; no bypass/config changes; capabilities focusedtests PASS.
Injection/XSS: Reacttext rendering only; no rawHTML/usercontent SQL additions.
Dependencies/config: zero dependency/lock/config/backend/schema changes; actual Vite compiler preserved; allQAonlyscripts under ownartifactsfolder.
Global repository vulnerabilities are not asserted absent; this is scoped changedcode + preserved baseline review.

## Limits and handoff
No livebackendintegration, realdatabase durability, OCR quality, model/provider success, realcamera/hardware, productiononline/Entra verification, sunlight usability, or whole-suitegreen claim. PDF test certifies realclientpreview+simulated2pageingestion only. Screenshots21/trace20/video20 bundled with custom HTML assertionreports using actual Playwrightlibrary rather than Playwrighttestrunner; reporttype explicitly custom.
Existing primary and inherited QAlauncher changes preserved. Only own QA7507PID41460 stopped after exactCIM/listenerownershipcheck; process/listenerabsent. Server exit1 is intentionalStop-Process, not runtimefailure. See server-receipt.json and execution-receipt.json.
Ruflo registry absent/priorCLI OOM unchanged; no retry/install/capabilityexpansion. Root to integrate, byteidentically rerun portable frozen recipes, bind finalreceipts/source, and make any authorized release/issue decision. No release authority exercised here.

QA Gate/Playwright/agent-loop skills shaped artifact/rerun/sealing and security requirements; PDFskill guided syntheticfixture generation/renderinspection. All application content readonly.

Codex must now re-run the QA Gate.

