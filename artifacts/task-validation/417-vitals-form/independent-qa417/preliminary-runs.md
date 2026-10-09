# Immutable preliminary evidence

No application source changed between any runs. All runs target application commit `02b4ba89af291186a72e040b868da024bb865164`.

| Run | Result | Cause and correction |
|---|---|---|
| run01 | 18/21 passed, 3 failed | Two AC3 bounded-caption assertions incorrectly counted all SPA reading requests, including unchanged dashboard LazyNews2 and chart period-history cursor loading. Third failure equated all injected 503 attempts to observed responses, even when navigation intentionally aborted requests. Original scripts, raw JSON, failed screenshots, traces, video and HTML report retained. |
| run02 | 23/24 passed, 1 failed | Phase-labeling still included four existing ward patient-row LazyNews2 requests plus two mounts of the shared caption hook. Assertion incorrectly capped all phase calls. No threshold was relaxed: hook requests were instead identified by actual Chromium CDP initiator stack containing usePreviousParameterValues.ts. Exact request-index/path/status HTTP fault allowlist replaces ordered injected-versus-observed equality; aborted calls need not yield a response. |
| run03-origin-probe | 2/2 passed | Actual shared-caption origin produces exactly two development StrictMode requests, each GETlimit50 for selected QA417-A only, no cursor or fanout. Both views tested. |
| run04-final | 24/24 passed | Entire strengthened suite rerun, no retries/skips/flaky tests. Final scripts copied into run04-final/original-* before execution; every capability has its own result assertions, runtime/HTTP ledger, screenshot, trace and video. |

These were harness assertion defects, not application defects. The unchanged patient-row NEWS2 behavior is NOT claimed to have no roster-wide reads. The scoped claim is that the newly extracted historical-caption hook loads one bounded selected-patient page and never pre-fills inputs. Final runtime HTTP failures are exclusively deliberate synthetic 400/503 injections matched by request index, endpoint and status. No application console exception, unexpected HTTP failure, unexpected mutation or external network activity is accepted.
