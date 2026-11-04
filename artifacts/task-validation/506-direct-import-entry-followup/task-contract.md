# Task Contract

## Task
- Title: 506 Direct Import Entry Followup
- Slug: 506-direct-import-entry-followup
- Type: bugfix
- Date: 2026-10-30

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | yes, presentation only |
| Auth / Permissions | no |
| Privacy / Security | yes, validation |
| Config / Env | no |

## Current Behaviour

Actual authenticated online verification of merge59f0a9ea demonstrated that PatientList's direct import button mounts AIImportStatus with default modal presentation, covering topbar/sidebar. The previous fixture exercised only NewPatientFlow. Four genuine Claude rounds remain preserved; the user's explicit reply authorizes exactly one additional round5, not a reset or unlimited budget.

## Expected Behaviour

PatientList explicitly requests page presentation from its real AIImportStatus entry. That component propagates presentation through both lazy loading and import/review/draft, and owns a stable trigger-focus target across temporary lazy/draft dialogs. Other callers retain default true-dialog semantics. Existing save/navigation guards remain unchanged. Root is the sole source writer in the isolated checkout; a new independent QA session will verify it. No backend/schema/API/permission/provider/config/dependency changes.

## Acceptance Criteria

- AC1: Clicking the actual PatientList import button renders bounded nonmodal loading/import/review/draft below topbar and beside desktop sidebar at1440/1024/768/390. Shell controls remain hit-testable; mobile menu opens above the workspace.
- AC2: Review-to-draft handoff through actual controls stays page-presented. Closing/saving, reloading and clicking PatientList's actual Riprendi bozza preserves same draft ID and edited value, without duplicate job/draft creation.
- AC3: Shell navigation flushes a pending resumed-draft edit; reopening/reloading preserves it. Existing legacy506 save-failure/pending-notice/modal-focus-Escape regression remains unmodified and passes.
- AC4: Default AIImportStatus callers retain genuine modal Escape/focus behavior. No production authorization/API/dependency/environment change.
- AC5: New regression fails on baseline59 before production correction, then passes. Independent QA, required exact-head CI, one actual Claude Max review bound to source, final Codex, protected merge and actual authenticated online acceptance precede closure.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Forwarding/default contract; full frontend suite, TypeScript and build |
| Integration | yes | Real PatientList and AIImportStatus with synthetic session/API fixtures |
| API | no | Intercepted localhost fixtures only, not backend certification |
| Playwright | yes | New actual entry four-width regression plus unchanged legacy506 runner, serialized owned loopback ports |
| Persistence after refresh | yes | Exact draft identity and edited value after close/reload/actual resume |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | yes | Presentation and review-to-draft handoff with synthetic result; no provider/OCR reliability claim |
| Security/privacy scan | yes | Source/dist/evidence scanner, strict no outbound/console/page/unexpected HTTP errors |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots for lazy loading/direct import/review/handoff/resume/default modal
- four Playwright traces and four videos, browser JSON and HTML companion
- sanitized test logs and exact source-bound independent QA report
- retained baseline RED and all environmental failures; no assertion weakening
- commit-pinned synthetic images and links on issue506
- authenticated normal-demo online empty import/own synthetic draft verification after deploy
- preserve old failed online evidence atc37121e1 and all original reviews/releases

## Risks

Scope is six source paths: AIImportStatus.tsx, PatientList.tsx, aiImportPresentation506.test.ts, frontend/e2e/issue506-direct-entry.html and.tsx, e2e/issue506-direct-entry.mjs; only contract/evidence/reports beyond these. No lockfile/workflow/backend edits. Original mergedPR508 remains immutable. Canonical postMergeFollowups records this separate follow-up, its ownership and global review5 allowance. No real patient writes, confirmation, provider or production API tests in local runner.

## Gate Status

READY FOR IMPLEMENTATION
