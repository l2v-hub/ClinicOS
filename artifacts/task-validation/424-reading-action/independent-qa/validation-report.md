# Independent QA — issue 424

Candidate `67d21c3e9257a5acb8c9b25130c9417fb92185fb`, baseline `b5f471cd2cd56839e7ebbd0d3daf0bbf04791468`. Original issue/comments read independently: four criteria, zero comments. No application edits by QA; root owns release and GitHub closure.

| Phase | Result | Evidence |
|---|---|---|
| Contract | PASS, four original criteria | task-contract.md |
| Diff | PASS, exact five frontend presentation/test files, unchanged service/API/auth/legacy urgency guards | security02/comparison.json; source-before/source-receipt.json; source-after/source-receipt.json |
| Build/test | PASS focused32/32, types frontend/backend, tsc-b+actual Vite React compiler, frontend secret scan | commands/command-results.json and logs |
| Full regression | Accepted baseline exception, not global green:1252 tests,1240 pass,12 exact existing failures,0 new | commands/command-results.json; full-regression.log |
| Prisma/local DB | PASS temporary output validate/generate;12/12 existing actual backend/API/DB tests in fresh isolated synthetic PostgreSQL57 migrations, finally closed | prisma/result.json; db/result.json; db/migrations.json; db/tests.log |
| Browser | PASS ordinary17 plus independent supplemental4, actual SPA, guarded transport; serial single7515 lane | attempt01/browser/test-results/browser-results.json; supplemental03/test-results/browser-results.json; playwright-report/index.html |
| Security | PASS scoped native scan baseline/candidate five files each0 findings; escaped hostile receipt; no changed dependencies/config/auth; actual credential/expanded archive scan | security02/comparison.json; supplemental03/screenshots/escaped-authoritative-receipt.png; privacy-receipt.json |

| Original criterion | Result | Evidence |
|---|---|---|
| Command describes action | PASS visible/accessibility Conferma lettura, keyboard, pending one POSTread, author/role/server guard | attempt01/browser; supplemental03 author/receipt cases |
| After confirmation author/date per product contract | PASS exact returned name/role and acknowledgedAt full facility date after refetch/reload in both handover history and direct patient chart; real local durable contract separate | supplemental03/screenshots/direct-chart-confirmed.png; chart-trace.zip; video/chart.webm; db/tests.log |
| Read distinct from takeover/completion | PASS purpose read keeps active urgency and original status, separate Ho capito remains; concurrency/idempotency actual server tested | attempt01/browser/screenshots/authoritative-read-active-urgency.png; supplemental03; db/tests.log |
| Brief cards no repeated common explanation | PASS one collapsed native guide per list; content/date/identity/severity retained, no clipping/overflow. Three source-bound notes desktop206.171875→189.171875px (17px each); mobile240.765625→231.765625px (9px each). No fixed heights/truncation | baseline/benchmark.json; baseline/benchmark-mobile.json; attempt01/browser/benchmark*.json; evidence-verification.json; desktop/mobile result screenshots |

All preliminary failures preserved: supplemental01 denied capability correctly removed navigation but harness tried clicking absent button; supplemental02 four functional checks passed but direct-chart prefetch parameter-readings lacked fixture route, caught guard; supplemental03 adds only documented empty-page shape and passes. Native security attempt01 PowerShell script execution policy blocked CLI (not product); attempt02 direct Node installed CLI scans QA-owned five-file copies and succeeds. Ruflo unexpectedly generated two untracked coordination files outside owned artifacts; root narrowly authorized recoverable move with exact pre/post hash, recorded in ledger-recovery-receipt.json. No weakening execution policy or app source edits.

Actual direct chart and mobile PNG pixels viewed: complete note, authoritative reader/date and distinct urgency button drawn. All successful browser guards: zero unexpected API, real clinical mutations, external requests and page errors. Intentional synthetic503/409 negative-path errors allowlisted precisely. Browser mocked reload is NOT DB proof;12 fresh local real DB tests separately cover authority, timestamps, append-only receipts, author/capability/scope, concurrent reads and unchanged note.

Source1472 raw files unchanged before/after SHA`8b16c3ce319301b04b79b85fd4e956bc466c053a3ee5506b69661de12c01b84f`; strict UTF-8 CRLF-only cross-checkout differences exactly five candidate paths. Additional fixture/harness hashes recorded in evidence-verification.json. Frozen recipes and all failed/successful attempt artifacts sealed immutable. Runtime compiler cache, generated scratch Prisma clone, build dist and temporary PostgreSQL datadir are not public evidence; logs/receipts retained. Native launcher overlays preexisting and untouched.

No production writes or deployment by QA; no clinical/provider/hardware or automated general PHI certification. Actual configured secrets and expanded ZIP members checked without emitting secret values. Parent must rerun byte-identical successful17+4 recipes and complete release gates.

Final Decision: READY FOR CODEX QA

Codex must now re-run the QA Gate.
