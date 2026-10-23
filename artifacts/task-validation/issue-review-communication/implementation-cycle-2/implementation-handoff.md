# Implementation attempt 2 — author STOP, independent QA2 required

The two defects demonstrated by dedicated QA1 are corrected in the existing seven-file scope. Only `agent-team/src/bug-pipeline/issue-review-communication.mjs` and its existing focused test file changed relative to archived attempt 1. No guard G source, workflow, clinical source, existing failed review, budget, original contract or historical proof was changed.

## Change

The publication boundary now repeats the source-comment identity/body-digest/author checks after the full cohort/PR/state verification has awaited its network reads, then checks the bridge actor's application authorization again before issuing the mutation. Source-author authorization is verified after the actual comment read. The outgoing request body remains serialized before any awaited guards.

A monotonic guard-age bound of 60 seconds rejects expired snapshots and invalid/backwards clock readings without retrying a mutation or invoking a model. The normal flow and informational-notification recovery remain unchanged. No credentials or diagnostic text are copied into comments.

These checks are bounded observations of separate GitHub resources, **not an atomic cross-resource transaction**. A later edit or role change after its last checked read can still occur; subsequent synchronization discovers new source versions. Mirrors retain source ID/content digest/candidate SHA provenance, while exact-SHA structured report and existing release gates remain mandatory. Informational labels or issue comments never authorize clinical release.

## Actual verification

| Check | Result | Evidence |
|---|---|---|
| Existing focused assertions plus six added test cases | 51/51 PASS, no skips/failures | `test-results/focused.log` |
| Exact original nine QA1 HTTP probe cases replayed separately against corrected module | 9/9 PASS, including both previous failing interleavings with zero writes | `test-results/corrected-replay.mjs`, `.json`, `.log` |
| Complete pipeline and Claude helper regression glob | 628 total = 625 PASS, 3 native-Windows skips, zero failures | `test-results/full-regression.log` |
| Syntax/whitespace | Six JavaScript syntax checks and `git diff --check` PASS | `test-results/static-checks.json` |
| Formatting | Seven authorized source paths pass Prettier | actual checked command |
| Scope and frozen history | Seven allowed source paths; only two changed since attempt 1; nineteen G sources unchanged; seven exact archived source files; original twenty author proofs and all QA1 manifest files plus its manifest unchanged; four contracts hashed | `source-hashes.json`, `scope-audit.json`, `preservation-check.json`, `contract-hashes.json` |

New regressions inject actor-role revocation during the write guard's own cohort reads, source editing/deletion and source-author revocation at the same interval, source-author revocation during the body read, expired/backwards controlled clock, and normal idempotent publication. The original 45 focused tests, including real existing correction/test/simplification/QA/new-SHA control flow and notification-outage recovery, remain present and passing.

All tests ran with real provider credentials removed and `gh`/`codex`/`claude` executable denial stubs. The corrected replay uses the original immutable QA1 loopback HTTP fixture, writes results only beneath `implementation-cycle-2`, and neither reruns nor replaces QA1's original RED results or browser evidence. No external GitHub write, provider/model call, database or production data access, personal-PC action, commit, push or PR was performed.

The author has stopped. A NEW dedicated QA2 agent must perform its five mandatory phases, including actual browser evidence and required build/type checks. This is an implementation handoff, not a self-issued QA verdict. The existing failed Max attempts for PRs 481 and 483 remain blocked and spent; their missing reports are not repaired or approved by this change.
