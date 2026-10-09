# Task Contract

## Task

Issue409 bugfix: sidebar read-confirmation count to exact bounded non-confirmed queue, one issue at a time. Original issue and empty comments read directly as untrusted evidence. Accepted main baseline973d78e5e109032a36cf89cf80fd8eb2a848a649; isolated C:/w-409. Root sole application/integration writer. Architecture read-only agent owns only architecture-review.md; fresh independent QA after immutable source freeze. Hierarchical2 ledger swarm-1791530395277-migucc is coordination, not release authority. Primary dirty checkout and pending405/408 application candidates preserved/excluded. Existing Windows AgentDB OOM not retried; recall source/tests/ADRs.

## Impact Classification

Frontend UX/navigation/state, backend/API/read model, persistence and schema migration, authorization boundary validation, security/privacy yes. AI/provider/voice/OCR, new dependencies, production clinical test writes no. New read-only bounded endpoint must be assigned existing diary.list capability, not broader grants. Only isolated local synthetic DB and guarded browser mutate receipts for testing.

## Current Behaviour

Badge /patients/diary-unread-count counts PatientDiaryEntry UNION Consegna lacking explicit non-author acknowledgment, across permitted scope, all dates/priorities/legacy statuses. Workspace ignores feed entry and always opens first patient's diary with temporal filters; neither queue nor unread patient counts exists. Existing purpose:read shares acknowledgment rows with urgency projection, so a plain read of an urgent note also settles urgency. Feed of Consegna alone cannot match badge. Patient roster summaries are currently unused.

## Expected Behaviour

Default Consegne/sidebar opens Non confermate across both sources, same scope and predicate as authoritative badge, bounded stable pagination, clear loaded versus exact total and patient counts. Identities/date/priority/non-color read state shown; explicit switch to patient diary/giro and preservation of compose drafts. Read-confirm action updates queue/sidebar/side counts only after authoritative success; no GET marks read. Clinical urgency handling stays distinct from plain reading. Preserve legacy urgency acknowledgments as urgency; additive purpose separation must permit same reader later taking urgency, append-only receipt/audit/atomic locking, no rewriting note text/status/history. No schema reset or destructive real data operation.

## Acceptance Criteria

- AC1 Badge corresponds to explainable consultable Non confermate list: same two sources/visibility, all dates/priorities/statuses including author's own unconfirmed entries, exact total and bounded pages, no unread preview truncation or client fanout across all patients.
- AC2 Opening navigation badge selects Non confermate by default; explicit transition to patient view and existing specific urgency/feed entry are not conflated. Reload/deep-link/default/session behavior tested.
- AC3 Confirm reading updates list/count without clinical take: read-only purpose cannot create urgency takeover; explicit urgency action and historical receipts maintain semantics; idempotency/concurrency, same actor reading then urgency, no stored clinical status change, failures do not falsely remove rows.
- AC4 Patient counts and states understandable without color; exact scoped patient total or unavailable state, never guessed zero. Synthetic mixed normal/important/urgent, source types, legacy closed/own-author, unread beyond50 verified.

## Test Plan

TDD focused parser/cursor/union-count/receipt-purpose/URL/state tests. Types/backend build/frontend build/security scans. Full regression compared to pinned accepted407proof, known12 only/0new. Real isolated PostgreSQL migrate and API integration: two sources, >50 pagination, tie dates/source ids, counts and scope/capability/invalid query/cursor/anonymous/disallowed roles; explicit read then urgency sameactor and concurrent readers, persist reload/receipts/unchanged clinicalstatus/audit PHIsafe. Actual SPA synthetic transport desktop/mobile, badge-toqueue, counts/loadmore/patientview/errors/session switch, confirm/update/fail and no unexpected network/console. Independent fresh QA then root rerun exact source; no release while criterion or backend migration/deployment unverified.

## Evidence Plan

Original criteria receipt, architecture review, implementation/policy decision, focused/integration logs and source-bound snapshots, before/after synthetic screenshots, trace/video/browser JSON, real DB request/response/persistence report, security/privacy scan and manifest hashes. Clean committed application or exact immutable snapshot, independent report + root rerun, authorized main push triggers Vercel/GitHub backend deployment, exact source/provider receipt verified before GitHub comment and closure. Only synthetic data/screenshots embedded on immutable proof commit. No PHI/credentials/original audit photos. No duplicate provider deployments.

## Risks

Read counter semantics are global first non-author confirmation, not per-user reads; label explanation must match. Legacy ack default urgency must preserve existing behavior. New read rows use separate append-only receipt tables, excluded from urgency but merged into reading evidence; unchanged urgency-table uniqueness permits the same reader to take urgency later. Migrations are additive before new backend. Shared node_modules junction used without install or client generation; raw typed SQL accesses additive tables. Race/stale requests/session isolation and scope fence remain. New endpoint authz registry coverage required. Audit issue429 and blocked405/408 remain open; no broad completion claim.

## Gate Status

READY FOR IMPLEMENTATION
