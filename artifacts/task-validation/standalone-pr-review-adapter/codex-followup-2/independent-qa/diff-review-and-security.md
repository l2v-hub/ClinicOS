# Independent diff and security review

PASS — no correctness or security defect found in the frozen candidate during this review. Reviewed complete current controller additions/changes against local origin/main, original standalone verifier/merge/workspace/model boundary, and follow-up changes from fcabd40713ad355c944d7aff3fcfa7852dce01e9. Raw comparison data is in full-main-source.diff and followup.diff. New untracked attempt-budget.mjs/review-policy.mjs are covered by source-freeze.json and were read in full. Fresh author scope amendment explicitly permits external-review.mjs and bounded Claude-helper allowance parsing. The new modules remove duplicated budget and policy decisions and are themselves protected.

The repository diff has no frontend/backend/runtime/schema/dependency/lockfile/.github edits. Application builds and clinical runtime are outside this controller-only validation; none are claimed. No dependency install was necessary. Node built-in test suite exceeds the existing Linux CI controller unit-test target; Windows-native scheduler/ACL/bootstrap verification and full hosted CI are not reproduced on this Linux Node24 host.

| Security area | Result and evidence |
| --- | --- |
| Secrets | PASS. Candidate diagnostics use owned bounded codes; no raw transport stderr. Provider-key fallback removed from both entrypoints. Publication byte/ZIP-member scan and decoded-media review required at final seal. |
| PHI | PASS. Synthetic controller fixtures only; private actual controller snapshot excluded from publication and never served to browser. No clinical service or patient DB accessed. |
| Logging | PASS. CLI prints identifiers/status/counts/auth mode, not credential contents or clinical payloads. Error tests confirm sanitized persisted/projection output. |
| Input bounds | PASS. Manifest/report pre-read, aggregate state/subject/result reservations and schema/path bounds retained. Recovery/extension require bounded reason and authority reference plus exact tokens. |
| AuthZ | PASS. Maintain/admin recovery/extension rechecked in mutation guard; exact subject/actor/CAS identity retained. Reviewer process identity is not inferred from same-account ownership. |
| Native release | PASS locally. Caller-expanded allowlists cannot merge protected sources or .github paths. Distinct human native review must be current-head, authorized User, nonauthor/nonreviewer/nonfinalizer; latest dismissed/stale/Bot/self reviews reject. |
| Injection/XSS | PASS. No new app endpoint, SQL, eval, raw user HTML or shell interpolation. QA-only loopback HTML uses fixed synthetic fields and textContent; rendered report escapes HTML. |
| Dependencies/config | PASS. No added package, CORS/prod flag weakening, workflow edit or native admin bypass. QA surface exists only in this external evidence directory. |
| History | PASS. Shared collection ownership rejects overlap; audited prefix hashes bind prior implementation/review bytes. Fresh reservations omit inherited terminal proof fields. 369 prior proof hashes checked before and after. Full actual post-migration state validates all collections, active432continuation5, and local Git packets for393/491. Root archived two old duplicate transfer tombstones with complete snapshots; their record/canonical hashes and exact legacy prefixes were independently verified, and reintroduction rejects F2. |

Relevant boundaries: review-policy.mjs requiresHumanReview/standaloneMergePolicy; standalone-review.mjs mergeStandaloneReview/verify/native/current/operation; comment-review-handoff.mjs maintainer/recover/extendBudget/save; github.mjs nativeReviewAuthorization/createStateStore; pipeline.mjs isolated reload; review-handoff-cli.mjs finalizeEnvironment and phase-aware output.

Actual GitHub native protection and approval were not queried in this QA. Root supplied the prior observation that admin protection API access returned403 and accessible GET rules/branches/main exposed required checks only. This does not establish that classic protection is absent. Trust-root PR492 remains manual/human-gated; no actual approval or release authority is fabricated by these synthetic fixtures.
