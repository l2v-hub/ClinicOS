# Independent QA2 — controller Claude followup 504

Verdict: **READY FOR CODEX QA**. No actionable correctness or security finding was identified in this frozen candidate. This is a local independent validation verdict; it is not a Claude review, hosted activation qualification, merge approval or deployment approval.

Reservation: `5afe07cc-f0c5-498b-99d1-f9d5c8d9605e`. Worktree: `/workspace/clinicos-controller-followup`. Exact base and unchanged worktree HEAD: `26a4137814f47c78d590f1b4dfe928d480e92909`. All eleven reserved source/test SHA-256 hashes match before and after QA, including the new untracked `agent-team/tests/bug-pipeline/checkpoint-recovery.test.mjs`. It must be explicitly included in any subsequent publication. QA1's sealed failed report, original probe and evidence all remain byte-identical.

## Gate phases

| Phase | Result | Evidence |
|---|---|---|
| 0 Contract | PASS | Read frozen task contract, implementation plan, genuine Claude comment 6390967525 / request 310c111d-3c1e-4424-a930-691584bbebde / exact base SHA, QA1 failed report and real Git reproducer, author2 report and source. Independently ran task-contract validator: CONTRACT VALIDO. No live API access was permitted. |
| 1 Diff review | PASS | Reviewed full cumulative six-source-module and four tracked-test diff against exact base, plus complete new untracked real Git test file. No unrelated application, clinical, API, schema, dependency or provider change. git diff --check clean. |
| 2 Build and tests | PASS | Independent Node 22 new recovery 15/15; focused five-module 150/150; full pipeline once: 1553 tests, 1550 passed, 0 failed, 3 Windows skips. Unmodified QA1 probes 3/3; extra QA2 fault probes 6/6. No frontend build needed for the assigned internal controller scope. |
| 3 Feature evidence | PASS | Actual Git commits, registered private worktrees, real checkpoint/capture and restoration, archive checks, source/new-head outcomes, typed filesystem failures and audit-save retries. Internal/no UI scope explicitly directed by assignment overrides the skill's generic QA surface/screenshot rule. No synthetic browser evidence was presented as application validation. |
| 4 Security | PASS | Checklist below; native maintainer and exact consumed capability gates, clean owned-worktree checks, exact journal/history binding, no new automatic model/push path. |
| 5 Report | PASS | This report, result.json, before/after source manifests, original QA1 seal verification, logs, STOP.json and seal.json in private QA2 output. No GitHub attachment or canonical write permitted. |

## Genuine Claude findings and QA1 F1

1. Scope failures: real createWorkspace tests cover out-of-scope edit, implementation symlink and frozen contract edits. Journal and paid attempt settle failed at verify-before with workspace-scope-invalid, are durably saved, and the initial loop starts the next attempt inside its budget. Invalid output has no retained reusable checkpoint; an allowance never makes dirty/out-of-scope output reusable. An exact clean owned source is required before a fresh correction.
2. Unchanged correction HEAD: implementation-revision-unchanged durably settles the paid attempt and journal failed, retains all seven completed stages, and requires explicit audited allowance/resume before a new attempt. The genuine review proposed a completed journal as one possible shape; the failed journal retains the completed stage history and supplies the required settled behavior.
3. Evidence/recovery: empty, oversize, noncontained, invalid-video, evidence-file/intermediate/directory symlinks produce typed workspace-evidence-invalid. Exact authorized settle-implementation consumes the latest running attempt once, preserves previous journal/history and grants no allowance. Missing verifier, mismatched digest/round/binding/history/replay and legacy journal-versus-paid-round ambiguity remain refused.
4. QA1 F1: unchanged historical reproducer still proves that settlement plus allowance cannot use ordinary resume with either old or checkpoint native head. This historical positive bug reproducer passing is not itself evidence of repair. New explicit reconcile-implementation-checkpoint real Git tests prove the repair without removing that refusal.

## Explicit checkpoint reconciliation

