# Task Contract: #402 manual intake

## Impact Classification

Frontend navigation/accessibility: yes. Intake draft opening/recovery: yes. Patient confirmation, backend/schema, clinical dosing, dependencies and authorization policy: no. Patient data: synthetic local fixtures only; preserve existing capability checks.

## Current Behaviour

PatientList chooses a local path then navigates back to the roster. App keys its page group by route, remounting PatientList and losing the selection. Manual workspace initially focuses Close rather than Name; opening failures lack an announced local retry.

## Expected Behaviour

Keep the method-choice route while the selected manual dialog opens. Authorized users see the form with first field focused. Cancel/Escape returns to the method chooser without confirming or creating patients; explicit Back returns to roster. Failed draft opening is announced with a retry action, never silent navigation.

## Acceptance Criteria

1. AC1: Authorized nurse selects A mano; actual App route remains nuovo-ingresso, visible titled manual form, focused Name field.
2. AC2: Cancel/close/Escape returns to method chooser and restores the chosen method focus; no patient create/confirm request and patient count unchanged.
3. AC3: First draft-opening failure is announced via alert and offers Riprova; successful retry opens the form without returning to roster. Lazy module error has a local announced recovery/back action.
4. AC4: Keyboard activation, dialog focus containment, Escape and explicit Back to roster pass. Denied capability cannot open/create draft. Returning to roster focuses Nuovo ingresso.

## Test Plan

Add regression tests for route-preserving selection, cancellation, retry, focus and capability. Run frontend types/build, targeted intake tests and full regression compared to baseline. Independent QA runs actual full SPA with local intercepted synthetic auth/roster/draft endpoints, asserts each AC, records console/runtime/relevant HTTP errors (expected injected failure separately).

## Evidence Plan

Independent screenshots desktop1150x1004/mobile390, browser result JSON, trace, video, HTML report, sanitized command logs, source SHA receipt and production deployment metadata. Commit/push/deploy explicitly authorized by user; proof comment and close #402 only after independent QA and production-ready exact-source verification. No live patient mutation. Baseline:04cb1e8f evidence-only commit, same app as318b81a0. Unchanged twelve known frontend failures explicitly waived, no new failures permitted.

## Gate Status

READY FOR IMPLEMENTATION

## Ownership / policy receipt

Root is sole application writer in C:/Workspace/ClinicOSHouse-worktrees/insulin-online-20261008. Read-only researcher completed; dedicated new independent QA will own evidence writes only after root freezes application inputs. Authorization: latest direct user request, sequential bugs and publish/evidence/closure. Decision: allow scoped frontend changes and synthetic test artifacts; allow authorized commit/push/Vercel release and GitHub proof/verified closure; deny real patient test writes, secret/PHI disclosure, authorization weakening, simultaneous application writers. No claims of ward hardware/clinical validation.
