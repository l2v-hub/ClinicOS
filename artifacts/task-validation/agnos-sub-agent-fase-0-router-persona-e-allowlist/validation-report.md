# Task Validation Report

## Task

- Title: Agnos sub-agent Fase 0 — router persona + allowlist
- Slug: agnos-sub-agent-fase-0-router-persona-e-allowlist
- Branch: `feat/agnos-subagents-fase0`
- Commit: (push in corso)
- Date: 2026-07-19

## Implementation Summary

Due sub-agent role-scoped sopra le letture Agnos ESISTENTI, selezione via toggle esplicito, zero cambi
schema, guardrail invariati.

- **`backend/src/ai/assistant/agents.ts`** (nuovo): profili `facility` (Gestione struttura) e `clinical`
  (Assistente clinico) — allowlist di intent + persona + `agentAllowsIntent`/`redirectMessage`/`ownerAgent`
  (funzioni pure). Facility = `rooms_occupancy`+`data_query`; Clinical = allergie/terapie/parametri/timeline/
  ricerche/correlate; SHARED = patient_search/appointments/unknown/refuse_clinical.
- **`service.ts`**: guard dopo il plan — intent fuori dominio dell'agente selezionato → `refusal` di redirect
  (non esegue tool); echo `agent` in risposta. AssistantAnswer + PlanContext estesi con `agent`.
- **`orchestrate.ts`** + route **`ai-actions.ts`**: `agent` propagato dal body → `planCommand` → `assistantQuery`
  (validato con `isAgentId`).
- **Frontend** `useAgnosChat.ts` + `AgnosPanel.tsx`: toggle "Assistente clinico / Gestione struttura" (riusa
  `.filter-chip`), default clinico se paziente aperto altrimenti gestione, invia `agent` al backend.

Guardrail invariati: `refuse_clinical` (interpretazione parametri resta rifiutata → Fase 2), role-clamp a
operatore, facility env-gate, SOURCE_ONLY. Percorso write/voce invariato.

## Files Changed

- `backend/src/ai/assistant/agents.ts` (nuovo) + `backend/src/ai/__tests__/agents.test.ts` (nuovo)
- `backend/src/ai/assistant/plan.ts`, `service.ts`
- `backend/src/ai/actions/orchestrate.ts`, `backend/src/routes/ai-actions.ts`
- `frontend/src/components/shared/agnos/useAgnosChat.ts`, `frontend/src/components/shared/AgnosPanel.tsx`

## Acceptance Criteria Result

| AC                                                                   | Result | Evidence                                                                                                                      |
| -------------------------------------------------------------------- | -----: | ----------------------------------------------------------------------------------------------------------------------------- |
| AC1 — 2 profili + allowlist + persona; `agent` fino a assistantQuery |   PASS | `agents.ts`; API: risposte con `"agent":"clinical"/"facility"`                                                                |
| AC2 — intent fuori dominio → redirect (non esegue)                   |   PASS | API: [clinical]+camere → `results:0`, refusal _«Gestione struttura»_; [facility]+allergie → refusal _«Assistente clinico»_    |
| AC3 — intent in dominio → risposta invariata; guardrail invariati    |   PASS | API: [clinical]+allergie Mancini → `results:1`, no refusal; refuse_clinical/role-clamp intatti                                |
| AC4 — toggle UI invia agent; build FE+BE verdi; unit routing verdi   |   PASS | Toggle switch active/pressed (Playwright), 0 errori console; FE build exit 0; BE build exit 0; agents.test 5/5; suite 341/341 |

## Test Results

| Test                     | Result | Evidence                                                                                        |
| ------------------------ | -----: | ----------------------------------------------------------------------------------------------- |
| Unit — agents.ts routing |   PASS | `agents.test.ts` 5/5 (allowlist, ownerAgent, redirectMessage, isAgentId)                        |
| Suite backend completa   |   PASS | 341/341 (era 336 + 5 nuovi)                                                                     |
| API routing (node fetch) |   PASS | 4 casi: 2 redirect cross-dominio, 1 read clinico eseguito, 1 facility al gate env pre-esistente |
| Playwright — toggle UI   |   PASS | `screenshots/agnos-subagent-toggle.png`; switch active/pressed verificato; 0 errori console     |
| Build frontend / backend |   PASS | exit 0 entrambi                                                                                 |

## Runtime Evidence

- `screenshots/agnos-subagent-toggle.png` — toggle "Assistente clinico / Gestione struttura" in AgnosPanel.
- Routing API (bypass RTK via node fetch): redirect cross-dominio con l'agente corretto citato; read in-dominio eseguito.

## Logs

Solo dati seed sintetici. Nessun PHI, nessun secret.

## Residual Risks / Follow-up

- **Fase 0**: scoping sulle LETTURE; il percorso write/voce resta condiviso (scoping write = follow-up).
- Persona definita in `agents.ts` ma non ancora iniettata nel composer LLM (il comportamento è imposto
  dall'allowlist, non dalla prosa) — wiring persona→composer opzionale in Fase 0.1.
- Le capacità nuove (personale+qualifica, ferie/ottimizzazione calendario, serie/grafici parametri,
  range di riferimento, terapia→documento) restano Fasi 1–3 (richiedono cambi schema + decisioni policy/ruoli).

## Final Decision

CLOSED — VERIFIED

(Due sub-agent role-scoped sopra le letture esistenti: allowlist + redirect cross-dominio + toggle UI,
verificati via unit 5/5 + suite 341/341 + routing API a 4 casi + Playwright toggle, build FE/BE verdi,
0 errori console. Guardrail invariati. READY per merge + deploy.)
