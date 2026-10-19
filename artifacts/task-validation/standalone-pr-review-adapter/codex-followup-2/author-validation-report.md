# PR492 author validation — continuation 6

Source base: `94fcaada4c224d3a3e472725c07a89b35c8dfe33`  
Author source scope: only `agent-team/tests/bug-pipeline/standalone-review.test.mjs`  
Production authentication source SHA-256 before and after: `309d09f58446aa99beb024139578c40277a1299de0465b6a2e73443abb45aebb`

## Change

The six mocked `finalize` invocations in the three hosted-failing tests now share a per-test temporary HOME and an explicitly created empty synthetic CODEX_HOME. Each fixture is removed through the test cleanup hook. Direct `finalizeEnvironment` coverage accepts an explicit directory and rejects absent authentication, a nonexistent explicit CODEX_HOME, a file path, an empty HOME, and a synthetic API key conflict. A CLI-level negative assertion confirms the auth gate rejects before invoking mocked dependencies. No authentication gate or production file changed.

## Validation

- Before the fix, the three hosted-failing tests were run with `HOME=/tmp/pr492-noauth-home`, no `.codex`, and no API key. Result: 0 passed, 3 failed. Failures were `codex-auth-unavailable` on the dispatch and concurrent tests; the unadopted-PR test received the same auth error before its expected adoption error.
- After the fix, the focused set (the three hosted tests plus direct auth-gate coverage) ran with the same isolated no-auth HOME: 4 passed, 0 failed, 0 skipped.
- Exact scoped command through `createRunner` in verification mode: `node --test agent-team/tests/bug-pipeline/*.test.mjs scripts/quality-gate/claude-bug-review.test.mjs`. Result: 715 tests, 712 passed, 0 failed, 3 skipped (the existing native-Windows skips). The runner's child environment contains no API key; finalize tests pass explicit per-test synthetic HOME/CODEX_HOME fixtures, and no test writes process.env.
- Runtime: Node `v24.19.0`.
- `git diff --check` passed. The source diff contains only the authorized test file. Production `review-handoff-cli.mjs` remains byte-identical at the SHA above.
- The prior proof manifest SHA-256 is unchanged at `030fbc1df290cefca0c88d93c07cfa16a36b5bb03257fb18c85840cb41ee74a1`; all 347 listed prior proof files match their recorded hashes (347 unchanged, 0 missing, 0 mismatched).
- Private run logs and SHA-256 digests are recorded in `author-handoff.json`; public evidence contains bounded result summaries and a credential-free runner receipt. Raw runner output contains synthetic fixture state and stays private.

## Author stop

Author implementation and local validation are complete. Source and test harness are frozen for fresh independent QA. No commit, push, provider review, external comment, state mutation, or merge was performed by the author.
