# Task Contract — PR483 / original batch432 / continuation6

Status: finalized root contract. Author must verify the durable round6 reservation readback before product/test/harness edits or runtime execution. This file alone creates no controller transition.

## Provenance and preserved history

- Refined read-only analysis: `/workspace/.clinicos-cloud/pr483-codex-followup2-20261018/analysis.md`; SHA256 `0ab00a8b521d77077c3141f258e6e3ab37c3e440701d82d39d1f79cf359b2b11`.
- Original worktree: `/workspace/ClinicOS/agent-team/.worktrees/bug-batch-432`.
- Candidate5 source commit: `2c8a4b2b91fcda5e527b323031992a757e47fe90`.
- Preserved candidate5 proof commit/boundary: `c212e3141b6c7fdd88b4b1a4eaef73e5616a04f7`.
- Parent source/config/test input manifest: `parent-input-manifest.json SHA256 e3fd1ec6f3420b3d811d1712e1e60a7a05e0ff85342188a22a0e4f88a16fe08e`.
- Parent prior-proof manifest including the newly preserved79 QA5 files and original7,119 proof files: `parent-proof-manifest.json SHA256 26580ab64ccf5796ce2878034798732861eb2ac2c307b7f8e66ffe530ecdbb59`.
- Candidate5 changed-source digest before preservation commit: `333b7c06f4d16e1ba54f857f594093008758e2a2165c3962a623e82f9d6a57f0`. The new parent commit SHA is deliberately not inferred from that content digest.
- QA5 is FAILED. Sealed proof: `/workspace/.clinicos-cloud/pr483-followup-independent-qa-20261018/publication/final-seal.json`; SHA256 verified read-only as `6a479c192cc0c64ca37e9c5d1e2fdc84660a5e0721ef27637b6182c2db3c5d08`. Preserve the seal and its original fields verbatim; committing the preserved bytes does not authorize rewriting its recorded source identity.
- Round6 durable reservation path/nonce: `/workspace/.clinicos-cloud/codex-after-claude-20261018/483-round6-reservation.json nonce f4d74317-96d1-4111-a80d-a7ec1acde163; must read back before author starts`.
- Final contract validation identity: `Exact finalized contract SHA256 recorded in durable reservation and root receipt after validator execution; not self-referential.`.

The user already authorized continuing beyond four review cycles while retaining all history. This is continuation6 on the same original entity, not a new batch or a counter reset. Root owns state, reservation, commits, GitHub, publication and release. All earlier outcomes and failures, including global FAILED QA5, remain recorded.

## Current Behaviour

## Expected Behaviour

Actual App renders both Agenda components without a therapy verification feed; optional component props hide this omission from compilation. Loading is restricted to Terapia, and Agenda has no initial-day therapy request. Actual independent browser QA found no ambiguous prescriptions on OperatorAgenda despite valid underlying read models. Round6 makes only authorized, read-only verification groups reachable on both actual Agenda routes, tied to the selected day and current scope.

Preserve UX447: do not reintroduce timed therapy cards, timed overlays/modals, administration buttons, or administration callbacks into the actual Agenda. App must project only `TherapyVerificationGroup[]`. Existing legacy optional timed props and their currently unwired behavior remain unchanged.

## Exact application/test scope

Production — exactly these four paths:

1. `frontend/src/App.tsx`.
2. `frontend/src/components/operator/OperatorAgenda.tsx`.
3. `frontend/src/components/admin/AdminAgenda.tsx`.
4. NEW `frontend/src/components/shared/AgendaTherapyVerification.tsx`.

Tests — exactly these two paths:

5. NEW `frontend/src/components/shared/__tests__/agendaTherapyVerification.test.ts`.
6. `frontend/src/lib/__tests__/therapyNavigationGuard.test.ts`.

New packet only: `artifacts/task-validation/bug-batch-432/codex-followup-2/` may contain this finalized contract, plan, source/proof manifests, reports, NEW `agenda-verification-browser.mjs`, NEW `run-author.mjs`, and explicitly fresh nested run outputs. New external owned scratch/runtime/evidence paths must be versioned and recorded. Do not edit or execute against writable outputs in any earlier packet or sealed QA directory.

No edits to backend, Prisma schema/client, dependencies/lockfiles, wire DTO representation, policy/#486, `frontend/src/types.ts`, existing TherapySlotModal/TherapyVerificationPanel, existing therapyAgendaDateGuard test, `backend/src/skills/http.ts`, UX447/481 or unrelated worktrees. If an unlisted source edit becomes necessary, notify root before editing that path; do not broaden scope silently.

## Implementation constraints

- Supply a REQUIRED typed verification-feed prop at both actual App call sites. It carries only verification groups, accepted date/scope identity, expected scope, first-page and append states, exact page metadata and stable day-bound callbacks. No empty fallback may substitute for missing wiring.
- Reuse App's bounded paginated loader, strict parser, roster assertion/recovery, merge, abort, sequence and session-epoch guards. No duplicate fetch in Agenda, unbounded request, new backend endpoint or second clinical-data cache/controller.
- Track accepted first-page date/scope explicitly and atomically with acceptance; requested date alone and inspecting a verification group's date do not establish ownership of a scheduled-only/empty response. Scope includes current session identity/epoch, roster request identity and policy version when available. Append requires the same accepted date/scope and active cursor.
- The small shared block owns the day request effect on initial mount, selected date, day re-entry, return/reload and current scope. Use stable callbacks and cleanup/request generation to ignore old pending completions. Preserve existing selected-day conventions and Terapia stale-while-revalidate behavior.
- Render verification only for an accepted selected-day/current-scope snapshot with appropriate read permission and no blocking first-page error/loading. Gate during render before the new-date effect. Accepted empty, pending, failed and denied are distinct states. Same-key refresh must be honestly indicated.
- Week/month show no single-day verification list or continuation. Existing appointment data, date/view/creation behavior and operator/status filters remain independent. Appointment permission/filtering does not establish patient ACL or therapy-read scope.
- First-page error/retry and append partial/error/retry are explicit. Append error preserves accepted authorized same-day rows/exact totals; duplicate append is disabled; new day/scope cannot reuse the old cursor. No false-zero/all-clear, stale-name leakage, fabricated clock/band/dose/quantity or action key.

