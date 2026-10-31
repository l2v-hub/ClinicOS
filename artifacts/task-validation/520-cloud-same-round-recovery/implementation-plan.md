# Same-round cloud recovery — bounded implementation plan

1. Add a separate recovery core and execution authorization, using the existing injected native authorizer, original failed reservation, immutable accounting snapshot and one-shot CAS technical execution. Do not call native handoff.claim or extend budgets.
2. Add a separate cloud entry requiring explicit workflow_dispatch/trusted main/maintainer/exact selector. Reuse qualified CLI/probe/input capacity and credential isolation, with no reviewed-code checkout/tools/API fallback and no general-controller wake.
3. Extend native source reader only with an explicitly supplied trusted recovery plan, labelled generated/not-committed and tied to canonical source manifests; default queue rules unchanged.
4. Add a native actual-POST publication guard while retaining existing idempotence and hashed-report preservation.
5. Test no-auth/mismatch/replay/concurrency/stale/failure/publication uncertainty, generic regression and workflow wiring. Generate a synthetic internal report, assert it in Playwright, capture source-bound proof.
6. Obtain independent Codex QA, publish a separate technical PR and inspect CI. Do not merge, dispatch recovery, request Claude or alter PR520/consumed round/budget.
