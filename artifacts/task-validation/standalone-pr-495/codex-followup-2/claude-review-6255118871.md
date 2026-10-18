## Claude review (read-only) — subject `ba5b512f63720e09e09afd53ec69d3cd5f36aec1`

**Verdict: changes-requested** — 2 low. Second read-only review, after `702c46779`. This PR has no controller packet, so the review is published as a PR comment. No PR code, tests or builds were run.

### Previous findings
1. **medium — concurrency group shared with the production deploy: resolved.** The workflow now uses `demo-bearer-readiness`.
2. **medium — every failure collapsed into `<PHASE>_READ_FAILED`: resolved.**
   - There are now constant codes per cause: `_HTTP_<status>`, `_GRAPHQL_REJECTED`, `_TIMEOUT`, `_NETWORK` and `_RESPONSE_INVALID`.
   - Codes minted by the helper are rethrown instead of overwritten, and no provider message or extension code is copied.
   - The Content-Length check is stricter, and the tests cover each cause.
3. **low — full receipt in a public job log: not addressed.**
   - `inspect-demo-bearer-readiness.mjs:168` still prints the whole receipt. In a public repository anyone can read that log.
   - The receipt contains the demo project, environment and service IDs, the domains, the trigger ID and branch, and the run context.
   - The task contract does not acknowledge this exposure. Either acknowledge it, or print only `outcome` and `inventorySha256` and keep the full receipt in the mode-0600 file.

### New findings
1. **low — `scripts/automation/inspect-demo-bearer-readiness.mjs:121`**
   - *Problem:* the new `project()` wrapper rewrites every error thrown by a projection into `<PHASE>_RESPONSE_INVALID`. That includes the helper's own diagnostic codes from `inventory()`: `DEMO_BEARER_DUPLICATE_TRIGGERS` (`:56`), `DEMO_BEARER_TRIGGERS` for paginated triggers (`:48`), `DEMO_BEARER_DOMAINS`, and `DEMO_BEARER_TARGET` when the environment name or IDs do not match. A demo with two triggers, or a target mismatch, is a meaningful readiness observation. It is now indistinguishable from a malformed body. This partly undoes the fix for previous finding 2.
   - *Requested change:* inside `project()`, rethrow errors that are already in `safeErrors` (as `bearerReader` now does), and map only foreign exceptions such as a `TypeError` from a missing property to `<PHASE>_RESPONSE_INVALID`.
   - *Test expectation:* duplicate triggers report `DEMO_BEARER_DUPLICATE_TRIGGERS`, a wrong environment name reports `DEMO_BEARER_TARGET`, and a missing `data.me` still reports `IDENTITY_RESPONSE_INVALID`.

### CI
Every required check is green on `ba5b512f6`. `Vercel` (the preview deployment) fails; this PR changes no frontend code, so it is unrelated.

### Limits
The tests use a synthetic provider, so whether the hosted Railway schema accepts these queries is only shown by the first real dispatch.

