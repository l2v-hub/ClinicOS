# Phase 4 — Current State

**Status: COMPLETED** — Definition of Done demonstrated end to end (E2E_TEST_REPORT.md).

## Bootstrap

Phase 3 COMPLETED (`../CURRENT_STATE.json` v3); handoff `../phase-3-skills/PROMPT4_HANDOFF.md` followed:
UI → `/skills/converse` only, previews rendered as cards, confirm button bound to the preview,
DENIED/FAILED with classic-screen fallback, no new permission system.

## DoD (Prompt 4 §22)

`User → AI Assistant UI → Identity/Role → Resident Access Scope → Agno → Skill → Policy →
Preview/Confirmation → Tool → Backend → Verified Result → Audit` — browser run with the real Agno
runtime, 46/46 (evidence/browser-e2e-agno.json, audit `interpreter:agno`, `channel ai_assistant`).

| #   | requirement                                       | evidence                                                               |
| --- | ------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | entry point                                       | topbar «Assistente AI» (`assistant-entry`)                             |
| 2   | full-screen tablet-friendly                       | screens-* (landscape, portrait, phone), UX gate §3                     |
| 3   | suggestions from real skills                      | `/skills/session.starters`; A (OSS), H (revocation hides it)           |
| 4   | resident context evident & safe                   | resident bar; G, QA H1, J (page resident server-verified)              |
| 5   | access scope enforced backend-side                | F (context 403, session residentDenied, DENIED, tool 404, picker)      |
| 6   | real read workflow                                | B                                                                      |
| 7   | real write with preview/confirmation              | C, E (browser + API)                                                   |
| 8   | prescriptions/administrations not confirmed by AI | C, I: prepared → UI confirm bound to previewId; typed «sì» refused     |
| 9   | cancellation → no write                           | D                                                                      |
| 10  | modified payload invalidates confirmation         | E, C (`preview_stale`)                                                 |
| 11  | dynamic revocation                                | H                                                                      |
| 12  | no false success                                  | I (backend 502 + network failure in browser)                           |
| 13  | Role Simulator validates different experiences    | OSS / Medico / Infermiere / Supervisore / Amministratore               |
| 14  | classic GUI no regression                         | J + full suites (0 new failures)                                       |
| 15  | audit verified                                    | C (API + browser), request/proposal/confirmation/execute + tool events |
| 16  | PROMPT5_HANDOFF complete                          | PROMPT5_HANDOFF.md                                                     |

## Decisions applied (Prompt 4 §1)

- 1.1 Prescription / administration: prepared by the assistant, executed only after the
  professional's explicit UI confirmation of a preview built from the exact payload.
- 1.2 Handover: priority `normale`, type `Assistente AI`; urgency suggested, never applied.
- 1.3 Administrator: per-resident clinical content removed from the baseline (aggregates kept);
  patient list tolerates 403 on clinical badges; admin gets no clinical skills.
- 1.4 Resident Access Scope service (behaviour preserved, configurable, not widened).

## Gaps (non-blocking)

| #         | gap                                                                                                                | next step                            |
| --------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| P4-G1     | Resident scope modes beyond `registered_by_me`/`all` need data (assignments, wards, teams)                         | customer decision + schema           |
| P4-G2     | Prescription binding compares drug/times/start with the draft; other fields are bound by showing the exact payload | optional server-side mapper          |
| P4-G3     | Workflow store in process (Phase 3 G1) — a restart cancels open previews                                           | DB-backed store if multi-instance    |
| P4-G4     | Two assistants coexist (legacy Agnos panel in the sidebar, new full-screen mode)                                   | retire/merge after customer feedback |
| P4-G5     | Browser E2E runs locally (Playwright library), not in CI                                                           | add a CI job with Postgres + Vite    |
| P4-G6     | Prod backend has `AUTH_MODE` unset (Phase 2 decision): the new mode is exercised on demo                           | user decision                        |
| inherited | P3-G2…G6, Phase 2 G1/G3/G8                                                                                         | unchanged                            |
