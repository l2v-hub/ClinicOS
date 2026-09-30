# E2E Test Report — Phase 4 (AI Assistant)

Date 2026-09-30 · branch `feat/phase4-assistant` · synthetic residents only.

## 1. API E2E at the Assistant surface (real app, real Postgres, Role Simulator)

`backend/src/skills/__tests__/assistant-e2e.test.ts` (Prompt 4 §17) + Phase 3 suites + access scope:
**38/38 pass** (skills-unit 9, skills-e2e 14, assistant-e2e 11, resident-access-scope 4), also in
the full parallel backend run.

| #     | scenario                                 | result | key assertions                                                                                                                                                                                                                                                                                                                                    |
| ----- | ---------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A     | OSS: only allowed skills                 | PASS   | session role OSS; starters ⊆ available; no prescription/administration; prescription → DENIED; direct tool 403                                                                                                                                                                                                                                    |
| B     | Doctor read                              | PASS   | `patient.overview` COMPLETED on the resident (server label); tool audit                                                                                                                                                                                                                                                                           |
| C     | Doctor sensitive write                   | PASS   | HIGH_RISK preview; 0 rows before; typed «sì» refused; unbound draft → `payload_not_bound`; wrong drug → `preview_mismatch`; altered dose → new preview showing it; old preview → `preview_stale`; bound confirm → therapy (2 schedules, operatoreInseritore «Medico 1») + diary entry linked; audit ai_assistant with `preview:<id>` + `ui_event` |
| D     | Cancel                                   | PASS   | Annulla → CANCELLED; later confirm stays CANCELLED; 0 consegne                                                                                                                                                                                                                                                                                    |
| E     | Modify                                   | PASS   | modify → `pending: edit`; edit → new previewId; old confirm → `preview_stale`, 0 writes; new confirm → 130/85 only; handover: urgency warning, priority stays normale, edit → alta, type «Assistente AI»                                                                                                                                          |
| F     | Unauthorized resident                    | PASS   | session `residentDenied`; `/skills/context` 403; read & write → DENIED `resident_out_of_scope` (audited); tool 404; picker empty                                                                                                                                                                                                                  |
| G     | Change resident                          | PASS   | preview for A + context B → CANCELLED `resident_changed`, 0 writes; closing the context invalidates too                                                                                                                                                                                                                                           |
| H     | Dynamic revocation                       | PASS   | Admin Save+Apply revokes → starter disappears; confirm → DENIED `capability_revoked`, no restart                                                                                                                                                                                                                                                  |
| I     | Backend error                            | PASS   | administration prepared (HIGH_RISK); tool 502 → FAILED «NON eseguita», 0 rows; retry → COMPLETED 1 row; nothing pending → `recorded:false`                                                                                                                                                                                                        |
| J     | Classic GUI regression                   | PASS   | classic routes (patient page, parameter reading) OK; admin aggregate overview 200, per-resident clinical summary 403; admin has no clinical skills; Supervisore label                                                                                                                                                                             |
| QA H1 | resident named in text, no page resident | PASS   | multi-turn + confirm COMPLETED; opening the same resident's page mid-workflow is not a change                                                                                                                                                                                                                                                     |

## 2. Browser E2E (real Vite frontend + real backend + Postgres, Playwright)

`scripts/assistant/assistant-browser-e2e.mjs` — login through the Login page (Role Simulator), clicks
and typing only; DB verified independently. Evidence `evidence/browser-e2e-*.json`, screenshots
`evidence/screens-*`.

| run                                        | interpreter                                                                | result         |
| ------------------------------------------ | -------------------------------------------------------------------------- | -------------- |
| deterministic                              | `SKILLS_INTERPRETER=deterministic`                                         | **46/46 PASS** |
| **Agno (real runtime, Azure gpt-6.1-sol)** | `SKILLS_INTERPRETER=agno`, all 9 skill requests audited `interpreter:agno` | **46/46 PASS** |

Covered in the browser: A (OSS starters/denial, no Conferma), B (starter read + verified result),
C (HIGH_RISK preview bound to the classic-mapper payload, landscape+portrait, **double click → one
therapy**, audit ai_assistant), D (Annulla), E (Modifica → edit form → new preview → confirm),
G (Cambia ospite → invalidated, preview removed, 0 writes), QA H1 (Chiudi contesto + named resident
multi-turn → COMPLETED), F (out-of-scope resident not offered), I (network failure on Conferma →
error shown, no success card, 0 writes; then explicit confirm → 1 administration), J (back to classic
GUI, patient chart via classic search → assistant opens with that resident server-verified, legacy
Agnos panel still opens), H (Admin revocation via policy API → DENIED, starter hidden), phone 390 px
no horizontal scroll, **0 console errors**.

## 3. UX quality gate (Prompt 4 §18)

| item                               | evidence                                                               |
| ---------------------------------- | ---------------------------------------------------------------------- |
| no double submit / repeated clicks | in-flight guard + disabled buttons; browser C double click → 1 write   |
| loading state                      | `am-loading` («Sto elaborando…» / «Esecuzione in corso…»)              |
| understandable errors              | notice role=alert (transport), reply text for DENIED/FAILED            |
| active resident visible            | resident bar on every screen (screens-*)                               |
| forbidden capabilities not usable  | starters from available skills; no Conferma unless confirmable + bound |
| readable preview                   | structured card (screens C/E)                                          |
| easy cancel                        | Annulla on preview and edit form; Escape closes the mode               |
| back to classic GUI                | «← Torna all’applicazione», «Apri <schermata>»                         |
| tablet responsive                  | 1180×820, 820×1180, 390×844 screenshots                                |

## 4. Regression

| suite                                                            | result                                                                                                                  |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Backend full suite (fresh DB, parallel)                          | 1584 tests · 34 fail — all in files already failing before Phase 4; 0 skills/assistant/scope failures                   |
| Frontend unit                                                    | 976 tests · 10 fail → after fixes 9 pre-existing (same files as main) + assistant state 7/7 + design-system guard green |
| Typecheck backend/frontend, lint (changed files), frontend build | pass                                                                                                                    |
| Runtime (unchanged in Phase 4)                                   | 176/176                                                                                                                 |

## 5. Independent QA

Dedicated QA agent (did not write the code), three rounds:
1. FAILED VALIDATION — H1 named-resident workflows cancelled by the UI context; M1 prescription
   payload not fully bound to the preview; L1 flaky PHI assert; L2 concurrent first simulator login
   (503); L3 dialog without Escape/focus trap.
2. FAILED VALIDATION — residual MEDIUM: a bound payload could carry fields the preview does not show
   (stato, prescrittore, drugPackageRef, allowedFractions); LOW: fascia conflict confirmable once bound.
3. **READY FOR QA** — all findings fixed with regression tests (assistant-e2e C hidden-field loop,
   QA H1 test, skills-unit `bindableTherapy`), probe re-run on fresh DBs (38/38, 7/7, tsc clean).
