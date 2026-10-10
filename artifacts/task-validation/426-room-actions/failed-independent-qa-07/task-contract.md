# Task Contract

## Task
- Title: 426 room actions
- Slug: 426-room-actions
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

Original issue426 and comments read as untrusted evidence. Accepted b7 baseline repeats title-only Modifica camera/Elimina camera/Modifica letto without resource context; room panel/bed dialog and delete heading lack complete target. Do not attribute old audit screenshot to current source without reproduction. Root sole writer C:/w-426 assigned before edits, preserving primary/launchers/external-blocked candidates. Other429/303/427/428/423 not in this scope.

## Expected Behaviour

Names/title and editor heading retain the exact captured room number and bed label. Number is schema-unique; bed label unique within room. Trash icon visually distinct from edit, spaced in scoped action group, existing danger variant/ConfirmDialog retained. No API/backend/schema/auth/config/dependency changes. Existing747line parent needs extraction of the room-panel/bed-modal and existing types/display/facility-read helpers to meet500line budget. Extract helpers unchanged in behavior, keep save/delete/single-flight handlers and validation in parent. Bed resource components JSON-quoted/escaped to avoid arbitrary custom separator/quote collisions without API change.

## Acceptance Criteria

- AC1: All accessible names identify exact room/bed uniquely across at least2 synthetic rooms and2 beds (including repeated A labels across rooms); escaped hostile resource text stays text.
- AC2: Native title tooltip and inline room editor/bed dialog/deletion confirmation heading include same captured originalresource. Editing new room number must not change identity of existing resource before save. New camera remains distinct creation heading. Keyboard dialog trapping/Escape/focus return unchanged.
- AC3: Delete uses trash not close/edit icon, existing danger styling with visible spacing from edit; existing irreversible confirmation still required. Cancellation/Escape never DELETE. Synthetic-only guard may test exact mocked delete target after confirmation and busy/error semantics; no live mutation.
- AC4: Verify accessible names/title/headers/actions with actual UI browser at1280x720 and mobile390x844, all clinical/auth/facility mutations intercepted BEFORE wire,0 real mutations. No physical AT/hardware certification claimed.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Focused room action regression TDD and existing bed/assignment bounds/accessibility |
| Integration | yes | Source-bound types/build and full regression exact baseline comparison |
| API | no | |
| Playwright | yes | Real app synthetic room fixtures, exact accessible values/title/headings, distincticons, keyboard/busy/cancel; independent and root identical rerun |
| Persistence after refresh | no | No persisted model changes; labels reloaded from mocked authoritative room data, not DB proof |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | yes | Diff/native scoped scan, secret scan, synthetic data/XSS/auth gate/unchanged API/dependencies, configured credential/ZIP canonical publication scan |

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

Same A labels across rooms must include room number; capture target strings when opening dialog, never derive target from subsequently edited fields. Preserve actual IDs for handlers and canonical controls. Existing RoomsManagement is758lines; limited presentation extraction only. Independent QA owns only isolated artifact scope on immutable candidate; no second app writer. Browser runs serial, no live delete/assign/save. Source app commit, current deployment metadata/statichashes, pinned GitHub synthetic screenshots and actual CIdelta required before closure; no global green/DB/hardware claim. Root release authority directly human-authorized, repository advisory ledger unavailable/OOM not retried or fabricated as release authority.

## Gate Status

READY FOR IMPLEMENTATION
