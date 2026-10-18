# Maintenance470 continuation6 — author source/harness STOP

**IMPLEMENTED — NOT VERIFIED remotely. AUTHOR SOURCE AND HARNESS STOP.** Fresh independent QA of the exact new committed SHA remains pending. No provider/GitHub/network/DB operations, credentials, package installation, commit or push were used.

Only the two reserved source paths changed from base `5babff63c52ef8935a9eccf654efe3aabe770a98`:

- The new readonly workflow job now checks out both `scripts/maintenance` and `.github/workflows` using a multiline cone sparse-checkout value. Old jobs are unchanged.
- The existing workflow test asserts that exact two-directory packaging. No test was skipped or removed. The wrapper and both imported helpers are unchanged.

Credential-free trusted createRunner verification passed:

| Check | Outcome |
|---|---|
| Full candidate checkout | 115 passed, 0 failed/skipped/cancelled; exit0 |
| Actual two-directory cone sparse checkout | 115 passed, 0 failed/skipped/cancelled; exit0 |
| Node syntax and git diff whitespace | pass |

The sparse run was an **uncommitted two-source overlay on exact base5bab**, not a claim about a nonexistent committed candidate. A local shared clone used actual Git cone sparse checkout with the two paths derived from the candidate workflow. All five workflow/test/wrapper/imported-helper bytes matched the candidate worktree; unrelated application/proof directories were absent. Its commands, cone patterns, overlay hashes, runner mode and complete original test results are retained. Runner input was PATH only; verification home was isolated and no deployment/GitHub credentials were present. After recording evidence, only this author's temporary clone and verification home were removed. No services were started and no baseline/failed5 fixture was removed.

QA5's failure is preserved accurately: ce7 full115 pass; exact old sparse114 pass / 1 ENOENT. It is not relabeled as passing. All **5,998** prior proof files independently match (1,153,830,954 bytes), including failed5 records; manifest SHA `7bac65b587b771566c790ca030ddfb7cafd74e70aee4e5972207785741edfc85` remains unchanged. Original failed5 external author19/19 and independent QA7/7 sealed files also match. All prior contract/amendment/proof bytes remain preserved. No failing continuation6 author test is hidden; both new executions passed.

Final source SHA-256:

| File | SHA-256 |
|---|---|
| `.github/workflows/deploy-backend.yml` | `80889c5eea0129659e0678403f6b22922469d3b525e5619e12fb9e9f40ed5ec2` |
| `scripts/maintenance/demo-storage-inspect.test.mjs` | `14955d91182ff8d4c1cce59fd57316ca34b29cc8ed1d391eaec089ee6af00a15` |

Unchanged wrapper SHA `ef67dc97b06c9bc7e7d9157240dbb71f913eb216e28ff0a28c00bce5e5d29429`; old-job suffix SHA `fc90d6c15c39d9ba8c3e54f25c20f152cbb11e531d889ef0dc67382e74e30e97`. No auth, targeting, concurrency, drift, receipt or cleanup behavior changed.

Evidence: `author-source-seal.json`, `source-input-manifest.json`, `source.diff`, `frozen-source/`, `verify.mjs`, `full-tests.json`, `sparse-tests.json`, `test-summary.json`, `sparse-fixture-inputs.json`, command/runner metadata, preservation/proof checks and cleanup receipt. Root must commit/review through the reserved flow; fresh QA must test that exact committed SHA in a fresh actual sparse checkout without overlay, followed by actual Claude/final Codex reviews before any protected dispatch. Never merge the historical maintenance branch into main. Actual provider behavior, storage cleanup and issue closure remain unverified.
