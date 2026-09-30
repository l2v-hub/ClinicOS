# Prompt 4 Handoff — from Phase 3 (Skills, Workflows & Agno Operational Readiness)

Read with: `../CURRENT_STATE.json`, `SKILL_CATALOG.json`, `ROLE_SKILL_MATRIX.json`,
`WORKFLOW_ARCHITECTURE.md`, `CONFIRMATION_POLICY.md`, `AGNO_ORCHESTRATION.md`, `E2E_TEST_REPORT.md`.
Phase 2 contracts (`../phase-2-authorization/POLICY_CONTRACT.md`) remain authoritative.

## 1. Architecture actually implemented

```
AI Assistant UI (Prompt 4)  ──►  POST /skills/converse   (one call = one workflow turn)
                                   │ requireOperator → identity; requireAuthorizationContext → role
                                   │ evaluateTools(): policy per turn (same hook as GET /tools)
                                   ├─► Agno skill router  POST {AI_RUNTIME_URL}/v1/assistant/skill-route
                                   │     (only AVAILABLE skills are sent; returns skill + slots)
                                   ├─► workflow engine (structured state, clarification, preview)
                                   └─► ToolRegistry.invoke (policy re-check, validation, scope, audit)
                                          └─► Phase 1 services → Postgres
```

| piece                          | path                                                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Skill catalog (code of record) | `backend/src/skills/catalog.ts` → `SKILL_CATALOG.json/.md` (`scripts/ai-architecture/build-skill-catalog.ts`, `render-skill-catalog.mjs`) |
| Role → Skill                   | `ROLE_SKILL_MATRIX.json` (baseline) · live: `GET /skills`                                                                                 |
| Workflow engine / state        | `backend/src/skills/engine.ts`, `types.ts`, `store.ts`                                                                                    |
| Context resolution             | `engine.ts#resolvePatient` (tools `patients.search`, `patients.clinical_summary`)                                                         |
| Confirmation                   | `backend/src/skills/confirmation.ts` (v1)                                                                                                 |
| Tool invocation                | `backend/src/skills/executors.ts` (only `ToolRegistry.invoke`, origin `ai`)                                                               |
| Agno entry point               | runtime `clinicos_ai/agents/skill_router.py` · backend `skills/interpreter.ts`                                                            |
| HTTP                           | `backend/src/skills/http.ts` mounted at `/skills` in `backend/src/app.ts`                                                                 |
| NL harness                     | `scripts/skills/nl-harness.mjs` (CLI over HTTP, Role Simulator)                                                                           |
| Live Agno E2E                  | `scripts/skills/agno-live-e2e.mjs` (+ `seed-demo-patients.ts`)                                                                            |

## 2. Contracts for the AI Assistant UI

- **Start/continue**: `POST /skills/converse {message, workflowId?, context:{currentPatientId, currentPatientLabel}}`.
  Keep `workflowId` while `status` ∉ {COMPLETED, DENIED, FAILED, CANCELLED}.
- **Render by status**:
  - `NEEDS_CLARIFICATION` → show `reply`; if `candidates` render them as choices (send the number or the label);
  - `NEEDS_CONFIRMATION` → render `preview` as a card (patient, action, values, notes, origin AI) with
    buttons Conferma (`action:"confirm"`) / Annulla (`action:"cancel"`); a free-text reply is treated as a correction;
  - `COMPLETED` → `reply` (+ `result`); `DENIED` → `reply` + `error.code` (`capability_denied`,
    `capability_revoked`, `human_control_required` → offer navigation to the GUI screen);
  - `FAILED` → `reply`; show «Riprova» only when the reply offers it (`action:"retry"`).
- **Never** show success without `status: COMPLETED`.
- **Skill palette / suggestions**: `GET /skills` (available, partial, missing capabilities) and
  `suggestions` when a message is not understood.
- **Voice (later)**: send the transcript as `message`; confirmation must stay an explicit act.

## 3. Authorization & audit integration

- The policy (Phase 2) is the only authority: availability = all required tools allowed; each tool
  call re-authorized; revocation effective at the next turn (tested F).
- Audit (`AiAuditEvent`, channel `ai`, requestId `skill-<workflowId>`): `skill:<id>:request`
  (interpreter), `:proposal` (tool, class, field names), `:confirmation` (confirmed/cancelled/retry),
  `:execute` (tools, outcome), `:denied` (code) + the Tool Layer's `tool:<name>` events. Operator id,
  policy role, patient id, timestamp on every row; field names only (PHI-safe).

## 4. Test commands

```bash
# backend unit + E2E A–J (+ per-role coverage), real Postgres
cd backend && AUTH_MODE=demo NODE_ENV=test DATABASE_URL=… node --import tsx --test src/skills/__tests__/*.test.ts
# runtime
cd clinicos-ai-runtime && python -m unittest discover -s tests -p "test_*.py"
# live Agno (backend with AI_RUNTIME_URL/TOKEN, simulator on, seeded synthetic patients)
node scripts/skills/agno-live-e2e.mjs --base http://127.0.0.1:3099 --out live.json
# manual NL session
node scripts/skills/nl-harness.mjs --base http://127.0.0.1:3099 --as SIM-NURSE-1
```

## 5. Known gaps

See `CURRENT_STATE.md` § Gaps (in-process workflow store, G1 ownership data scope, Italian-only
fallback keywords, pre-existing 16-char codice-fiscale search quirk, HIGH_RISK skills human-only).

## 6. Decisions that need the customer

1. Whether the assistant may PREPARE (never confirm) prescriptions/administrations (today: hand-off only).
2. `handover.create` defaults (priorità normale, tipo Monitoraggio).
3. Administrator READ_ONLY clinical reads (inherited from Phase 2 baseline) — keep or remove.
4. Ward/team data scope for Doctor/Nurse/OSS (Phase 2 G1) — affects which residents a skill can target.
5. Retention of the AI audit trail and whether messages may be stored (today: never stored).
