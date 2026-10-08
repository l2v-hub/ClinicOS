# #404 independent QA

## Decision

**READY FOR CODEX QA** — local frozen candidate validated, not released or closed. Root must independently rerun the gate and any separately authorized publication checks.

Candidate: `848ae9613c3cfe2a6eae81308719964475dc9afe`. Baseline: `64b3427be9e2d73ae47303f31b468b3c89f0c214`. Dedicated QA authored this issue's evidence only, never application/config/dependencies or Git/release changes. `independent-source-receipt.json` binds exact source/build/harness/evidence hashes and the clean application status.

Tracked frontend/build-input aggregate SHA256: `203df922820be0446c51cf4eb138c14bd7d58dbf099626fe88bb63dbf9bcdc45`. All17 final checks passed; maximum observed active cartella fetches4; zero unexpected runtime/API/HTTP/external outcomes. Named final videos retained; redundant initial temporary recording removed, failed attempt JSON/HTML/PNG preserved.

## Gate phases

| Phase | Result | Evidence |
|---|---|---|
| 0 Contract/issue | PASS | task-contract.md, issue-source.json (full original body/comments[]), independent-test-plan.md. Issue capture supplied by root; QA CLI lacks GitHub authentication, so no claim of a separate remote retrieval. |
| 1 Diff review | PASS | Six scoped frontend paths only. No backend/schema/API/config/lockfile changes. Allergy projection/type refinement, scoped abortable read, local component, insertion before drug actions, token CSS and tests. No new logging/raw HTML/SQL or changed clinical write payload. |
| 2 Types/build | PASS | logs/types.log, logs/tsc-build.log, logs/vite-build.log: independent zero-error types/production build. |
| 2 Focused tests | PASS | logs/focused-tests.log:34/34 allergy-state/projection/security/concurrency and existing Giro/in-place tests. |
| 2 Full regression | BASELINE WAIVER ONLY | logs/full-regression.log:1175 total/1163 PASS/12 FAIL. All12 exact failure identities match #403 baseline1165/1153/12; zero NEW or resolved failures. Receipt compares names and hashes baseline log. Full suite is NOT green. |
| 3 Actual SPA | PASS |17/17 checks in test-results/browser-results.json; playwright-report/index.html; trace.zip/scenario traces; final desktop/mobile recordings. Actual React SPA, not SSR-only or fabricated QA UI. |
| 4 Security | PASS | logs/security-scan.log source+production bundle0 findings; logs/evidence-security-scan.log evidence0 findings. Synthetic fixtures and local guarded transport only, no real patient/DB write, no dependency additions, denied-read suppression, identity validation, cancellation and React escaping tested. |

## Acceptance criteria

- AC1 PASS: Visible cards distinguish named known allergens (even contradictory absence), verified absence, explicit status-only patient denial and unknown. Missing/malformed/failed/unavailable source never implies absence. Array-shaped status and mismatched internal identity show unknown/retry; optional array-shaped severity remains non documentata. Pure tests additionally cover top-level/null mismatches and status-only verified absence. Clinical-read capability denial sends zero cartella requests; live capability revocation clears rendered detail and suppresses rereads. Expected401/403/503 each show unavailable+unknown and recover with explicit fresh retry.10s timeout/cancel and max4 active authenticated no-store reads tested. Deferred prior responses cannot replace new hour/day/unmounted/session source; actual supervisor logout→nurse login cancels old reads. Full-chart sentinel absent from DOM/storage; minimal projected fields retained locally.
- AC2 PASS: At1150x1004 and390x844, named allergen, textual grave/non-documentata severity and reaction appear before Somministra; list takes priority over contradictory assenti. Explicit absence/denial/unknown states are words, never only color/count. Document width does not overflow. Desktop/mobile result screenshots independently visually inspected.
- AC3 PASS: Native details open+close by Enter/Space and pointer, including lower card with keyboard focus. Exact window scroll, date/hour/non-default Da erogare filter/hash/patient remain unchanged; no write/navigation. Documentation author/date/notes visible inside local disclosure. HTML-like malicious note renders literal text, no img node or execution. Loading/errors carry an explicit source-status message beside Stato non documentato, preserving a clear unknown rather than asserting source absence.
- AC4 PASS: Real supervisor admin-shell Somministra→confirmation dialog proves correct synthetic target and07:00 hour. Annulla sends zero writes. Confirm sends exactly patientId/therapyId/date/fascia/confirmed:true, no allergy/drug/dose fields. Refreshed badge and page.reload show administered with simulated persisted response. Exactly one mocked clinical POST in the entire final run; all other cases zero. Original nurse/operator profile also shows allergy context with enabled existing action and no route/write side effect.

## Final evidence

- screenshots/desktop-allergy-before-action.png; screenshots/mobile-allergy-before-action.png; screenshots/nurse-allergy-before-action.png.
- screenshots/desktop-details-open.png; screenshots/desktop-lower-details-open.png; screenshots/mobile-details-open.png; screenshots/nurse-lower-details-open.png.
- screenshots/supervisor-confirmation-dialog.png; screenshots/supervisor-administered-refresh.png; screenshots/supervisor-administered-after-reload.png.
- screenshots/capability-denied-unknown.png; screenshots/http-401-retry-known.png; screenshots/http-403-retry-known.png; screenshots/http-503-retry-known.png; screenshots/nurse-after-stale-supervisor-session.png.
- trace.zip; mobile-trace.zip; nurse-trace.zip; capability-denied-trace.zip; http-401-trace.zip; http-403-trace.zip; http-503-trace.zip; stale-trace.zip; session-change-trace.zip; timeout-trace.zip.
- video/final-desktop.webm; video/final-mobile.webm.
- test-results/browser-results.json; playwright-report/index.html; independent-source-receipt.json; executable qa-browser.mjs/qa-server.mjs/qa-commands.mjs/qa-receipt.mjs.

The HTML report is generated from executable assertion outcomes, not a standard Playwright Test reporter. The browser harness directly uses Playwright/expect and captures real SPA tracing/video. `CLINICOS_QA_OUTPUT_DIR` allows root reruns to preserve independent evidence.

## Honest limits and initial attempts

All runtime APIs are intercepted synthetic local fixtures; token text is a synthetic non-secret. This proves actual SPA behavior/capability gating, correct request shape and mocked refresh/reload persistence, NOT real database durability, live backend authorization, clinical compatibility or physical bedside/hardware/sunlight safety. No real patient data, documents or credentials enter evidence. No production/closure decision is made here. No broader #429 human audit claim.

Initial parser review prompted a root source repair before the final freeze (strict status/severity typing, internal identity check, valid status-only source semantics). Old candidate build logs were overwritten by fresh independent848ae execution. A first browser run on the repaired candidate deliberately failed on unhandled admin /operators/page bootstrap500s; this was a missing QA fixture, not an application failure. That raw failed JSON/HTML is retained in initial-harness-failed/ and is NOT final proof. Fresh17 checks reject unexpected endpoints and have zero unexpected console/runtime/HTTP/external errors; deliberate401/403/503 resource errors are separately listed. `maxRouteReads` in raw mock state counts deferred route handlers even after a client abort, not live network concurrency; actual observed cartella fetch concurrency is separately recorded and bounded4.

## Final Decision

READY FOR CODEX QA

Codex must now re-run the QA Gate.
