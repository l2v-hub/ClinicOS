# Task Contract

## Task
- Title: ux-turno-commenti
- Slug: ux-turno-commenti
- Type: feature
- Date: 2026-10-03

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
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

Turno duplicates therapy deadlines, truncates patient identity, labels overdue as urgent, has inconsistent width, and lacks critical handover navigation badges.

## Expected Behaviour

Clear action queue, separate persistent allergy attention, bounded severity-first handovers preview, one shared critical count decreasing after successful Ho capito, consistent layout and friendly assistant name. Remove Note navigation while preserving existing mailbox data and route.

## Acceptance Criteria

- AC1: Replace patient/therapy duplication with deduplicated bounded handovers sorted by severity then newest; expose loading/error/empty states.
- AC2: Full patient name, separate location/detail/time in Adesso; distinguish overdue from urgent; severity visible in text and icon/color; persistent allergy amber.
- AC3: Exact handover count shared by topbar/sidebar, refresh after successful acknowledgement; failed acknowledgement does not decrement; zero hidden and unknown explicit.
- AC4: Note removed from navigation without deleting data, common dashboard gutter, responsive 390/768/1161/1575, keyboard actions, no console errors.
- AC5: Friendly assistant name consistent, explicit clinical AI description retained.
- AC6: Diary has no completed badge, preserves role/author/severity and shared Ho capito history; active and taken visually distinct; compact vitals with accessible expansion dialog; allergy strip separated from adjacent content.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Selection, severity, badge and existing regressions |
| Integration | no | |
| API | no | |
| Playwright | yes | Synthetic fixtures, interactions, screenshots and trace |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | |

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

Preview is bounded, never claim global completeness. Server urgency is shared acknowledgement, not personal unread. Backend, schema, auth, environment, production data untouched.

## Policy Decision Receipt

Allow isolated local frontend edits and synthetic validation under user request. One writer, read-only independent QA. No tracked local lease adapter found. Ruflo MCP guidance and CLI absent; use native Codex collaboration and repository instructions. Deny unrequested commits/pushes/deployments/production mutations. Bind evidence to HEAD plus changed-file hashes (dirty snapshot).

## Gate Status

READY FOR IMPLEMENTATION
