# Independent QA — issue402

Verdict: **READY FOR CODEX QA** for exact candidate `2b7ae91375289209dea113498ade8dfd5faf719a`. Local acceptance criteria pass; release/production verification/GitHub evidence/closure belong to root and were not performed by this QA worker.

## Source and scope

Baseline: `04cb1e8f` (same application source as the previously published intake correction). Six changed frontend application/test files only: App.tsx, PatientList.tsx, NewPatientFlow.tsx, IntakeWorkspace.tsx and two navigation/import regression test files. Backend, Prisma, API routes, credentials, dependency manifests, lockfile and production configuration remain unchanged.

The actual full SPA was tested: Vite serves committed frontend/index.html → main.tsx → App.tsx, including the real keyed WidgetGroup route boundary that caused the defect. All backend transport was intercepted before login on localhost with explicit synthetic role/roster/draft fixtures. Unhandled endpoints and external API calls fail the harness. No replacement PatientList/standalone workspace surface was used.

## Gate phases

| Phase | Result | Evidence |
|---|---|---|
| 0 Contract and original issue/comments | PASS | task-contract.md; issue402 independently read, comments empty |
| 1 Committed diff review | PASS | scoped route-preserving flow, post-mount focus, local opening retry/error boundary; git diff whitespace check clean |
| 2 Types and production build | PASS | logs/types.log, logs/tsc-build.log, logs/vite-build.log, all exit0 |
| 2 Focused intake/navigation regression | PASS | logs/focused-tests.log:117/117 |
| 2 Full frontend regression | BASELINE WAIVER REQUIRED | logs/full-regression.log:1156 total,1144 pass,12 fail; exact prior twelve failure names, zero new failures; independent-source-receipt.json records comparison |
| 3 Full SPA runtime | PASS |13 concrete browser checks plus eight Back/remount cycles; test-results/browser-results.json |
| 4 Security and privacy | PASS for scoped frontend change | synthetic role checks, deny empty/direct intake, zero unauthorized draft attempts, guarded patient mutations; no backend authorization claim |

## Acceptance criteria

| AC | Result and asserted outcome | Result evidence |
|---|---|---|
| AC1 | PASS: nurse activates A mano using Enter; actual route stays #/nuovo-ingresso; titled dialog and Anagrafica visible; empty Name input focused | screenshots/manual-form-name-focused.png; trace.zip; video/final-desktop.webm |
| AC2 | PASS: Cancel and Escape return method chooser and A mano focus; no patient create/confirm request; returning roster remains1 loaded of1 | screenshots/cancel-method-focus.png; screenshots/back-roster-focused.png; browser-results.json |
| AC3 | PASS: one deliberately injected draft503 produces role=alert and visible Riprova; retry opens Name on same route. Aborted lazy module produces local alert dialog with focused Riprova; reload/relogin/reselection recovers. Lazy Cancel restores method focus without creating draft | screenshots/draft-opening-error.png; screenshots/lazy-module-error.png; draft-failure-trace.zip; lazy-failure-trace.zip; lazy-cancel-trace.zip |
| AC4 | PASS:35 forward and35 reverse Tab assertions stay within dialog; Enter/Escape/Back pass; eight repeated route-remount Back cycles restore Nuovo ingresso focus; denied OSS empty/populated/direct method routes expose no action and make no draft request | screenshots/denied-empty-roster.png; denied-empty-trace.zip; denied-populated-trace.zip; trace.zip |
| Persistence | PASS in synthetic transport: Name=NOME QA is PATCH-saved, page.reload and simulator reauthentication precede GET of same opaque draft; exact Name survives and is focused | screenshots/draft-reloaded.png; trace.zip |
| Mobile | PASS at390×844: focused Name is in viewport, above fixed actions, and its center hit-tests to the actual input; no document horizontal overflow | screenshots/mobile-manual-form.png; mobile-trace.zip; video/final-mobile.webm |

Across all seven final browser contexts: zero unexpected console errors, runtime errors, relevant HTTP errors, unhandled API calls, blocked external API targets, patient create/confirm requests or denied-role draft openings. The one deliberate503 and two deliberate lazy-module errors are classified with narrow matching and preserved in raw results, not presented as an error-free failure-injection run. No real patient was created.

## Security checklist

