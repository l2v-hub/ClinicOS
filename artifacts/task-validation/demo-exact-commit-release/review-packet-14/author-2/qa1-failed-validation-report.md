# Independent QA — native exact-commit demo policy

Final Decision: FAILED VALIDATION

Source: `630bef997a53a2d335b1f4a775151a7e8c604d81`. Base: `45033a3949742218b1c9d23a37a0c94776cd5bd5`.
Reservation: `8065d5b5-de1e-48b1-a3c2-5eda23c1d022`, read before tests and private harness creation. Author code and report were reviewed, not trusted as independent evidence. Root alone owns Git/GitHub/state/provider writes; this session made none. No source changes, real credentials, provider requests or deployments.

## Blocking finding F1 — legacy sibling writer and whole-workflow dependency

Severity: HIGH for release readiness. `.github/workflows/deploy-backend.yml:47` runs the unchanged legacy production job on the same main push or deploy dispatch as the new exact demo path (`:106`). Its `railway up` command (`:69`, `:71`) uses repository `RAILWAY_TOKEN` and optional `RAILWAY_SERVICE` (`:61`), whose effective target is not established by the fixed demo project-token inspection. The jobs are siblings, without `needs`; workflow-level `railway-backend` concurrency (`:41`) serializes workflow runs, not sibling jobs within one run.

`agent-team/src/bug-pipeline/demo-deployment.mjs:352` requires the ENTIRE run conclusion to be success. Consequently a failed legacy job makes valid exact-demo proof unverifiable even when the demo job succeeds. The independent `failed-legacy-job` case used the real proof reader/verifier inputs and demonstrated rejection before native/live reads with a valid exact receipt available. This dependency is unconditional and reproducible; it is sufficient to fail the candidate's intended safe exact release path.

If the repository token can address the fixed demo service/environment, the legacy job is also an uncontrolled concurrent writer during exact deployment/readiness/proof. If it targets a distinct production environment, that same-target race does not occur. This review establishes neither token target; no same-target overwrite or actual production event is claimed. Final reinspection helps reject observed drift, but cannot exclude a later sibling write after receipt creation. The new policy selects this combined workflow for its first main merge/autopush, so retaining the legacy job byte-for-byte does not remove the integration risk. A legacy upload is never exact demo deployment proof.

Lead acknowledged the finding and requested FAILED VALIDATION, no merge of this candidate, and a read-only recommendation for an isolated manual workflow. No provider dispatch should be authorized from this packet.

## Independent evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Contract | PASS; validated before tests/harness | task-contract.md; repository validator printed CONTRACT VALIDO |
| Source freeze and scope | PASS | source-before.json, source-after.json, independent-inode snapshot/ |
| Focused actual demo workflow command | 150 PASS, 0 failed/skipped | focused-attempt-1.log/json |
| Full actual bug-pipeline workflow unit command | 725 total; 722 PASS, 0 failed, 3 native Windows skips | full-workflow-attempt-1.log/json |
| Private independent actual CLI subprocess cases | 41 PASS | independent-qa.mjs, cli-attempts/, independent-results.json |
| Real immutable reader/ZIP/verifier plus unknown selected policy | 8 PASS | independent-qa.mjs, independent-results.json |
| Extra native/topology/bounds checks | 10 PASS | independent-extra.mjs, independent-extra-results.json |
| Integration review | FAIL F1 | workflow and verifier line references above |
| Source and old evidence after checks | PASS, unchanged | source-after.json |

Commands independently executed on Node v24.19.0 with a minimal environment and no credential inheritance:

- `node --test agent-team/tests/bug-pipeline/demo-deployment.test.mjs`
- `node --test agent-team/tests/bug-pipeline/*.test.mjs scripts/quality-gate/claude-bug-review.test.mjs`
- `node /workspace/.clinicos-cloud/demo-exact-release-independent-qa1-20261019/independent-qa.mjs`
- `node /workspace/.clinicos-cloud/demo-exact-release-independent-qa1-20261019/independent-extra.mjs`

The full workflow command here means its specified unit-test step, not every hosted workflow step. Actual sandbox installation, isolated-services readiness and hosted Windows execution were not repeated or claimed.

CLI fixtures replace fetch in each actual child process and return synthetic Web Responses; they assert fixed official API URL, project-token header only, redirect rejection, AbortSignal presence, fixed mutation service/environment and exact commit SHA. No network fallback exists in that fixture. Successful child receipts are read from disk and require mode 0600, selected exact policy and source SHA. Rejected operations issue no receipt; uncertain mutation, denial, invalid identity or polling errors never submit a second mutation. Raw stdout, stderr and synthetic request histories are retained per case.

The independent tests cover fixed workflow/Actions/main/repository/event/run context; unknown CLI mode and policy; strict defaults versus explicit zero-trigger policy; pagination and missing domain lists; foreign source, token project/environment, service and instance; foreign branch/repository/project trigger; duplicate/null trigger; native commitHash rather than message; deployment target; stale/duplicate active identities; readiness routing; source drift after readiness; and denial/uncertain transport safe error behavior. The extra persistent SUCCESS stale/duplicate cases time out with one mutation and zero readiness requests. The genuine createProofReader path downloads a synthetic digest-bound ZIP from a synthetic signed storage URL with no GitHub Authorization forwarding, extracts and validates the actual receipt, then performs native/live/post-live verification. It demonstrates legacy missing-policy receipts cannot authorize zero triggers; explicit exact receipt policy drives both native inspections; unknown and mismatched policy reject; post-ready source/active drift rejects. No fake verifier was substituted.

