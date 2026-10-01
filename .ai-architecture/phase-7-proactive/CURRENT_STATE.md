# Phase 7 — Current State (Proactive Intelligence, Shift Awareness & Safe Operational Signals)

Status: `.ai-architecture/CURRENT_STATE.json` (`phase: 7`). Loop: DISCOVER EVENTS → MODEL →
IMPLEMENT → TEST → INSPECT → FIX → RETEST → REGRESSION, with an independent QA agent (two rounds of
FAILED VALIDATION → fixed → re-verified).

## 1. What exists now

| Capability                                               | Status                                                 | Where                                                                                                             |
| -------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Event catalog (13 real types from existing tables)       | integrated                                             | `EVENT_CATALOG.json`, `backend/src/proactive/catalog.ts`, `sources.ts`                                            |
| Event ≠ Signal ≠ AI summary                              | yes                                                    | `engine.ts` `projectSignals`; summaries never stored as events/signals                                            |
| Policy + Resident Access Scope before any AI             | yes                                                    | `eligibility` (active policy per request), scope in every query, notes/handover residents disclosed only in scope |
| Role → signal matrix (configurable via policy)           | v `f2b159ec8050` (baseline)                            | `ROLE_SIGNAL_MATRIX.json`                                                                                         |
| Attention Inbox («Per te / Da vedere / Cosa è cambiato») | done                                                   | `ProactivePanel.tsx`, `GET /skills/proactive/inbox`                                                               |
| Badge                                                    | done (new items only)                                  | `AssistantEntryBadge.tsx` (`?view=count`)                                                                         |
| Ack / dedup / grouping / revisions                       | done                                                   | `POST /skills/proactive/ack`, signal keys + `rev`                                                                 |
| Change since last view                                   | done (real watermark)                                  | `POST /skills/proactive/seen`                                                                                     |
| Shift briefing                                           | done (facts + optional AI, fallback, cost guard)       | `GET /skills/proactive/briefing`                                                                                  |
| Signal → Skill                                           | done (existing skills, reopen preview, classic screen) | `POST /skills/proactive/open`, `AssistantMode.tsx#openSignal`                                                     |
| Audit                                                    | done                                                   | `PROACTIVE_AUDIT.md`                                                                                              |
| External notifications (SMS/email/push)                  | not built (out of scope, no infrastructure)            | —                                                                                                                 |

## 2. Decisions

- Polling with cursor over existing tables (no realtime channel exists; no outbox/bus added).
- Ack / seen as append-only `AiAuditEvent` facts → no Prisma schema change.
- Care feed requires `diary.list` → administrators never see residents.
- Handovers / notes keep their existing delivery rules; the resident they name is disclosed only
  inside the reader's scope (stricter than the classic screens, which still show it — residual R7-2).
- AI only for the briefing wording, fixed templates, ≤ 1 call, reuse keyed on the exact context.

## 3. Also fixed in this phase (Phase 6 regression)

The Phase 6 untrusted-data rule was classified as a jailbreak by Azure Prompt Shields → plan,
compose and Azure extraction requests were refused in production (deterministic fallbacks were
used). Reworded descriptively; verified on the real provider; guarded by tests.

## 4. Residual risks

| Id   | Residual                                                                                                                | Mitigation                                                                              |
| ---- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| R7-1 | Polling (60 s panel, 120 s badge) — no push                                                                             | bounded indexed queries; manual «Aggiorna»                                              |
| R7-2 | Classic Note / Consegne screens still show residents named by notes/handovers outside the reader scope (existing rules) | the proactive layer never discloses them; product decision for the classic screens      |
| R7-3 | Ack / seen live in the audit table (14-day lookback)                                                                    | append-only, synchronous; a dedicated table needs a schema decision                     |
| R7-4 | Briefing AI text can still be imprecise                                                                                 | facts always shown below, citations required, composer post-check                       |
| R7-5 | Supervisor briefing on large facilities: 30 facts sent max, rest in the facts list                                      | bounded context by design                                                               |
| R7-6 | No clinical scoring (e.g. NEWS2) in signal priority                                                                     | priorities only from source fields / time rules; clinical scoring needs a business rule |
| —    | Phase 6 residuals R-01…R-20                                                                                             | unchanged (`phase-6-safety/PROMPT7_HANDOFF.md` §11)                                     |
