# Task Contract

## Task
- Title: bug-batch-450 owner-approved manual intake corrections
- Slug: bug-batch-450
- Type: bugfix
- Date: 2026-10-17

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | yes |
| Database/Persistence | yes |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | yes |
| Auth / Permissions | yes |
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour
Three duplicate entry choices; automatic admission date/time completes the admission section; repeated demographics helper content. Existing PR469 addresses these but needs responsive and objective evidence improvements.

## Expected Behaviour
Keep the existing complete one-page intake per owner override https://github.com/l2v-hub/ClinicOS/issues/450#issuecomment-6154947896. Reuse scoped PR469 changes while preserving document route and role behavior.

## Acceptance Criteria

- AC1: Exactly one combined letter/transfer document route plus manual entry, preserving document availability and role gates.
- AC2: Automatic admission date/time and empty or whitespace-only sections never appear complete; genuine entered admission data completes its section.
- AC3: Keep the complete one-page manual intake; remove redundant demographics summary and obvious helper paragraphs while preserving field errors and computed tax-code notice.
- AC4: Create a synthetic manual patient on an isolated fresh local database, assert browser-visible identity and values, reload and verify persistence through the real API and database.
- AC5: At desktop 1180x820, tablet 820x1180 and phone 390x844, exactly two usable accessible choices have no horizontal overflow; document route and manual route remain keyboard accessible.
- AC6: Browser run fails on every unexpected console/page error and relevant failed HTTP response, records screenshot, trace and video, and tears down all local services.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Behavior of empty/automatic/genuine sections and rendered entry choices |
| Integration | yes | Actual frontend/backend/local synthetic database |
| API | yes | Assert saved synthetic patient field values |
| Playwright | yes | Entry choices, real creation, responsive and accessible flow |
| Persistence after refresh | yes | Patient remains readable after reload |
| Agnos action registry | no | No assistant action changes |
| Voice simulation | no | No voice changes |
| OCR/import test | yes | Synthetic multipage text/scanned document upload, review, parser provenance and persistent draft |
| Security/privacy scan | yes | Loopback-only synthetic fixtures, role gates, no credentials in evidence |

## Evidence Plan
Store command logs and per-AC results, final issue450 PNG, trace ZIP, WebM and source receipts under this packet. Only synthetic values. Independent QA and external Claude review remain root-owned gates.

## Risks
Shared IntakeWorkspace must be serialized with import integration. Reusing old PR source does not inherit its historical validation or release status. No online or production data access. No issue closure before review and verified release.

## Gate Status
READY FOR IMPLEMENTATION — awaiting controller plan freeze

## Aggregated import scope and acceptance

Root extends durable450 round1 to472/473/475/476 before plan freeze. Shared intake state makes a single coordinated batch necessary. Each issue keeps own acceptance and PNG/trace/video. Backend changes are explicitly limited to imported draft identity/confirm and source prescription recognition; no schema or therapy administration changes.

### Issue 472
- Import review occupies available viewport without nested modal obstruction; original document remains available while editing every demographic and therapy field at desktop/tablet/phone.
- Save/leave/resume preserves edits through reload with visible incomplete draft status in patient list/dashboard and no duplicate patient on repeated continuation.
- Required and strongly recommended fields are distinct; preserve incomplete values accurately instead of inventing birth dates or demographics.

### Issue 473
- Validated unambiguous CF may derive a reviewable missing sex with provenance; invalid code or explicit contradictory sex is never silently overridden.
- Unheaded synthetic medication lists produce reviewable prescription rows retaining quantities, schedules and source provenance; ambiguity remains visible, unsafe rows cannot be activated, and no administration event is invented.
- Original source remains visible while right-side field/therapy editing scrolls; browser synthetic PDF import persists reviewed values through reload.

### Issue 475
- Authenticated synthetic multipage PDF includes readable text page and scanned-image page; preview thumbnails and selected original page render actual nonblank canvas content.
- Missing/unreadable source yields actionable error/retry and cannot expose another session source; actual failing fetch/render root cause determines the minimal fix.

### Issue 476
- Name/surname/validCF alone can continue as incomplete draft; backend and UI agree, remaining recommended data is visible and persisted after reload.
- Invalid CF, supplied future birth date, unsafe/unreviewed therapy and duplicate conflict remain explicit actionable blockers rather than unexplained disabled create button.

OCR/import runtime test is now required with synthetic text and scanned PDF; API/backend integration required for incomplete draft, duplicate and source authorization behavior. Previous manual-only no values in impact table apply to450; aggregate includes backend/API, OCR/import and draft persistence impact.

## Isolated database/runtime execution
Owned nonprivileged Docker container clinicos-qa-batch450 runs PostgreSQL16 on loopback55450 only, without hostmounts or privilege flags. Inspect ownership label before cleanup. NativePG16 fallback where supported by CI. Start real Python AI runtime on8795 with mock providers only and dedicated synthetic uploadroot. Single harness owns all services, readiness SQL and teardown.

## Frozen source baseline
Updated baseline origin/main a516d42e31f6674c39c1d130c9706cd80a7ab4c6 after merged479. Existing PR469 source remains29b2f5c9b72b4d909b954d5360ec08095825f29e and is adopted as scoped source, not historical validation. Controller owns durable5issueclaim and unchanged implementation round1.
