# Demo source configuration — frozen operational contract

Base: b7194ac4dd185b3edc4f8d093c0505d0b4ef69ea. Configuration attempt 1 of at most 4, separate from the exhausted demo-release-guard and maintenance-470 implementation budgets. Existing guard, maintenance, clinical source and their budgets remain unchanged.

Authorized goal: inspect and, only if uniquely and safely identified, set the existing Railway demo repository trigger branch to main. No application deployment, service-level reconnect, trigger creation/deletion, variables, credentials, database or provider account changes.

Owned source scope: `.github/workflows/configure-demo-source.yml`, `scripts/automation/configure-demo-source.mjs`, `scripts/automation/configure-demo-source.test.mjs`. Evidence scope: this directory only. Worktree: codex/demo-source-configuration.

Fixed target: project bddf5d1b-ee83-4362-8238-a79721f795e5; environment 8021987e-8eaa-4bc8-a102-20566db5e6b4 named demo; service c000f011-0349-4ea9-9b56-13c625b5767b; repository l2v-hub/ClinicOS; branch main; domain clinicos-backend-demo.up.railway.app.

Manual-only workflow. Read-only inspect is the default. Jobs require this repository, refs/heads/main, and reviewed SHA equal to the exact current GitHub commit. The protected environment is glistening-friendship / demo. Only its existing RAILWAY_DEMO_TOKEN is bound. No provider body, token, environment dump or variable data may be printed or archived. Snapshot artifacts are schema-validated, allowlisted metadata with SHA-256 digest; bounded I/O, HTTPS fixed endpoint, no redirects, finite timeout.

Update is allowed only for one existing exact-repository GitHub trigger scoped to the exact target. It changes only branch to main. Missing trigger, duplicate triggers, foreign repository/provider, wrong target or domain, stale expected digest and changing metadata block before any write with fixed diagnostic constants. Exact already-main unique binding is idempotent and performs zero writes. An update requires a nonempty digest obtained from inspection, a fresh matching inventory immediately before write, and exact fresh verification after write. Other metadata must be preserved. No automatic retry of mutations. Errors do not include untrusted provider response text.

Acceptance: meaningful Node tests cover read-only projection, correct update, exact/no-op, drift before mutation, drift after mutation, absent/duplicate/foreign trigger, target/domain mismatch, API/network/oversize/redirect errors, response-secret non-disclosure, and trusted workflow dispatch context. Official schema validation and YAML/AST checks precede a new independent QA. The implementer makes no provider calls, does not push or create a PR, and stops with the sealed candidate. Actual native inspection/update happens only after the new operational workflow is reviewed, merged and dispatched on trusted main. Existing clinical issues stay open pending their full release proof.
