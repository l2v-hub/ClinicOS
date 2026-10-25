# Independent QA — controller Claude followup 504

Verdict: **FAILED VALIDATION**. Frozen candidate 1 is not ready for Codex QA because the new recovery does not complete a documented capture-failure recovery path. No source, contract, canonical ledger, capability, GitHub, or provider was changed by this QA. Git operations were restricted to private synthetic test repositories.

Reservation: `80644daf-045d-4c21-ae12-170af552b2c8`. Base: `26a4137814f47c78d590f1b4dfe928d480e92909`. All ten source/test hashes matched the reservation before and after QA.

## Phase results

| Phase | Result | Evidence |
|---|---|---|
| 0 Contract | PASS | Read task-contract.md and genuine Claude report 6390967525 / request 310c111d-3c1e-4424-a930-691584bbebde / exact base SHA; contract validator independently returned CONTRACT VALIDO. No live API read was permitted. |
| 1 Diff review | FAIL | F1 below; full ten-file implementation/test diff reviewed. |
| 2 Build and tests | PASS | Node 22 focused 135/135; full pipeline 1538 tests, 1535 pass, 0 fail, 3 Windows skips; independent probes 3/3 including one positive bug reproducer. git diff --check clean. No application code touched; frontend build not required by this internal contract. |
| 3 Feature evidence | PASS | Internal/no UI per task contract and assignment; real Git/filesystem tests and logs. No fake screenshot, video, or UI surface produced. The explicit assignment overrides qa-gate's generic screenshot instruction for internal changes. |
| 4 Security | PASS | See checklist below. No detected security bypass. F1 is an incomplete recovery path, not justification for bypassing publication checks. |
| 5 Verdict and report | PASS | This report, result.json, STOP.json, seal.json and before/after manifests. No external attachment permitted in this read-only assignment. |

## F1 — Medium — post-checkpoint capture failure remains permanently blocked after settlement

Locations: `agent-team/src/bug-pipeline/workspace.mjs:83` and `:677`; `agent-team/src/bug-pipeline/operator-authorization.mjs:205`; `agent-team/src/bug-pipeline/comment-review-handoff.mjs:862` and `:887`.

Real call chain: actual createWorkspace with a registered private Git worktree -> actual runImplementationStages -> actual Git checkpoint commit -> injected transient Git worktree-list failure in the actual captureCheckpoint -> actual handoff recover(settle-implementation) -> actual extendBudget -> actual recover(resume). Only GitHub transport/state persistence/authorization provenance were synthetic in-memory fixtures; no actual capability was used. Verification/model success fixtures do not assert application behavior.

The commit advances batch.sha. Progress retains the original sourceSha and becomes running with next=6; the outer caller may persist this ambiguous journal as blocked. Exact settlement succeeds, sets journal and latest attempt failed, removes the checkpoint, and preserves history. An independently bound one-unit allowance succeeds (limit=5). Resume still rejects with `Resume requires transient recovery or unused audited correction and review allowances`: the new settlement code is not a transient failure, knownFailedCorrection requires sourceSha === batch.sha, and the old negative review concerns the original SHA. The reproducer tried fresh authoritative remote observations at both the original source head and the new checkpoint head; neither yields a supported route. Paid model count remains 1 and publish count remains 0.

This is not an introduced change to the existing sourceSha guard. It is an incomplete new recovery mechanism for the documented capture-failure class in genuine finding 3. Deleting the guard or blindly replaying publish/model would be unsafe. A repair needs an explicitly authorized, exact journal/attempt/history-bound reconciliation of source SHA, local checkpoint SHA/output, and freshly observed native remote head, with clear branches for definite unpublished, definitely published, and unknown publication outcomes. Unknown publication must remain blocked pending authoritative observation; no extra model allowance, history reset, implicit approval, or blind republish is acceptable.

Reproducer: `independent-probes.test.mjs`, third test. Output: `independent-probes.log`. This is a positive reproducer whose assertions intentionally demonstrate the refusal; its passing test status is not a passing product result.

## Confirmed repairs and retained boundaries

- Real createWorkspace initial-loop tests independently passed for out-of-scope edits, implementation symlinks, and frozen contracts: failed verify-before with workspace-scope-invalid, failed paid attempt, durable save, next attempt inside native budget, no retained invalid checkpoint.
- Invalid correction output cannot be reused. An audited allowance alone does not make it reusable; clean exact owned restoration is required.
- Unchanged correction HEAD durably fails the attempt with implementation-revision-unchanged and retains seven completed stages. The implementation marks overall progress failed rather than completed; this preserves the completed-stage journal and enables the intended audited retry accounting.
- Empty, oversized, noncontained, invalid-video, evidence-file and directory symlink errors are typed workspace-evidence-invalid. An extra independent test rejects a contained intermediate symlink too.
- Pre-checkpoint exact running journals settle once with the trusted injected verifier; missing verifier, changed digest/round/history/binding and replay are refused; no history reset or allowance increase.
- Legacy progress.round differing from the latest paid attempt is intentionally refused before authorization. An independent probe confirms no mutation or verifier invocation. Existing source already retained ambiguous running work and required explicit recovery; this refusal does not newly break a previously supported legacy settlement. It remains a declared unsupported case, not inferred authorization.
- Source trust, human review, native-head checks, merge reservations, release gates, review-round accounting, and default inference budgets were not weakened in the reviewed diff. Existing review round 2 remains changes-requested; no genuine next review was performed here.

## Security checklist

Secrets PASS: no new secret/token/connection-string material in the diff or QA logs; existing synthetic credential fixtures remain synthetic. PHI PASS: fixtures are synthetic controller/code state, no clinical data. Logging PASS: no new payload logging in source. Input validation PASS: bounded safe integer attempt round, exact digest/history binding, bounded actor/reason/reference, contained files and bounded evidence. AuthZ PASS: native maintainer check plus injected consumed exact capability required, CLI supplies no default verifier; standalone adapter settlement refused. Injection/XSS PASS: no SQL/HTML changes, no new dynamic command execution. Dependencies PASS: no package changes or installs. Config PASS: no weakened environment/auth/CORS/production gates.

## Independent commands and limits

Node: `/tmp/clinicos-node22-native12/node_modules/node/bin/node`.

- `node --test <absolute paths to workspace, external-review, operator-authorization, comment-review-handoff tests>`: 135 passed, 0 failed; focused-tests.log.
- `node --test /workspace/clinicos-controller-followup/agent-team/tests/bug-pipeline/*.test.mjs`: 1538 tests, 1535 passed, 0 failed, 3 Windows skips, exit 0; pipeline-suite.log. Run once independently.
- `node --test independent-probes.test.mjs`: 3 positive probes passed; independent-probes.log.
- `git diff --check <base>` clean; task-contract validator valid.

Test cwd and TMPDIR were private QA1 paths. No installs, browser downloads, full fetch, whole artifact copy, application provider call, actual authorization consumption, or live GitHub/state operation occurred. No frontend/UI/API/schema/clinical change was in scope. Native Windows execution was not available.

Hosted qualification, actual authentication/native event activation, root acceptance of trusted transport, and exact-head receipts remain external operational gates. They were not qualified here and do not explain or waive F1. This report does not claim activation, approval, merge, deployment, issue closure, or authorization to mutate canonical state.
