# Task Contract

## Task

- Title: Phase 4 AI assistant experience
- Slug: phase-4-ai-assistant-experience
- Type: feature
- Date: 2026-09-30
- Source: `PROMPT_4_AI_ASSISTANT_EXPERIENCE.md` (user request 2026-09-30), handoff `.ai-architecture/phase-3-skills/PROMPT4_HANDOFF.md`
- Branch: `feat/phase4-assistant` (from origin/main bde6bcd1)

## Impact Classification

| Area                 |                                                                                          Impacted |
| -------------------- | ------------------------------------------------------------------------------------------------: |
| Frontend/UI          |                                           yes (full-screen AI Assistant mode, topbar entry point) |
| Backend/API          | yes (/skills: preview binding, modify, resident context, session/starters; new executable skills) |
| Database/Persistence |                                                                             no (no schema change) |
| Agnos AI / Chatbot   |                                                        yes (skill router receives the new skills) |
| Voice                |                                                                       no (integration point only) |
| OCR / Import         |                                                                                                no |
| Auth / Permissions   |          yes (Resident Access Scope service; Administrator baseline minimised for clinical reads) |
| Privacy / Security   |                      yes (clinical writes only after explicit UI confirmation bound to a preview) |
| Config / Env         |                                                              yes (optional RESIDENT_SCOPE_CONFIG) |

## Current Behaviour

The Skill layer (Phase 3) is reachable only through the API/harness; prescriptions and
administrations are human-only hand-offs; confirmations are not bound to a specific preview;
patient visibility is hard-coded (`registeredById`, admin/manager global) in `patientScopeWhere`.

## Expected Behaviour

A full-screen, tablet-first AI Assistant (entry point in the topbar) drives `/skills` with the same
identity/role/policy; resident context always visible and verified by a backend Resident Access
Scope; every write shows a structured preview and executes only after an explicit UI confirmation
bound to that preview (payload change invalidates it); prescriptions/administrations can be prepared
and are executed only after the authorised professional confirms; results shown only when the
backend confirms; audit origin AI_ASSISTANT.

## Acceptance Criteria

- AC1: entry point + full-screen tablet-friendly mode with identity/role, resident bar, starters from real skills, workflow state, preview, Conferma/Modifica/Annulla, verified result, return to classic GUI.
- AC2: Resident Access Scope service `canAccessResident(identity, residentId, operationContext)` enforced backend-side for selection, read, skill and write; behaviour preserved, not widened.
- AC3: Prompt 4 §17 A–J pass (OSS limits, Doctor read, Doctor sensitive write with audit, cancel, modify invalidates confirmation, unauthorized resident, change resident, dynamic revocation, backend error, classic GUI regression).
- AC4: prescriptions/administrations never confirmed by the AI (explicit UI confirmation bound to preview only).
- AC5: handover defaults NORMAL priority + AI-assisted type; urgency only suggested.
- AC6: Administrator baseline without implicit clinical content reads.
- AC7: audit origin AI_ASSISTANT with identity, role, skill, tool, preview, confirmation, outcome.
- AC8: regression suites without new failures; builds pass; `.ai-architecture/phase-4-assistant/*` + PROMPT5_HANDOFF complete.

## Test Plan

| Test type                 | Required | Reason                                                        |
| ------------------------- | -------: | ------------------------------------------------------------- |
| Unit                      |      yes | access scope, preview binding, frontend assistant state       |
| Integration               |      yes | HTTP E2E A–J on real app + Postgres + Role Simulator          |
| API                       |      yes | deployed demo checks                                          |
| Playwright                |      yes | Assistant UI flows in a real browser against the real backend |
| Persistence after refresh |      yes | rows verified in Postgres                                     |
| Agnos action registry     |      yes | live Agno run through the UI path                             |
| Voice simulation          |       no | Prompt 5                                                      |
| OCR/import test           |       no |                                                               |
| Security/privacy scan     |      yes | scope enforcement, confirmation binding, no PHI in audit      |

## Evidence Plan

Required evidence:

- validation-report.md
- test output (backend, frontend, browser)
- screenshots (tablet portrait/landscape) and Playwright trace/log
- `.ai-architecture/phase-4-assistant/E2E_TEST_REPORT.md`

## Risks

- Administrator baseline change may hide data an admin screen used (verified by the classic GUI regression run).
- Browser E2E needs local Postgres (memory-constrained machine).

## Gate Status

READY FOR IMPLEMENTATION
