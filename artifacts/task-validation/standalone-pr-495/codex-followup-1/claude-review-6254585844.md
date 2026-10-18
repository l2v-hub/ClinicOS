## Claude review (read-only) — subject `702c46779dc3212c2f1938746b482743aca7da64`

**Verdict: changes-requested** — 2 medium, 1 low. This PR has no controller packet, so the review is published as a PR comment. No PR code, tests or builds were run. All CI checks on this SHA are green.

### Findings
1. **medium — `.github/workflows/inspect-demo-bearer-readiness.yml:12`**
   - *Problem:* this is the same issue as finding 1 of the #491 review, which was fixed there. The read-only diagnostic joins the concurrency group `railway-backend`, which it shares with `deploy-backend.yml`. GitHub keeps at most one pending run per group, and a newly queued run cancels the pending one. Dispatching this workflow while a production deploy is running and another deploy is queued therefore silently cancels the queued deploy.
   - *Requested change:* use a dedicated group, for example `demo-bearer-readiness`. Drift is already detected by the two snapshots compared at line 121.
   - *Test expectation:* `inspect-demo-bearer-readiness.test.mjs:138` currently asserts `group: railway-backend`. It should assert the dedicated group and that it differs from `deploy-backend.yml`'s, as #491's test now does.
2. **medium — `scripts/automation/inspect-demo-bearer-readiness.mjs:88`** (with `:73` and `:86`)
   - *Problem:* the PR's stated purpose is to explain why the earlier credential attempt was refused. Yet every failure inside a read is collapsed into `<PHASE>_READ_FAILED`: an HTTP 401 or 403, a GraphQL `errors` array (Railway's usual "Not Authorized" answer), malformed JSON, a timeout and a network error. The `catch {}` also swallows the more specific `fail('RESPONSE')`. The test at `:113-124` asserts this collapse. A rejected bearer token and a network problem therefore produce the same receipt-less output, and the diagnostic cannot tell them apart.
   - *Requested change:* keep constant, non-sensitive codes per cause. Examples: `<PHASE>_HTTP_<status>` for non-2xx, `<PHASE>_GRAPHQL_REJECTED` when `errors` is present (optionally with an enumerated, allowlisted extension code such as `UNAUTHENTICATED` or `FORBIDDEN`, never the raw message), `<PHASE>_TIMEOUT`, `<PHASE>_NETWORK`, and `<PHASE>_RESPONSE_INVALID`. Rethrow codes already created by `fail()` instead of overwriting them.
   - *Test expectation:* the cases at `:113-124` assert distinct codes for a 403, a GraphQL `errors` reply, a timeout, a network failure and malformed or oversized bodies. They also assert that no raw provider message or URL appears in stderr.
3. **low — `scripts/automation/inspect-demo-bearer-readiness.mjs:145`**
   - *Problem:* the receipt is printed to the job log, which is readable by anyone because the repository is public. It contains the demo project, environment and service IDs, the domains, the trigger ID and branch, and the run context. These are not credentials, and the same exposure was noted on #494, but here it happens on every dispatch with no artifact retention limit.
   - *Requested change:* acknowledge this in the task contract, or print only `inventorySha256` and the outcome in the log while keeping the full receipt in the mode-0600 file and a short-retention artifact.
   - *Test expectation:* the CLI test asserts which fields the console line contains.

### What holds up
- **Workflow guards:** `contents: read`, exact-main with the reviewed SHA, a repository check, pinned actions and `persist-credentials: false`. Tests run before the secret is used.
- **Fixed reads:** a fixed set of four query phases, each with fixed variables, so callers cannot submit GraphQL text. The reads carry no mutation, `projectToken` or variables query. They are limited to 8 requests within 90 s, with a 15 s timeout per request, no redirects, a 256 KB body limit and a `response.url` check.
- **Target and receipt:** identity is checked and then discarded. Every value is checked against the exact target. A false `canAccess` is recorded as an observation, never treated as authorization. Two snapshots are compared, with fresh-main checks between them. The receipt can only be created from a genuine result, and secrets and forbidden values are excluded. The output file is written exclusively with mode 0600.

### Limits
The tests use a synthetic provider. Whether the hosted Railway schema accepts `me`, `gitHubRepoAccessAvailable` and the bearer projection is only shown by the first real dispatch. Until finding 2 is fixed, that first dispatch may not say why it failed.