The new action requires a settled exact post-checkpoint correction, latest failed paid round, unchanged journal digest, source/checkpoint distinction, completed checkpoint entry, fixed plan/feedback, no active paid/review/final-QA/release work, prior source review, exact clean registered owned branch and direct source parent. The consumed external capability binds action, owner, head, journal/history, round, both SHAs, native observed head and local checkpoint snapshot digest. CLI has no default verifier; free-text maintainer permission alone is refused.

With fresh native remote source HEAD, the checkpoint is retained under the exact recovery archive ref and the clean owned branch is restored with reset --keep to source. Durable audit preserves prior progress, external review, checkpoint proof and native observation. Failed attempt and histories remain. Reconciliation performs no model invocation/push and grants no allowance; explicit resume still needs the separate unused audited allowance, after which a fresh round 5 can execute.

With fresh native checkpoint HEAD, the exact checkpoint is retained/restored, publication is reconciled from the positive native observation, old handoff is retained in audit, and the controller requests review of the new SHA. The tests assert no old-review correction, new model invocation or publication replay. Reviews stay changes-requested until a genuine next review; this native observation never claims Claude approval.

Unknown/missing/unavailable/changed remote, dirty or foreign local worktree, changed digest/round, missing source or checkpoint stage, missing verifier and incorrect capability round/history refuse. Native head is rechecked after authorization and in the save guard. Audit-save failure leaves durable state unadvanced, retains the archived local checkpoint, and supports exact retry; an intervening observed checkpoint publication is also reconciled without replay. An independent QA2 save-guard probe changes the native head only after local source restoration, verifies no audit/state success is recorded, then demonstrates exact retry without allowance/model/push.

## Security checklist

| Check | Result |
|---|---|
| Secrets | PASS — no new credential material in reviewed diff; credential fixtures are synthetic. No environment-secret inspection or logging. |
| PHI | PASS — synthetic code/controller fixtures; no patient data. |
| Logging | PASS — no new clinical/payload logging or debug output in source. |
| Input validation | PASS — bounded round, reason, identity/reference; exact digests and clean owned contained filesystem evidence. |
| AuthZ | PASS — native maintainer authorization plus injected atomically consumed exact external capability; ordinary CLI has no substitute verifier; standalone adapter reconciliation refused. |
| Injection/XSS | PASS — no SQL/HTML changes, fixed Git argument arrays, exact SHA/ref/owned-worktree checks and hooks disabled for recovery mutations. |
| Dependencies | PASS — no package changes, installs, fetches or browser downloads. |
| Config/gates | PASS — source trust, human review, final QA, native-head, review/model budgets, merge and release gates remain in force. |

## Commands, evidence and limits

Node: `/tmp/clinicos-node22-native12/node_modules/node/bin/node`. Test cwd: private `controller-qa2/run`; TMPDIR: private `controller-qa2/tmp`. Logs contain exact TAP counts. Full native bug-pipeline suite was run once independently. All test sessions exited zero. Contract validation and diff-check independently succeeded.

`independent-probes.test.mjs` reuses the new real-Git fixture helper with absolute source imports; its six additional QA2 assertions/fault injections are separate from author assertions. It explicitly tests absent source/checkpoint evidence, missing native head, mismatched capability round/history and changed native head at durable-save guard/retry. Existing author tests provide the other positive and refusal paths. QA1's unchanged probe was executed directly from its frozen location.

No source/old-QA/canonical/API/provider writes occurred. Git mutations were confined to private synthetic local repositories. No source commit, checkout, reset, push, external authorization use or real model call was performed by QA. Windows-only native execution was unavailable (three existing skips). Model/verification success fixtures establish controller behavior, not clinical/UI correctness. No live hosted GitHub/CAS/auth transport was qualified by these fixtures.

Real hosted cloud Max authentication run `40202235777` remains **FAILED** as a separate operational gate. This local result does not waive hosted authentication/native event qualification, genuine next exact-head Claude review, root trust acceptance, protected publication or merge gates. There is no claim of activation, deployment, issue closure or permission to mutate canonical state.