## Acceptance Criteria

AC1 — Reachability and regression guard: cold authenticated actual `#/agenda-operatore` and `#/agenda-admin`, without visiting Terapia, request the bounded exact selected day and display real authorized verification details/count. Reload works. Omitting the required App feed prop fails type checking.

AC2 — UX447 boundary: both actual Agenda DOMs receive only verification projection. Valid scheduled prescriptions do not produce timed therapy cards, overlays, modals or administration controls; no Agenda administration POST or new callbacks. Verification remains read-only with null time/band/dose/quantity and no administration key.

AC3 — Date/scope lifecycle: next/previous/today, week/month/day selection, Terapia-to-Agenda, back/return and reload show only selected-day/current-scope verification. A held dayA response resolving after dayB, or held append resolving after date/scope change, never replacesB or merges old data/cursor. Week/month have no single-day verification controls.

AC4 — Honest errors, partial data and ACL: initial failure/403/denied read shows an explicit unavailable/error state while appointments remain usable; no successful-empty fallback or old names. Retry uses selected day. With at least105 eligible candidates and verification beyond page1, total stays exact, partial details and continuation are truthful, append failure retains safe accepted data, retry progresses and every verification item appears once. Roster/context recovery and logout/login reject stale scope/session responses; existing backend ACL remains authoritative.

AC5 — Regression and actual validation: fresh frontend type/build/full suite plus actual-App positive and negative browser coverage with real owned backend/DB SQL assertions. Preserve all seven original issue behaviors and both clinical findings; no weakening/removal of negative assertions. A fresh independent QA6 session evaluates the final candidate.

AC6 — Provenance and history: exact changed-source/config/test manifests, source before/after, fresh proof and per-AC/issue mapping. Parent source/proof and every prior failed outcome remain byte-identical. No backend/schema changes. Global QA5 stays FAILED even when an unchanged successful backend phase is explicitly inherited.

## Source hardlinks and execution safety

QA/source snapshots may hardlink the same source files. Before any authorized edit, identify hardlinked target files and materialize a private same-byte inode using copy-to-temporary plus atomic replacement, preserving mode and verifying hashes before/after. Never edit/format a shared inode in place. This includes App, both existing Agendas and the existing test file. Verify linked QA snapshots, parent manifests and all prior proof remain unchanged. Copy-before-edit is a prerequisite, not permission to change scope.

Before live work, root coordinates `/tmp/clinicos-browser-qa.lock` over the entire owned snapshot/DB/services/browser/teardown lifecycle and disk headroom. Refuse occupied ports or mismatched ownership. Use existing pinned trusted runtime/dependencies; no installs, shared Prisma generation, provider/production calls or baseline-container changes. Preserve failed invocations separately and clean only owned disposable runtime. Do not claim DB-container restart/disk durability from tmpfs-based validation.

## Test Plan — validation and permitted inheritance

Fresh independent QA6 must execute the full frontend suite/build/types and real actual-App Agenda browser/SQL coverage on final source; old frontend/browser results cannot certify this integration fix. Re-run appropriate original seven-issue clinical/browser regressions in fresh outputs.

ONLY the prior successful backend phase (1,932 PASS and five unchanged opt-in skips) may be inherited, and only after complete backend test-input identity is proved and recorded: backend source/tests/config, Prisma schema/client identity, root manifests/lockfiles, runner/build scripts, fixtures/catalog/assets and frontend modules imported/read by backend tests. Known cross-boundary inputs include therapyAdministrationWrite and assessment frontend modules. A shallow “no backend diff” check is insufficient. Runtime/dependency provenance must be compatible and explicit. If that closure cannot be established or any relevant input changed, run the backend suite again. Label inheritance `executedHere:false` with exact originating phase/manifest/log hashes; do not turn skipped tests into passes or inherit the overall FAILED QA5 verdict.

## Evidence Plan — evidence and handoff

Record positive real-route screenshots/trace/video and actual request/SQL assertions for both roles, selected-day behavior and UX447 absence of timed Agenda UI. Lifecycle negatives may use owned synthetic request delays/errors with the interception/provenance disclosed; positive visibility/ACL uses real backend/DB fixtures. No real patient/provider data. Decode images/video, CRC-check every ZIP member, scan artifacts and keep each public file at most25MiB.

Author stops product/test/harness edits at handoff, gives exact source/config/test digest, per-AC/seven-issue mapping, actual phase results and limitations. Author cannot self-certify independent QA. Pending commits, publication, exact-source review and release are root-owned. Implementation starts only after the explicit durable root reservation gate is satisfied.

## Impact Classification

Frontend/UI, read-only clinical visibility, authorization/scope lifecycle and synthetic evidence are impacted. Backend/schema/data-write semantics/dependencies are unchanged.

## Gate Status

READY FOR IMPLEMENTATION only after the matching round6 reservation is persisted and read back. Independent validation and release remain pending.
