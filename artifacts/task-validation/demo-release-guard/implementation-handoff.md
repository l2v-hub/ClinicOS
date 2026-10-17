# Preparatory implementation handoff

Status: implemented locally for independent QA; NOT published, activated, deployed or Claude-approved. All feature groups remain under root control outside automatic release. Baseline a516d42e31f6674c39c1d130c9706cd80a7ab4c6. No GitHub state mutation, secrets access/export, commit or push performed by the implementer.

## Behavior

- Dedicated demo job uses existing demo environment/token and fixed project/environment/service/domain. Read-only preflight requires native source repo and a unique exact-main deployment trigger. This deliberately fails if the service is only configured for manual uploads; no automatic source reconfiguration occurs.
- Manual workflow dispatch defaults to `operation=preflight`; production deployment is skipped and no mutation is issued. Explicit deploy and backend-related main push use exact-source commitSha API and wait for SUCCESS, native commitHash, active deployment membership and public /ready matching deployment UUID.
- Immutable artifact receipt binds main source, target, run/attempt and successful live deployment. Release checks actual GitHub run metadata and archive SHA256 before bounded JSON extraction; it rechecks Railway native target/provenance and public no-store readiness before recording and publication.
- Premerge backend releases require a fresh successful preflight artifact at CURRENT main SHA. Old production success URLs cannot authorize merge or closure. A new main revision may need a fresh read-only preflight if no backend deploy run generated one.
- Actual live verification uses a separate final confirmation job in the demo environment. The production job never receives the demo credential. Existing frontend deployment behavior is retained; root's final real frontend alias/API binding check remains necessary.
- Durable `batch.releaseHold` holds whenever its value is present and differs from null/false. It blocks automatic candidate selection, manual release, immediately-before-merge recheck, recording and immediately-before-closure checks. Clearing requires removal/null/false under root's authenticated state ownership; this task does not clear any hold or reset budgets.

## Local validation

- Full bug-pipeline suite: actual terminal totals in bug-pipeline-tests.log (last complete run198 tests,195 pass,0 fail,3 native-Windows skips; final hardening rerun retained).
- Focused helper/release suite:78 pass,0 fail. Covers native exact commit metadata, wrong source/branch/project/environment/domain, missing/stale/fork/wrong-run/wrong-attempt proof, archive tampering, secret isolation, no credential forwarding, live redirects/HTTP errors/cache/old instance, hold races and no premature closure.
- Real local HTTP readiness test:1 pass,0 fail, no database connection; both healthy and dependency-failure responses asserted. Optional UUID validates length/shape, rejects malformed/newline values; no new auth route.
- Backend TypeScript noEmit: pass.
- Frontend TypeScript noEmit: pass; production build log records final result.
- YAML parsing and structural credential/environment/job tests pass. Native actionlint NOT run: public release binary download returned empty archive; /usr/bin/go is an unrelated utility and rejects `run`. Do not count these failed tool acquisition attempts as a lint pass. Dedicated QA/native GitHub CI must assess workflow semantics.

Early setup attempts failed because Prisma config needs an explicit synthetic DATABASE_URL; generation and readiness test then passed with an isolated own-worktree Prisma client. No root/clinical-worktree generated client was modified. No Docker operation was performed.

## Remaining gates

Dedicated independent full-diff/security/build/test QA with a safe synthetic QA-only browser surface and screenshot/trace/video is required. Root must publish only after that verdict and native checks. Infrastructure bootstrap must be governed explicitly by root: normal feature groups are not promoted until trusted main contains this guard. A workflow inside an unmerged PR cannot govern existing trusted-main release instances. Existing setup474 Max budget stays untouched; feature Claude Max approvals must be actual exact-SHA reviews under the normal durable budget.

After infrastructure is on main, run the read-only preflight to determine whether existing demo source/trigger is configured; missing source/token/provenance is a real blocker, not permission to substitute a message, health200 or fabricated successful status. Actual reviewed feature rollout then needs the native live receipt and root's real frontend alias binding check before issue closure.
