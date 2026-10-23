# Independent QA3 — therapy group

**Verdict: READY FOR CODEX QA**

Tested local source commit: `938ae9c44d60b1d963873762f26677d6856f6d63`. Baseline: `a516d42e31f6674c39c1d130c9706cd80a7ab4c6`. Candidate3 source-manifest SHA256: `2bdf9c414df2304784ad09f241964bc58db530014fa9db4c349a743aac530c0c`. Group #432, #441, #442, #460, #463, #464, #467. Same implementation cycle3/4, reviews0/4; this independent QA changes no source, Git state, remote state, budget, model, PR, issue or deployment.

| Phase | Result | Evidence |
|---|---|---|
| 0 Contract | PASS: all seven live issue bodies and comments read; original criteria retained | [task-contract.md](task-contract.md), [issue-sources.json](issue-sources.json) |
| 1 Diff | PASS: all37 source paths reviewed against frozen baseline, no out-of-scope change or certain new correctness finding | [diff-review.json](diff-review.json), [source-after-and-history-integrity.json](source-after-and-history-integrity.json) |
| 2 Build/tests | PASS: entire canonical independently executed once, exit0; both builds/types, complete unit suites, actual HTTP/DB import and all frozen verifications pass | [canonical-exit.json](canonical-exit.json), [fresh canonical summary](../test-results/validation-summary.json), [targeted37](frozen-targeted-regressions.txt), [adversarial10](actual-helper-adversarial.txt) |
| 3 Playwright | PASS for the scoped therapy/inventory/retry/internal capabilities and responsive data assertions; focused settled/fresh mobile proof below | [actual HTML evidence index](playwright-report/index.html), [measured result screenshot](playwright-report/measured-results.png), [browser results](../test-results/additional-browser-results.json), per-issue actual media below |
| 4 Security | PASS: synthetic isolated DB, current ACL, bounds, no config/dependency relaxation, no credential/PHI finding in source or publication media/logs | [final privacy/media audit](final-security-and-media-audit.json), [source audit](source-secret-audit.json), [frontend+bundle scan](frontend-and-build-secret-scan.txt), [cleanup](independent-cleanup-check.json) |

## Independently executed

Command: `node e2e/qa-bug-batch-432.mjs --test`. Internal global flock held across the complete owned PostgreSQL16/container, migration, services, tests, browsers and cleanup. The launcher sets the installed Python, Chromium and FFmpeg-cache paths before Node imports Playwright. Only known test values and official proxy/CA variables are forwarded; no GitHub/model/deployment credentials. [Launcher](launcher.json), [tool provenance](local-tool-provenance.json).

- Migration and backend build/types: PASS. Frontend TypeScript project build plus Vite build: PASS.
- Full frontend: **1388/1388 PASS**, zero fail/cancel/skip.
- Full backend: **1933 total = 1928 PASS + 5 opt-in skips**, zero fail/cancel. Concurrent block1885 =1880PASS/5skip; all nine serialized global DB suites48/48PASS. The skips are one archive-original opt-in and four #428 professional-profile real-API opt-ins, outside these seven issues; they were not executed and are not claimed covered.
- Actual full-load H1 clinical race: **158ms PASS**. Barrier failure handling and new timeout/late-rejection test also PASS. Original clinical body is byte-identical to candidate2; original5s helper phases and20s clinical outer bound retained. [Clinical invariant source proof](clinical-invariants-source-proof.json).
- Independent actual-source helper extraction: **10/10 PASS** under strict unhandled-rejection mode, covering both copies: never-settling callback after entry, late callback rejection, primary+cleanup exact errors, missing entry and exactly-one successful release. [Extraction provenance](actual-helper-provenance.json), [test](actual-helper-adversarial.test.mjs). These are Promise-lifecycle checks, not a substituted clinical/database proof.
- Exact frozen targeted verification command: **37/37 PASS**, zero fail/skip.
- Actual import HTTP/DB: five retained occurrences → three reviewed persisted prescriptions and two explicitly deferred indexes[2,4]; structured-only/ambiguous source stays unverified, omissions and stale client rejected, replay does not duplicate. Browser reload shows the three retained names. Local mock extraction/runtime is declared; no external paid OCR/model accuracy claim.
- Browser: **9 inventory scenarios +13 additional measured checks**, plus **two real network-loss/reload flows**, all PASS. No unexpected console/page/HTTP errors. Exactly two intentional transport-abort console events and two deliberately injected catalogue-status GET503 events are individually accounted for; no429, broad error waiver or limiter change.
- Seven real pinned WOFF2 files and both package identities/integrities/archives match the trusted existing bundle; both OFL licenses verified. Nonempty actual font geometry is asserted. No network bootstrap, empty CSS substitution, TLS relaxation or shared trust change. [Independent font audit](independent-font-asset-audit.json).

