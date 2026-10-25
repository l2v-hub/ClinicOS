# Independent cloud QA4 — READY FOR CODEX QA

Reservation: `0b09d6e7-82bd-48a8-afed-2bdea9d6043c`. Worktree: `/workspace/clinicos-cloud-review`. Exact eleven-file manifest SHA256: `6e63324f25e2047bc57877d520d4fd0227345c6f8cda69a7c3584cb15ab691fe`. Preserved source3: `4738b0cc9c33380e2d8b9c7a6ca165f06f29ab4c`; last published cloud source: `9ac823307f981da33e96eab33cc18d6ce139ed93`.

No new correctness or security finding in this frozen candidate. QA3-01 is corrected. This is independent review of the repaired code, not hosted activation qualification or permission to merge/deploy. The genuine prior QA3 failure remains authoritative for its old source and is unchanged.

## Contract and source review

Read actual Claude review1 `6400155301`, the task contract and acceptance amendment, sealed QA3 report and its failing native preclaim probe, author4 report/source-freeze/STOP, and the complete source3-to-candidate diff. Reviewed the worker, native handoff, standalone wrapper, source reader, capacity/schema path, workflow and committed tools package/lock. The seven changed files address the frozen preclaim binding; four reserved files are unchanged from source3. No application, clinical, database, API or UI change is in scope.

Cloud copies the original subject before asynchronous retrieval, gives the reader a different copy, and copies the returned packet/inventory. It captures actual actor-filtered feedback before the probe. Native claim copies its expected subject at entry, compares semantic specification/packet/source/history/request/ownership identity before reserving, and rechecks the pending subject plus fresh feedback in the final save guard. Native CAS continues to bind the original write body and refuses changed same-subject state. The returned reservation must also be exactly the original semantic subject plus the legitimate one-round pending-to-running transition before inference. The standalone wrapper copies options before gated prerequisite awaits. Projection copies used for transition comparison do not modify durable arrays or refund history.

## Independent behavioral evidence

- `independent-preclaim-probe.mjs` / `.log`: **31 PASS** cases across real native batch and standalone fixtures. Same-SHA criterion changes during retrieval/probe; actual added/edited GitHub feedback, review flags and probe actor drift; packet/source/prior-report/request changes; shared durable aliases; detached reader/packet aliases; final prerequisite/CAS specification and feedback changes; benign observations; filtered own protocol comments; postclaim feedback import; standalone caller options copied before gated awaits. Rejected pending work has zero review inference, zero report/projection/wake, zero reserved round, and preserves the changed pending request. Successful detached-alias cases send the original captured criterion to inference.
- `late-source-cas-probe.mjs` / `.log`: **PASS**. Changes the durable criterion after the final pending-source load, immediately before PUT. The actual native GitHub state-store CAS refuses the stale body, produces `preclaim-source-changed`, preserves the new criterion/request and reserves zero rounds. The guard's intervening load cannot promote the old body to the newer file SHA.
- `source-reader-native-probe.mjs` / `.log`: **3 PASS** cases through the real hash-verifying source reader and real native batch handoff with synthetic API responses. The successful branch includes complete before/after source, required frozen evidence and original plan in the exact inference input. Durable criterion mutation while fetching a source blob and actual feedback mutation during qualification both prevent inference/claim.
- `returned-transition-probe.mjs` / `.log`: **2 PASS** cases. An altered returned batch/standalone reservation cannot authorize inference. The real legitimate reservation remains running/spent for authorized recovery; no fabricated provider failure, report or wake occurs.
- `independent-retention-capacity-probe.mjs` / `.log`: **22 PASS** scenario groups, independently rerun from the preserved QA3 probe with the newly required packet-feedback fixture. Valid/timeout/unsafe results cannot consume same-actor same-SHA replacement claims. Valid sanitized reports and their digest survive real ownership changes and submit/post-then-error, reconcile, projection and wake uncertainty. Benign observations still allow publication or exact-owned finite failure. Semantic claim/source/implementation guards remain effective. Unicode and JSON-escaping input, exact schema bytes, 65,536 native allowance and observed output capacity are checked before claim; exactly-at-capacity succeeds and one-over fails. Unique qualified Opus model/context/output rules, Haiku exclusion, missing profile and oversize zero-claim behavior remain effective.

These are 59 independent scenario groups/cases. All transport/state/provider inputs are synthetic. No real provider invocation, authentication retry, GitHub API mutation, canonical-state change or operational claim occurred.

