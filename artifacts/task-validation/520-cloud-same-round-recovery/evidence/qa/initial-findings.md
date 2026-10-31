# Independent QA — initial findings, retained

Reviewed base: `59f0a9ea60bd56d1823305da9b18fa0bca8db213`.
Initial candidate: `fe35e6c6a01050220288ead3da036c1d0c4f900d`.
Harness correction reviewed separately at `430afa979e50ed64d46c019c0e257e09d8f0b92e`.
Session: `qa_gate520_infra`, not an implementation session.

## Findings

1. **P1 — live qualification inference precedes the one-shot claim.**
   `agent-team/src/bug-pipeline/cloud-review-recovery-worker.mjs:62` calls
   `probeCloudClaude` before `controller.claim`. That native probe itself runs
   `claude --print`, without a claim, as shown in
   `agent-team/src/bug-pipeline/cloud-review-worker.mjs:400`. Concurrent or repeated
   dispatches can therefore execute unaccounted provider calls even when only one
   recovery claim wins. The already approved probe is not reused. The transport
   tests mock qualification and count only the final review call, hiding this
   behavior. This violates the same-round one-shot safety envelope (AC2/AC4).
   Required correction: qualified source-bound receipt reuse with no new provider
   inference, and a regression proving no `--print` before successful CAS.

2. **P2 — browser harness imports an undeclared package.**
   The initial spec/config and documented CLI used `@playwright/test`, absent from
   the lockfile/runtime. First browser invocation failed with `MODULE_NOT_FOUND`,
   before Chromium launch. The repository already includes `playwright/test`.
   Root corrected these three references in `430afa9`, without adding a dependency
   or disabling assertions. Independent rerun passed, with screenshot/trace/video
   under `browser-retry/` at that exact SHA. Initial failure remains in the private
   QA log; this report preserves its sanitized error.

## Initial evidence

- Focused native/new controller suites: **342 passed, 0 failed, 0 skipped**.
- Frontend TypeScript app check: exit 0.
- Corrected synthetic browser harness: **1 passed**, exact persisted values asserted
  before/after reload, no console/page/HTTP errors, no non-loopback requests.
- Canonical controller shape checked by read-only API, then authorization/preparation
  run exclusively on a disconnected in-memory copy with a synthetic verifier:
  six frozen source files, five review rounds and the expected frozen packet.
  **Zero real controller writes or provider calls**. This is not an approval.
- Full build still pending at this report's creation.
- Main's broad Windows suite comparison is being independently investigated;
  no assertions were disabled or relaxed.

## Initial verdict

**FAILED VALIDATION** — P1 must be corrected and independently retested before a
ready verdict. The browser PASS does not prove real Claude recovery or activation.
