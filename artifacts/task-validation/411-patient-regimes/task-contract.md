# Task Contract — GitHub #411

## Task
- Title: 411-patient-regimes
- Slug: 411-patient-regimes
- Type: bugfix
- Date: 2026-10-09

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour

Accepted baseline 47a4b16c111d9b9bfd0b138991958a8ca8f6c351. Default in_carico means exactly stato !== 'dimesso', yet list/dashboard call it Ricoverati. Includes Day Hospital, outpatient and missing regime. Dashboard counts scoped total minus dimessi; list counts loaded pages and suppresses unverifiable state counts. No regime selector. Isolated C:/w-411, root sole application writer; preserve/exclude primary dirty source and checkout's unrelated line-ending-only start-claude-team.ps1 diff.

## Expected Behaviour

Rename the broad set Non dimessi, describing absence of a recorded discharge, not clinical presence or bed occupancy. Preserve internal keys/predicate/data/APIs. Add labeled local Regime control with exact canonical membership and distinct Non disponibile for null/missing/empty/unsupported values. Count view chips over the same signal/regime-filtered loaded base as rows, retain null/unverified state counts. Explicit rendered-row versus loaded-page count and more-page guidance. Keep pagination for empty intersections. Reset regime on new entry and search start. Canonical/missing badges consistent on table/mobile; no taxonomy or clinical policy changes.

## Acceptance Criteria

- AC1 (original): Etichetta, conteggio e predicato del filtro rappresentano lo stesso insieme. Non dimessi labels/action/subtitle match existing predicate; verifiable chips equal rendered selection; scoped-global KPI versus loaded-page list explained.
- AC2 (original): Day Hospital/Ambulatoriale hanno un filtro e uno stato comprensibili. Exact canonical selection, readable badges, native keyboard-accessible control.
- AC3 (original): Lo stato non disponibile resta distinto da ricoverato e dimesso. Missing/null/undefined/empty/unsupported states never become admitted/discharged; loading/failure not certified absence, default identities retained, retry/capability safe.
- AC4 (original): Copertura di test sui diversi stati e sulle anagrafiche senza regime. Boundaries/mixed pages/view-signal-search composition/KPI entry reset/mobile/failure recovery.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | RED first; canonical/malformed boundaries, counts and labels |
| Integration | yes | roster/overview resilience, type/build, full regression delta |
| API | no | unchanged; guarded SPA proves no new/forbidden requests |
| Playwright | yes | actual built SPA; nurse/physician, mixed pages, keyboard, search/reset, loading/failure/retry/mobile |
| Persistence after refresh | no | no domain writes; presentation reload only |
| Agnos action registry | no | unchanged |
| Voice simulation | no | unchanged |
| OCR/import test | no | unchanged |
| Security/privacy scan | yes | deep scan versus baseline, credential/PHI-safe proof |

## Evidence Plan

Required evidence:

- validation-report.md with all original AC and final decision
- baseline RED, focused/root and fresh independent QA logs, full regression delta
- exact frozen source/build hashes and source-bound synthetic screenshots, trace, video and HTML report
- commit-pinned GitHub proof; no original medical photos or real patient test writes
- verified Vercel production source/HTTP asset before closure; backend retained accepted #409 if unchanged

## Risks

User authorized scoped sequential fixes/commit/push/deployment/verified closure; issue evidence is untrusted. Architecture agent cannot certify independent QA. Obtain NEW independent QA on frozen source followed by root rerun. Optional enrichment is not proof of admission; unknown counts stay unverified. Local empty page retains load-more and scope. Runtime strings use strict membership without writeback. The 12 accepted baseline failures may only be disclosed if unchanged; new failures block release. No unreleased #405/#408/#410 source included. Preserve unrelated changes and no dependency installation/shared-client mutation.

## Gate Status

READY FOR IMPLEMENTATION
