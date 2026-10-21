# Packet 10 evidence contract

## Scope and source

Source under review is the clean existing worktree `codex/bug-batch-447` at `74b260cdbcf36b1f7395477f4e35d07aba7fcf90`. The follow-up delta is limited to `e2e/import-happy-path.mjs` and its private evidence. It follows the saved empty-allergy summary through the visible `Verifica` action to the real `Allergie e Intolleranze` dialog after reload, then checks the persisted selected radio and exact semantic hint on desktop and tablet. No application source changed for this delta.

## Original issue acceptance

The original seven issue criteria (#447, #451, #452, #453, #454, #456, #457) retain their independent QA4 `PASS_SCENARIO` evidence: 17 canonical receipts total, DB33 PASS33/33, and build pass. Exact per-issue counts and source identity are in `prior-packet9-report.json`, `prior-packet9-evidence-index.json`, `provenance/qa4-canonical-seven-receipt-summary.json`, and the copied QA4 report. These seven scenarios were retained, not rerun by follow-up 10.

The eighth issue in packet 9, #486, preserves QA4's aggregate failure and actual Milo route failure. QA5's fresh scoped regression corrected the missing `doseMode: fixed` binding and passed 11 affected assistant HTTP cases, three actual Milo/route cases, the recorded matrix (8 criteria), and recorded lifecycle (6 criteria). The original QA4 failed verdict and QA5 attempts 1–4 remain immutable and disclosed. Follow-up 10 does not recast historical failures as passes.

## New follow-up 10 result

One independent browser invocation passed desktop and tablet (2/2, zero failed or skipped). Both viewports verified the persisted summary, the real allergy dialog, the selected radio and exact status hint after reload, API persistence, zero relevant HTTP failures, and zero browser console errors. Migrations and synthetic seed passed; four document jobs reached the local mock runtime. The acceptance details are in `provenance/FOLLOWUP10-REPORT.json`; selected summary/dialog screenshots are in `evidence/import-followup/`. Two private traces and remaining screenshots are kept at the original sealed QA location and referenced by the copied seal only.

The author report is supplemental: syntax passed; the pure unit test reported 2 passed and 1 stale `accept-demographics` assertion failure, which was already absent in the pre-edit source. This is not represented as an all-green author unit run. Independent runtime evidence is from attempt-006.

## Boundaries and remaining gates

This evidence packet supports review of the recorded acceptance only. It is not self-certification, PR approval, merge, deployment, or issue closure. Parent #483 writer-fix integration, current native gates and exact-source Claude review are pending. Also disclosed as unrun: unchanged broad frontend/backend suites, native release checks, the author-reported pure journey unit rerun (2/3), and provider/external actions. Packet 9 separately records its previously unrun supplemental checks; see its exact copied report and acceptance index.

No raw trace, SQL, runtime log, credential value, or provider response is included. New screenshots show synthetic fixtures.
