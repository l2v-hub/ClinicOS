# Phase 8 — Copilot Prompting Contract

Target (§15): `base behavior + safety invariants + role profile + current capabilities + resident
scope + available skills + current context` — composed, not duplicated per role.

## 1. Skill router (Agno, runtime `agents/skill_router.py`)

```
_SYSTEM (shared, one per platform)
UNTRUSTED_RULE (Phase 6, descriptive wording)
OGGI / VALUE_KEYS
PROFILO DEL RUOLO (solo tono e priorità): <assistantHint ≤ 200 chars>   ← Phase 8, optional
SKILL DISPONIBILI: <authorized subset only (skillAvailability)>
SKILL NON CONSENTITE: <id + name only, to answer DENIED>
DOMANDA IN SOSPESO
MESSAGGIO: <fenced user text>
```

- The role hint is ONE line from the profile, ≤ 200 chars (backend slices, runtime `max_length=200`),
  never capabilities; the only source of what the user may do is the SKILL list, which the backend
  computes from the active policy per request. A policy change needs no prompt change.
- No per-role prompt files; no capability names hardcoded in prompts.

## 2. Shift briefing (compose, `proactive/engine.ts`)

`BRIEFING_QUESTION (shared) + profile.briefing.focus` over FIXED-template facts (Phase 7), ordered by
the profile's preferred event types, capped by `briefing.maxFacts`; same composer post-check and
fallback. Focus texts are descriptive (no imperative «ignora…» wording — Azure Prompt Shields).

## 3. Context budget (measured — `copilot-e2e` K, characters of the skill list + role hint)

| Role          | Skills sent / catalog | Skill-list + hint chars | vs full catalog (3 099) |
| ------------- | --------------------- | ----------------------- | ----------------------- |
| OSS           | 11 / 16               | 2 117                   | −32 %                   |
| Nurse         | 13 / 16               | 2 609                   | −16 %                   |
| Doctor        | 13 / 16               | 2 604                   | −16 %                   |
| Supervisor    | 15 / 16               | 2 934                   | −5 %                    |
| Administrator | 6 / 16                | 908                     | −71 %                   |

The administrator's 6 include baseline-granted reads (handover overview, appointments, occupancy):
the copilot does not promote them (`startersFromProfileOnly`), the policy decides access.

Duplicated context eliminated: one shared system prompt instead of five role prompts; the role
contributes ≤ 200 chars. Signal context for the briefing: fixed templates, ≤ maxFacts per role
(OSS 12, nurse 20, doctor 25, supervisor 30, admin 10).
