# Task Contract

## Task
- Title: profiles restore no expiry 20261104
- Slug: profiles-restore-no-expiry-20261104
- Type: feature
- Date: 2026-11-04
- Baseline: main6e3d880921653465ca0527b40f9fc09f6486ada2; preserve PR525 history through ca42860980bc5df5a2718cb47806d48b6d886e75.
- Owner: Codex root, existing standalone-pr-525 ownership retained, isolated writing checkout.

## Authority and sequencing

The user's new explicit instructions supersede the finite2029 plan: restore the CURRENT online app FIRST with original passwordless five-profile chooser, respective server-resolved permissions, all existing functions and NO service cutoff. User authorizes PRs, protected auto-merge and verified deploy autonomously; all data is stated synthetic/disposable and unused production infrastructure may be used if needed. Preserve all local files, attempts, reviews and original evidence; no approval transfer or reset. Reconcile the new scope/authority in the controller before implementation. Phase2 single-development-stream consolidation starts AFTER restored access, with parity before replacement; it cannot delay or substitute this restoration. No database/storage deletion, cleanup SQL, seeding, unrelated feature or issue506 workaround.

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes: existing chooser and login behaviour; edits only if needed |
| Backend/API | yes |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | yes |
| Privacy / Security | yes |
| Config / Env | yes |

## Current Behaviour

Actual public frontend points to clinicos-backend-demo.up.railway.app. Public ready is tier demo, auth disabled, simulator false, expiry2026-10-31. The finite backend predicate blocks access; this is not only a visual message. Five server-owned simulated identities already exist. PR525 has greenCI and real Max3 changes-requested (LOW EOF), not approval of the new scope.

## Expected Behaviour

Add an explicit, validated hosted-SYNTHETIC no-expiry mode rather than a distant timestamp. Require correct explicit tier/purpose, dataset, auth/allow flags and configured signing secret. Malformed/conflicting/missing prerequisites fail closed, never fall through to self-declared operator headers. Ordinary finite behaviour and real-production/Entra/staging safety remain independently tested. Token TTL/logout/revocation are separate from unlimited service availability.

The public URL must serve the real complete app and five actual server identities; login obtains a signed session and auth/me resolves the stored policy roles/capabilities. Reload returns the chooser by existing design. No policy or data reset.

## Acceptance Criteria

- AC1: Dedicated explicit opt-in enables unlimited hosted synthetic profile availability only with validated prerequisites; no future date dependency.
- AC2: Auth/status metadata truthfully shows enabled simulator and no effective expiry; stale date cannot hide chooser. No frontend-only bypass.
- AC3: Real production, unknown/missing tier, wrong dataset/mode, short/missing secret, disabled simulator and malformed flags remain closed. Finite mode tests/assertions unchanged.
- AC4: All five real local-backend identity/session/auth-me flows yield respective active policy roles/capabilities. Spoofed headers, forged/expired/revoked tokens and forbidden lower-role operations remain refused.
- AC5: Built-App browser tests assert five chooser entries/login/expected shells and reload on desktop/mobile, with existing synthetic feature smoke and no relevant console/HTTP errors.
- AC6: Build-context/Windows-CI corrections retain all assertions/ten patterns; remove both source EOF errors. Old packets/review3 are immutable.
- AC7: Focused/regression tests, builds/types, exact-headCI, genuine exact-head Max review and distinct final Codex QA precede protected merge. No counter reset, invented grant or approval transfer.
- AC8: Configuration mutation is fixed-target, separately authorized and source-bound; expiry effectively absent, not another future date. No production-token fallback, secrets/clinical payload in evidence or cleanup/migration beyond existing forward-only deployment behaviour.
- AC9: Exact reviewed source deployed; actual public ready/auth and real chooser/profile/session tests prove restored online access. Safe screenshots pinned to source/evidence commit; issue stays open until proven.
- AC10: Dirty primary/unrelated files/branches/claims preserved; no broad issue processing or phase2 cutover substitutes AC9.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Flags/tier/secret/date truth tables; unchanged finite mode |
| Integration | yes | Real HTTP identity/session/policy/revocation |
| API | yes | Status/five identities/session/me, negative authorization |
| Playwright | yes | Complete real built App/backend, desktop/mobile |
| Persistence after refresh | yes | Existing chooser reload behaviour, no data reset |
| Agnos action registry | no | No change; authorization regressions retained |
| Voice simulation | no | Unchanged |
| OCR/import test | existing regression | No feature change |
| Security/privacy scan | yes | No credentials/PHI, no role/header/production bypass |
| Exact-head CI/build | yes | No stale source approval |
| Public deployment verification | yes | Actual user outcome |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

Preserve actual RED/GREEN and hashes/receipts, separate independent QA checkout and real built-App screenshots/video/trace/report using synthetic fixtures. Never publish JWTs/cookies, patient documents, raw clinical responses or online authentication traces/HAR. Online tokens stay memory-only. Clearly distinguish local fixture proof from actual public proof and bind deployed source separately from later evidence-only commit. Root records real review/finalQA/protectedmerge/configcapability/deployment receipts.

## Risks

Wrong target/policy, permissive fallback, malformed flags and credential leakage block release. Do not set NODE_ENV=development as a hosted shortcut. Keep real-production fail-closed policy; unused infrastructure permission does not qualify real clinical use. Disposable data does not require destructive action. Prior finite-stage/failed-deploy records remain history, not reusable grants. Phase2 follows actual restoration only.

## Gate Status

READY FOR IMPLEMENTATION
