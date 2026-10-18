# Durable state blob transport — author handoff

**Status:** AUTHOR COMPLETE — SOURCE / HARNESS FROZEN FOR INDEPENDENT QA.

The loader now accepts canonical inline Contents base64 and the `encoding: "none"` response, fetching a blob only by the exact Contents SHA. Both paths enforce a regular file record, a positive decoded size at or below 4 MiB, consistent metadata, canonical base64 (allowing GitHub’s CR/LF line wrapping), Git blob SHA-1, strict UTF-8 and a top-level JSON object. The dashboard reader uses the same bounded validation. Saves use compact JSON, retain all logical state, and reject payloads over 4 MiB before any remote call. Existing expected-SHA compare-and-swap and guard behavior remains exercised.

The authorized synthetic >1 MiB full-history blob test, inline test, dashboard fallback test, malformed metadata / encoding / SHA / UTF-8 / size cases, missing-file versus access-error behavior, and pre-mutation oversize rejection all pass. Existing CAS and guard-race cases pass.

Validation used the trusted `createRunner` from `/workspace/clinicos-review-handoff/agent-team/src/bug-pipeline/process.mjs` in `verification` mode. It passed no ambient GitHub/provider credentials to test subprocesses.

- Focused GitHub adapter tests: **58 passed, 0 failed**.
- Authorized host suite (`agent-team/tests/bug-pipeline/*.test.mjs` and `scripts/quality-gate/claude-bug-review.test.mjs`): **660 total, 657 passed, 0 failed, 3 skipped**.
- Broader bug-pipeline + unit suite: **750 total, 745 passed, 2 failed, 3 skipped**. The two failures are unchanged frontend source-lock assertions in `ci-browser-e2e-config.test.mjs` and `e2e-import-journey.test.mjs`; both reproduced on a clean detached clone at base `df1bf69f48242ad5f61d81d7ac54f7f7a14f9711` (3 passed, 2 failed). The two test files and their asserted `frontend/src/config.ts` and `e2e/import-happy-path.mjs` inputs match baseline hashes exactly. No application or unit-test path was changed.
- Before the authorized fixture amendment, a credential-free broad run reported **737 total, 720 passed, 14 failed, 3 skipped**. Twelve failures were the strict metadata errors in the handoff fixtures subsequently updated under Amendment 1; the remaining two are the baseline-reproduced assertions. The original log is retained.

The amendment adds only `agent-team/tests/bug-pipeline/comment-review-handoff.test.mjs` to the original two-file scope to provide truthful metadata and SHA fixtures. It does not relax assertions. The amended fixture’s 12 tests pass.

No live GitHub, model/provider, credential, database, commit, push, merge or state write was used. GitHub API reads returned HTTP 401 during the root’s attempted amendment publication; the amendment is durably recorded locally and is **not represented as remotely published**. The root remains the sole remote/state/commit writer.

## Frozen inputs and hashes

Base commit: `df1bf69f48242ad5f61d81d7ac54f7f7a14f9711`.

| Input | SHA-256 |
|---|---|
| Original task contract | `bd8dc948818ff50c3428ad16135096d311ba8e91773e159e3fa26aed61d14ae2` |
| Scope Amendment 1 | `7798a1873acda7bf96a221f173f0f5e707ad519dcd9cc95d693197eb893f8b59` |
| `agent-team/src/bug-pipeline/github.mjs` | `1419fd31f6344c024abebd1d0f3136947455f96b5b63f83c67e52c2760cc3b29` |
| `agent-team/tests/bug-pipeline/github.test.mjs` | `ae6ddd66e1a080be1d8d655928e9ccc36ddb6e56f35f56305ff119376440acd2` |
| `agent-team/tests/bug-pipeline/comment-review-handoff.test.mjs` | `438382fbfbe96dbe97d71442d7493bc92ecdd1c593adff9af0495c2d5e010009` |
| Focused credential-free log | `7fa2402145acee660b6293afad8cabadd8ae963656287d4a2a039ff622cbaeef` |
| Authorized host-suite credential-free log | `87e156d06851a6bceed5b771e667a112783f405e8fc3f622d066cbc24efec60d` |
| Broad-suite final log | `be836cceccb5c357855c14bd259a95ecce63784af338af12c0cc607b891b85d4` |
| Pre-amendment credential-free broad log | `ee1147e792a23013dcb206a8ffb7d4087a1a437b0e34ae5ce1e165f1f74b3033` |
| Baseline reproduction log | `298fb3c2711f6b65c8577c4ca91e4d7d80e50feb79a4d91b8f667deb82878475` |

Diff hygiene check: `git diff --check` passed. No commit was created. Independent QA may now inspect the frozen three authorized paths and logs above.
