# Independent QA — label intake recovery

Verdict: **READY FOR CODEX QA**.

Dedicated QA session independent of implementation. Base `b058ce032e5b1d73050353e849103ea438f7d613`; exact reviewed source hashes in `reviewed-source-manifest.json`. No production issue writes, remote state changes, paid inference, closure, merge or deploy performed by QA.

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS | Parent `task-contract.md`, five acceptance criteria checked against latest source |
| 1 Diff | PASS | GitHub actor authorization, label-only recovery, read-only dashboard, job concurrency and documentation only; `git diff --check` zero errors |
| 2 Build/tests | PASS | Independent frontend `npx tsc --noEmit` then `npm run build`; `test-results/frontend-build.log`. Full bug-pipeline132 total129PASS/0FAIL/3native-WindowsSKIP (`test-results/full-regression.log`); relevant source42/42 (`test-results/regression.log`); independent boundary matrix27/27 (`test-results/authorization.log`) |
| 3 Browser | PASS | Actual dashboard server+snapshot, explicit QA-only synthetic adapter, real Chromium1/1; `result.png`, `trace.zip`, `video.webm`, `playwright-report/index.html`, raw `test-results/browser/` and `browser.log` |
| 4 Security | PASS | Checklist below; unknown/Bot actors remain fail-closed, external ownership preserved |

## Findings and resolution

1. Initial diff would normalize labels on externally owned work before eligibility filtering. Latest `github.mjs:214` excludes all five external ownership labels from normalization; independent matrix proves zero mutation for each. Existing pipeline still performs fresh ownership/authorization checks before claim and inference. External issues can remain visible for status transparency.
2. Initial Bot fallback checked the command author's permission without requiring GitHub type User. Latest `github.mjs:189` requires User; independent negative tests for Bot/null/Unknown author metadata all pass. Bot needs recent exact authorized command; near-match, stale, future and non-write authors fail.

No remaining source correctness/security finding on the reviewed diff.

## Browser assertions

Synthetic opted-in issue801 exists only in queue, without bug classification, and appears as In coda/Raccolta issue per accorpamento. Synthetic issue802 likewise comes from queue and retains Gestita da altro flusso/Verifica QA esterna because ready-for-qa is preserved. Queued count1 and processing0, statuses and values persist after reload and explicit refresh. Private synthetic title/body/comment markers are absent from both JSON DTO and rendered text. No console/page errors or HTTP errors; error banner hidden. Screenshot taken from this QA run.

## Security checklist

| Check | Result |
| --- | --- |
| Secrets | PASS — no credential values, auth files or connection strings added; fixtures synthetic |
| PHI | PASS — synthetic fixtures/evidence only; actual read-only queue receipt contains IDs/counts/statuses only |
| Logging | PASS — no clinical text or raw issue/model payload introduced into dashboard DTO |
| Input validation | PASS — existing repo/issue/login validators retained; actor type and exact command checks strengthened |
| AuthZ | PASS — write/maintain/admin required; read/triage/none, Bot self-authorization and unknown types rejected; zero normalization before authorization |
| Injection/XSS | PASS — no SQL or raw HTML added; DTO emits only bounded known fields and ID-derived URLs |
| Dependencies | PASS — no package/dependency changes |
| Config | PASS — trusted-main checkout, same serial group and cancel-in-progress false retained; irrelevant label jobs filtered before queue; read-only dashboard remains loopback/Host/Origin/CSP guarded; QA adapter requires explicit env flag |

## Evidence scope and limits

The actual GitHub side-by-side read-only receipt (`../read-only-queue-result.json`, produced by controller session) records old adapter0 vs fixed adapter16 authorized entries:13queued and3externally managed, with zero writes. This supports the diagnosed emptyqueue behavior; it does not prove production implementation, model execution or release.

Three native Windows tests are skipped by design on this Linux host; native Windows CI must still run on the published revision. Browser uses installed Chromium and cached system-backed ffmpeg; no API/provider call required. Frontend build emits existing bundle/plugin timing advisories but completes successfully. Native Actions scheduling behavior after merge must be verified on main; the local workflow structural regression proves location/filter invariants, not a hosted event execution.

An initial QA-only matrix run mistakenly defaulted explicit undefined actorType to User through JavaScript destructuring; corrected synthetic unknown-type fixture to null and reran all27 tests successfully. This was a QA fixture issue, not a source defect.

Do not reset durable collections or four-cycle budgets; this patch leaves grouping, frozen plans, implementation/review budgets, Max review and verified-release closure logic unchanged. Existing production pending queue has not been claimed by this QA session. Preserve unrelated `scripts/maintenance/demo-patient-cleanup.sql`.
