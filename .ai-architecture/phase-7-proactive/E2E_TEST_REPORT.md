# Phase 7 — E2E Test Report

Date 2026-10-01 · branch `feat/phase7-proactive` · local embedded Postgres (fresh UTF8 databases),
never production. Evidence: `artifacts/task-validation/phase-7-proactive-intelligence/evidence/`.

## 1. Backend — real app (`backend/src/proactive/__tests__/proactive-e2e.test.ts`, 23/23)

| Id  | Scenario                                                                                                                            | Result |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ------ |
| A   | OSS: only allowed event types, only own residents; a note to «tutti» naming an out-of-scope resident delivered WITHOUT the resident | PASS   |
| B   | out-of-scope resident absent from the inbox AND from the LLM briefing context                                                       | PASS   |
| C   | nurse briefing: real events, period = previous shift start → now, source event ids, 1 LLM call, facts always present                | PASS   |
| D   | doctor change-since-last-view on a real watermark (`/seen`)                                                                         | PASS   |
| E   | supervisor facility scope + technical types; no event source fails silently (all roles); no signal dated in the future              | PASS   |
| F   | administrator: technical signals only, every care type denied, never a resident                                                     | PASS   |
| G   | Signal → existing skill via the normal converse path; foreign signal 404; pending preview → `resume_workflow`, zero writes          | PASS   |
| H   | prescription visible to nurse, not OSS; engine writes no therapy / administration                                                   | PASS   |
| I   | AI-prepared handover default NORMAL even with «URGENTE» in the text; escalation only by edit → new preview → confirm                | PASS   |
| J   | 20-event burst → 1 signal, stable ids, dedup ratio > 1                                                                              | PASS   |
| K   | ack = view only; out-of-scope ack ignored; audited with server resident; new event → visible again                                  | PASS   |
| L   | injection in a diary note: scope unchanged, user text not sent to the LLM, injected AI text discarded → fallback                    | PASS   |
| M   | AI down → fallback, facts intact, nothing acknowledged                                                                              | PASS   |
| N   | revoke `diary.list` → care feed gone at next refresh; resident out of scope → gone                                                  | PASS   |
| O   | overdue administration = deterministic time rule (fixed clock), grouped per slot                                                    | PASS   |
| P   | audit of shown / briefing with identity, role, signal ids; no clinical row authored by the engine                                   | PASS   |
| Q   | (QA) ack of «in arrivo» never hides the same slot once overdue                                                                      | PASS   |
| R   | (QA) handover escalated to «urgente» after the ack → visible again                                                                  | PASS   |
| S   | (QA) handover about an out-of-scope resident → delivered without the resident, not in the LLM context                               | PASS   |
| T   | (QA) typed drug name with injected text / delimiters never reaches the LLM (fixed templates)                                        | PASS   |
| U   | (QA) denied-access summary keeps its ack until a new denial                                                                         | PASS   |
| V   | briefing cost guard: same facts → summary reused (0 LLM calls); new facts in cooldown → fallback                                    | PASS   |
| W | (QA re-verification) a cached AI summary never survives a scope revocation (reuse key = hash of the exact AI context) | PASS |

Unit (`proactive-unit.test.ts`, 6/6): DST-safe facility time, shift window, grouping + revision,
priority only from source, actions limited to skill / reopen / classic, eligibility fails closed.
Rule-wording guards: backend `untrusted-prompt.test.ts` 2/2, runtime `RuleWordingTests`.

## 2. Browser — real Vite + backend + Agno + real compose model (`scripts/proactive/proactive-browser-e2e.mjs`, 29/29)

