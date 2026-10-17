# Implementation handoff — awaiting independent QA

Group: bug-batch-432; issues 432, 441, 442, 460, 463, 464, 467.
Worktree: codex/bug-batch-432, baseline a516d42e31f6674c39c1d130c9706cd80a7ab4c6.
Implementation round: reserved cycle 2/4 after independent preliminary QA1 FAILED VALIDATION. No commit, push, GitHub mutation, external review, production access or release was performed by this implementer.

## Changes

Reused the 30 application/test files from PR466 (7028844633760f03a42072fa6648f975370e6db6 relative to 224a7e68eceb2836b08a785820d884cc0f9956b6), preserving independent scheduled dose identities, authoritative current patient scope, immutable actor/request receipts, one-off identity across edited time bands, facility timezone and deterministic correction barrier. The migration must deploy before the backend and frontend.

Issue432 also required strict emergency-print pagination validation: foreign patient rows, duplicate prescription IDs, invalid status, inconsistent totals, changed page summaries, empty nonterminal pages and truncation now fail closed. A rejected clinical snapshot evicts only this patient's therapy-page cache so the visible Riprova action reads repaired API data. Regression tests reproduced the gaps before the fix.

The added isolated stack harness migrates synthetic PostgreSQL16, builds both applications, runs both complete unit suites, invokes the real HTTP/DB import path, and exercises real UI/API/DB flows with Chromium. It holds the common browser lock across the entire owned Docker lifecycle, cleans only ownership-verified resources and exact known generated test artifacts, then asserts the frozen source scope and source hashes. Static Google font requests use bundled official, pinned, hash-checked WOFF2 assets plus OFL licenses; no clinical endpoint is replaced except explicit failing upstream-response tests.

## Observed verification and boundaries

- The entire current-source frontend suite passed 1388/1388 with zero failures/skips (`test-results/frontend-unit-final.txt`), including the final print-cache regression. The corrected broad backend run observed 1926 passing, zero failing, five explicit opt-in skips (1883 concurrent tests including five skips plus 48 isolated tests). Backend application code has not changed since that successful run; the root-owned formal harness still must rerun on the immutable integrated candidate.
- Current targeted pagination, completeness, persisted retry and facility-time regressions: 29/29 passing. Current frontend build passed after the final product cache fix. Node syntax, formatting and git diff checks passed.
- Real import API/DB: five detected occurrences; three explicitly retained and persisted; two explicit deferred indices [2,4]; missing/stale omission rejected; idempotent replay preserved the one patient and intended therapies.
- Browser development runs intentionally skip repeated broad build/unit work and always write verified:false with developmentOnly:true. They are selector/fault debugging, not independent QA. Previous failed attempts are retained with their logs; the formal command below must pass on immutable final source before acceptance.
- Five backend skips are existing opt-in archive-original / issue428 dedicated environment cases, not suppressed failures.
- Native CI PostgreSQL16 creation/ownership/teardown support is implemented but not executed in this cloud (which has no native PostgreSQL binaries). Cloud testing uses the pinned trusted PostgreSQL16 Docker image, own loopback port55432 and a synthetic QA database.

## Independent verification

Use the existing trusted QA provider environment with its supported frozen dependency installation and own generated Prisma client. Run:

```sh
node e2e/qa-bug-batch-432.mjs --test
```

Cloud prerequisites: pinned PostgreSQL16 Docker image already present; QA_PYTHON points to the installed mock-runtime Python; PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium; PLAYWRIGHT_BROWSERS_PATH points to the batch-owned cache with provenance-checked system FFmpeg fallback. The CI native branch accepts only loopback PostgreSQL16:5432/clinicos_test, creates a separately owned clinicos_qa_batch432 and drops only that owned database. No production connection is accepted. The font bundle is read exclusively from the committed packet; the global font cache is not referenced.

Root owns independent QA, canonical PR publication, exact-SHA Claude Max review, remediation reservation and verified release before issue closure. This report does not mark any issue resolved.

## Candidate 2 and final development observations

QA1 found the H1 full-suite test could await interpreter entry before cleanup protection. Cycle2 fixes that actual defect: correction completion/rejection is observed immediately, entry and settlement are bounded, release executes on failure, and a secondary cleanup failure preserves the primary error through AggregateError/cause. The clinical race still proves COMPLETED/late-COMPLETED/replay-COMPLETED, original120/80, original actor, one write and an unchanged first record. The browser internal runner uses the same lifecycle semantics; its final failure-only guard alignment was checked synthetically after the real internal flow passed. QA1's failed report and RED reproducer remain unchanged in independent-qa/.

Current cycle2 backend build passes. The real complete skills-e2e file passes15/15 including H1 and the new failure-path test. Strict-unhandled-rejection synthetic checks of the actual full-suite and browser lifecycle helpers pass2/2; these exercise real helper code with synthetic Promises and are not application/DB suite verdicts.

Development browser observations are distributed across preserved runs, not a single final canonical verification:

- inventory-browser/results.json:9/9 real inventory/calendar/mobile/one-off/empty-catalog groups passing.
- retry-browser/results.json: lost committed response replays the first immutable record; a separate pre-write abort reloads and retries through the visible UI using the same persisted requestId. Each dose has exactly one record/receipt; both deliberate transport aborts are classified exactly.
- test-results/development-preflight1/additional-browser-results.json:5/5 complete105 print, foreign-patient print rejection plus repaired retry, short inventory rejection plus visible retry, patient switch/mobile, import5 detected/3 retained/2 explicitly deferred visible after reload.
- test-results/cycle-2-preflight2/additional-browser-results.json: available and malformed catalog each retain2 real name lookups, zero unexpected errors.
- test-results/additional-browser-results.json: persistent-unreachable catalog retains2 real searches with exactly2 deliberate GET503 responses and2 exact expected console messages; four roles pass with zero empty-catalog searches (OSS therapy-read denial retained); actual internal H1 and Europe/Rome/night/DST assertions pass.
- test-results/internal-measured-results.json records the actual clinical one-write120/80 and night counts/DST values rendered on the explicitly QA-only442/464 screenshot surface.
- test-results/development-validation-summary.json: final residual run exit0, browserAssertionsPassed:true, lifecycleAndScopeClean:true, but verified:false/developmentOnly:true. It deliberately skips previously tested groups/build/unit work. No full immutable-source acceptance is claimed.

The positive catalog failure initially exposed127 automatic global-round lookups from unrelated same-run synthetic seed/105-print fixtures and68 genuine429 responses. The fix isolates the positive fixture by deleting only therapies in this invocation's new owned synthetic database after432/460/467 proofs are captured, leaving B's two prescriptions. Both Docker/native modes bind a database SQL marker to this run UUID; URL, owned database name, UUID and live SQL marker are rechecked immediately before cleanup. Foreign keys/triggers remain active, no rate limiter/window was modified/reset, no429 is accepted, and only exact deliberately injected503 failures are classified. Ownership proof JSON files retain no connection credentials.

Source is now sealed for root-owned independent QA2:37 scoped paths,35 changed, all5 frozen contract hashes unchanged, no outside-scope files. implementation-source-manifest.json and candidate-2-seal.json identify the final source; evidence-manifest.json hashes all21 required primary proof files. Runtime images/videos/traces are development evidence; independent QA must refresh them against the final immutable candidate and execute the one canonical complete command. Native CI PostgreSQL16 remains unexecuted in this cloud; Docker ownership/SQL guard was exercised by the final residual run.

No further implementation-author runtime, commit, push, remote mutation, Claude call or issue closure will be performed. Required next gate: a new independent complete QA session; then root-owned exact-SHA Claude review and verified deployment.
