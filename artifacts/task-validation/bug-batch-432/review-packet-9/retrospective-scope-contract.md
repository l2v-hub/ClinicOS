# Task Contract — PR 483 legacy one-off write guard (QA9)

## Impact Classification
Clinical-integrity correction to the existing authoritative one-off administration writer. Backend and test changes are confined to three paths; no schema, route, request format, authorization, deployment policy, dose, timezone or UI source changes.

## Current Behaviour
The reader resolves a recorded one-off outcome by exact patient and civil date, matching either modern `therapyId` or legacy `therapyId=null` plus exact drug name across bands. Before this follow-up, the writer only looked up modern therapy IDs, so a valid or repaired one-off clock could make an existing legacy outcome appear absent to the write guard. The earlier final Codex review reproduced a legacy-given duplicate and a stale pending bypass of a legacy refusal on a transaction double. The root then found that an omitted expected state could still correct a refusal without explicit observation; continuation 1 tightened this state requirement.

## Expected Behaviour
The authoritative write path uses the same exact identity and outcome priority as the reader within the serialized transaction. It rejects already-given and stale pending requests, including omitted-state requests against a recorded refusal. An observed refusal can be corrected only with explicit `expectedStato=non_erogata`, using the actual selected historical row and existing actor/scope/receipt rules.

## Acceptance Criteria
- Resolve one-off state by exact patient/date and modern therapy ID or legacy null therapy ID plus exact drug name, across bands. Include only recognized `erogata` and `non_erogata`; preserve given-wins, modern-before-legacy and stable-ID priority by reusing the existing pure helper.
- An existing given result blocks confirmation regardless of pending or observed-refusal input. An existing refusal blocks pending and omitted-state requests. Explicit `expectedStato=non_erogata` may correct the observed refusal once, on the same historical row, with current authorization and actor attribution.
- Preserve request-ID replay and atomic receipts; repeated non-keyed correction is rejected. Do not create a second clinical row, rewrite historical identity, or infer a target when patient/date/drug identity does not match.
- Keep multi-dose single-band/exact-hour behavior, invalid-clock read-only behavior, measured-dose guards, scope checks, and current API semantics intact.
- Regressions exercise actual writer transaction flow and the real HTTP/PostgreSQL route fixture, including valid/repaired clocks, modern/legacy outcomes, priority ties, identity exclusions, explicit correction, zero-mutation denials, persistence/reload and keyed replay.

## Scope
- `backend/src/therapies/administration-record.ts`
- `backend/src/therapies/__tests__/legacy-administration-record.test.ts`
- `backend/src/routes/__tests__/therapy-authoritative-write.test.ts`

## Test Plan
Author fresh pure actual-writer and slot-scheduling tests, backend official typecheck, and prepare real HTTP/PostgreSQL cases. Independent QA runs the affected real HTTP/PostgreSQL file, backend types, private frontend build, and selected real App/HTTP/SQL checks only after a scoped resource grant. Historical QA7/QA8 suites remain attributed to their original source and outcomes; they are not recast as fresh QA9 checks.

## Evidence Plan
This candidate contains exact QA9 report/summary/STOP/seal copies, the author continuation report/results/hash metadata, four safe screenshots and one decoded video, per-issue proof links to the immutable packet8 commit, and an explicit provenance index. Raw SQL rows, logs, request headers, bearer values and raw trace are excluded. Historical final Codex F1 and Claude4 approval remain linked and reported with their own verdicts.

## Gate Status
Scoped independent QA9 verdict: **READY FOR CODEX QA** for source `e405399427e7c738dc32070b17a50494b629608b`. This does not certify overall PR release. Native current-SHA publication checks, actual Claude5, fresh final Codex and any deployment/release decision remain pending root ownership. Issue closure, merge and deployment are not claimed.
