# Author report — bounded null-policy bootstrap

**Status: IMPLEMENTED — NOT INDEPENDENTLY VERIFIED.** The implementation is ready for the dedicated narrow QA review requested by the task contract. It does not establish that provider-side policy inventory or administration succeeds in a future real invocation.

The exact-null branch now validates protection and secret-presence metadata and constructs the preserving environment update before writing. It sends one fixed PUT, immediately verifies environment identity, custom policy state, and unrelated controls, then performs complete bounded policy inventory. Policy 404 and conflicting, malformed, duplicate, wildcard, or tag records fail closed after one attempted PUT with no subsequent write. Empty inventory permits one `main` policy creation. Readable preexisting policy modes keep their prewrite inventory guard. The legacy `configureRepository` export remains byte-identical.

Validation used the trusted `createRunner` from `/workspace/clinicos-review-handoff/agent-team/src/bug-pipeline/process.mjs` with `envMode: verification` and a credential-stripped child environment:

- `node --check scripts/quality-gate/configure-bug-repository.mjs` — passed.
- `node --check agent-team/tests/bug-pipeline/repository-settings.test.mjs` — passed.
- `node --test agent-team/tests/bug-pipeline/repository-settings.test.mjs` — 85 passed, 0 failed, 0 skipped.
- `git diff --check` — passed.

The suite includes a fake API whose null-policy inventory returns 404 until after the PUT, method/order and preservation assertions, post-PUT 404/readback/conflict cases, and CLI diagnostic counter checks. One initial local harness attempt exposed a test-transform fixture returning `undefined`; that failed receipt is preserved privately and the fixture was corrected before the passing run. No real network, provider API, repository settings, or credentials were used by author validation.

The `configureRepository` function remains byte-identical at 5,668 bytes (SHA-256 `a64ad850bf45fde82fc3e470e3c4b9ac26c28cd330694ea0c73035629bfccfad`). All 127 previously sealed packet/private evidence files checked against the initial freeze remain unchanged. Scoped source hashes, baseline hashes, bytes, inodes, and hardlink counts are in `source-manifest.json`; test stdout/stderr/exit receipts and the frozen original function are retained under the private author directory.

The prior actual diagnostic remains a policy-inventory HTTP 404 after four reads and zero writes, with the fixed environment still reporting a null branch policy. That result does not diagnose token permissions. This author run made no provider request and does not claim that settings were applied or that operational permission is known.
