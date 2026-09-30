# E2E Test Report — Phase 3

Date 2026-09-30 · main @ 5a62fcfd (PR #386 + #387) · all data synthetic.

## 1. Automated suite (CI-safe, deterministic interpreter)

`backend/src/skills/__tests__/skills-e2e.test.ts` + `skills-unit.test.ts` — REAL Express app over HTTP,
Role Simulator identities, real Postgres (fresh local DB), policy changed through the real admin API.
Output: `evidence/skills-tests.txt` → **22/22 pass**.

| #   | Prompt 3 §20                         | Test                                 | Result | Key assertions                                                                                                                                                                                             |
| --- | ------------------------------------ | ------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | Read skill                           | `A — read skill…`                    | PASS   | NL → `vitals.recent`, COMPLETED, reply shows seeded 135/85; `tool:parameters.list_readings` audited (channel ai); `patient.overview` COMPLETED                                                             |
| B   | Write skill + preview + confirmation | `B + I — write skill…`               | PASS   | NEEDS_CONFIRMATION with structured preview; 0 rows before confirm; +1 row after; values `{pa:120/80, spo2:97}`; author SIM-NURSE-1; read-back `verified: true`                                             |
| C   | Ambiguous context                    | `C — ambiguous…`                     | PASS   | no target → NEEDS_CLARIFICATION(patient), `confirm` cannot skip it; two «Bianchi» → 2 candidates; 0 writes                                                                                                 |
| D   | Unauthorized                         | `D — identity without…`              | PASS   | Administrator → DENIED `capability_denied`; direct `POST /tools/parameters.create_reading/invoke` → 403; OSS administrations → DENIED (audited); Doctor prescription → DENIED `human_control_required`     |
| E   | Multi-turn                           | `E — multi-turn…`                    | PASS   | 5 turns (target → candidate #2 → values → preview → «sì»), history START…COMPLETED, row on the chosen patient; other identity: 404 / `workflow_not_found`                                                  |
| F   | Dynamic revocation                   | `F — capability revoked…`            | PASS   | preview → Admin revokes `diary.create` for nurse (Save+Apply) → `GET /skills` shows it unavailable → confirm → DENIED `capability_revoked`, 0 rows; restore → new workflow COMPLETED, text stored verbatim |
| G   | Cancellation                         | `G — cancellation…`                  | PASS   | «annulla» → CANCELLED; late confirm stays CANCELLED; 0 consegne                                                                                                                                            |
| H   | Backend failure                      | `H — backend failure…`               | PASS   | tool 502 → FAILED «NON eseguita», no success wording, 0 rows; write-then-lost-answer → FAILED, `retry` → `replayed: true`, exactly 1 row; target deleted after preview → FAILED                            |
| I   | Audit                                | `B + I`                              | PASS   | `skill:vitals.record:request/proposal/confirmation/execute` + `tool:parameters.create_reading`, operator SIM-NURSE-1, role nurse, channel ai, patient id; field names only (no values)                     |
| J   | Regression                           | `J — regression…` + full suites (§3) | PASS   | `/tools` discovery/denial unchanged; not-understood → suggestions                                                                                                                                          |
| —   | Per-role coverage                    | `per-role coverage…`                 | PASS   | every executable skill COMPLETED for an intended role                                                                                                                                                      |
| —   | QA regressions                       | `QA H1/M1/L1`                        | PASS   | racing correction cannot cause a 2nd write; near-confirmation never replaces a note; page context exact id + server label                                                                                  |

## 2. Live run with the REAL Agno runtime (AC12)

`scripts/skills/agno-live-e2e.mjs` against a local backend (local DB, seeded synthetic patients)
wired to the deployed clinicos-ai-runtime (`/v1/assistant/skill-route`, Agno Agent, Azure
`gpt-6.1-sol`). Reports: `evidence/agno-live-e2e-run1.json`, `-run2.json` → **9/9 PASS twice**
(avg Agno turn ≈ 2.6 s, max 2.8 s).

| scenario | message (free wording)                                                                                                  | outcome                                                           | interpreter   |
| -------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------- |
| A        | «mi fai vedere gli ultimi parametri vitali di questo ospite?»                                                           | vitals.recent COMPLETED                                           | agno          |
| B        | «al signor Mario Rossi ho misurato adesso la pressione: 128 su 82, saturazione 95 per cento»                            | preview (Rossi Mario, 128/82, 95) → confirm → COMPLETED, verified | agno          |
| C        | «segna una pressione di 120/80»                                                                                         | NEEDS_CLARIFICATION «Per quale ospite?»                           | agno          |
| E        | «devo annotare una osservazione nel diario» → «per la signora Anna Bianchi» → «ha passato una notte tranquilla…» → «sì» | COMPLETED (author Infermiere 1)                                   | agno          |
| D        | Administrator: «registra pressione 120/80 per Mario Rossi»                                                              | DENIED (Agno never receives the skill; backend denies)            | deterministic |
| D2       | OSS: «quali somministrazioni ci sono oggi?»                                                                             | DENIED (Agno recognises the forbidden skill)                      | agno          |
| G        | «lascia una consegna per Mario Rossi: controllare la glicemia prima di cena» → «annulla»                                | CANCELLED                                                         | agno          |

Audit of the live write (local DB): request (`interpreter:agno`) → `tool:patients.search` →
proposal → confirmation (`confirmed`) → `tool:parameters.create_reading` → `tool:parameters.list_readings`
→ execute ok — same requestId `skill-<workflowId>`, SIM-NURSE-1 / nurse / ai.

Deployed demo backend (`clinicos-backend-demo`, read-only checks): Supervisore 1 «quanti posti letto
sono occupati?» → COMPLETED via agno; OSS administrations → DENIED via agno; `GET /skills` nurse → 12/16.

**Finding fixed during the live loop:** before PR #387 Agno routed the OSS administrations request to
the nearest allowed skill (clinical.question) instead of DENIED; now it receives id+name of the
forbidden skills (never tools) and the backend denies.

## 3. Regression

| suite                                            | result                                                                                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Backend full suite, fresh local DB               | 1567 tests · 1533 pass · 33 fail — every failing file already failing in the pre-change baselines (G10 flaky/pre-existing); 0 failures in skills |
| CI `gate` (PR #386, #387)                        | 19 failures, identical by name to main run 36699759660                                                                                           |
| Runtime (`python -m unittest`)                   | 176/176 (+6 skill-route tests)                                                                                                                   |
| Phase 1/2 tool & authz suites                    | green inside the full suite                                                                                                                      |
| Frontend                                         | untouched by this phase                                                                                                                          |
| Typecheck / lint (changed files) / backend build | pass                                                                                                                                             |

## 4. Independent QA

General-purpose QA agent (did not write the code): first verdict FAILED VALIDATION (H1 race → 2
writes, M1 near-confirmation replacing a note, L1 context/label) → fixed with tests → second verdict
**READY FOR QA** (race reproduced: 1 write; concurrent cancel: 0 writes).
