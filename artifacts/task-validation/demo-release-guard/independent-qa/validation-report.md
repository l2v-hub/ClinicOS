# Independent QA — demo release guard, cycle 1

Verdict: **FAILED VALIDATION**. The candidate must return to the implementer before publication.

Dedicated reviewer: `/root/release_guard_qa`; this session did not author or coordinate the source changes. Baseline: `a516d42e31f6674c39c1d130c9706cd80a7ab4c6`. Source: eight unstaged candidate files, all matching the handoff SHA256 manifest. No commit, push, GitHub mutation, model invocation, deployment, patient data or real credential was used.

## Finding

**QA-F1 — Cacheable readiness accepted as uncached deployment proof.** `agent-team/src/bug-pipeline/demo-deployment.mjs:113` checks `/\bno-store\b/i` anywhere in the Cache-Control header. The matcher accepts an unknown extension name or quoted extension value containing the same words. For example, `Cache-Control: public, max-age=3600, x-no-store-extension=1` permits caching, but `verifyLiveReady` returns a verified healthy deployment. This violates AC3/AC4/AC6: the live routing check can consume a cached response instead of proving which deployment currently serves the domain.

The independent regression file `cache-directive-negative.test.mjs` is **RED: 0 pass, 3 fail**, all with `Missing expected rejection`. Other accepted lookalikes are `no-store-extension` and `extension="no-store"`. Exact output is preserved in `cache-directive-negative.log`. Require an exact Cache-Control directive token, and test genuine no-store case-insensitively with whitespace/combined headers while rejecting prefix, suffix and quoted-value lookalikes. Do not weaken dependency, UUID or target checks.

## Phase results

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS | Parent-authorized infrastructure task; `../task-contract.md` AC1–AC6 and `../implementation-plan.md` read before review. AC1 uses the old word “upload”; the plan explicitly records parent-approved native `serviceInstanceDeployV2(commitSha)` instead. This wording discrepancy is not a product failure. |
| 1 Full diff review | FAIL | QA-F1 above. All five tracked and three new source files independently reviewed. Scope is confined to the frozen eight source files and task evidence; `git diff --check` passed. No unrelated frontend, schema, policy or data change. |
| 2 Independent build/tests | FAIL | Existing suites green, but the three independent cache-directive negatives fail. Full pipeline: 198 total, 195 pass, 0 fail, 3 Windows-only skips. Focused helper/release: 78/78 pass. Actual local backend readiness HTTP: 1/1 pass. Backend and frontend TypeScript noEmit pass; frontend production build pass (740 modules, 36.44 s). |
| 3 Synthetic Playwright | FAIL — defect reproduced visually; evidence complete | Actual production helpers invoked against synthetic localhost HTTP responses. Ten scenarios: nine desired decisions, one incorrect VERIFIED for cache-extension-defect. All actual values retained after reload; zero console/page/HTTP errors. Screenshot visually inspected; valid trace ZIP and actual WebM recorded. See final-result.png, trace.zip, test-results/, playwright-report/, browser-results.json. |
| 4 Security review | PASS with provenance correctness finding QA-F1 | Fixed official origins; exact repository/main/run/attempt/SHA/target; archive digest and bounded JSON extraction; redirect blocking; credential isolation; dedicated demo environment; no secret forwarding or error-body logging; no new package, auth route, unsafe SQL, PHI or product QA hook. The no-store acceptance defect is explicitly a release-proof correctness failure, not excused by these passing controls. |

## Independent protocol and workflow review

The official Railway CLI v5.66.0 GraphQL schema was independently downloaded from its public source over verified TLS. `railway-schema-review.json` records its SHA256 and the actual relevant argument/return shapes: the optional exact `commitSha` parameter exists; service/environment/project types, source.repo, active deployments and exact-main deployment triggers match the helper queries. No real Railway API call was made. Missing source or trigger remains fail-closed.

Both workflow YAML files parse successfully. Existing actual structural tests verify demo credential isolation, exact checkout, default read-only dispatch, demo-environment confirmation and no demo secret in the production job. Native actionlint was unavailable; this is **not** a native-actionlint pass. Native GitHub Actions validation and live source binding/preflight remain later root gates.

The hold checks cover automatic selection, manual candidate validation, post-await premerge reread, post-live-verification record reread and immediately before issue status mutation. Existing four-cycle/review ledgers are not altered. The source deploy and read-only preflight are distinct. A production-only successful URL cannot satisfy the new backend closure path. Signed artifact storage receives no GitHub token. Backend readiness exposes only the optional well-formed nonsecret UUID and preserves no-store/DB/policy status handling.

## Commands and limits

- `node --test agent-team/tests/bug-pipeline/*.test.mjs` — `bug-pipeline-tests.log`.
- `node --test agent-team/tests/bug-pipeline/demo-deployment.test.mjs agent-team/tests/bug-pipeline/release.test.mjs` — `focused-tests.log`.
- Sanitized `env -i` + `node --import tsx --test backend/src/lib/__tests__/readiness-deployment.test.ts` with a synthetic localhost database URL and injected readiness dependencies — `backend-readiness.log`; no database connection.
- `tsc --noEmit -p backend/tsconfig.json`, `tsc --noEmit -p frontend/tsconfig.json`, `npm run build -w frontend` — respective logs.
- `env -i ... node --test .../cache-directive-negative.test.mjs` — `cache-directive-negative.log` (expected proof of actual candidate failure).

All eight source files remain unchanged. Before/after browser source hash assertions and final scope audit passed; source-hashes-before.json, source-hashes-after.json and candidate-source-hashes.json preserve all eight exact candidate hashes. No live activation, actual demo deployment, final Claude review, frontend alias binding, issue completion or release approval is claimed by this QA result.

Browser execution held `/tmp/clinicos-browser-qa.lock` for its entire local server/browser lifecycle. No Docker operation or shared NSS/trust change occurred. The surface used system fonts and did not load external assets. Video used the installed `/usr/bin/ffmpeg` through a task-local Playwright cache symlink; no downloaded/replaced browser binary or TLS bypass. The entire synthetic subprocess environment was `env -i` with only PATH and task-local PLAYWRIGHT_BROWSERS_PATH.
