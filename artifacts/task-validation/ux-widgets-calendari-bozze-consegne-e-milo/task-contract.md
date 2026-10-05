# Task Contract

## Task
- Title: UX widgets calendari bozze consegne e Milo
- Slug: ux-widgets-calendari-bozze-consegne-e-milo
- Type: feature
- Date: 2026-10-04

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | yes |
| Database/Persistence | yes |
| Agnos AI / Chatbot | yes |
| Voice | yes |
| OCR / Import | no |
| Auth / Permissions | yes |
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour

Browser annotations show inconsistent widget insets/gaps, duplicate actions, squeezed patient names, session-only drafts, repeated therapy details and unclear handover workflows. Voice interpretation and agentic support need explicit explanation and confirmation.

## Expected Behaviour

Compact consistent widgets with individual/global collapse, one complete print entry point, persistent operator-isolated drafts, compact grouped calendar slots opening accessible detail dialogs. One handover composer and patient history. Voice reads interpretation and proposed action before explicit confirmation; doctor prescription proposals remain role-gated and require verified acceptance.

## Acceptance Criteria

- AC1: Admission/contact cards share a container and spacing; no duplicate print; global selection prints admission/contact and all represented patient sections.
- AC2: Clinical widgets have equal horizontal edges and vertical gaps; reusable individual and page-wide collapse preserves entered form data and supports keyboard navigation throughout multi-widget pages.
- AC3: Assessment drafts survive reload, isolate operator/patient, support delete, compact accessible actions and Draft chip; redundant catalog introduction removed; legacy module actions use named icons and recorded history shows creation date/author; server errors remain truthful.
- AC4: Sidebar Therapy exits patient context; active drugs are in Piano terapeutico after Storico, separate from calendar; occupied hour grouped into one clickable summary and accessible modal containing all details and permitted administration actions. Empty patient calendar slots expose a small named + for authorized prescribers, opening the existing prescription form in a modal initialized to the selected date/time; no write occurs before explicit saving.
- AC5: Global/patient calendars share rendering; global occupied slots compact patient summaries with modal details; entry to patient therapy and Back restore originating calendar/modal state.
- AC6: Multi-patient vital roster names remain readable at 1150/768/390 without letter wrapping or excessive height.
- AC7: Shared diary/rounds handover form uses severity and narrative, automatic author/time, no editable type/deadline. Patient diary replaces redundant feed/summary; long history is bounded/filterable; topbar duplicate shortcut removed.
- AC8: Doctor therapy narrative produces a reviewable proposal using existing authorized interpretation and prescription APIs, writes only after explicit doctor confirmation; missing/ambiguous data never fabricates a prescription.
- AC9: Milo identifies agentic AI support and need to verify retrieved information. Voice reads interpreted command/proposed action, waits for explicit confirmation, uses best available Italian voice with softer pacing; rejection performs no write.
- AC10: Existing shared receipt semantics, immutable original clinical entries, role/facility scope, pending-operation idempotency, errors and unavailable data remain correct. Maximum ten documented discover/fix/verify iterations for this batch.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Draft restoration/deletion, grouping, collapse, voice confirmation state. |
| Integration | yes | Shared components and navigation return state. |
| API | yes | Existing doctor proposal/write authorization and acknowledgement regression. |
| Playwright | yes | Synthetic full app at annotated and responsive sizes, modal/keyboard/history/print. |
| Persistence after refresh | yes | Draft content and uncertain request identity survive refresh. |
| Agnos action registry | yes | Proposal confirmation uses existing permitted actions. |
| Voice simulation | yes | Mock speech capture/synthesis and confirmation/rejection. |
| OCR/import test | no | |
| Security/privacy scan | yes | Role isolation, no secrets/real patient evidence, bounded storage. |

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

Synthetic fixtures only. Preserve original user browser drafts and unrelated main changes. Root sole writer in ux-turno-review; research agents read-only; independent backend QA owns only QA worktree artifacts. New frontend validation must bind final source. Prior user authorized push to l2v-hub/ClinicOS and online publication; no force push, no manual backend upload. Never interpret acknowledgement as completed care. Draft storage must be scoped/cleared on logout and report storage failure. No new dependencies without necessity.

## Gate Status

READY FOR IMPLEMENTATION

2026-10-05 resumed steering: repeated admission/collapse/catalog-intro requests are already in the candidate; new empty-slot creation, tab name/order and legacy module history/action details are included in consolidated cycle 9. Existing backend authorization remains authoritative.

2026-10-05 follow-up AC4: patient hour popup shows each drug once in a compact full-width row with dose, route, prescriber, notes and its existing administration actions. Remove nested duplicate cards/left insets; reduce status chips and buttons; preserve readable long text, read-only/loading/error views, non-administration reasons and explicit confirmation at 1150/1024/390 widths. Only frontend rendering/styles change; synthetic browser evidence and independent QA required.
