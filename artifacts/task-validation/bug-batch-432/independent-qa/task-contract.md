# Independent QA contract

Read every source issue and comment directly using GitHub CLI. Historical comments/reports are context only. The following frozen acceptance criteria match the current issue contracts. This QA has not executed tests yet and awaits root STABLE-GO.

# Task Contract

## Task
- Title: bug-batch-432
- Slug: bug-batch-432
- Type: bugfix
- Date: 2026-10-17

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | yes |
| Database/Persistence | yes |
| Agnos AI / Chatbot | yes |
| Voice | no |
| OCR / Import | yes |
| Auth / Permissions | yes |
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour

Seven source issues share existing unmerged PR466 changes. Prior screenshots/test reports are historical; main still lacks receipt storage and one-off/timezone/catalog fixes.432 import and inventory code is partly merged but complete acceptance/release remains unverified. Baseline a516d42e31f6674c39c1d130c9706cd80a7ab4c6.

## Expected Behaviour

Complete persisted therapy inventory/import reconciliation and authoritative patient-scoped single-write administration with stable one-off identity and Europe/Rome clock. One worktree integrates existing work and proves each source issue independently.

## Acceptance Criteria

- AC432.1: Complete saved prescription inventory follows all pages including inactive prescriptions independently from calendar filtering; 106-prescription real DB fixture proves both pages and exact counts.
- AC432.2: PRN visible in day/week, including period bounds; no administration outside prescription period; absent feed rows remain read-only without invented dose identity, quantity, or authorization.
- AC432.3: Short, inconsistent, repeating, other-patient paginated data fails closed; error/retry, patient switching, aborted stale responses and print completeness are covered by value assertions.
- AC432.4: Real HTTP/DB import reconciliation preserves every retained source occurrence through review, confirmation and saved list; ambiguous/structured-only entries require review, exclusions explicit, stale omissions rejected, replay creates one patient and exactly intended therapies.
- AC432.5: Responsive browser, persistence after reload, independent QA, immutable evidence at final tested SHA and verified deployment required before issue closure.
- AC441.1: Explicit one-off date/time with no legacy band flags appears in feed, summary and assistant; server resolves authoritative dose and actor.
- AC441.2: Wrong clock, date or band and contradictory schedule are rejected; successful write creates exactly one correct medication administration and repeat write is rejected.
- AC442.1: Held correction/interpreter barrier deterministically reproduces stale correction; confirmation releases only correct result, completion remains recorded, replay causes no duplicate clinical write.
- AC442.2: Run regression under actual full backend suite load; retain original safety assertions and guarantee barrier cleanup even on test failure.
- AC460.1: Same actor/requestId and same immutable request replays first outcome including lost-response/reload retry, with exactly one administration and one receipt.
- AC460.2: Changed payload/requestId conflict and changed current patient authorization are rejected before receipt disclosure; pending-only request cannot overwrite refusal; concurrent requests preserve first snapshot.
- AC460.3: Browser visible retry retains request identity across reload and session changes do not leak or reuse another actor retry; relevant clients exercise same contract.
- AC463.1: Strict empty catalog status suppresses automatic per-drug searches across complete inventory and renders unavailable distinct from drug not found.
- AC463.2: Available catalog continues resolving found/absent drugs; unreachable/malformed/unknown status does not falsely claim empty catalog or bypass established lookup behavior; public limit unchanged.
- AC464.1: Europe/Rome day and minute independent of host timezone; future08:00 not overdue at00:30, due00:45 then overdue00:46, exact expected counts and dose identity.
- AC464.2: Midnight/year boundary/winter/summer/both DST transitions tested; assistant/feed/due query share facility clock; existing access controls and bounds retained.
- AC467.1: Already administered or refused one-off stays recorded after editing time across bands; no second administration, no mutation of first record; feed/summary/assistant agree.
- AC467.2: Periodic multidose prescriptions keep distinct scheduled doses independent, including same-band08:00/10:00 and exact quantity; browser reload preserves status.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Pagination, catalog status, timezone, retry request identity |
| Integration | yes | Isolated PostgreSQL migration, immutable receipts, clinical writes |
| API | yes | Real HTTP authorization, replay, import omissions and persistence |
| Playwright | yes | Real inventory, retry and import values; local safe QA surface for internals |
| Persistence after refresh | yes | One administration/receipt and complete inventory/import after reload |
| Agnos action registry | yes | Assistant dose completion and deterministic correction regression |
| Voice simulation | no | No voice implementation change |
| OCR/import test | yes | All retained source occurrences reconciled; no inference of ambiguous doses |
| Security/privacy scan | yes | Synthetic-only evidence, no credentials, original scopes/limits |

## Evidence Plan

Exact plan-proposal.json lists scopes/commands and per-issue PNG, trace ZIP and WebM. All source issue evidence under artifacts/task-validation/bug-batch-432/evidence, sanitized test outputs in test-results, with independent QA report and final reviewed/deployed SHA supplied by root.

## Risks

Migration must precede backend then frontend release. Existing original PR466 is reuse context, not new QA proof. Shared ORM generation may need isolated worktree dependencies. Expected negative request statuses must be explicit so network errors never silently pass. Non-loopback DB is refused. Root alone owns durable reservation, publication, review budget and release; implementation round1/4 only.

## Gate Status

READY FOR IMPLEMENTATION
