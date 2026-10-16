# Task contract — issue lifecycle and operational dashboard

The user asks: when an issue is taken, mark it In progress; when resolved, mark it resolved; show the processing queue and the current phase inside this Codex workspace.

## Acceptance criteria

1. Persist the authorized claim before setting In progress and before invoking the triage model; cover every grouped issue.
2. Preserve unrelated labels, use Bloccato for blocked work, and keep unresolved issues open. Approval or merge alone cannot resolve an issue.
3. After tested evidence, exact-SHA review, checks and confirmed release, publish the completion links, set Risolto and close as completed. Retry status publication from durable facts without starting new model calls or resetting budgets.
4. A read-only local dashboard displays the actual authorized queue, external QA exclusions, current persisted phase, groups/PR and used implementation/review attempts. Show setup PR471 separately and distinguish integration from runtime readiness.
5. Refresh at most once per15seconds; preserve the last snapshot with a visible warning on upstream failure. Display timestamps. No fabricated progress or empty-success on403.
6. Bind only127.0.0.1; reject foreignHost/Origin, cross-site reads and mutations; only fixed assets/API. Keep credentials, raw issue text, provider output and model reports server-side. Render all values as text.
7. Real browser assertions cover displayed queue/status/phase values, refresh and reload, failed refresh, zero console/HTTP errors and produce screenshot/trace/video/report. Independent QA verifies the source and lifecycle tests. No live bug processing or fabricated resolution for this setup.

The dashboard is a workspace operational surface, not an added public clinical-app route. The available app tool may open its tab but does not provide browser DOM control. An unavailable UI bridge must be reported accurately.

## External review handoff (latest user steering)

The user cancels further Max-token attempts and will run their own cron with an already
authenticated Claude Code subscription. Prepare PR Ready for review and a true GitHub round
trip: CAS-reserved review request, actual SHA-bound structured verdict, GitHub publication,
Codex corrections/tests/evidence/simplification, then another bounded request. Actions must
not require Claude secrets. The worker must reject API authentication, drafts/forks/stale SHA,
publication failures must not cause model retries, and all existing human/CI/deploy gates stay.
No actual provider invocation, cron installation on an inaccessible personal machine, merge
or deploy is part of completing this preparation. The setup PR471 retains its spent first
attempt and three remaining, even with the new harness.

Scope: automation helpers/workflows/skills and scoped evidence only. Preserve unrelated cleanupSQL. No patient/clinical application/schema/dependency changes. User authorizes normal push/review integration only after existing gates; one actual setup Claude attempt already failed authentication and remains spent, three remain. Do not run another until updated authentication is available.
