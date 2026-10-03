# Task Contract

## Task
- Title: ux-patient-live-review
- Slug: ux-patient-live-review
- Type: change
- Date: 2026-10-04

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

The online browser retained an old frontend bundle. Reloading the current release exposes an unchecked legacy handover overview response, causing a dashboard module crash. The old screenshots show oversized vitals, no allergy spacing, and COMPLETATA. The current acknowledgement copy says presa in carico, which does not clearly communicate read-and-understood confirmation.

## Expected Behaviour

Validate the handover API response before using it; incompatible or malformed responses produce an unavailable/retry state, never a crash or a fabricated zero/shared acknowledgement. Verify compact vitals and allergy spacing in the actual patient shell at the reported viewport. Show Letta e compresa, reader and timestamp for validated shared confirmations, retaining the original priority in history and no COMPLETATA label. Publishing backend/schema is separately pending explicit user authorization.

## Acceptance Criteria

- AC1: Current, legacy and malformed overview responses cannot crash App; only current exact aggregates count as shared critical handovers.
- AC2: Patient vitals are compact at 1074x1004; expansion is keyboard-accessible and the allergy strip has at least 24px separation from the next content.
- AC3: Confirmed notes show Letta e compresa and the actual reader/time; legacy completion alone is not proof of reading and no COMPLETATA badge is rendered.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Boundary validation and acknowledgement semantics. |
| Integration | yes | Actual App with both API contracts. |
| API | no | |
| Playwright | yes | Patient shell, compact vitals, spacing, expansion and no crash. |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | yes | Only synthetic fixtures in committed evidence; no credentials or backend/schema changes. |

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

The online backend lacks shared handover acknowledgement. A frontend change cannot supply that persistence; do not relabel legacy urgentOpen as urgentActive or personal reads as shared confirmation. Keep the frontend deploy reviewable and disclose the backend dependency. Do not mutate live clinical records during UI verification.

## Gate Status

READY FOR IMPLEMENTATION