## Acceptance results and media

All paths below are actual fresh files from this QA3 canonical; the HTML index links each trace/video and displays measured JSON, including invisible network/clock outcomes.

| Issue | Actual result | Screenshot | Trace | Video |
|---|---|---|---|---|
| #432 |106 saved prescriptions,105 active+one inactive; later pages and PRN day/week, read-only missing-feed row,105-row complete print, foreign/short snapshot rejected then retry, switched patient2 rows, import5→3+2 survives reload | [inventory](../evidence/issue-432.png), [print](../evidence/issue-432-print.png), [saved import](../evidence/issue-432-import-saved.png), [accepted settled phone](mobile-followup/resize-settled-readable.png), [fresh phone/reload](mobile-followup/fresh-mobile-menu-dismissed-reload.png) | [inventory](../evidence/issue-432-trace.zip), [print/switch](../evidence/issue-432-additional-trace.zip), [import](../evidence/issue-432-import-trace.zip) | [inventory](../evidence/issue-432.webm), [import](../evidence/issue-432-import.webm) |
| #441 | Explicit11:30 one-off with empty flags saves correct server dose/actor; invalid clock/band/date and contradictory schedule rejected, no duplicate | [actual11:30 result](../evidence/issue-441.png) | [trace](../evidence/issue-441-trace.zip) | [video](../evidence/issue-441.webm) |
| #442 | Confirm, late correction and replay allCOMPLETED; exact120/80, correct actor, one immutable DB reading | [actual internal measurement](../evidence/issue-442.png) | [trace](../evidence/issue-442-trace.zip) | [video](../evidence/issue-442.webm) |
| #460 | Actual committed response loss replays same key through real shared client after reload; separate pre-write loss retries visible UI after reload; one record/receipt each, first snapshot unchanged | [record after reload](../evidence/issue-460.png), [visible retry](../retry-browser/visible-retry-after-reload.png) | [trace](../evidence/issue-460-trace.zip) | [video](../evidence/issue-460.webm) |
| #463 | Empty106-prescription catalog produces0 automatic searches; nurse/doctor/supervisor0, OSS retains read denial; available/malformed/unreachable status each retains two real name lookups, found/absent labels asserted | [inventory context](../evidence/issue-463.png), [measured request counts](playwright-report/measured-results.png) | [trace](../evidence/issue-463-trace.zip) | [video](../evidence/issue-463.webm) |
| #464 | Rome00:30: overdue0/dueSoon1 for00:45;00:46: overdue1/late1minute; DST90/210/150/150 and clinical day2026-10-13 | [actual internal measurement](../evidence/issue-464.png) | [trace](../evidence/issue-464-trace.zip) | [video](../evidence/issue-464.webm) |
| #467 | Given one-off remains recorded after11:30→18:10 and reload, original unchanged/no action; refused one-off also protected in real DB tests; periodic08:00/10:00 quantities independent | [persisted18:10 phone result](../evidence/issue-467.png) | [trace](../evidence/issue-467-trace.zip) | [video](../evidence/issue-467.webm) |

The seven required PNGs plus saved-import/mobile-switch/report PNGs were visually inspected. #441 captures the successful registered11:30 confirmation while its subsequent status refresh is loading; #467 additionally shows the durable recorded badge after reload. Actual result values and persistence are established by browser/SQL assertions and linked traces, not inferred from a screenshot alone.

## Mobile capture timing resolved by focused actual evidence

The original phone screenshot was captured during the existing220ms sidebar exit animation, not after the final layout. Its original trace records resize84194.201–84217.985ms and screenshot84245.727–84310.779ms: screenshot starts27.7ms after resize returns and completes within the220ms transition. Original PNG/trace bytes remain unchanged.

Root explicitly authorized only a focused independent QA3 follow-up on the **same37 source bytes**, with the whole lifecycle lock and a new owned PostgreSQL16 database. Existing builds/client were reused; no full suite, build, import or seed repeated. The narrowly adapted QA-owned stack retains migration, ownership markers, services, cleanup and source guards. Its output is explicitly `focusedOnly=true, verified=false, focusedMobileAssertionsPassed=true`, distinguishing it from the already completed full canonical.

