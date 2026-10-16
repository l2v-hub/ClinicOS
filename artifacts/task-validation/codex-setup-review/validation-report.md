> HISTORICAL CHECKPOINT — This report and its10-file source manifest describe the earlier native/hosted review checkpoint. The current combined lifecycle/dashboard/external-cron preparation is reviewed in [codex-bug-dashboard/qa-gate.md](../codex-bug-dashboard/qa-gate.md), its `validation-report.md` and `qa-reviewed-files.sha256`. The historical manifest is not a current-source verification command. Retain its evidence and the spent setup review attempt; this notice resets no state or budget.

# Bootstrap review validation

Date: 2026-10-16. Existing draft PR471. User supplied Max OAuth; actual readiness38969585616 sees it and the official CLI recognizes it. OpenAI model metadata,86regressions and actual sandbox passed in that check. This is not yet a remote model review.

The bootstrap job is manual, administrator-only, exact-SHA/open same-repository PR471-bound and depends on the native regression job. It reuses the existing read-only Max reviewer and CAS state store. setupReview471 reserves before inference, restores hashed prior reports, freezes interrupted running records and keeps the four-review cap across changed commits/runs. Existing ordinary batch records/budgets are preserved. Structured reports are posted on the exact reviewed PR head and uploaded; failed publication recovers without another inference or duplicate review. Symlink/existing-file restores fail before overwriting targets. Errors log only fixed categories and exit status.

## Validation before model invocation

- Local complete relevant suite:93/93PASS, including7temporary-Git bootstrap regressions (reservation/CAS/authorization/stale head/four-round limit/evidence tampering/publication retry/symlink safety), plus the existing meaningful state/model/worktree/evidence/release tests.
- Independent source QA and manifest are recorded in qa-gate.md and qa-reviewed-files.sha256. Native regression will rerun at the exact reviewed workflow revision before one actual Claude Max review.
- Application sources/dependencies/UI are unchanged. Existing independent build and synthetic browser evidence is carried forward explicitly; it does not establish live authentication or issue processing.
- No Anthropic API fallback, secret values, patient data, merge/deploy or issue closure is introduced by this helper.

## Actual review evidence after dispatch

The actual model report, reserved/spent attempt ledger and hashes are saved in setupReview471 within .codex-bug-state.json on codex/bug-control and posted on PR471. They intentionally stay outside the reviewed commit so publishing evidence does not invalidate its SHA. Native run artifacts include structured JSON. Do not infer approval from this preflight report; read the current remote report and exact SHA. At four rounds with unresolved findings, stop BLOCKED without resetting state.

## Verdict

**BLOCKED** for complete activation pending actual Max review, required checks and trusted-default-branch integration. Source is ready for the independent QA-approved bounded model dispatch. No real bug or production deployment has been certified by these checks.

## Local services integration prerequisite (before any actual model call)

Independent source QA identified a concrete gap: :workspace blocks sockets and the host Postgres service is inaccessible inside verification. A supported named workspace-derived managed proxy profile now permits local binding and denies every external domain, without SOCKS/UDP proxy or unrestricted network flags. Each planned command starts fresh synthetic PostgreSQL16 and applies migrations inside its invocation; HTTP services start in the same test script. Native probes require local HTTP value, Patient schema/migration history, explicit TCP/UDP denial, proxy HTTP/CONNECT403, failed outside-workspace writes and propagated failing-command exit7. The original five basic assertions remain.

The first native run38972121631 stopped before this new profile probe: stock Ubuntu22 could not locate postgresql-16. A CI-only shared installer now adds the official HTTPS PGDG repository using a single-primary-key/full40hex fingerprint check and per-source apt signature validation. No TLS/signature bypass was used; local access to the public key hostname was denied403 by the cloud allowlist, so actual key/install validation belongs to the native run. The hosted check remains blocked until that prerequisite and every service/containment assertion passes.

The initial real-review dispatch38970606680 was canceled while fetching full Git history and before any budget/state branch/model call existed. Bootstrap now fetches only validated base/current trees and checks ancestry/base freshness. No actual Claude setup review budget has been consumed. Root must wait for native services proof and fresh source QA before launching the first actual Max review.
