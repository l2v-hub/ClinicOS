# Independent QA2 — issue #426

QA Verdict: FAILED VALIDATION
Final Decision: FAILED VALIDATION

Application commit: `1436602e81d0c03625cfa73ce24974099e919612`. Baseline: `b7ae14d120c1e70ccf72784206a505f8c48f975e`. This is a new independent session in C:/w-426-qa2, not the implementer. No app edits, commit, publication, credentials, installation or live mutations performed.

## Original acceptance criteria

| Criterion | Result | Evidence |
|---|---|---|
| AC1 unique room/bed accessible names | PASS | browser01/test-results/browser-results.json; supplemental01 and long01 hostile/separator tests |
| AC2 tooltip and editor/confirmation maintain same full resource | FAIL | room-headers01/test-results/room-heading-geometry.json; delete-header01/test-results/delete-heading-geometry.json; actual screenshots below |
| AC3 distinct removal with existing confirmation | PASS for standard resource, long confirmation label visual regression | browser01 destructive icon/color/gap/confirmation cancel; delete-header01 actual pixels |
| AC4 verify without live deletes | PASS | all browser state guards show zero actual mutations, external/API surprises and page errors; only explicitly expected before-wire mocked PUT/409 in supplemental recipes |

## Findings requiring remediation

1. `frontend/src/components/admin/RoomFormPanel.tsx:19`: exact captured room number is now included in the inline heading, but a valid 32-character unbroken number overflows on 390x844. Measured heading right 517.34375, editor right 376, viewport 390. Actual `room-headers01/screenshots/mobile-long-room-editor.png` shows clipped context and close control outside the visible card. Replay `recipes/room-headers.mjs`; assertion fails before any mutation. Header must wrap locally and preserve reachable close control.
2. `frontend/src/components/admin/RoomsManagement.tsx:473` and `:479`: the newly contextual deletion title and confirm label inherit unbounded generic layout. Heading right 611.09375 exceeds dialog right 374.390625 and viewport 390. `delete-header01/screenshots/mobile-long-delete-confirm.png` additionally shows message and destructive button text spilling beyond the dialog. Replay `recipes/delete-header.mjs`. No confirmation click and no DELETE occurred. Scope local room confirmation wrapping for title, message and button text, without a global design-system rewrite.

The bed-only remediation is objectively correct: `long01/test-results/long-heading-geometry.json` has heading right326 <= viewport390/dialog390 and scrollWidth310 == clientWidth310. Inspected `long01/screenshots/independent-mobile-long-context.png` shows complete wrapped 32W/16L context and reachable close/control area. This does not waive the other AC2 resource headings.

## Phases

| Phase | Result | Evidence |
|---|---|---|
| Contract | PASS | original-issue.json (comments empty), task-contract.md, qa2-assignment-policy.md |
| Full 8-path diff review | Scoped, two correctness regressions | findings above; diff-review.txt; presentation/helper extraction preserves parent handlers, state guards and typed bounds |
| Types/build/focused | PASS | commands01: frontend/backend types, tsc-b, actual Vite React compiler, 22/22 focused |
| Full regression | Exact baseline delta PASS, NOT globally green | commands01/command-results.json:1265 tests,1253 PASS,12 identical named accepted failures,0 new; pinned baseline proof057dc6ca6374203d4a1c86d1e5c4b14b73810d48 |
| Playwright library tests | 17 original cases PASS, 2 independent new header checks FAIL | browser01 6, supplemental01 5, long01 6; room-headers01/delete-header01 failure JSON, screenshots/traces/video |
| Security | Scoped PASS | security01/comparison.json zero new native findings; frontend secrets source/build scan PASS; security checklist below |
| Immutable source | PASS | source-before.json/source-after.json and source-integrity.json; all1539 application paths unchanged, 8 changed Git blobs canonical match |
| Browser handoff | PASS | lane-handoff.json verifies own PID/command/listener then stop; all recipe browser finally blocks completed |

## Security checklist and scope limits

No backend/schema/API/config/environment/dependency/lock changes. Role gating remains existing admin/manager and operatorHeaders in parent requests and extracted facility reads. Number32, floor/ward64, note2000 remain unchanged; no persisted derived occupied state option. Names/JSON quoting are rendered as React text, hostile labels create no img/XSS element. Existing keyboard-safe dialog/single-flight bed guard and all5 busy-disabled controls retained and runtime asserted. Red remains existing destructive tone only. No new logging, raw HTML or SQL. Evidence uses synthetic supervisor/rooms, no patient fixtures; all API endpoints intercepted before wire. The single expected409 path and console error are checked exactly, not suppressed wholesale. No native AT/physical mobile certification, real persistence or live deletion claim. Browser tests use the actual repository app/config/compiler, not a replica. HTML report is generated from Playwright library assertions, not a native Playwright Test runner report.

Startup tooling: Windows PowerShell execution policy rejected initial start-server.ps1 before server creation; retried only the owned launcher with process-local Bypass. Read-only probes initially referenced nonexistent CSS/schema paths, then located correct files with rg; no application or test failure inferred from these probes. Both application geometry failures remain preserved, not relabeled as harness failures.

Release remains blocked on correcting both findings and a fresh immutable independent gate plus root replay. No issue closure/deployment authorized by this verdict.

Codex must now re-run the QA Gate.
