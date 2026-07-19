# Task Contract

## Task

- Title: Agnos sub-agent Fase 0 router persona e allowlist
- Slug: agnos-sub-agent-fase-0-router-persona-e-allowlist
- Type: feature
- Date: 2026-07-19

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |      yes |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |      yes |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |      yes |
| Config / Env         |       no |

## Current Behaviour

Agnos ha un solo assistente indistinto: qualsiasi domanda risolve sullo stesso set di intent
(allergie/terapie/parametri/timeline/ricerche + rooms_occupancy/agenda). Nessuna nozione di "agente"
role-scoped. Le primitive esistono (planner ibrido + query engine + read-tools SOURCE_ONLY + guardrail
privacy/refuse_clinical).

## Expected Behaviour

Fase 0: due sub-agent role-scoped **sopra le letture esistenti**, selezione via toggle esplicito, zero
cambi schema. Ogni agente = allowlist di intent + persona; una domanda fuori dominio riceve un **redirect
gentile** all'altro agente (non esegue).

- **Gestione/Direzione**: `rooms_occupancy`, `data_query` (DSL facility), agenda (`appointments`) + patient_search.
- **Clinico**: allergie/terapie/parametri (recent/range)/timeline/ricerche narrative-documenti/correlate + agenda + patient_search.
- Guardrail invariati: `refuse_clinical` (interpretazione parametri resta rifiutata → Fase 2), role-clamp e privacy attuali. SOURCE_ONLY invariato.

## Acceptance Criteria

- AC1: esistono 2 profili agente (`facility`, `clinical`) con allowlist di intent + persona; `agent` passa dal client fino a `assistantQuery`.
- AC2: intent fuori dominio dell'agente selezionato → risposta di **redirect** (non esegue tool), con messaggio che indica l'agente giusto.
- AC3: intent in dominio → risposta invariata (stessi risultati SOURCE_ONLY di oggi). Guardrail refuse_clinical/privacy invariati.
- AC4: UI AgnosPanel ha un toggle Clinico/Gestione che invia `agent`; build frontend+backend verdi; test unit del routing verdi.

## Test Plan

| Test type                 | Required | Reason                                                                                      |
| ------------------------- | -------: | ------------------------------------------------------------------------------------------- |
| Unit                      |      yes | Routing agente↔intent (allowlist + redirect) su funzioni pure di agents.ts + assistantQuery |
| Integration               |       no | Nessun nuovo flusso DB                                                                      |
| API                       |       no | Contratto route esteso (campo agent), coperto da unit                                       |
| Playwright                |      yes | Toggle Clinico/Gestione in AgnosPanel + una risposta per agente                             |
| Persistence after refresh |       no | Nessun dato modificato                                                                      |
| Agnos action registry     |       no | Nessuna nuova write action                                                                  |
| Voice simulation          |       no | Percorso write/voce invariato in Fase 0                                                     |
| OCR/import test           |       no | Non impattato                                                                               |
| Security/privacy scan     |      yes | Verifica che il redirect non esegua tool fuori dominio e che il role-clamp resti            |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

- Mis-routing (intent assegnato all'agente sbagliato): mitigazione — allowlist esplicita + set "shared" (patient_search/unknown/refuse) ammesso ovunque; redirect non distruttivo (non esegue).
- Non indebolire i guardrail: il guard agente è additivo (dopo il plan, prima dell'esecuzione tool); refuse_clinical e role-clamp restano invariati.
- Percorso write/voce invariato in Fase 0 (scoping delle write rimandato).

## Gate Status

READY FOR IMPLEMENTATION
