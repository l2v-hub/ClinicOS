# Task Contract: #406 separate administration route from therapeutic regimen

## Impact Classification

Frontend yes: shared therapy form options/legacy feedback/preview/validation and regression tests. Backend yes: existing shared scalar validator and existing therapy PUT effective-state validation; tests only against synthetic mocked/local DB fixtures. No schema, dependencies, dose calculation, auth capability or deployment-config changes. Root sole application writer in C:/w-406 from origin/main45f3582d; #405 source excluded. Dedicated read-only backend reviewer, then fresh independent QA evidence-only writer after frozen candidate.

## Current Behaviour

Shared VIA_OPTIONS contains al bisogno. Changing this route leaves tipo periodica, so preview presents regimen as route. Backend bounds route text but does not reject scheduling regimens. Previously saved/imported ambiguous route strings must not be silently reassigned to a therapy type or medical route.

## Expected Behaviour

Remove scheduling regimens from route choices. Selecting tipo al_bisogno preserves the actual route. Preview names Via and Tipo terapia separately. Treat existing/imported ambiguous route as an explicit review warning, preserving original value in state/read models until clinician corrects it. No automatic conversion/migration, no invented route/dose/type. Shared backend input guard rejects normalized regimen tokens used as route across all types before persistence; PUT validates merged effective route/type, including omitted route bypass. Preserve non-regimen route aliases/custom routes and existing requiredness/default compatibility. For an ambiguous legacy record, repair requires both explicit nonblank real route and explicit valid therapy type. The sole exception is a raw request containing exactly stato:sospesa or stato:conclusa: persist only that status, without rewriting doseMode/doseProtocol. Reactivation, note-only, schedule-only, type-only, empty and extra-key requests without explicit reviewed repair are rejected. Existing authorization and patient scope still apply.

## Acceptance Criteria

1. AC1: Via choices contain only administration routes, never al bisogno/PRN/periodica/una tantum; unknown ambiguous legacy value is not a selectable regime option. Shared manual/intake/edit forms display review feedback instead of reinterpretation.
2. AC2: Changing tipo Periodica/Al bisogno/Una tantum never changes viaSomministrazione, original schedule draft or original legacy value implicitly. Existing mapper/payload retains chosen real route; PRN has no active scheduled times in preview/payload.
3. AC3: Visible preview exposes Via and Tipo terapia as distinct coherent labelled information, and ambiguous legacy route as Da verificare, not a confirmed administration route. Desktop/mobile names, native labels, keyboard and Escape remain usable. No real-screen-reader criterion is invented for this issue.
4. AC4: Shared backend rejects scheduling-regime routes with TherapyInputError/HTTP400 before any create/update persistence across manual POST/PUT, intake and diary/tool shared writes. Validate actual type allowlist and effective merged updates. Valid route/type combinations and aliases/custom route text remain compatible. Provide an explicit doctor-led review protocol for pre-existing records; no production patient inspection, automatic data conversion or migration. Preserve status-only suspension/conclusion safety if needed; tests must cover exact exception and reject reactivation/bypass.

## Test Plan

TDD regression: all supported route/type combinations preserve values, regimen token variants including case/separators are rejected, null/omitted/length/type compatibility, merged legacy update and suspension/conclusion safety, frontend legacy review/nonselectable option/error/preview, PRN mapper no schedule. API route tests with synthetic transaction spies (zero write on400), intake preflight and existing therapy authorization regressions. Existing local isolated synthetic DB integration tests if available to prove rejected persistence and explicit reviewed update; never use real patients. Frontend TypeScript/build/focused/full baseline1175total1163PASS12unchanged failures zeroNEW; backend types/build/scoped tests plus applicable regression baseline. Actual SPA guarded synthetic APIs for physician create/edit/legacy review, PRN-via preservation, preview, simulated save/reload, negative/role-denied controls, desktop/mobile. Real DB proof distinguished from browser mock proof.

## Evidence Plan

Before source changes validate this contract. Capture issue-source, read-only analysis, source-bound baseline, fresh independent QA report and receipts, native browser assertions, result screenshots, trace/video/HTML/JSON and sanitized test/build/security logs. Root reruns gates. Publish only after acceptance and independent QA pass: explicit path commits, authorized push, exact-source Vercel and backend pipeline verification, pinned screenshot GitHub comment. Keep issue open until deployment verified; no guessed READY/check-box claims. Old #405 remains separately blocked; no inclusion in #406 release. One writer/one browser lane, release all owned processes at handoff. Use source/ADR recall fallback because prior AgentDB Windows memory CLI OOM is documented; do not repeat the known unsafe scan.

## Gate Status

READY FOR IMPLEMENTATION

## Policy / Ownership Receipt

Allow scoped source/tests, isolated worktree/dependency reuse, synthetic local test writes, GitHub processing/evidence comments and verified commit/push/deploy as explicitly authorized by user. Deny clinical conversion/automatic migration, real patient test writes, secrets/PHI publication, destructive cleanup and shared checkout writers. No registered guidance_brain tool; Ruflo records coordination and never replaces code/QA. Root integrates shared backend/frontend changes; read-only agent may not write. Refinements to legacy exception must be recorded before source edits if materially changing this contract.
