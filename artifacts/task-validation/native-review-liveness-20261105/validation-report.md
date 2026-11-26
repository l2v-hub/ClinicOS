# Validation Report

## Scope and identity
Base: b5e79ae7bec869af894f12ed6676547f21172db4. Tested code commit: d632085ef8ba5b6c8f53d00a272276d20c685332. The subsequent evidence commit adds this packet only. Production changes are limited to the already-fingerprinted native-guard-session.mjs and native-guard-container.mjs. No workflow, release authorization, target, model, application, credential or old review history changes.

## Acceptance evidence
| Criterion | Result | Evidence and limits |
|---|---|---|
| AC1 child regressions | PASS locally | Real standalone child processes cover pending startup, cleanup, isolation cancellation and release cancellation without internal keepalive. Original source reproduced exit13. |
| AC2 bounded lifecycle | PASS locally | Referenced deadlines, shared cancellation and memoized bounded cleanup. Timeout means unknown cleanup, never successful release. |
| AC3 concurrency and ownership | PASS with fakes | Concurrent callers, late startup and late container ID tests; only verified owned ID eligible for removal. No real Docker run. |
| AC4 guard preservation | PASS locally; Linux pending | 95 tests, 92 passed, 3 Linux-specific skips, 0 fail; see test-results/native-guard.tap. No weakened image/binary/profile/output/claim/forward checks. |
| AC5 disclosure and demo preservation | PASS | analysis.md and independent-review.md distinguish technical failure, unknown inference and no application review. Current demo remains online on the same deployment; no candidate deployment or parity claimed. |
| AC6 positive cleanup proof | PASS with fakes | One exact-ID rm; successful empty exact-ID query handles Docker auto-removal; errors, timeout, visible ID, malformed/nonempty output and missing observed ID fail closed. Live removal remains unproven. |

## Checks performed
- Native guard tests using Node26.3.0 on Windows: 95 total, 92 pass, 3 skip, 0 fail.
- Syntax checks of both production modules and new/changed test/fixture files passed.
- Prettier and git diff --check passed; files remain below 500 lines.
- Independent agent source review performed; all confirmed functional findings addressed. No Max/human/finalQA approval inferred.

## Release limitations
The failed hosted native run41937588247 has an empty receipt. Probe/qualification inference is UNKNOWN, application review remains unclaimed at PR528's frozen head. This patch is not a reason to rerun/refund that attempt. Actual native qualification must bind the newly protected source and precede any application claim.

Existing instructions at docs/claude-local-review-prompt.md require a manual protected path and an actual independent native human approving review for trust-root changes. No such approval exists. The repository's main protection read returned404; the authenticated collaborator inventory contains only the author. No bypass, admin merge, model-as-human review or protection removal is performed.

The isolated development resources are still source-free service shells. Live authority/provider adapters, database/storage/configuration, backend/runtime/frontend deployments and full five-role functional/persistence/AI parity are not complete.

Final Decision: IMPLEMENTED — NOT VERIFIED
