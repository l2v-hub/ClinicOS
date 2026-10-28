# Task Validation Report — implementation cycle 2

Status: IMPLEMENTED_NOT_VERIFIED. Local acceptance passes; fresh independent QA, final main reconciliation, Claude review and release gates remain required. No issue is ready for closure.

Group: #447, #451, #452, #453, #454, #456, #457. Branch/worktree: codex/bug-batch-447. Original baseline a516d42e31f6674c39c1d130c9706cd80a7ab4c6; combined local dependency D65e902f40026ec8e2cf3e8b385cb1de0cc269f7b includes therapy432 candidate3 and intake450 checkpoint. Current integration HEAD2912d4d09861d46fce75f8d213732c467c095c12. Scope92 through amendment12;20 immutable document hashes verified. Implementation2/4, reviews0/4; root owns budgets and all Git/GitHub/release actions.

## Final local acceptance

All seven real synthetic PostgreSQL/HTTP/Playwright scenarios pass on unchanged source. Fingerprint: `deccb111eec6d4d4d7658acfd478abd573791b3e741b0c510821cfce14464aad`; before equals after. No residual clinical-policy gate remains. Both user decisions are implemented and exercised; unknown clinical information is never treated as verified absence.

| Issue | Actual acceptance exercised | Evidence |
|---|---|---|
|447|Eight chart sections begin at y131–157 at1180×820/scroll0; complete severe allergy names, risks,44px controls and identity remain visible. Today dose/diary writes persist after reload.|evidence/issue-447.png; named trace/video; geometry/value receipts in results.json|
|451|Verified save advances to the correct patient;400/503 failures preserve position and identical retry. Actual51-patient pagination crosses25/25/1 while49 prior completions remain unchanged; keyboard/touch states checked.|evidence/issue-451.png; touch trace/video; saved DB values and pagination receipts|
|452|Bed-first compact lists, one loaded-population completion disclosure, responsive layouts, real08/20 doses despite zero appointments, exact-patient agenda action/reload/error retry. NEWS2 complete result beyond50 partial records survives a separate503; aggregate unknown and real recovery verified.|evidence/issue-452.png; empty-agenda-pending/news2-partial-failure PNGs; trace/video|
|453|Ordinary known-negative package prescription uses4 interactions. Explicit allergy warning/ack invalidates on patient/product/form/strength/allergy/reload changes; actual local allergy edit preserves draft. Fresh external change prevents premature POST; unknown/error stays honest; committed503 retry creates once with unchanged payload.|evidence/issue-453.png; trace/video and exact schedule/payload receipts|
|454|Current-facility-time Giro entry, compact controls, actual administration/reload and first occupied day-calendar scroll verified.|evidence/issue-454.png; trace/video|
|456|Unified urgent diary/handover acknowledgements, real current shift, occupancy and exact destinations; future items excluded and source failure remains unknown.|evidence/issue-456.png; trace/video|
|457|Print creates zero exits. Explicit pause/continue, real server exit/return history, uncertain identical retry, patient-switch isolation, unauthorized/tamper denial, scheduled/PRN hold, valid prior receipts, explicit absence, next-day return and no reopening given doses all verified. Agenda disables only held patient administration.|evidence/issue-457.png; paused PNG, actual PDF, trace/video|

## Checks

- Frontend complete final suite:1474 PASS,0 failures,0 skips. Production TypeScript/build PASS742 modules,35.64s. Secret scan PASS,0 findings.
- Backend complete integrated suite:1939 PASS,0 failures,5 existing opt-in skips (1944 total). Four skipped428 cases require its dedicated physical synthetic cluster; archive persistence opt-in requires its separate named database. No scoped447 test is skipped. Backend TypeScript/build PASS.
- PS tests:6/6 PASS, including actual scheduled/PRN lock interleavings with initially absent/present charts, two observed queued writers, zero doses after committed pause, explicit absence and duplicate exit retry invariants.
- Downstream intake integration:all19 original browser/SQL checks PASS, errors=[], actual source/identity/draft persistence and disclosure navigation. Results under intake-regression; original450 packet/worktree untouched. Only the external extraction provider and official font distribution are declared fixtures; clinical app/API/DB are real.
- Native PostgreSQL16 adapter:parent database0 tables before/after, own child removed only after ownership-marker verification, own container/services stopped. Full backend ran on a separate fresh owned child; receipts distinguish the two runs.
- All publishable ZIPs pass CRC and contain zero signed simulator tokens. Offline redaction preserves schemas/resources and records before/after hashes. Official7WOFF2 plus OFL licenses are portable and verified; no empty font substitute. Raw issue/comment bodies are not copied into this packet.
- Exactly9 legacy generated backend artifacts restored from byte-verified clean Git baseline after preserving before/after bytes;16 new test-generated files preserved privately then removed individually. Outside the92-source scope and owned packet, Git status is clean. No checkout/reset/clean used.
- Task contract validation, JavaScript syntax and git diff --check PASS. Historical failed preflights remain under history with their real failed results; none is represented as a pass.

Current source/plan inventories: current-source-inventory-cycle-2.json, current-approved-plan-cycle-2-final.json, current-contract-hashes-cycle-2-final.json. Machine acceptance receipt: test-results/final-acceptance-receipt.json. Final privacy receipt: trace-privacy/packet-audit-cycle-2-final.json. Full raw test outputs are in test-results; all data are synthetic.

## Remaining gates

1. Root checkpoint exact92-source candidate and helper; integrate trusted operational main/GD with explicit immutable addendum. Reconcile actual reviewed432/450 main contents before the final UX gate.
2. Obtain fresh independent QA against that exact source. Preliminary QA1 is historical; these implementation tests do not replace independent review.
3. Root-controlled Claude PR review, required CI checks, release/deployment and deployed acceptance remain mandatory. No merge, push, issue closure or production write is performed by this execution agent.