## Security review and limits

The bounded diff adds no dependencies, PHI, clinical app changes, auth routes, sourceConnect/trigger writes/latestCommit or additional deployment mutation. All fixture data and bindings are synthetic. Provider denial/transport sentinel content and synthetic token are absent from CLI stdout/stderr. Existing API and ready responses use 1MiB and 16KiB bounds respectively, with redirects denied and per-request AbortSignal timeouts. Independent tests exercised those byte limits with real Web Response streams and checked timeout option presence; no real-duration timeout experiment is claimed. The changed producer and independent verifier both reread native deployment topology after live readiness. Historical policy is retained for missing sourcePolicy and strict receipts still require a trigger.

Inherited limitations: request timeouts are per-request, not a single total deployment deadline; configured polling can exceed the workflow's 40-minute cap in slow failure paths. Artifact listing and workflow run search have fixed first-page/search windows, potentially rejecting available older proof; rejection is fail-closed. No finite snapshot can prove continued readiness or exclude writes occurring after the final reread. Current code's UUID/run-number parsing and artifact parsing conventions were preserved. No separate security bypass was found in the bounded policy implementation; F1 prevents release approval.

Node 22 hosted execution, native Windows checks, actual project-token authorization, GitHub source-fetch permission, mutation acceptance, real native metadata and live provider routing remain unproven. Public official-schema research was read locally; no live API was queried. Synthetic PASS is no deployment proof.

## Read-only minimal remediation recommendation

1. Restore `.github/workflows/deploy-backend.yml` to the exact base bytes. Add a NEW, fixed-path exact-demo-only workflow with `workflow_dispatch` only, explicit reviewed SHA, main-only context, immutable SHA checkout, pinned actions, read-only permissions, dedicated demo environment/token and same `railway-backend` concurrency with cancel-in-progress false. Keep tests and provenance checks before the sole credential-bearing deploy step. Restoring the old workflow and adding only a new workflow/module/test should avoid the old backend workflow's path-filter trigger on the first infrastructure merge; verify the actual final diff against every listed path filter.
2. Bind source policy to workflow identity throughout producer context, receipt validation, immutable reader and preflight workflow discovery. Exact policy accepts only the new manual workflow; strict/missing policy accepts only the original old workflow. Do not broaden either policy to arbitrary workflows or make validateRun accept a union before knowing the authenticated receipt policy. Update fixed event requirements to manual dispatch for the new policy.
3. Require `reviewed_sha` to be a canonical full SHA equal to `GITHUB_SHA` and current protected-main head immediately before the one native mutation. Check again inside the trusted execution path after any environment approval/queue wait and target preflight; an early workflow-only comparison can become stale. Fail before mutation on missing/wrong/stale main data, untrusted workflow/ref/event, or unknown policy. Reading current main cannot atomically prevent a subsequent branch move, so report that residual limit and retain exact SHA selection and native/live rereads.
4. Root should drain every old running AND pending writer before the first manual dispatch, then observe only the new exact workflow's completed success and immutable receipt. Shared workflow concurrency prevents simultaneous runs across these two workflows; it does not make GitHub pending order FIFO or prevent future old backend pushes after the new run. A new-main commit while waiting should reject stale reviewed_sha. No token target inference or provider configuration change is needed for this source isolation.
5. Minimal source scope: existing demo module, its test, restoration of old deploy workflow, new manual workflow; add release wrapper/discovery tests only if their current assumptions require it. Amend the author contract before edits. Preserve all historical receipt/proof blobs.

Required regressions: old workflow byte identity and no new source changes match old push path filters; new workflow has dispatch-only fixed main reviewed-SHA gate, immutable checkout and exact-only token step, pinned actions, read-only permissions and exact shared concurrency; old path cannot select exact policy; new path cannot authorize legacy missing-policy receipts; cross-policy/workflow/event receipts reject; real immutable-reader discovery selects the correct fixed workflow; current main mismatch/unavailable/new commit after preflight rejects with zero mutations; valid current-main exact dispatch reaches one mutation; uncertain responses never retry; first exact receipt remains verifiable even if a separate old run failed; existing strict receipts remain valid; whole focused/full regressions, fresh independent QA and real required native reviews before any actual dispatch.

## Preservation and stop

Frozen source copies use distinct inodes. All 99 snapshotted files match their original hashes after checks. All 7,235 old proof Git entries, working-tree presence and present-file SHA256 hashes are unchanged; the historical trace is not duplicated. Git status remains empty and HEAD is unchanged. Original production workflow prefix SHA256 remains `8520e8d32b7ee84d38524d18a507ebd728238815d58d7c1a5064847b7f118c75`. Only three source paths plus the new author evidence packet differ from base. Disk free after checks: 1,566,007,296 bytes, above the 1GB stop floor.

No clinical UI is touched. Per lead's explicit CLI/HTTP-fixture scope, no clinical browser, shared browser lock, ports 3447/5447/55432, screenshot/video or provider preview was used. Media inventory records this as not captured; test stdout and fixture histories are the runtime evidence. This session is STOPPED after sealing this FAILED VALIDATION packet. Root selects any safe public excerpt and owns subsequent source/review/state actions.
