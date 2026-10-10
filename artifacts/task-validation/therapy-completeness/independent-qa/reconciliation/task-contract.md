# Task Contract

## Task
- Title: Therapy completeness
- Slug: therapy-reconciliation-qa
- Type: bugfix
- Date: 2026-10-10

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | yes (internal import helpers only; no endpoint changes) |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | yes |
| Auth / Permissions | no |
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour

Active thread objective: all medicines assigned for therapy must be reported, none silently omitted. Current main30f0b14: patient plan reads one mixed-state100-row page until manual load-more; week calendar suppresses its PRN list; printing reader can accept a short terminal list despite a larger server total; a loaded hourly administration feed can hide prescribed drugs absent from that feed. Read-only import analysis also identified potential parser/reconciliation omissions; these remain part of the completion audit, not waived by a narrower UI fix.

## Expected Behaviour

Every assigned prescription remains discoverable in the authoritative complete plan, with its actual state and regimen. Day/week calendars distinguish prescriptions from actionable administration records, never invent a dose or action for a missing feed entry. Incomplete reads are visibly errors, never complete/empty clinical lists. Imported/manual medicines, provenance and explicit exclusions must remain accounted for; no invented medical instructions or automatic correction of real patient records.

## Acceptance Criteria

- AC1: Audit import, draft review, confirmation and stored therapy display. Reproduce concrete omission paths with synthetic inputs and record remaining gaps; no completion claim based only on one screen.
- AC2: Complete patient-plan read consumes every bounded cursor page, validates patient/state/count/identity, rejects repeats/short terminal pages and stale patient responses. No manually hidden later assigned drug; inactive drugs remain discoverable as inactive, never administered as active.
- AC3: PRN prescriptions remain visible in both day and week views, deduplicated across the period and labelled with actual applicability. Week visibility does not authorize dosing on a day outside the prescription dates.
- AC4: A prescribed hourly occurrence absent from a loaded administration feed remains visible as read-only unavailable, without inventing administration records, dose identity, quantity or permissions.
- AC5: Printing/other full-list consumers cannot accept a count-mismatched partial response as complete. Explicit exclusions, conditional doses and incomplete imported values stay identified, not silently promoted or fabricated.
- AC6: Focused regression tests, types/build, failure-path tests, fresh independent QA and responsive real-component/browser evidence. Final release binds exact clean application source, verified deployment and synthetic pinned GitHub evidence; no actual patient/document/session writes. Full thread goal stays active until every requirement is proved, including any remaining import gaps.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Cursor completeness, identity/count failures, date-aware PRN and uncovered prescription merging |
| Integration | yes | Actual plan/calendar/detail components with synthetic transport |
| API | yes | Existing draft merge/selection confirmation contract must reject omitted, unreviewed and deferred rows; internal-only tests, no real service writes |
| Playwright | yes | Before/after desktop/mobile, all medicine values, error/retry/refresh, exact guarded SPA |
| Persistence after refresh | yes | Re-read synthetic server manifest after reload; no real DB claim for frontend-only stage |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | yes | Audit raw/structured import and preserved rows; track unresolved gaps rather than claiming OCR completeness |
| Security/privacy scan | yes | Patient scope, errors, read-only missing administration states, synthetic evidence, unchanged auth/permissions |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

Root sole application writer in C:/w-therapy, branch codex/therapy-reconciliation-qa from exact main30f0b14; primary dirty checkout and prior proof branches preserved. Two read-only investigators share prior app source, no writer/production API access. Native short checkout used after known managed Windows path failure. Browser lane must be serialized; claim a free specific port before launching. Current frontend/API pagination guards and therapy scope must not be weakened; no automatic medical selection, no dose invention and no backend/schema/API/env/provider changes in initial implementation. Import parser stopping at prose is a separate verified gap requiring careful non-prescription safety reconciliation, not blanket promotion of source prose. Existing standing human scoped commit/push/deploy authorization does not permit real-patient tests or claiming completion without all gates. Memory recall/routing failed native embedding allocation; ledger initialized, no repeated installation/restart workaround. Existing issue queue automation remains paused.

## Gate Status

## Import Reconciliation Extension — 2026-10-10

Standing human instructions explicitly authorize backend corrections when pertinent. Root remains sole application writer; independent QA uses its isolated checkout. This extension is limited to deterministic import parser/row reconciliation and frontend review mapping; no routes, schemas, dependencies, provider/model, configuration or real database changes.

- Preserve #296 non-prescription termination unchanged. Reconcile additional structured extraction items as visible, mandatory-review candidates, never automatically actionable prescriptions. Keep model extraction distinguishable from original document text and preserve source/group/hash/conflict provenance.
- Account for repeated names with different extracted prescriptions; do not collapse two drugs sharing the same original line on refresh or proposal selection. Legacy rows remain readable. Do not silently overwrite manual/operator-reviewed fields.
- Strip only anchored numbered-list decoration from parsing, retaining originalText verbatim. Explicit PRN regimen remains al_bisogno through form/save/confirmation; never infer fixed schedules, doses or unrestricted instructions.
- Add synthetic parser, reconciliation/refresh/conflict/proposal and review/confirmation tests, backend types/build, guarded responsive real-component review screenshots, independent QA and security checks. Whole issue stays PARTIAL until all gaps and mandatory gates pass.
- Raw combined lines and unclassified narrative remain available for manual comparison; no blanket splitting or conversion of clinical prose. OCR/model extraction cannot certify that every original document medicine was recognized; require source comparison, not an automatic completeness claim.
- Structured-only candidates have blank state/date/route/schedules until explicit operator review. The shared form accepts an empty state only as an invalid review placeholder; manual defaults remain unchanged. Exact immutable extraction variants, duplicate occurrences and all unknown extracted fields remain accessible through the shared React-escaped evidence component in review/proposals/summary. Legacy *new* seeding is covered; existing legacy drafts are not silently rewritten or retroactively certified.

READY FOR IMPLEMENTATION
