# Cycle 3 runtime and terminal-publication scope amendment

The user requests the entire automatic issue-to-E2E-to-closure flow. Two concrete integration defects were found before candidate3/source freeze: verification HOME is isolated but Chromium was installed only under runner HOME, and terminal controller publication neither passes fresh durable store nor has the protected demo credential needed for live verification. Root authorizes these exact seven additional files, for19sourcefiles total, within ongoing implementation3/4 (no counter/reset/new review).
- agent-team/src/bug-pipeline/process.mjs
- agent-team/tests/bug-pipeline/workspace.test.mjs
- agent-team/src/bug-pipeline/pipeline.mjs
- agent-team/tests/bug-pipeline/pipeline.test.mjs
- .github/workflows/codex-bug-pipeline.yml
- .github/workflows/bug-pipeline-tests.yml
- scripts/quality-gate/verify-isolated-services.mjs

1. Browser cache: trusted workflow install and actual controller share an explicit absolute nonsecret PLAYWRIGHT_BROWSERS_PATH. Forward only that validated path to verification children; preserve isolated HOME and secret stripping, no broad parent env forwarding or model/reviewer browser-env changes. Existing native sandbox CI readiness must launch ACTUAL Chromium from that cache under the actual Codex verification sandbox, assert concrete DOM value/write/reload persistence, and retain existing actual PostgreSQL/external TCP+UDP+proxy denial/outside-write/exit propagation checks. Install browser before secret-bearing controller step; no insecure TLS, shared trust changes or relaxed egress. No product dependencies; use already pinned Playwright and existing CI job/readiness script.

2. Terminal publication: controller must pass fresh store/repo for any allowed publication, and never receive Railway credentials. Backend deployment completion must be published/retried only by the existing protected confirm-demo job. Persist publication pending/published identity tied to merge/reviewedSHA, reserve no model/review attempt for idempotent recovery, and auto-select verified deployed backend batches with pending publication so the next successful controller poll invokes the trusted release/confirm flow again. Already-deployed release path must not redeploy/remerge, and successful publication ends retries. Retain same hold/revision/review/evidence requirements: do not weaken proof or silently invent legacy approvals to make fixtures pass; synthetic test fixtures should faithfully represent real reviewed deployed facts or explicitly prove rejection. The real controller path must be tested, not only helper stubs.

3. Existing authorized github callback work: invalidate stale status cache before first actual issue-label mutation and populate only after full operation succeeds, so partial failure/hold cannot make later status reconciliation incorrectly skip. Preserve unrelated labels.

No other scope, secrets, data, application code, review reset, live mutation or deployment authorized in implementation. Preserve all historical candidate/QA artifacts and provide final19sourcehashes plus fresh independent QA.
