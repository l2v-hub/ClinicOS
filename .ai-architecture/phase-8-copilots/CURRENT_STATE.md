# Phase 8 — Current State (Role-Specific Copilots & Workflow Specialization)

Status: `.ai-architecture/CURRENT_STATE.json` (`phase: 8`). Loop: LOAD HANDOFF → BUILD ROLE PROFILES →
IMPLEMENT → TEST → INSPECT → FIX → RETEST → REGRESSION, with an independent QA agent.

## 1. What exists

| Capability                                                               | Status                                                                                                                     | Where                                                                                     |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Role Experience Profiles (configurable, validated, never grant)          | done — oss, nurse, doctor, supervisor, administrator (+ default)                                                           | `backend/src/copilot/role-profiles.json`, `profiles.ts`; override `COPILOT_PROFILES_FILE` |
| Dynamic Role Home                                                        | done                                                                                                                       | `GET /skills/copilot/home`, `CopilotHome.tsx`                                             |
| Starters from authorized skills (deterministic ranking)                  | done                                                                                                                       | `rankStarters`                                                                            |
| Shortcuts (skill / round / start shift / briefing / panel tab / classic) | done, filtered per request                                                                                                 | `availableShortcuts`                                                                      |
| Composite workflows                                                      | Start shift, Resident round (giro parametri / giro terapia / prepara visita)                                               | `RoundPanel.tsx`, `GET /skills/copilot/round`                                             |
| Continue work                                                            | done (own previews, valid role/scope, ≤ 30 min)                                                                            | `continueWork`, `resumeOwnWorkflow`                                                       |
| Proactive integration                                                    | role default tab, preferred order, density cap (never hides alta/urgente), role briefing focus + ordering (priority first) | `ProactivePanel.tsx`, `proactive/engine.ts`                                               |
| Voice integration                                                        | same `submitText` path; whole-phrase shortcuts from the profile; mic handed back                                           | `AssistantMode.tsx`, `matchShortcut`                                                      |
| Prompting                                                                | shared prompts + ≤ 200-char role hint + authorized skill subset                                                            | `skills/engine.ts`, `interpreter.ts`, runtime `skill_router.py`                           |
| Context invalidation                                                     | role / resident / session / policy / scope / time                                                                          | `COPILOT_ARCHITECTURE.md` §5                                                              |

## 2. What was NOT duplicated

No per-role assistant, skill, tool, policy, scope rule, voice path, proactive engine or prompt file.
Role differences live in one JSON file that only orders and words.

## 3. Residual risks

| Id   | Residual                                                                                                                           | Mitigation                                         |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| R8-1 | Baseline policy grants the administrator some clinical reads (handover overview, appointments) — reachable by asking, not promoted | policy decision («Ruoli e permessi»)               |
| R8-2 | The home computes the proactive inbox for starter boosting (one extra inbox per home load)                                         | bounded queries, 12–31 ms p50; cache if load grows |
| R8-3 | In-memory per-instance state (workflows, caches, audit throttle)                                                                   | Prompt 9 (shared store)                            |
| R8-4 | Profile override file is trusted configuration (validated, cannot grant, prompt texts filtered)                                    | ops-controlled path                                |
| R8-5 | Round list capped at 50 residents (`hasMore` notice)                                                                               | «Cambia ospite» search for the rest                |
| —    | Phase 6 / 7 residuals                                                                                                              | unchanged                                          || R8-6 | Non-«normale» facts are never capped in the briefing AI context (bounded only by signal grouping) | keeps safety; add a high ceiling if facilities grow |
| R8-7 | Profile prompt-text filter is a blocklist (paraphrases pass) | config-only surface; re-run `prompt-filter-check.py` on every profile change |
| R8-8 | `GET /skills/workflows/:id` still returns a preview after a capability revocation (pre-Phase 8) | confirm is DENIED by the engine |
| R8-9 | Home audit throttled to 1/min per operator+role (a resident switch inside the minute is audited by the session/context path) | by design |

