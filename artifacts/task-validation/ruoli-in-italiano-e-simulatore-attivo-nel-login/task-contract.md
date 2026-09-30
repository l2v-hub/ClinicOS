# Task Contract

## Task

- Title: Ruoli in italiano e simulatore attivo nel login
- Slug: ruoli-in-italiano-e-simulatore-attivo-nel-login
- Type: change
- Date: 2026-09-30
- Source: user 2026-09-30 — "nell'index della pagina continuo a vedere Amministratore e Operatore quando invece operatore non deve esistere ... ruolo di Infermiere, OSS, Medico e Supervisore" (Prompt 2 §1–§2).
- Branch: `feat/ruoli-italiano-simulatore` (from origin/main 59f7afdd)

## Impact Classification

| Area                 |                                                           Impacted |
| -------------------- | -----------------------------------------------------------------: |
| Frontend/UI          |                  yes (login shows the server's simulated profiles) |
| Backend/API          |            yes (role labels + simulated identity names, text only) |
| Database/Persistence |                                                                 no |
| Agnos AI / Chatbot   |                                                                 no |
| Voice                |                                                                 no |
| OCR / Import         |                                                                 no |
| Auth / Permissions   | yes (demo env: enable the existing Role Simulator; no rule change) |
| Privacy / Security   |                                                                 no |
| Config / Env         |   yes (demo: ROLE_SIMULATOR_ENABLED / _ALLOW_PRODUCTION / _SECRET) |

## Current Behaviour

`GET /auth/status` answers `simulator:false` on demo and production, so the login falls back to the
legacy "Amministratore / Operatore" cards. The baseline roles and simulated identities are labelled
in English (Administrator, Supervisor, Doctor, Nurse; "Doctor 1", "Nurse 1"...).

## Expected Behaviour

On the demo backend (AUTH_MODE=demo) the login shows the Role Simulator with Amministratore,
Supervisore 1, Medico 1, Infermiere 1, OSS 1, role labels in Italian. The legacy "Operatore" card
is not shown there. Production (AUTH_MODE unset) is NOT changed: that is the user's decision.

## Acceptance Criteria

- AC1: baseline role labels are Amministratore, Supervisore, Medico, Infermiere, OSS (legacy: "Operatore (legacy)", "Amministratore (legacy)"); role ids and permissions unchanged.
- AC2: simulated identities are named Amministratore, Supervisore 1, Medico 1, Infermiere 1, OSS 1; ids unchanged.
- AC3: demo `GET /auth/status` → `simulator:true`; `GET /auth/simulator/identities` lists the 5 Italian profiles; a session as Medico 1 works end-to-end.
- AC4: backend + frontend suites without new failures; builds pass.

## Test Plan

| Test type                 | Required | Reason                                                                     |
| ------------------------- | -------: | -------------------------------------------------------------------------- |
| Unit                      |      yes | label/name assertions updated                                              |
| Integration               |      yes | authz e2e / agno-readiness tests (attribution to "Medico 1")               |
| API                       |      yes | demo /auth/status, identities, simulated session call                      |
| Playwright                |       no | login rendering is data-driven from the server list, API evidence suffices |
| Persistence after refresh |       no |                                                                            |
| Agnos action registry     |       no |                                                                            |
| Voice simulation          |       no |                                                                            |
| OCR/import test           |       no |                                                                            |
| Security/privacy scan     |      yes | simulator stays off in production; secret never printed                    |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- API test output on demo

## Risks

- Existing audit rows keep the old English names (history is not rewritten).
- A policy version already applied by an administrator keeps its stored labels.

## Gate Status

READY FOR IMPLEMENTATION
