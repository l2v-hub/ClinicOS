# Phase 8 — Copilot Architecture

One platform, multiple role experiences:

```
Identity → Role (active policy) → Policy (capabilities) → Resident Scope
  → Shared Assistant (AssistantMode, /skills/converse, workflow engine)
  → Role Experience Profile (presentation: order, wording, density, shortcuts)
  → Shared Skills (catalog, preview, confirmation) → Shared Tools (Tool Layer) → Backend
```

No role-specific assistant, skill, tool, policy, voice path or proactive engine was created. The
profile is the only role-specific artefact, and it can only ORDER, WORD and GROUP what the live
policy and scope already allow.

## 1. Components (file / symbol)

| Concern                     | Where                                                                                                                                                                                                                                                 |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profiles (configuration)    | `backend/src/copilot/role-profiles.json` (bundled), override `COPILOT_PROFILES_FILE`; loader/validator `backend/src/copilot/profiles.ts` (`loadProfiles`, `normalizeProfile`, `profileFor`)                                                           |
| Role Home                   | `backend/src/copilot/home.ts` (`buildRoleHome`, `rankStarters`, `availableShortcuts`)                                                                                                                                                                 |
| HTTP                        | `backend/src/copilot/http.ts` — `GET /skills/copilot/home`, `GET /skills/copilot/round` (inside the skills router: auth, policy context, no-store, async guard)                                                                                       |
| Role hint to the LLM router | `skills/engine.ts` (`roleHint: profileFor(turn.roleId).assistantHint`), `skills/interpreter.ts` (`roleHint` in the Agno request), runtime `contracts.py` (`SkillRouteRequest.roleHint`, max 200), `agents/skill_router.py` (one optional prompt line) |
| Role briefing               | `proactive/engine.ts` `composeBriefing` — facts ordered by `signals.preferredEventTypes`, capped by `briefing.maxFacts`, question + `briefing.focus`                                                                                                  |
| UI                          | `frontend/src/components/assistant/CopilotHome.tsx`, `RoundPanel.tsx`, `ProactivePanel.tsx` (role presentation props), `AssistantMode.tsx` (`runShortcut`, `resumeOwnWorkflow`, `matchShortcut` in `submitText`), `assistantApi.ts`                   |

## 2. What is authoritative (unchanged)

| Decision                                  | Source                                                                            | Re-evaluated                 |
| ----------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------- |
| Which skills exist for the identity       | `skillAvailability` (active policy, same hook as `/tools`)                        | every home / session request |
| Which classic screens a shortcut may open | `authz.can(requiresCapability)`                                                   | every home request           |
| Which residents                           | Resident Access Scope (`describeResident`, `patients.list_page`, Phase 7 queries) | every request                |
| What happens on an action                 | existing skill → preview → «Conferma» → Tool Layer                                | every turn                   |
| What is shown proactively                 | Phase 7 engine (policy + scope)                                                   | every inbox / briefing       |

## 3. Composite workflows

- **Start shift** (`kind: start_shift`): role profile → scoped signals → shift briefing on the shared
  panel (facts + optional AI) → pending items and handovers already in the inbox → ranked starters.
- **Resident round** (`kind: resident_round`): residents from `patients.list_page` (policy + scope)
  → select (server scope check) → step buttons = starter texts of EXISTING skills (normal converse;
  writes need preview + «Conferma») → next resident / close (resident context change → the existing
  rule cancels a pending sensitive workflow).
- Neither changes authorization, auto-confirms, skips a preview or calls a tool directly.

## 4. Voice + copilot

Voice is still a channel: a reviewed transcript goes through `submitText(text, 'voice')`, the SAME
function as typed text. A whole-utterance phrase of the current profile (`matchShortcut`) starts the
same shortcut for both channels; anything else goes to `/skills/converse` (Agno / deterministic
interpreter with the role hint). No mapping lives in the voice layer.

## 5. Context invalidation (§12)

| Change                                        | Effect                                                                                                                                                                              |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role (policy assignment)                      | home recomputed: profile, starters, shortcuts follow the new role; previews whose skill is no longer allowed disappear from «Continua»; execution re-checked by the engine (DENIED) |
| Resident                                      | existing rule cancels a sensitive workflow; home resident re-described with scope; round moves on                                                                                   |
| Session / identity (logout, simulator switch) | Assistant closed and remounted (Phase 6), home / round / panel state reset                                                                                                          |
| Policy (capability revoked)                   | shortcut / starter gone at the next home load; backend denies the skill                                                                                                             |
| Access scope                                  | round list, resident labels in «Continua» / «Attività recenti», signals filtered by scope at every load                                                                             |
| Time                                          | «Continua» only for previews younger than `COPILOT_RESUME_MAX_MIN` (30); the workflow store TTL also expires them                                                                   |
