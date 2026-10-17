# Attempt4 implementation validation — new independent QA required

This is the last existing maintenance-470 attempt, not a new budget. The root-authored `attempt-4-correction-addendum.md` was read before implementation. Attempt3 manifests, logs and `independent-qa-attempt-3/` remain untouched. No actual remote request/mutation, deploy, cleanup, browser login, commit or push was performed.

## F1 — operational container replacement, not restart acknowledgements

The storage phase no longer accepts restart ACKs or stale HTTP200 as cache/source cleanup. The explicitly authorized fallback invokes official `deploymentRedeploy` of the exact frozen backend/runtime deployment IDs with `usePreviousImageTag:true`. It never deploys main, the maintenance branch, or a newly selected revision. Both service source/build/deploy settings and all nongenerated configuration variables are compared before mutation and after convergence/health. Known deployment metadata is compared on the new deployment; output describes the provider's native same-code/build/deploy-config clone attestation, and explicitly claims no independently measured immutable image digest.

The complete verified environment has only one recognized PostgreSQL volume and no application/runtime volumes. A native loop requires the uniquely identified new deployment and one RUNNING instance per service, changed instance identity, all previously observed old instances explicitly terminal, old deploymentStopped=true, and no other transitional/active instances. Missing old instance records are not accepted as terminal evidence. Persistence/source/config and unchanged new-instance identity are checked again after actual healthy backend database/policy/demo and runtime available/errors/roles payloads.

Public runtime health is permitted only on a natively mapped HTTPS domain. A private runtime uses a strictly target-bound, read-only, volume-free owned worker with no database code or provider credentials in its source. It verifies its demo service identity, fetches only the preverified private runtime health path, emits allowlisted booleans/role names, and deletes its exact owned service in finally with a separate cleanup budget. Source/template metadata and IDs are never promoted into invented provider image hashes. Native permission/unsupported outcomes remain distinct static diagnostic categories, without raw sensitive errors.

The new storage job uses concurrency group `railway-backend`, cancel-in-progress:false. Root additionally holds main rollout while the operational snapshot is active. Existing production and inventory jobs are unchanged.

## F2 — actual database volume binding

Before snapshot enumeration or any redeploy, the selected exact demo volume must be READY; its canonical absolute mount must equal the database service's injected RAILWAY_VOLUME_MOUNT_PATH and contain canonical PGDATA. Missing paths, traversal, unrelated/inactive mounts, extra volumes and ambiguous persistence fail closed. The source environment/binding is repeatedly re-read during convergence and final attestation.

## F3 — fail-closed evidence publication

All browser media is recorded in a private0700 sibling staging directory outside every uploaded path. Unexpected content, process kill or step timeout cannot leave media in the published directory. Full empty/reload/privacy assertions, trace checks, finalized video and successful session revocation must pass before the complete bundle is atomically renamed into the published path. A failed logout publishes no media. Safe failure JSON is separate and never contains patient content, raw errors or tokens.

The workflow media upload requires success from both the actual verifier step and a separate published-bundle validation step. Only the exact safe failure JSON path has an always-upload rule. The gate checks completed verdict/value assertions, PNG/video presence and headers, safe trace, session revocation and the complete publication version.

## Validation performed

- 41 unit/failure/security tests PASS, 0 FAIL, 0 SKIP: `attempt-4-unit-results.txt`.
- New negatives include old200, old-not-stopped, surviving/missing old instance records, replica transition, changed source/config/revision, invalid backend/runtime health, unrelated/inactive/traversal PGDATA mount before sensitive operations, denied/unsupported native access redaction, invalid private worker health with exact cleanup, SIGKILL before emptiness proof, failed logout, and independent media gate.
- The browser publication fixtures are explicitly synthetic controlled failures, not actual online browser evidence. They use real ZIP/file publication and a real child SIGKILL. No local Docker browser, TLS bypass or shared NSS change was used.
- All11 extracted GraphQL query/mutation literals were parsed and validated against official Railway CLI v5.66.0 introspection schema using isolated temporary graphql16.11 tooling: PASS. Schema SHA2563c3d1448f2a746d6e5977ba3aa205889f959c427be5cfe37c72e79b1fa65f2be. Audit: `attempt-4-schema-audit.json`. A missing query brace was caught and corrected during development before handoff; no unknown field/argument remains. No product dependencies changed.
- Source syntax and git whitespace checks PASS.
- SQL cleanup implementation, full43-table PostgreSQL fixture and original readonly inventory are unchanged from independently tested attempt3. Their immutable hashes are checked in `attempt-4-source-sha256.json`; no new SQL behavior or runtime success is asserted. Earlier actual PostgreSQL proof remains in attempt3 artifacts; QA4 must validate independently.

## Pending

A fresh dedicated QA4 verdict and root full source review are mandatory. Nothing is ready for live execution merely because these tests pass. Actual database cleanup, snapshot/source replacement, real private/public health, and hosted online screenshot/video are still unexecuted. Any missing actual target/config/persistence/convergence/health proof remains BLOCKED. There is no fifth implementation attempt and no new token request.