Nurse: badge; inbox with own residents, prescription and handover signals, when / origin / why;
injected title shown as data. Ack → leaves «Da vedere», source unchanged, audited. «Segna tutto come
visto» → empty; new DB fact → «Cosa è cambiato». Signal → vitals skill for that resident, no
confirmation, no write, audited. Own preview → signal → reopened → still needs «Conferma» → one write
after the click. Briefing: period, «Sintesi AI — verifica sui fatti» (`azure:gpt-6.1-sol`,
`composed:true`, 1 LLM call, ~1.9 k chars), facts grouped by accessible residents, audit. OSS: own
resident only. Supervisor: facility. Administrator: no resident, no clinical feed. No console
errors. Screenshots `evidence/screens/A…G`.

## 3. Regression (final code)

| Suite                                                                 | Result                                                                                           |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Backend full suite, serial, fresh DB                                  | 1673 tests, 1651 pass, 21 fail = the pre-existing baseline set, **0 new** |
| Phase 6 adversarial (backend)                                         | 44/44 (independent QA run)                                                                       |
| Phase 6 safety browser                                                | 18/18                                                                                            |
| Phase 4 Assistant browser (real Agno + production plan/compose flags) | 47/47                                                                                            |
| Phase 5 voice browser (real Gemini STT + Agno)                        | 78/78 (DB without unread notes — the demo note turns the sidebar label into «Note 1»)            |
| Frontend `npm test`                                                   | 999 tests, 990 pass, 9 fail = same pre-existing set                                              |
| Frontend build / `tsc -b`                                             | pass                                                                                             |
| Runtime unittest                                                      | 188/188                                                                                          |
| Real provider content-filter check                                    | compose, compose + injected data, plan, briefing, extraction: OK                                 |

## 4. Findings during the loop (all fixed, regression tests added)

1. Handover source silently empty (feed page size ≤ 20) → cursor pagination + «no silent source
   failure» test.
2. A note to «tutti» disclosed an out-of-scope resident to the OSS → resident shown only if in scope.
3. Phase 6 untrusted-data rule refused by Azure Prompt Shields (jailbreak) → descriptive wording.
4. One signal per policy version → grouped per day.
5. Independent QA (FAILED VALIDATION → fixed → re-verified): ack of «in arrivo» hid the overdue slot
   (HIGH); handover escalation after ack hidden (MEDIUM); out-of-scope resident of a handover in
   UI/LLM (MEDIUM); drug free text to the LLM (LOW); unstable ack of the denied summary (LOW); badge
   counted «visto», poll audit noise, partial-source notice, briefing cost guard, rule wording (LOW);
   re-verification: the first cost-guard version could reuse an AI summary after a scope revocation
   (HIGH) → reuse keyed on the hash of the exact AI context + 10-minute expiry (test W).
6. Due slots dated at the future slot time stayed «changed» after «Segna tutto come visto» (browser
   E2E in the evening) → dated when they become relevant + future-date invariant.

## 5. Cost / performance baseline (local, synthetic demo data)

| Role          | inbox p50 / p95                       | events → signals      | event types allowed / filtered |
| ------------- | ------------------------------------- | --------------------- | ------------------------------ |
| Nurse         | 26–34 / ≤ 270 ms (first-call warm-up) | 11–14 → 9–10          | 11 / 2                         |
| Doctor        | 11–16 / 15–22 ms                      | 3–7 → 3–6             | 11 / 2                         |
| Supervisor    | 19–25 / 25–34 ms                      | 16–35 → 13–21         | 13 / 0                         |
| OSS           | 8–10 / 15–17 ms                       | 1–2 → 1–2             | 6 / 7                          |
| Administrator | 5 / 6–7 ms                            | 2–7 → 2–7 (technical) | 4 / 9                          |

Briefing: ≤ 1 LLM call (~1.9–2.2 k chars, ~7–8 s with `azure:gpt-6.1-sol`); repeated briefing on
the same facts: 0 LLM calls, 29 ms. Inbox: 0 LLM calls. Filtering before AI: event types never
loaded when not allowed; out-of-scope rows never loaded. Burst dedup: 20 events → 1 signal.
Evidence: `performance-baseline.json`, `performance-cached-briefing.json`.
