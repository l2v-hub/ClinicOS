# Task Contract

## Task
- Title: ux2 w8 urgent model diary consegne
- Slug: ux2-w8-urgent-model-diary-consegne
- Type: change
- Date: 2026-10-03

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | yes |
| Database/Persistence | yes |
| Agnos AI / Chatbot | yes |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | yes |
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour

Diary: urgent entries carry a per-reader «Presa visione» (every reader acks separately; author can ack own).
Consegne: priorita normale|alta|urgente + stato aperta|in_corso|completata shown in forms, cards, filters, KPI
(«Consegne aperte», «Consegne in corso»), proactive signal «consegna aperta», assistant ordering.

## Expected Behaviour

An urgent diary entry or consegna is "urgente attiva" until the FIRST acknowledgement («Ho capito») by an
operator other than the author; then it is "urgenza presa in carico" (by whom, when) for everyone — trace
kept, no longer counted/flagged anywhere. Author cannot acknowledge own item (button hidden + server 409).
Consegne UX has no aperta/in corso/completata; priority Normale/Urgente only (legacy alta = «(valore precedente)»).
Stored stato values are never rewritten.

## Acceptance Criteria

- AC1: POST ack by author -> 409 with clear message; by non-author -> 201, urgency taken for all readers; second ack idempotent.
- AC2: New append-only ConsegnaAcknowledgement table + POST /consegne/:id/ack, audited ids-only, resident scope, capability registered (read-level).
- AC3: Diary GET and consegne feed expose urgency {state active|taken|none, takenBy}; trace persists after reload.
- AC4: Counts/badges/signals (Turno Adesso, KPI, admin dashboard, proactive, assistant) count only active urgencies.
- AC5: No aperta / in corso / completata in consegne UX; priority Normale/Urgente; legacy stato untouched in DB.
- AC6: tsc both, build, frontend tests 0 new failures, targeted backend DB suites green.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | frontend helpers |
| Integration | yes | backend DB suites |
| API | yes | ack endpoints |
| Playwright | yes | nurse/doctor/supervisor flow |
| Persistence after refresh | yes | trace survives reload |
| Agnos action registry | yes | capability registry regenerated |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | yes | author 409, scope, audit ids only |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots (artifacts/task-validation/ux2-cycle/w8/)
- API test output
- persistence proof after reload

## Risks

Many consumers of stato; legacy completed urgent consegne must not flood active urgencies (treated as closed).
Diary entries had no authorId: add nullable authorId (new entries) with authorName fallback for legacy rows.

## Gate Status

READY FOR IMPLEMENTATION