The fixed hosted `GH_TOKEN` is copied into the worker's isolated runner environment. Changing a repository secret or local gh profile cannot change the identity of that current PAT. Probe-time actor drift is explicitly rejected. An arbitrarily mutable synthetic `/user` response during a single token's invocation is not evidence of a real worker identity-switch defect.

## Tests and security

Node: `/tmp/clinicos-node22-native12/node_modules/node/bin/node` (`v22.23.4`). Private `TMPDIR=.../cloud-qa4/test-tmp` used throughout.

1. Focused command: `node --test agent-team/tests/bug-pipeline/cloud-review-worker.test.mjs agent-team/tests/bug-pipeline/comment-review-handoff.test.mjs agent-team/tests/bug-pipeline/standalone-review.test.mjs scripts/quality-gate/claude-bug-review.test.mjs` → **134 PASS, zero fail/skip/cancel** (`focused-node22.log`).
2. Full requested suite, run **once**: `node --test agent-team/tests/bug-pipeline/*.test.mjs scripts/quality-gate/claude-bug-review.test.mjs` → **1,265 tests, 1,262 PASS, zero FAIL, three skips** (`full-bug-pipeline-node22.log`).
3. Contract validator: **PASS**, `CONTRACT VALIDO` (`contract.log`). `git diff --check`: **PASS** (`diff-check.log`).

Independently parsed workflow YAML grants only `contents: read`, gates trusted main and disabled activation, and installs using the isolated committed lock with `npm ci` before credentials enter the review step. Every CLI/platform package is version 2.1.301 with a registry URL and SHA512 integrity. The existing real clean-install receipt matches both exact package hashes and shows install/version exits zero with `2.1.301 (Claude Code)`, zero provider calls and zero GitHub mutations. QA did not repeat installation. Root package-lock matches HEAD (`static-security-verification.json`).

The reviewer receives subscription OAuth only, an isolated empty cwd/HOME, no tools/MCP/settings/PR execution, no GitHub/deploy/API-key credentials and bounded hash-verified data. Reports are schema/path/secret validated, then communication-sanitized and retained with their full digest. Synthetic fixtures contain no real PHI or credential values. Unknown model execution outcomes retain spent attempts and finite recovery notification; no replay, array removal/refund, reservation reuse or self-issued allowance was introduced. The unsafe refund request was explicitly declined in the acceptance amendment and is not a defect.

Three initial private harness errors were corrected without modifying candidate source: an overbroad fixture replacement caused a parse error, a minimal batch plan failed native validation, and an assertion assumed an optional standalone plan existed. Their original scripts/logs remain alongside the final passing probes. None is reclassified as a candidate failure or used to erase historical QA failures.

## Recorded phases

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS | Actual peer review and amendment read; validator output in contract.log. |
| 1 Source/diff | PASS | Complete source3-to-qa4.diff; exact eleven-file reservation; no new finding. |
| 2 Tests | PASS | Focused/full suite logs and 59 independent scenario groups/cases. |
| 3 Scoped runtime | PASS | Internal configuration/worker only; contract explicitly has Frontend/UI=no and Playwright=no; parent prohibits browsers. Real native synthetic protocol/state/source-reader assertions meet this authorized scope. No UI surface introduced. |
| 4 Security | PASS | Frozen specification/feedback authorization, claim replacement/retention, capacity, child isolation and locked installation checks. |
| 5 Report/freeze | PASS | report.md, result.json, source-before/after.json, STOP.json and seal.json. |

All eleven reserved source hashes, root package-lock, every prior QA1/QA2/QA3 evidence file and author4 frozen evidence match before/after. Only this private QA4 directory was written. No source, contract, prior QA, Git index, branch, commit, publication or external state was changed.

## Operational status remains UNVERIFIED

Read actual hosted authentication receipt `40202235777`: token present, `claude-authentication-error`, providerAuthenticated=false, zero issue claims, API fallback=false. Read actual metadata-only format receipt `40208616713`: token present, unrecognized format, providerCalled=false. Existing failures were preserved; neither was retried. The 1M profile has synthetic code evidence here. Actual hosted authentication/profile, native event handling and genuine cloud review must still qualify before activation. **Whole activation remains UNVERIFIED.**

Code verdict: **READY FOR CODEX QA**. QA4 is frozen and stopped; publication/operational gates belong to the root controller.