- Secrets/PHI: no real identities, patient records, credentials or clinical prescriptions in fixtures/evidence; the literal simulator token is explicitly synthetic, not a credential. Name/roster values are synthetic. Scoped text scan found no credential patterns.
- Logging: no new application logs. Browser output includes only synthetic fixtures, route/method/outcomes and expected sanitized failure descriptions.
- AuthZ: existing useCan/session capability mechanism is preserved; flow and empty-list action are gated. Nurse vs denied OSS exercised with isolated browser contexts. Backend policy enforcement is unchanged and not bypassed.
- Input validation: no new endpoints or changed payload schema; existing versioned draft queue and confirmation validation preserved. Retry uses internal counter only; cancellation does not confirm patient.
- Injection/dependencies/config: no new raw HTML/SQL, packages, auth/CORS policy changes or production QA route. QA server lives only under excluded artifacts and explicitly targets localhost API; all API requests intercepted before login.

## Evidence integrity and iteration

`independent-source-receipt.json` binds the clean committed candidate, Git tree, every tracked frontend/build input and four executable QA scripts by SHA256. Current full-frontend input aggregate: `336b8e7771bf9a07a4116dd39c63f66c4a6265ff16d2d520dbe6d1d23e994569`. Application input status remained clean before/after testing. Named final desktop/mobile videos are copies of the last candidate run, not initial failure recordings.

`initial-qa-findings.md`, `mobile-focus-findings.md`, `test-results/initial-candidate-browser-results.json`, `test-results/initial-failed-browser-results.json`, `test-results/mobile-obstruction-browser-results.json` and `screenshots/failed-0.png` are retained historical iterations, **not final passing proof**. Initial source had intermittent Back focus and one new source-guard failure; the second candidate exposed mobile focus obscured by fixed actions. Root repaired these, and final candidate was independently rerun. Remaining random-name WebM files retain historical runs; use the named final videos above for release proof.

Reproduce from repository root: run `node artifacts/task-validation/402-manual-intake/qa-server.mjs`, then `qa-commands.mjs`, `qa-browser.mjs` and `qa-receipt.mjs`. Browser uses installed Playwright via C:/w-insulin-qa; no application dependencies added. The HTML report is `playwright-report/index.html`, generated from actual assertion results by the reproducible script. Trace and videos are real Playwright artifacts.

Limitations: mocked transport proves frontend request/state behavior and reload continuity, not actual database persistence, production Entra/backend authorization, real clinical decisions or ward hardware/sunlight validation. Full regression remains twelve known baseline failures (assessment catalog module, canonical CSS source guard, schedule-session guard, CF provenance guard, six multipatient parameter guards, assistant fallback and weekly/monthly therapy date guard); not silently waived by QA. Root must acknowledge that existing limitation before release. Lazy-load error fallback uses existing generic modal styling; behavior/readability are verified, no unrelated redesign performed.

**Codex must now re-run the QA Gate.**

## Root QA Gate and publication

Root reviewed the committed diff and contract, reran the nine navigation/import tests (all PASS), source-receipt integrity gate (PASS, same committed source/hash), the complete full-SPA browser harness (all13 PASS including eight Back cycles and mobile input/footer hit-test), and frontend secret scan (zero findings). Desktop and mobile final screenshots were visually inspected. QA and root browser servers stopped. Root explicitly accepts the unchanged twelve-failure baseline limitation for this scoped bug only, not as a claim of clean global regression.

User-authorized commit `2b7ae91375289209dea113498ade8dfd5faf719a` was pushed to main. Production Vercel deployment `dpl_FNqEgVnL2mj5GC3SizMsCHrVzv5D` is READY; gitSource and GitHub metadata both match the exact candidate, production alias assigned. Public root HTTP200 and backend health200/ok. Public served intake chunk `/assets/IntakeWorkspace-BEbUppAo.js` returns200 and contains both centered/instant manual first-name focus and opening retry. See `frontend-release-receipt.json` and `promotion-decision.json`. Production checks were read-only static/health requests; all browser patient fixtures remain synthetic.

## Final Decision

CLOSED — VERIFIED

All four issue acceptance criteria, independent and root gates, and exact-source production publication verified. Publish pinned synthetic screenshot/trace/report evidence in issue402 before closing GitHub; retain limitations above and do not certify the broader clinical/hardware audit.
