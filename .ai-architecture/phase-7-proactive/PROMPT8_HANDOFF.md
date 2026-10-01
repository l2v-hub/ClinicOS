# PROMPT 8 — Handoff from Phase 7 (Proactive Intelligence)

Authoritative entry for the next phase. Read with `.ai-architecture/CURRENT_STATE.json` (phase 7)
and `.ai-architecture/phase-6-safety/PROMPT7_HANDOFF.md` (safety invariants, still binding).

## 1. Event Catalog

`EVENT_CATALOG.json` (generated from `backend/src/proactive/catalog.ts` by
`scripts/proactive/export-catalog.mts`). 13 event types, all integrated, all from existing tables:
`vitals.recorded`, `diary.entry_created`, `handover.open`, `therapy.prescribed`, `therapy.changed`,
`administration.recorded`, `administration.due`, `document.added`, `room.changed`,
`note.received`, `workflow.pending`, `policy.applied`, `access.denied_summary`.
Candidates not integrated (no reliable source / out of scope): appointment reminders, import jobs
ready for review, assessment due dates, discharge/transfer.

## 2. Signal Catalog

`SIGNAL_CATALOG.json`: NEW_INFORMATION, PENDING_ACTIVITY, OVERDUE_ACTIVITY, HANDOVER_ITEM,
STATE_CHANGE, FOLLOW_UP, DOCUMENT_AVAILABLE, ATTENTION_REQUIRED (technical threshold only). No
type is a clinical alert; an AI summary is never a signal.

## 3. Attention Policy / Role-Signal Matrix

`ATTENTION_POLICY.md`, `ROLE_SIGNAL_MATRIX.json` (baseline; the live matrix is the ACTIVE policy
evaluated per request — editing «Ruoli e permessi» changes it without deployment). Care events
require their read capabilities + `diary.list` (no implicit clinical feed for administrators).

## 4. Contracts

- Shift briefing and change-since-last-view: `SHIFT_BRIEFING_CONTRACT.md`.
- Signal → Skill: the action is recomputed on the server (`POST /skills/proactive/open`); kinds
  `skill` (starter text of an EXISTING skill, sent through `/skills/converse` with the signal's
  resident as context — same interpreter, policy, scope, preview, confirmation), `resume_workflow`
  (reopens MY preview via `GET /skills/workflows/:id`; «Conferma» still required),
  `classic` (classic screen). Nothing else.

## 5. Proactive safety boundaries

NEVER automatic: prescriptions, administrations, any clinical write, record changes, therapy
changes, resident assignment, policy/roles, external sensitive actions, confirmations (button only,
not voice, not notification). The engine writes only audit facts (shown / ack / seen / opened /
briefing). Priorities come from source fields or config rules, never from the LLM.

## 6. Resident scope / injection

- Scope inside the queries (`residentScopeWhere`) and existing rules (consegne feed, notes mailbox,
  therapy slots); a note's resident is disclosed only if in the reader's scope; administrators
  never see residents.
- The briefing sends the LLM only templated facts (`id, tipo, ospite, quando, fatto, conteggio,
priorita_dalla_fonte`), max 30, never user free text; composer post-check; fallback.
- Phase 6 fencing/rule reused; rule reworded so Azure Prompt Shields does not refuse it
  (`scripts/ai/prompt-filter-check.py` to re-verify on a provider change).

## 7. Ack / dedup model

Grouping keys: `vitals:<resident>:<day>`, `diary:<resident>:<day>`, `doc:<resident>:<day>`,
`adm-given:<resident>:<date>`, `adm-due:<date>:<slot>:<upcoming|overdue>`, `handover:<id>`, `note:<id>`,
`therapy-new:<id>`, `therapy-change:<id>`, `adm-not-given:<id>`, `room:<id>`, `workflow:<id>`,
`policy:<day>`, `denied:<facility day>`. `rev` = `<latest event second>.<count>.<priority>.<signal type>`; ack = `ack:<id>@<rev>`
(append-only audit fact); new events → new revision → visible again. Resolution/expiry by
recomputation from current state.

## 8. Audit

