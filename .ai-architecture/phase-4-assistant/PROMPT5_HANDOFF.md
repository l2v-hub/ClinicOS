# Prompt 5 Handoff — from Phase 4 (AI Assistant Experience)

Read with: `../CURRENT_STATE.json`, `ASSISTANT_UX_ARCHITECTURE.md`, `ASSISTANT_STATE_MODEL.md`,
`ACTION_PREVIEW_CONTRACT.md`, `RESIDENT_ACCESS_SCOPE.md`, `SAFETY_AND_CONFIRMATION_RULES.md`,
`E2E_TEST_REPORT.md`, and Phase 3 `../phase-3-skills/{AGNO_ORCHESTRATION.md,SKILL_CATALOG.json}`.

## 1. Assistant UI entry point & components

| piece                | path                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Entry point          | topbar button «Assistente AI» (`data-testid="assistant-entry"`) in `frontend/src/App.tsx` → `AssistantMode` (lazy)                    |
| Full-screen mode     | `frontend/src/components/assistant/AssistantMode.tsx` (+ `AssistantMode.css`, `AssistantEditForm` inside)                             |
| State (pure reducer) | `frontend/src/components/assistant/assistantState.ts` (tests `__tests__/assistantState.test.ts`)                                      |
| HTTP client          | `frontend/src/components/assistant/assistantApi.ts`                                                                                   |
| Backend surface      | `backend/src/skills/http.ts` (`/skills/session`, `/skills/context`, `/skills/residents`, `/skills/converse`, `/skills/workflows/:id`) |
| Engine / skills      | `backend/src/skills/{engine,executors,catalog,confirmation,interpreter}.ts`                                                           |
| Resident scope       | `backend/src/access-scope/resident-access-scope.ts`                                                                                   |
| Agno                 | runtime `clinicos-ai-runtime/clinicos_ai/agents/skill_router.py` (`POST /v1/assistant/skill-route`)                                   |

## 2. Contracts

- **Assistant state**: `ASSISTANT_STATE_MODEL.md` (server authoritative, client mirror).
- **Resident context**: every `/skills/converse` carries `context.currentPatientId` (string | null);
  the server verifies it (`canAccessResident`), labels it (`describeResident`), and invalidates an
  open workflow when it changes (`resident_changed`).
- **Agno I/O**: request `{message, today, pending, skills[], forbiddenSkills[], valueKeys}` →
  `{route: {skillId, patientQuery?, currentPatient?, values?, text?, date?, query?}}`; validated
  twice (runtime + backend); never confirms; fallback deterministic.
- **Preview / confirmation / cancellation**: `ACTION_PREVIEW_CONTRACT.md` — confirm = `action:"confirm"`
  - current `previewId` (+ `payload.therapy` for prescriptions); modify → edit → new preview id;
    cancel → no write; retry only for requestId-idempotent writes.
- **Audit**: `AiAuditEvent` with `channel = ai_assistant` (origin AI_ASSISTANT), `requestId = skill-<workflowId>`,
  stages `request | proposal | confirmation | execute | denied` + `tool:<name>` events; fields
  `interpreter:*`, `preview:<id>`, `tool:*`, `confirmed`, `ui_event`, `cancelled`, `modify`, `edit:*`,
  `preview_stale`, `resident_changed`, `error:*` (names only).

## 3. Supported skill examples (text today, voice tomorrow)

«Mostrami i parametri recenti di questo ospite» · «Registra pressione 120/80 per questo ospite» ·
«Aggiungi un’osservazione nel diario di questo ospite: …» · «Crea una consegna per questo ospite: …» ·
«Prescrivi Paracetamolo 1000 mg 1 compressa per os alle 8 e alle 20 per questo ospite» (Medico) ·
«Registra una somministrazione per questo ospite» (Infermiere) · «Quali somministrazioni ci sono
oggi?» · «Dimmi tutto su questo ospite» · «Quanti posti letto sono occupati?» (Supervisore/Amministratore).

## 4. Tablet UX constraints

Controls ≥ 48 px (design-system `ds-btn`, never restyled), single column ≤ 700 px, composer pinned
at the bottom (virtual keyboard), preview card auto-scrolled into view, no horizontal scroll at 390 px,
resident always visible in the resident bar, all actions disabled while a request is in flight.

## 5. Test commands

```bash
# backend: Phase 3 + Phase 4 skill suites, access scope (real HTTP + Postgres + Role Simulator)
cd backend && AUTH_MODE=demo NODE_ENV=test DATABASE_URL=… node --import tsx --test src/skills/__tests__/*.test.ts src/access-scope/__tests__/*.test.ts
# frontend state
cd frontend && node --import tsx --import ../scripts/stub-css-loader.mjs --test src/components/assistant/__tests__/*.test.ts
# browser E2E (real Vite + backend): seed, start both, run
DATABASE_URL=… npx tsx scripts/assistant/seed-assistant-demo.mts
DATABASE_URL=… node scripts/assistant/assistant-browser-e2e.mjs --front http://127.0.0.1:5199 --api http://127.0.0.1:3099 --out <dir>
```

## 6. Where Prompt 5 plugs in (voice)

| capability           | integration point                                                  | rule                                                              |
| -------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| push-to-talk         | a mic button in `AssistantMode` composer area → start/stop capture | the button never confirms                                         |
| VAD                  | client-side around the capture stream                              | ends an utterance only                                            |
| streaming transcript | show partial text in the composer (`draft`)                        | nothing is sent until final                                       |
| voice activity state | new UI state next to `busy` (listening / processing)               | keep `busy` semantics for requests                                |
| text-to-command      | final transcript → `submitText(text, 'voice')`                     | identical path to keyboard (Agno → skill → policy → scope → tool) |

Must NOT be duplicated by the Voice Layer: skill selection, policy/scope checks, workflow state,
previews, confirmation (spoken «sì» is not a confirmation — the button bound to `previewId` is),
tool invocation, audit. The legacy Agnos voice (`/ai/voice`, `useVoiceInput`) stays a separate
channel until retired; do not route the new assistant through it.

## 7. Known gaps

See `CURRENT_STATE.md` § Gaps.

## 8. Decisions that need the customer

1. Real use of AI-prepared prescriptions/administrations (doctor/nurse confirm) — clinical governance sign-off.
2. Resident scope beyond `registered_by_me` (ward/team/assignment) needs data model + policy decision.
3. Administrator: keep aggregates only (current) or re-enable specific clinical reads for an admin function.
4. Handover urgency: keep "suggest only" or introduce deterministic escalation rules.
