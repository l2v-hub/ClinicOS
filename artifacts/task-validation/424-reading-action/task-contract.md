# Task Contract

## Task
- Title: 424-reading-action
- Slug: 424-reading-action
- Type: bugfix
- Date: 2026-10-09

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | yes |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour

Original issue424 and all comments freshly read (zero comments/labels; no requirement id). Before confirmation the visible action says Letto, while its accessible name says Segna come letto. Each brief note repeats explanations about explicit reading. Modern server receipt uses readBy.acknowledgedAt. Confirmation and urgency takeover already have separate API purposes and must remain separate. Root sole writer in isolated C:/w-424 from accepted b5f471cd2cd56839e7ebbd0d3daf0bbf04791468; primary dirty and blocked candidates preserved. Read-only review complete; new independent QA required. Persistence impact is validation of existing read write, not schema/backend changes.

## Expected Behaviour

Visible and accessible action Conferma lettura. Confirmed state Lettura confermata da with exact authoritative server name, role and full facility date. Concise truthful unconfirmed state, not an assertion that nobody viewed the note. One collapsed contextual reading guide per owning diary/queue list, no duplicated explanation per modern note; shorter modern receipt spacing while retaining complete content, severity and actionable controls. Preserve legacy personal/urgency traces, guards, errors and original author restrictions.

## Acceptance Criteria

- AC1: The reading command describes an action, not a future state. Both visible and accessible names say Conferma lettura; busy/disabled/author/capability guards retained, all priorities, keyboard and escaped hostile strings verified.
- AC2: After confirmation exact server author, role and acknowledgedAt are shown in the diary as Lettura confermata da plus full facility date. Refetch and reload verified with guarded synthetic transport; actual durable contract separately verified on fresh isolated local PostgreSQL. Malformed response/503/409 never fabricate confirmation.
- AC3: Reading confirmation remains distinct from clinical takeover and completion. POST purpose read, urgent state remains active and Ho capito remains separate. Queue removes confirmed notes then diary shows receipt; no fabricated queue success metadata or clinical status mutation.
- AC4: Brief notes are compact and no longer repeat common explanations. One collapsed contextual guide per list, content and identity/date/severity retained. Source-bound desktop1150x1004/mobile390x844 before/after height comparison, no clipping or horizontal overflow.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | TDD new action/state/guide; existing modern/legacy receipt, unread queue and urgency contracts |
| Integration | yes | frontend/backend types, actual repository React compiler build, full regression exact accepted12 failure delta |
| API | yes | Guarded synthetic read success/failure/invalid/busy and separate urgency, no real API mutation |
| Playwright | yes | Source-bound before/after, chart and queue desktop/mobile, independent fresh QA and identical root rerun, compiled online bundle |
| Persistence after refresh | yes | Guarded UI reload plus existing12 real backend reading/queue tests on a fresh isolated synthetic PostgreSQL cluster; distinguish UI mocks from real persistence |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | yes | scoped source, escaped names, no changed auth/services; configured secret and expanded trace scan, synthetic data only |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

Never turn reading into takeover/completion or change authoritative guards. Queue refetch removes read notes, so receipt identity/time must be checked in diary not invented in success notice. Keep invalid/legacy truthfulness and urgency notice unchanged. No inherited DATABASE_URL in DB tests: fresh loopback synthetic cluster only, test-owned cleanup only. No provider/clinical production mutation, secrets, PHI, dependency/config/lock changes. Application scope DiaryThreadReceipt.tsx/.css, DiarioPazienteTab.tsx, ConsegneUnreadQueue.tsx, diaryReading.test.ts. All attempts retained; physical source exact clean commit, independent QA then root release gate. Baseline12 frontend failures and existing single backend CI failure explicitly compared, no global green claim. Swarm max3 ledger initialized; prior unavailable memory/guidance unchanged no install/retry. User release authorization recorded; all four original AC, exact deployed source and pinned public synthetic screenshot hash required before closure.

## Gate Status

READY FOR IMPLEMENTATION
