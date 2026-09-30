# Phase 3 — Current State

**Status: COMPLETED** (Definition of Done verified end-to-end, see E2E_TEST_REPORT.md).
Merged on main: PR #386 (94f335d1) + PR #387 (5a62fcfd); deployed: production backend + AI runtime
(GitHub Actions), demo backend (manual `railway up`).

## Bootstrap check

Phase 1 and Phase 2 COMPLETED per `../CURRENT_STATE.json` v2; handoff
`../phase-2-authorization/PROMPT3_HANDOFF.md` rules respected: Agno never holds its own permission
list, every invocation re-authorized server-side, skills = compositions of existing tools, no bypass
of the Tool Layer, no new capability needed.

## Totals

|                                            | count                                                                                                 |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Skills                                     | 16                                                                                                    |
| TESTED (automated E2E)                     | 14                                                                                                    |
| of which also live with Agno               | 5 (vitals.record, vitals.recent, diary.add_observation, handover.create, therapy.due_administrations) |
| DESIGNED (HIGH_RISK, human-only by design) | 2 (therapy.prescribe, administration.record)                                                          |
| BLOCKED                                    | 0                                                                                                     |

Role → Skill (baseline, `ROLE_SKILL_MATRIX.json` v1): administrator 8 · supervisor 14 · doctor 12 · nurse 12 · oss 11.

## Skills tested per role (automated)

- **Nurse**: vitals.record, diary.add_observation, handover.create (cancel), vitals.recent, patient.overview, diary.recent, clinical.question, therapy.due_administrations, patient.find
- **OSS**: handover.overview, vitals.recent, handover.create, diary.add_observation; therapy.due_administrations DENIED
- **Doctor**: appointments.day, patient.overview, vitals.record; therapy.prescribe → human hand-off
- **Supervisor**: facility.occupancy
- **Administrator**: facility.occupancy, admin.roster_contexts, drug.lookup; vitals.record DENIED

## Definition of Done (Prompt 3 §22)

| #   | requirement                                                                                                        | evidence                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| —   | NL → Identity → Role/Policy → Skill → Context → Workflow → Confirmation → Tool → Backend → Verified result → Audit | live B (Agno) + automated B+I                                                 |
| 1   | persistent Skill Catalog                                                                                           | SKILL_CATALOG.json/.md (generated from code)                                  |
| 2   | Role → Skill Matrix                                                                                                | ROLE_SKILL_MATRIX.json + live `GET /skills`                                   |
| 3   | Agno uses skills/tools without duplicating business logic                                                          | AGNO_ORCHESTRATION.md; executors only call ToolRegistry.invoke                |
| 4   | Phase 2 authorization authoritative                                                                                | availability via the same hook as GET /tools; per-call re-authorization; D, F |
| 5   | read skill E2E TESTED                                                                                              | A (automated + live)                                                          |
| 6   | write skill E2E TESTED with preview/confirmation                                                                   | B (automated + live)                                                          |
| 7   | ambiguity → no write                                                                                               | C (automated + live)                                                          |
| 8   | dynamic revocation blocks started workflows                                                                        | F                                                                             |
| 9   | multi-turn verified                                                                                                | E (automated + live)                                                          |
| 10  | backend errors never false success                                                                                 | H                                                                             |
| 11  | audit verified                                                                                                     | I (automated) + live audit trail                                              |
| 12  | relevant regression suite passes                                                                                   | E2E_TEST_REPORT §3 (no new failures)                                          |
| 13  | mandatory gaps resolved or BLOCKED                                                                                 | none open that blocks the DoD                                                 |
| 14  | PROMPT4_HANDOFF complete                                                                                           | PROMPT4_HANDOFF.md                                                            |

## Gaps (non-blocking)

| #         | gap                                                                                                                           | severity  | next step                                               |
| --------- | ----------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------- |
| P3-G1     | workflow store is in-process (restart drops open workflows; single Railway instance)                                          | low       | DB-backed `WorkflowStore` if multi-instance             |
| P3-G2     | deterministic fallback keywords are Italian-only                                                                              | low       | extend with the AI Assistant UI                         |
| P3-G3     | `patients.search` treats any 16-char alphanumeric query as a codice fiscale (pre-existing product bug; skill works around it) | medium    | fix in `patients/identity-page.ts` (needs its own task) |
| P3-G4     | `/skills` shares the import rate limiter                                                                                      | low       | dedicated limiter when chat traffic grows               |
| P3-G5     | preview label falls back to «ospite della scheda aperta» when the page label search misses                                    | low       | by-id patient read tool                                 |
| P3-G6     | HIGH_RISK skills are human-only                                                                                               | by design | customer decision (PROMPT4_HANDOFF §6)                  |
| inherited | Phase 2 G1 ownership scope, G3 Agnos divergent writers, G8 hardening                                                          | —         | unchanged                                               |

## Decisions

- Agno = interpretation (skill + slots) over the skills the user may use (+ id/name of forbidden
  ones for explicit denial); backend = workflow, context, confirmation, execution, audit.
- Confirmation is an explicit user act, never an LLM output; corrections must be explicit.
- No new capability, no schema change; audit reuses `AiAuditEvent`.
