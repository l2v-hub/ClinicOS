# Task Contract

## Impact Classification
Milo prescription confirmation compatibility at existing high-risk payload boundary; preserve authorization, exact-preview and clinical dose/route safeguards. No UI/schema/policy changes.

## Current Behaviour
QA4 actual browser on8a27ef372807a68f464c3ebcfa85ca85b2da5344: canonical7/build/DB33 and seven486 subpaths PASS, but actual full-screen Milo returns preview_mismatch for valid mapper-produced oral prescription. Actual trace attempt12 includes doseMode:'fixed'; BINDABLE_THERAPY_KEYS omits it, so bindableTherapy rejects before matching. Root independently decoded response: therapyDraft.preview has direct row and intent, NOT an extra wrapper. QA4 report initially misdiagnosed wrapper; preserve original sealed report and record correction addendum instead of changing it. No therapy/diary persisted in failure. Recorded Agenda/lifecycle remains UNRUN.

## Expected Behaviour
Accept existing classic mapper fixed-dose discriminator for the normal supported assistant prescription, preserving omission compatibility and rejecting unsupported dose modes/hidden fields. The valid explicit-route draft can attach, display exact new preview, and save only after genuine explicit confirmation.

## Acceptance Criteria
- Minimal bindableTherapy allowlist addition for doseMode; when present accept ONLY literal fixed, reject glucose_scale, unknown/null/object/empty modes. Omitted legacy mode remains unchanged. Do not normalize or strip unsafe fields silently. No unrequested glucose-regimen support or inferred route; explicit OS to orale mapping/operator policy unchanged.
- Preserve all current hidden-field, state, package, prescriber, oneoff, exact drug/times/start, preview ID, stale workflow, confirmation, actor/scope and authorization guards. Do NOT unwrap the already-flat correct preview, weaken therapyMatchesDraft or bypass bindable validation.
- Existing unit regression uses the actual captured mapper-shaped fixed payload, verifies acceptance and unsupported modes rejection, retains all old negative assertions. Existing assistant HTTP end-to-end positive fixture includes actual doseMode fixed; tampered drug, hidden keys, changed payload/new preview/confirm/no-write-before-confirm remain asserted. No simplistic source-text mirrored test or broad test deletions.
- Only three scoped files plus NEW safe packet. Snapshot originals/old proof/QA4 report+STOP before edit; privatize hardlinks and preserve all prior failures. Root sole actual Git/GH/state/provider writer. Author readonly actual Git and credential-stripped pure unit/type checks; NO DB/API/browser until parentQA8 owned resources hand back and root grants a fresh independent phase.
- Author STOP then independent actual browser Milo explicit route/preview/confirm/SQL/reload and missing-route no-confirm/no-write; run affected real HTTP file on owned DB once available plus remaining recorded matrix. Retain unaffected previous PASS only with documented exact relevant production/input identity, never call partial evidence all8PASS.

## Scope
- backend/src/skills/engine.ts
- backend/src/skills/__tests__/skills-unit.test.ts
- backend/src/skills/__tests__/assistant-e2e.test.ts

## Test Plan
Fresh existing pure skills unit file and backend types through trusted verification runner. No full1900/1500 reruns for isolated payload allowlist; DB/browser/HTTP tests prepared but explicitly UNRUN during author phase. Actual real caller regression must fail old source and pass final independent runtime. Later actual Claude, native6, final Codex and exact deploy proof remain required.

## Evidence Plan
Private /workspace/.clinicos-cloud/ux447-milo-author9-20261019; NEW safe public artifacts/task-validation/bug-batch-447/codex-followup-5. QA4 actual trace is private readonly; safe decoded key-only proof and root cause addendum can be new, never rewrite sealed erroneous diagnosis. Store every attempt/exit status, source hashes/inodes and old proofs. No ignored raw force additions, no PHI/credentials.

## Gate Status
READY FOR IMPLEMENTATION after authenticated user-session eight-to-nine allowance, canonical nonce/readback. User already authorized continue until resolution and history conservation. ParentQA8 is sole clinical owner; source author must not start services or access provider. No issue closure from this fix alone.
