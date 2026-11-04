# Independent final-source-C local QA

Source candidate `8192fc5f7d4c2849f6f9e235d19d32a6b678be74`, tree `7b0168298ba586f9ae1e53f2e7362311bd5415aa`. Dedicated QA checkout commit `cd76d19d170200c1fbd41dcfbc9cc7faac7de66b` has the exact same tree and no tracked modifications. This report is not a release approval or post-review/deployment validation.

The independently identified inspection binding gap is addressed: when a request is supplied, inspection compares active and failed deployment IDs and source SHAs, validates the reviewed SHA and rejects active source equal to reviewed source. Tests exercise all four field mismatches, active/reviewed equality, malformed requests, and secret-map erasure on errors. Metadata intentionally performs unbound read-only inspection.

Executed on Windows with Node:

```
node --test scripts/automation/demo-no-expiry-controller.test.mjs scripts/automation/enable-demo-auth-no-expiry.test.mjs scripts/automation/demo-no-expiry.integration.test.mjs scripts/automation/demo-no-expiry.metadata.integration.test.mjs scripts/automation/renew-demo-auth-expiry.test.mjs scripts/build/backend-build-context.test.mjs agent-team/tests/bug-pipeline/windows-review.test.mjs
```

Result: 160 passed, 0 failed, 0 skipped. The Windows suite included native scheduler-object parsing, ACL, and isolated bootstrap fixture checks; no actual scheduled task or provider operation was authorized or performed by this QA. Tests simulate remote state and providers. The source's workflow guard currently invokes only the first two operations test files; the two added integration files were not found in workflow invocations and therefore local green should not be represented as CI enforcement.

`git diff --name-status f52979d1a1d8c37d2caf6003e057950adafee678 HEAD -- backend frontend prisma` and the same comparison for root package manifest/lock were empty: earlier local built-app, real-backend, five-profile browser proof remains source-equivalent for those files. `git diff --check ca42860980bc5df5a2718cb47806d48b6d886e75 HEAD` was clean. A main-baseline (`6e3d880921653465ca0527b40f9fc09f6486ada2`) comparison still reports blank EOF lines in two inherited immutable historical evidence documents under `artifacts/task-validation/demo-expiry-2029-r5-20261103/`; do not claim the complete main-relative diff is whitespace-clean.

External Railway has no provider-enforced owner epoch in this mutation. The last owner/capability check and provider write are separate operations; a concurrent change in between is a residual read-before-write window. The stated safety envelope mitigates but does not eliminate it: single canonical operator, serialized protected demo workflow, consumed exact-action capability, final read-only checks, durable intent, one provider POST, and no automatic retry of uncertain writes. No claim of atomic cross-system fencing or Railway CAS is made.

No cloud, GitHub/provider mutation, real grant, public deployment or model review was undertaken. Later source/test changes need a new source seal and validation. Earlier raw fixture traces remain private and contain ephemeral synthetic session tokens; no sanitized derivative was generated.

## C2 amendment

Candidate `6872ad02b78a9cfd147a4a9cb78f335e8d9f177f`, exact Git tree `97b2921209283785c34c246fb6f6c342145d23de`, was independently cherry-picked as QA commit `cd11572082a0a26a139bb9ca9086dfae78ceb9c4`; tree identity and clean tracked state were verified. The three-file delta adds all four operations suites to both required CI and manual pre-credential workflow commands and adds a regression assertion. The earlier missing CI wiring finding is resolved for C2.

The same seven-file test command above was independently rerun: **161 passed, 0 failed, 0 skipped**, including native Windows tests. `git diff --check ca42860980bc5df5a2718cb47806d48b6d886e75 HEAD` was clean. Backend, frontend, Prisma, root package manifest and lock have no diff from browser-tested `f52979d1a1d8c37d2caf6003e057950adafee678`. The Git subtree hashes are backend `2967a2f7d6eaeff050451d3f7f98fb7f6f79a184`, frontend `b48c7e28f4a1085d3ad2ae8a3cabb7eca3717f6a`, Prisma `6b0e362cd2c9342d3eb0757b01283ce4b0ee0e96`. SHA256 of `git ls-tree -r --full-tree HEAD` output is `e13502bb87223bce1a57e0a7a936c6ff440ffe06c42053ad8deaf6239a39201e` (3,144,292 bytes; Windows Git output).

Source SHA256: package lock `a2e80872c9085f8ec028c968ef0f6d0f6622235c649bf081f7289f5cde6593f6`, Prisma schema `f73f82133948fadc7e289baccd630fb490df2a25e43ace3dd7ef3085ad96b210`, Noto Sans regular `b85c38ecea8a7cfb39c24e395a4007474fa5a4fc864f6ee33309eb4948d232d5`, bold `c976e4b1b99edc88775377fcc21692ca4bfa46b6d6ca6522bfda505b28ff9d6a`, and font license `0dab92d0544f7b233403f14b84a663bdbfa746982eda629e7f4f9ffe1b036feb`. These are source inputs, not independent proof of a clean install or published build. The C residual risks and public-deployment limitations above remain applicable.