`PROACTIVE_AUDIT.md`: `proactive:inbox | ack | seen | action_opened | briefing`, identity, role,
resident where applicable, signal and source event ids, AI metadata (composed, llm_calls,
context_chars).

## 9. Cost / performance (local, synthetic data — `E2E_TEST_REPORT.md` §5)

Inbox p50 5–34 ms, p95 ≤ 270 ms (first-call warm-up); 1 LLM call per briefing (~2 kB context,
~7–8 s with `azure:gpt-6.1-sol`); 0 LLM calls for the inbox; dedup ratio 1.0–1.7 on demo data
(20× burst → 1 signal in tests). Badge = counts only, 120 s; panel 60 s.

## 10. E2E / regression commands

```bash
# backend (from backend/, local Postgres)
NODE_ENV=test AUTH_MODE=demo AI_PROVIDER=mock DATABASE_URL=<local> npx tsx --test src/proactive/__tests__/*.test.ts
NODE_ENV=test AUTH_MODE=demo AI_PROVIDER=mock DATABASE_URL=<local> npx tsx --test src/safety/__tests__/adversarial.test.ts
# browser (Vite :5199, backend :3099 with AI_ASSISTANT_* flags, runtime :8765)
npx tsx scripts/assistant/seed-assistant-demo.mts && npx tsx scripts/proactive/seed-proactive-demo.mts
node scripts/proactive/proactive-browser-e2e.mjs --out <dir>     # 29 checks
node scripts/safety/safety-browser-e2e.mjs --out <dir>           # 18
node scripts/assistant/assistant-browser-e2e.mjs --out <dir>     # 47
node scripts/voice/voice-browser-e2e.mjs --out <dir>             # 78 (run on a DB without unread notes: the sidebar label becomes «Note N»)
# catalogs
npx tsx scripts/proactive/export-catalog.mts
# provider content-filter check (real provider, synthetic input)
python scripts/ai/prompt-filter-check.py <file with backend UNTRUSTED_RULE>
```

## 11. Role-specific usage patterns / candidate workflows

- **OSS**: start of shift → «Da vedere» (own residents: new parameters, diary, handovers assigned)
  → open «Mostrami il diario…» → add observation / create handover (NORMAL default).
- **Nurse**: overdue slot signal → «Quali somministrazioni ci sono oggi?» → per resident the
  existing administration skill (HIGH_RISK preview + button); new prescription → patient overview.
- **Doctor**: «Cosa è cambiato» since last view (diary from the team, documents, not-given
  administrations) → patient overview / prescription workflow (preview + button).
- **Supervisor**: facility-wide overdue slots and open handovers, denied-access threshold,
  briefing for the ward handover meeting.
- Candidate Phase 8 workflows: acknowledge-and-delegate a handover; briefing export for the shift
  meeting; per-resident «timeline» drill-down — all must reuse skills and the confirmation path.

## 12. File / symbol entry points

`PROACTIVE_ARCHITECTURE.md` §1 (backend `proactive/*`, `skills/index.ts`, `skills/store.ts`,
`routes/note.ts`; frontend `ProactivePanel.tsx`, `AssistantMode.tsx#openSignal`,
`AssistantEntryBadge.tsx`, `assistantApi.ts`).

## 13. Constraints Prompt 8 must not violate

1. Notify, don't act: no new automatic clinical write; the «Conferma» button is the only commit.
2. Filter by policy and resident scope BEFORE disclosure and BEFORE any AI call.
3. Events are facts from existing tables; never store AI inferences as events or signals.
4. Priorities from business rules / source fields / config — never from the LLM.
5. No user free text to the LLM unless fenced AND necessary; keep the descriptive untrusted rule
   (no imperative jailbreak-like wording); re-run the provider filter check.
6. Reuse existing skills and visibility rules; no parallel business layer; new routes catalogued.
7. Keep ack/seen append-only; never alter source rows from the attention layer.
8. Extend `proactive-e2e.test.ts`, the browser E2E and the adversarial suite for every new surface.
9. Phase 6 invariants (PROMPT7_HANDOFF §13) remain binding.
