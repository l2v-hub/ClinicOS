# Task Contract

## Task
- Title: Caricamento rapido elenco pazienti e importazione immediata
- Slug: caricamento-rapido-elenco-pazienti-e-importazione-immediata
- Type: bugfix / performance
- Baseline: 393e8b4ae909d66d945d474c01bb7669b0d8be3d
- Authority: user browser comments request faster listing and immediate import button. Prior commit/push/publication authorization persists for exact verified files only.

## Impact Classification
Frontend/UI: yes. Backend/API/Database: no. OCR/import: entry/loading only. Auth/permissions: unchanged. Privacy/security: asynchronous stale-response review; no new patient cache. Production configuration: unchanged.

## Current Behaviour
PatientList delays every load 250ms and waits for page then clinical-summary before showing rows. AIImportStatus replaces the action with a loading badge until status responds. Intake and import dialogs are eagerly imported while closed. Missing summaries are currently treated as zero signals.

## Expected Behaviour
Immediate first request; debounce only typed searches. Show identities before clinical summary, with explicit pending/error signals. Stable import action at first render, availability checked in background. Heavy dialog code loaded on opening. Preserve rows during same-filter refresh without adding persistent/cross-session caches.

## Acceptance Criteria
- AC1: initial request has no deliberate debounce; search remains debounced and uses POST.
- AC2: rows selectable before delayed summary; summary failure does not hide roster or imply no warnings; separate retry.
- AC3: import action exists at first render with stable geometry; disabled until service availability is confirmed.
- AC4: closed import/intake dialogs excluded from static route dependencies; opening/closing works with feedback.
- AC5: pagination, races, abort, refresh, remount correct; stale responses cannot overwrite newer queries.
- AC6: source-bound before/after browser measurements, bundle comparison, focused tests, build and independent QA.

## Test Plan
Unit: fetch/summary errors, abort, POST privacy, incomplete signals.
Browser: synthetic delayed identity/summary/status, error/retry, pagination, search race, remount, lazy dialogs.
Build: type checks and splitting.
Security: synthetic fixtures only; no PHI cache/logs; existing authorization intact.
No production data writes.

## Evidence Plan
Immutable baseline and candidate builds of same synthetic harness. DOM metrics record request/row/button timing from opening. Actual screenshots and assertions; CUA cannot export trace/video, do not fabricate. Production route dependency bytes compared. Manifest binds app/tests. QA independently runs tests/build and reviews browser evidence.

## Ownership and Safety Envelope
Root sole writer in existing isolated worktree C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications. Audit/QA read application source only; QA writes evidence only after root handoff. Direct user task outside GitHub agent-team supervisor, no external claim/issue messages. Local preview port 4179. Preserve launcher modifications, prior artifacts and docs/product.
Exact anticipated scope: PatientList, PatientRoster, patientPage, AIImportStatus, focused loading helper/hook and tests. No lockfile/shared manifest edits.

## Risks
Missing clinical data must be visibly incomplete. No new persistent patient cache. Summary retry retains rows. Lazy loading preserves import permissions and cannot create jobs before user opens the dialog.

## Gate Status
READY FOR IMPLEMENTATION