Both focused cases PASS with zero page/console/HTTP errors:

- Desktop1280 → actual105-row emergency print → screen media reset → real patient switch to two rows →360px resize. The immediate measured sidebar is100px wide/right100 with `app-shell` closed and transition0.22s. A bounded **geometry condition**, without sleeps/CSS hiding/animation disabling, waits for closed-nav right<=0.5. Measured settled right0.0119px. Both real named row buttons spanx35–325 inside360px and show the correct two drugs, no prior patient's names.
- Fresh360px initial navigation has sidebar.right0. The ordinary menu button opens it; a normal scrim click closes it. After the same geometry condition and actual page reload, both names/quantities remain readable atx35–325 and sidebar.right0.

[Settled resize screenshot](mobile-followup/resize-settled-readable.png) · [fresh mobile/menu dismissal/reload screenshot](mobile-followup/fresh-mobile-menu-dismissed-reload.png) · [actual geometry/results](mobile-followup/results.json) · [original timing](mobile-original-trace-timing.json) · [resize trace](mobile-followup/desktop-resize-trace.zip) · [resize video](mobile-followup/desktop-resize.webm) · [fresh mobile trace](mobile-followup/fresh-mobile-trace.zip) · [fresh mobile video](mobile-followup/fresh-mobile.webm) · [stack provenance](mobile-followup-stack-provenance.json) · [cleanup result](mobile-followup/stack/test-results/validation-summary.json).

The two new screenshots were visually inspected: the left edge, both medication names and quantities are readable and unobstructed. This completes AC432.3/AC432.5 for the scoped therapy/patient-switch responsive flow. The original transient PNG is retained as historical capture evidence; use the accepted supplemental PNGs for settled mobile proof. No persistent application defect, source-harness edit or fourth implementation attempt is needed for this capture-timing observation.

## Security, history and cleanup

- Current patient access is reapplied before replay result disclosure; actor identity is server-derived, input bounds and explicit role/confirmation gates preserved. Actual out-of-scope replay and session-switch negatives pass.
- All new production SQL uses bound Prisma expressions/fixed identifiers. No new package, dangerous HTML, debug logging, auth bypass, capacity increase or production flag change.
- Frontend source+fresh built bundle scanner0 findings; source37 credential scan0. Final complete packet scan: **9062 text/ZIP entries,33 valid ZIPs, zero raw simulator bearer/provider/GitHub/JWT/credentialed-DB-URI findings**. Exact synthetic bearer redaction retains requests/results/events; actual screenshots/videos use synthetic data only. No symlink or file above25MiB; all seven required PNG/ZIP/WebM formats plus both accepted mobile PNG/videos and positive durations verified. One literal QA-driver password interpolation is classified explicitly as source syntax, not a credential.
- Source37 and frozen contracts7 unchanged before/after. **261 historical manifest records** match, including old canonical runtime paths explicitly remapped to the byte-preserved pre-run snapshot. Candidate2 seals and failed QA1/QA2 remain failed history. Only one stale top-level old failure file was relocated to that already-verified history snapshot after this successful fresh canonical; no history verdict/hash was rewritten. [Freshness](runtime-freshness.json), [history/source proof](source-after-and-history-integrity.json).
- Canonical reports lifecycle/scope clean; independent read-only check under the same global flock confirms owned container absent and3432/5433/8432 closed. Known generated legacy fixture outputs are archived and original bytes restored; no outside-packet change remains. Existing development DB5432 was never used, seeded, read or modified.
- The supplementary static HTML index initially encountered managed Chromium file:// blocking; that failed optional viewer attempt is retained under `supplementary-report-file-policy-blocked/`. An ordinary loopback-only ephemeral HTTP server then rendered the same measured index with exact value/reload assertions, zero errors and real PNG/trace/video, exit0. No browser restriction/trust/flag bypass, no product source change and no second product canonical occurred. [Viewer result](playwright-report/report-browser-result.json).

## Root-owned remaining gates

Local QA3 passes the scoped source gate. This is not a Claude review, required hosted CI result, deployment or issue completion. Root must publish only the accepted sanitized packet/source, request the existing exact-SHA external Max review, satisfy required CI, integrate dependencies, apply receipt migration before backend then frontend, and verify the actual demo target/source before closure. No merge, push, remote mutation, model invocation or release was performed here.

**Codex must now re-run the QA Gate.**
