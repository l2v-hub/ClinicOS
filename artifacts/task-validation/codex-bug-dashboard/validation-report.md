# Validation report — lifecycle, dashboard and external review handoff

Date: 2026-10-16. Independent dedicated QA; existing PR471. This report covers the preparation requested by the user, including their latest choice of a personal external Claude Code cron. Exact reviewed source bytes are recorded in `qa-reviewed-files.sha256` (24 files; all verified).

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS | `task-contract.md`, `implementation-plan.md` |
| 1 Diff review | PASS; recovery, completion-proof, closed-source and feedback-race findings fixed; no unresolved source finding | `qa-gate.md`, `qa-reviewed-files.sha256` |
| 2 Build/tests | PASS; independent112/112 regressions, external9/9, cache/failure2/2, source syntax,3workflow YAML and3inline JavaScript blocks | `test-results/qa-combined-regressions.txt`, `test-results/qa-external-review-final.txt`, `test-results/qa-dashboard-probes.txt`, `test-results/qa-static-checks.txt` |
| 2 Unchanged app build | Prior independent evidence carried forward; clinical React app/package/schema source unchanged | `../codex-runner-activation/test-results/qa-frontend-build-carried-forward.txt` |
| 3 Browser | PASS2/2; concrete queue/phase/status values, external waiting-review/setup mapping, real read-only live snapshot, refresh/reload/staleness/recovery, zero console/page/relevant HTTP errors | `test-results/qa-browser-external-final.txt`, `result.png`, `stale-result.png`, `live-result.png`, `trace.zip`, `live-trace.zip`, `synthetic-video.webm`, `live-video.webm`, `playwright-report/index.html` |
| 4 Security | PASS; loopback GET-only dashboard, whitelisted DTO, authenticated controller, exact-SHA CAS and hashed reports, bounded attempts, no Actions Claude credentials or API fallback | Security checklist and fixed findings in `qa-gate.md`; meaningful negative protocol/server regressions |

The earlier native run38973156720 actually passed sandbox/service readiness:93 regressions, HTTP/PostgreSQL,58 migrations, external TCP/UDP/proxy denial and outside-write/exit-code checks. Final changed-source required CI must run after push; prior native evidence is not represented as final112-test native CI.

The actual live dashboard showed zero authorized queued/processing/blocked/resolved items, four externally managed QA issues and467 awaiting activation. Synthetic resolved rows prove rendering/lifecycle behavior only. The authoritative setup ledger retains one failed review attempt, with three remaining; no reset occurred.

QA invoked no provider, ran no personal cron, mutated no GitHub state, claimed no live bug and performed no merge/deploy. Actual external subscription authentication/review, default-branch activation and deployment are not asserted. These remain subject to the existing CI, human protections and release gates. The first browser recorder prerequisite failure and its supported system-ffmpeg correction are documented in `qa-gate.md`; real final trace/video evidence exists.

**READY FOR CODEX QA** for the reviewed preparation scope. Proceed to required CI and external review handoff; this verdict does not certify an executed live end-to-end bug/review/release cycle.
