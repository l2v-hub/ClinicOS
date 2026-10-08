# #403 Independent QA — verified candidate

Candidate: **038dd839cc69d054d38caeac2eb17dc146440746**. Baseline: 4ddb4b4c. Application source was committed and frozen before independent execution. QA authored only this issue's evidence, never application/config/dependency files or Git/release changes.

Source aggregate SHA256: `3acf1b69a253e8f054654b131fd8f0fd88d0534708466b2a5cc61dca6eb76ac1`. Source/build-input/evidence hashes and baseline comparison are in independent-source-receipt.json. Application status is clean.

## Phase results

| Phase | Result | Evidence |
|---|---|---|
| 0 Contract/issue | PASS | task-contract.md valid; original #403 body and empty comments read independently |
| 1 Scoped diff | PASS | Calendar/summary/editor UI and mapping only; unrelated formatter edits restored. Shared clinical engine/read byte-identical to baseline. No backend/schema/dependency/config changes. |
| 2 Types/build | PASS | logs/types.log, logs/tsc-build.log, logs/vite-build.log: independent types, tsc -b, Vite production build, all exit0 |
| 2 Focused | PASS | logs/clean-focused-tests.log: **36/36 PASS**, incomplete-summary, complete-read/planner, calendar-create and in-place suites |
| 2 Broader regression | PASS with explicit baseline waiver | logs/focused-tests.log: 104 total/103 PASS/1 identical pre-existing weekly/monthly guard failure. logs/full-regression.log: **1165 total/1153 PASS/12 exact known baseline failures**. independent-source-receipt.json: zero new/resolved failures. Never claim the full suite is green. |
| 3 Actual SPA browser | PASS | **13/13 actual assertions**; test-results/browser-results.json; playwright-report/index.html; trace.zip plus doctor/mixed/empty/prn/mobile/mobile-doctor-trace.zip; video/final-desktop.webm, video/final-mobile.webm |
| 4 Security | PASS | logs/security-scan.log: changed source and production bundle 0 findings. Synthetic fixtures only; zero clinical writes, unexpected console/runtime/HTTP/external errors. Capabilities and restrictions not weakened. |

## Acceptance criteria

- AC1 PASS: At1150x1004 and390x844 first viewport displays `0 dosi programmate · 0 orari esatti` and `2 terapie con programmazione da completare`, including legitimate optional-demographics reminder. Count and warning headline assert100% viewport. Mixed prescription has1 exact dose and2 incomplete; PRN is separate, never incomplete.
- AC2 PASS: Actual text distinguishes no doses with unfinished programming from genuinely empty/PRN-only cases. Day/week explanation matches period. Mixed week7 doses at10:30 and2 unique incomplete, no duplicate incomplete count.
- AC3 PASS: Nurse has no editor action and sees prescribing-clinician reference. Doctor deliberately has therapy.update but NO therapy.create, opens existing populated second-page prescription. Heading focused, visible/hittable, URLattivi, drugB/25mg/prescriber/note correct. No missing time inferred from fascia/defaults. `+ Aggiungi orario` adds blank time. Mobile doctor also opens/hits focused existing editor. Zero clinical writes from navigation. Unit tests preserve saved exact/invalid times and quantities.
- AC4 PASS: Native details expand by Enter; warning/details before controls/grid. Grid scrollHeight<=clientHeight+1 and scrollTop0 (no innerY), mobile week locally horizontal-scrollable and document has no horizontal overflow. Details share outer path.

## Final screenshots (fresh candidate only)

- screenshots/desktop-incomplete-first-screen.png — distinct counts/explanation.
- screenshots/mobile-incomplete-first-screen.png — same at390x844 even with optional reminder.
- screenshots/nurse-source-details.png — original bands/reasons and clinician reference.
- screenshots/doctor-second-page-existing-editor.png — focused original second-page therapy.
- screenshots/doctor-explicit-time-required.png — new time blank, preserved25mg/prescriber/note.
- screenshots/mobile-doctor-existing-editor.png — update-only focus visible/hittable.
- screenshots/mixed-week-counts.png; screenshots/mobile-week-reachable.png.
- screenshots/empty-zero-dose-state.png; screenshots/prn-zero-dose-state.png.

PNGs visually inspected independently as well as browser-asserted. Named final videos and traces come from fresh passing candidate. Other generated video/page@*.webm are temporary historical recordings, NOT final proof; do not stage. initial-failed/ preserves first rejected report/source/results/PNGs, not release evidence.

## Security and limitations

No real patient records, discharge documents, credentials or production writes. Typed React rendering; no new endpoint, raw SQL/HTML injection/logging/dependency. Auth simulator is intercepted locally: proves UI capability gating, not live backend authorization or DB persistence. Read/navigation fix: clinical persistence test not applicable because zero clinical writes allowed/required. No ward hardware/sunlight/clinical outcome or #429 full human-audit claim.

Baseline12 failures exactly match #402 full-regression log; waiver permits zero NEW failures only. Initial bootstrap500s were missing synthetic mocks, corrected in harness; fresh13 checks have zero unexpected failures. Initial candidate inferred22:00/mobilefold failures repaired and fresh source-bound QA recorded here.

## Root QA gate and publication

Root reran contract validation, scoped diff review/whitespace check, all36 focused tests and the entire13-check full-SPA browser harness. All PASS; source receipt remains bound to038dd839 with identical application hash, zero unexpected errors/clinical writes/new failures. Root visually inspected fresh desktop/mobile first-screen PNGs and ran source/bundle/artifact secret scan (0 findings). QA and root servers stopped. The twelve unchanged baseline failures are explicitly accepted for this scoped release only. Publication policy receipt: promotion-decision.json.

User-authorized application commit038dd839 pushed to main. Git-linked production deployment dpl_FYwJUybuhcZX2BC7DRQX59w2UA78 READY, both Git source/GitHub metadata match exact commit, public alias assigned. Root/public therapy asset HTTP200; served therapy chunk contains distinct dose/incomplete/empty text and strict editor restoration option; its linked shared editor chunk contains blank newly-added time. Backend health200/ok. No live patient mutation. See frontend-release-receipt.json. Evidence-only commit/pinned screenshot comment must be published before marking GitHub403 completed; no broader #429 closure claim.

## Final Decision

CLOSED — VERIFIED

All four issue acceptance criteria pass independent and root QA; exact-source production publication verified with the limitations above. This report authorizes the pinned proof publication and subsequent GitHub403 closure, not a global clinical/hardware audit certification.
