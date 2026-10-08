# Task Contract: #405 appointment form associated accessible names

## Impact Classification

Small frontend semantics-only correction in shared appointment form, plus regression/QA evidence. No API/backend/schema/capability/style/dose changes. Synthetic test data only; preserve existing save behavior, Escape, focus trap and trigger restoration.

## Current Behaviour

Date/time/duration/type/priority/operator/room/state/notes visually labelled but labels lack htmlFor/id. Patient is already associated. Constant title/patient IDs are not safe for simultaneous instances. Existing save errors are alert text without dialog/control description association.

## Expected Behaviour

Stable per-instance React useId prefix; associate every visible input label to its control and align accessible/visible names. Preserve patient combobox associations/help and unique dialog heading. General save error is announced and linked to dialog/save control without marking unrelated fields clinically invalid.

## Acceptance Criteria

1. AC1: All dialog fields have unique accessible names matching visible labels and unique associated IDs, including patient, room and notes. Multiple form instances do not collide. No change to field values/payload/permission.
2. AC2: Clicking each visible label focuses the corresponding native input/select/textarea; keyboard order/focus trap remain coherent on desktop/mobile and edit/create variants.
3. AC3: Tab order and error announcements must be verified with a REAL screen reader as original issue explicitly requires. Browser accessible-tree/DOM automation is partial evidence only, not a substitute. Current native computer APIs are disabled; NVDA not found at standard paths and Narrator not running. Record this criterion UNVERIFIED unless actual AT evidence arrives; no unconditional release or closure allowed under a blocked independent QA gate.
4. AC4: Escape and close/cancel restore focus to originating calendar slot, already working in audit. Existing saving non-dismissible behavior preserved.

## Test Plan

Render/source tests for all labels/id uniqueness across instances, described error connections and preserved callbacks/dialog behavior. Types/build/full frontend baseline1175 total1163 pass12 unchanged failures, zero new. Fresh dedicated independent QA uses actual SPA local guarded synthetic APIs for create/edit DOM names, native label click/focus, desktop/mobile keyboard/Escape/return, deliberate mocked save conflict/error/retry without real writes. Record actual reader requirement as external acceptance limitation, not falsely PASS.

## Evidence Plan

Root sole application writer; freeze commit before new independent QA evidence handoff. Keep synthetic screenshots/trace/video/HTML/JSON/source hashes and sanitized logs. Root reruns automated gate. If real reader AC3 remains unavailable, preserve candidate/evidence locally, post honest issue status/test instructions and leave GitHub OPEN; do not push candidate to production under BLOCKED gate. Request missing human AT evidence/direction rather than fabricate completion.

## Gate Status

READY FOR IMPLEMENTATION

## Ownership / Policy Decision

Allow scoped semantics/tests/local candidate commit and authorized issue evidence/status comments. Publishing requires all applicable QA criteria, including genuine reader evidence. Deny pretending Playwright is a real screen reader, secret/PHI publication, real patient writes, unauthorized native-control fallback or another writer in this worktree. Preserve unrelated dirty files.
