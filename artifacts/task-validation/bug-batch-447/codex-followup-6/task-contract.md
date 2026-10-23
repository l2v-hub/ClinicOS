# Task Contract

## Impact Classification
Existing end-to-end journey adaptation to the explicit empty-allergy summary/editor UX accepted in issue451. Test-only. No clinical/API/authorization/schema/runtime policy change.

## Current Behaviour
Actual native browser-e2e run39645185680/job119386669520 on 84402577c0ae313e57dcdb22c1a8102ae16d6b46 failed desktop and tablet after API persistence succeeded: saved radio locator allergy-status-paziente_nega or assenti is not visible. PatientDetail now intentionally renders an empty-list summary at data-chart-anchor=allergie and opens AllergiesEditor through its real Modifica action. Intake selection still works and saves exact status. The test assumes the radio editor is always mounted on Clinica and times out. Do not treat API-only success as UI acceptance or blindly rerun unchanged job.

## Expected Behaviour
The existing real journey follows the actual current user flow: assert persisted exact allergy summary in Clinica, open the real allergy management dialog via its rendered action, assert selected exact status and semantic hint after actual reload. Keep original intake, PDF/JPG upload, demographics, explicit therapy acceptance, API persistence and zero-console/HTTP error assertions on both desktop and tablet.

## Acceptance Criteria
- Only e2e/import-happy-path.mjs and new safe evidence packet. Preserve all previous source/proof hash+bytes/inodes before editing, privatize hardlinks if any; no old report or controller counter rewrite.
- Diagnose source against actual PatientDetail summary and existing dialog markup. Use explicit accessible or stable scoped user interaction; never catch-and-ignore a missing summary/editor, bypass assertions, call production implementation helpers as oracle, or change clinical UI merely to satisfy stale locator.
- Assert actual status value/visible label on the inline summary and aria-checked true plus exact saved-state hint in the real dialog. Continue on both existing viewport cases. Real reload boundary retained; no browser route mock for positive persistence, no hidden DOM injection, new sleeps, increased timeouts or error filtering.
- Existing intake/identity/API uniqueness and persistence, empty allergy list contradiction guard, explicit therapy acceptance, handled duplicate-only409 and all other console/HTTP failure assertions remain intact.
- Author syntax and relevant existing pure journey tests only with trusted credential-stripped runner. Independent dedicated QA later executes actual full journey against root-owned isolated runtime and native checks on new publication SHA; no source/self-certified UI proof. New runtime only after root grant, no queued service jobs.
- Preserve actual failed native log and its SHA/job. Keep QA4 original7, QA5 scoped route/Milo and all other acceptance proof with exact source identity; this test-only delta does not reset clinical proof or imply deployment/closure. No Claude label until all6 native app15368 PASS on new live SHA.

## Scope
- e2e/import-happy-path.mjs

## Test Plan
Syntax and existing agent-team/tests/unit/e2e-import-journey.test.mjs via verification runner; actual independent end-to-end desktop/tablet including import, persisted summary/editor after reload, screenshot and no unexpected HTTP/console failures after explicit resource handoff. Do not rerun unchanged whole frontend/backend suites locally.

## Evidence Plan
Private /workspace/.clinicos-cloud/497-browser-author10-20261021. New public artifacts/task-validation/bug-batch-447/codex-followup-6 for contract/analysis/author report/hash metadata only; raw stdout/failed attempts private immutable. Existing QA4/QA5 and packet9 sealed proof unchanged. Root sole Git/GH/canonical/provider writer. No real credentials or patient data.

## Gate Status
READY FOR IMPLEMENTATION after authenticated nine-to-ten implementation extension and reserved nonce/readback; continuation to resolution already user-authorized. Native browser failed honestly, whole release remains PARTIAL.
