# Complete exact demo release flow — author report

Author implementation only; independent QA and protected-main operations remain separate. No GitHub publication, provider request, provider mutation, deployment, database access, install, credential-file read, or live UI run was performed by this author.

## Authorized source

Isolated worktree `/workspace/clinicos-release-integration`, root-created branch `codex/complete-demo-release-flow`, base `b07317f4d7eee2bd873ff465d0df317459fcde28`. Original reservation nonce `1afdf870-9367-46aa-90bf-dc054d3eeb45`; original canonical reservation `d9f07042d1a921c548c6f8fc50e09002108d25f6`. Root approved the correlation amendment before the extra exact-workflow edit; amendment canonical `7fff22625148436fb6e35aefcfd9a2409d920f32`, amendment nonce `36ebb206-d7fc-4cf2-b312-2e4170db2ba6`. Eleven authorized paths are enumerated in `diff-manifest.json`.

The cloud onboarding setup skill and its onboarding reference were read through the skill provider, and saved verbatim as `setup-skill.md` and `setup-onboarding-reference.md` for root review. Existing installed dependencies sufficed; no environment configuration draft or install was needed. The explicit authorized coding contract governs these source edits.

## Resulting behavior

- Source policy is a strict enum. Omitted policy retains `main-trigger-v1`; the protected-main release workflow explicitly selects `native-exact-commit-v1`. Unknown values fail before state loading or mutation. Selected policy is saved with merge facts, and passed through recording and completion live revalidation.
- Backend exact release persists a unique per-batch dispatch intent before one fixed `l2v-hub/ClinicOS` / main / `deploy-demo-exact-commit.yml` POST. It first awaits an explicitly read-only preflight on freshly checked current main, before the protected reviewed merge. It then persists confirmed merge facts and awaits the exact merged-SHA deploy. Dry runs cannot initiate dispatch.
- A fixed run-name binds operation, SHA and UUID in authenticated Actions metadata. Discovery rejects old runs, ambiguous correlations, wrong repository/path/event/head SHA/attempt, terminal failure, missing proof and changed main. Submission acknowledgement is never treated as workflow success. Saved intent and actual run identity survive uncertainty, timeout and failure; retries discover the saved operation without automatically submitting another dispatch. Current main movement fails closed.
- Successful runs must have a valid immutable receipt under the exact policy. Recording binds the successful saved deploy run, and existing provider/live verification remains required before publication/closure. The CLI rechecks current main and run attempt 1 both before and after that verifier. Existing pending-completion receipt digest comparison and durable subject guards remain active.
- Only the protected main orchestration job receives Actions-write permission. Dispatch uses its explicitly supplied `github.token` binding. No demo token or demo-secret presence check enters the release orchestration step. The exact workflow and confirm job retain the dedicated protected demo environment and dedicated demo token. Native review/check/hold gates, existing Vercel deployment and separate runtime deployment remain in place. Release queue and `railway-demo` queue are distinct.
- Collector, remote evidence reader and release metadata validator share a 33,554,432-byte binary ceiling (32MiB). Git blob JSON transport is bounded at 50,331,648 bytes (48MiB), sufficient for base64 plus wrapping. Existing regular-file containment and media/ZIP validation remain; actual length/hash/metadata checks remain and the remote reader additionally verifies canonical base64 and the pinned Git object digest.

## Verification

All source tests and formatter invocations used the trusted `/workspace/clinicos-review-handoff/agent-team/src/bug-pipeline/process.mjs` createRunner with `envMode: verification`, using a constructed environment containing only PATH. No source tests received controller/provider credentials. New release/dispatch tests use fake transport and clocks; existing workspace regression tests also create temporary local Git fixtures, outside the protected worktree. Runtime observed: Node v24.19.0. Hosted workflow remains pinned to Node 22; no hosted job was executed here.

- `focused-1.json`: preserved failed attempt, 23 pass / 3 failures. My temporary remote-reader variable collision prevented two files loading, and a race-test error assertion was too specific. Corrected without weakening existing tests.
- `focused-2.json`: 421 pass, 0 failures, 0 skips.
- `full-1.json`: 1070 pass, 0 failures, 3 existing Windows-only skips (1073 total).
- `focused-3.json`: 329 pass, 0 failures, after adding exact completion main checks.
- `full-2.json`: 1071 pass, 0 failures, 3 existing Windows-only skips (1074 total).
- `focused-4.json`: 330 pass, 0 failures, after pinning completion against a later rerun.
- `full-3-final.json`: **1072 pass, 0 failures, 3 existing Windows-only skips (1075 total)** on final source.
- `format-1.json`, `format-2.json`, `format-3.json`: successful scoped Prettier runs using existing installed package.

The three skipped checks exercise native Windows scheduler/ACL/bootstrap behavior and are unchanged. Existing tests were retained. New tests cover exact opt-in/default/invalid enum, protected workflow/binding checks, preflight/deploy order and operation correlation, protected merge recovery, changed main, uncertainty/no duplicate dispatch, old/absent/ambiguous/failed/pending/mismatched proof, run rerun races, record/completion policy binding, and exact/over-limit evidence boundaries and metadata/hash mismatch.

## Existing authentic trace validation

`authentic-media-1.json` and `authentic-media/receipt.json` record collector and fake remote-reader validation of the already sanitized independent #453 trace, exactly **27,606,230 bytes**, SHA-256 `1d926e21b02c8b3c68353c55bab71151b672c428fcc24359c49e4eb5c9f11102`. A contained private copy was used. Original trace SHA was checked before and after and remained unchanged. This is validation of existing media, not a fresh browser run, resource-completeness re-audit, authenticated GitHub read, or proof that issue behavior currently passes. No raw trace was added to source or public output.

Root materialized the two original base-version screenshot/trace regression fixtures into the sparse checkout. Root's pre-use receipt is `../root-materialized-original-test-fixtures.json`; author additionally captured `fixture-freeze.json` after the first focused attempt and rechecked those same hashes. These are root setup additions, outside the author source diff.

## Freeze and handoff limits

`before.json` captured existing source hashes and worktree Git metadata before author edits. `after.json` and `diff-manifest.json` describe final source and compare against that snapshot; `source-diff.patch` is generated using a hash-matched unchanged base checkout, without author Git commands. Only the eleven authorized source files changed, plus the two root-materialized fixtures.

The final metadata comparison detected a changed worktree index hash (`39934b4d…` to `abab618d…`), with all other captured Git metadata unchanged. Root confirmed its own `git status --short` at 20:13:58 refreshed index stat metadata; root independently verified `git diff --cached --exit-code` returned 0 and all 13,754 stage-0 mode/blob/path entries matched HEAD. Receipt: `../root-index-refresh-attribution.json`. This is an explicit root metadata-refresh exception, not a byte-identical index claim. The author ran no Git commands against this worktree and did not edit or restore its index or refs. `git-freeze-mismatch.json` preserves the exact hashes. Independent QA must take its own post-author freeze.

Author source work is complete and stopped. Independent QA has not been claimed. Actual protected-main dispatch, approval, dedicated secret/provider identity, successful deployment and public live proof remain unexecuted and unproven by this author; root owns publication and any such operations after review.
