# Prior preparatory Max advisory — NOT release approval

# Advisory review: isolated ClinicOS development preparation

**Verdict: the preparation is safe to hold, but not ready to apply configuration or deploy.** Nothing is deployed, the baseline is untouched, and `parity: not-proven` is accurate. However, the parity target is undefined, and the current constraints make full parity impossible to prove.

I used no tools, so this relies only on your brief and manifest. The session's git context shows `b5e79ae7` at the top of the log, but I didn't verify the full SHA, tree, CI or source behavior. This is not a release approval.

## Blockers

1. **The parity oracle is undefined.**
   - The baseline has one `deploymentId` for several services and no source commit or tree.
   - Its runtime has no deployment and returns 404, so it can't serve as the AI reference.
   - **Fix:** record the baseline's per-service state read-only, and write an expected-behavior matrix from source and specs. Mark each row as baseline-comparable or spec-only.

2. **An empty database conflicts with full functional testing.**
   - With no seed or copy, data-dependent screens and workflows can't be compared with the demo. `DEMO_DATASET_ID=synthetic-v1` also names a dataset the database won't contain.
   - **Fix:** the owner should decide whether tests may create synthetic records through normal UI/API flows. If not, candidate parity can't be claimed for those workflows. Also check how the source uses this ID.

3. **The frontend has no target.**
   - `frontend: null` is consistent with three services, but it leaves browser, role and public alias parity untestable.
   - **Fix:** name an isolated frontend target, or record the existing architecture and how it will be built against the candidate API.

4. **The source-free `database` service is not yet a database.**
   - Its image, Postgres version, extensions and volume are unspecified, and persistence and "preserve data" depend on them.
   - **Fix:** pin these against the source's requirements and the baseline's read-only metadata.

5. **The AI test path has no authority.**
   - Copying credentials and using the production runtime are both ruled out, and no dedicated credential or spend limit is defined.
   - **Fix:** authorize a dedicated provider key with a provider-side cap, and set a numeric meaning for "significant spend". Railway limits may be workspace-wide, so check this rather than changing existing budgets.

6. **There is no authorized candidate release path.**
   - The old workflow must not be repointed, and the replacement doesn't exist yet. Adding it can also blur the source identity.
   - **Fix:** keep the workflow revision separate from the pinned app commit and record both in the receipt. It needs equivalent protection and should be scoped only to this project and environment. Name the human approver.

## High-risk findings

7. **Demo auth may be exposed.** A private Railway project doesn't make its endpoints private. Demo auth plus the role simulator could give anyone who reaches a public URL access to privileged roles, with no service expiry as a backstop.
   - Keep the database and runtime off public networking.
   - Decide how the backend is gated before creating any domain.
   - Set an owner and review date for the environment.

8. **Logging in to the baseline may write to it.** If it shares the source's upsert behavior, a parity login could change protected data. Treat baseline logins as prohibited unless explicitly authorized, and use only read-only checks otherwise.

9. **Revocation gets weaker with restarts and replicas.** A logged-out token can become valid again after a restart, for its remaining TTL. In-memory state also won't be shared across replicas.
   - Run one replica.
   - Test post-restart replay and record it as a known limitation, not a pass.
   - Confirm in source that `DEMO_AUTH_NO_EXPIRY` doesn't remove the JWT `exp`. If it does, the replay window is unbounded and this becomes a blocker.

10. **Policy v0 can hide a parity failure.** Its fallback can look healthy while differing from the baseline's stored policy. Compare the effective policy and role decisions, and report the policy source and version in the evidence.

11. **Source exactness can be lost at upload.** A CLI upload from this worktree could include the untracked `config/` and `artifacts/` directories, and repo auto-deploy could pick up a later commit.
    - Build from a clean export of the exact commit, with auto-deploy off and a frozen lockfile.
    - Record the archive hash, image digest and deployment ID for each service.
    - Confirm the runtime source is actually in this tree.

12. **Cross-target access is the largest blast radius.**
    - Use a token scoped to this project and environment, not a workspace token.
    - Use Railway reference variables for the database URL.
    - Fail before migrating if the project, environment, service or empty-database check doesn't match.
    - Make sure an unset runtime URL fails closed, with no hardcoded production or demo fallback.

13. **`NODE_ENV=production` may activate real integrations.** Audit email, SMS, webhooks, telemetry, storage and schedulers, and disable or isolate them. Tag logs so candidate activity can't be mistaken for the demo.

14. **Migration failure has no recovery path.** Cleanup SQL is forbidden and data must be preserved, so a partial migration currently has nowhere to go. Pre-authorize stopping, keeping the evidence, and using a new isolated database. Also check whether backend startup runs migrations, because each restart would then need a receipt.

## Manifest gaps

- **State evidence:** `source-free-services-verified` has no evidence reference, timestamp or hash.
- **Configuration:** it omits the secret variable names, service wiring, CORS and frontend URLs, and AI settings. Compare the simulator flags against the source guard.
- **Governance:** it has no approver, spend limit, baseline workspace or cutover staleness rule.
- **Rollback:** "candidate-only configuration" should name the exact control and how to verify it.

## Safest next steps

1. **Freeze the current state:** keep configuration, deployment and aliases unchanged, and confirm `config/` and `artifacts/` contain no secrets.
2. **Get owner decisions on:** test-data creation, the frontend target, the AI credential and spend limit, network access, baseline login policy and the release approver.
3. **Complete the source audit:** cover the auth guard, token expiry, dataset ID, runtime fallback, migrations and outbound integrations.
4. **Publish manifest v2:** add the parity matrix, evidence schema and stop conditions, then have it re-reviewed.
5. **Build the candidate release path:** add target preflight checks and check them with a dry run before any write.
6. **Deploy in order:** provision the database, apply fresh secrets, migrate and capture the receipt, then deploy the backend, runtime and frontend from pinned artifacts. Stop on any mismatch.
7. **Run the full test suite:**
   - Every role and route, including denial of unmapped routes
   - Concurrent first logins
   - Persistence across restarts
   - Rejection of tokens from other environments, without logging in to the baseline
   - Capped AI success, plus runtime and provider failures
   - Database outage and failed migration behavior
8. **Report parity:** mark each matrix row as passed, failed or not provable, and keep every limitation visible. Even a clean result only supports a separate cutover decision by the human approver, using current CI, review and QA gates.

Report the baseline runtime outage to the demo owner as a separate issue, and don't fix it as part of this work.
