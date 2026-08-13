# Task Validation Report

## Task

- Title: AI assistant: instradamento automatico invece del rimando all altro agente + de-branding Agnos nel chatbot
- Slug: ai-assistant-instradamento-automatico-invece-del-rimando-all-altro-agente-de-bra
- Commit: (non ancora committato — working tree)
- Date: 2026-08-13

## Implementation Summary

1. **Instradamento automatico (backend).** `redirectMessage()` è stato sostituito da
   `resolveAgent(selected, intent)`: se l'intent appartiene all'altro dominio, la richiesta viene
   instradata al suo proprietario ed **eseguita**. `assistantQuery` non ha più il ramo che
   restituiva un refusal con «Selezionalo per ottenere la risposta»; la risposta espone in `agent`
   chi ha effettivamente risposto. Nessun guardrail toccato (refuse_clinical, role clamp, tenant
   isolation, cross-patient gate, SOURCE_ONLY sono tutti a monte/valle e invariati).
2. **De-branding + trasparenza (frontend).** Nel chatbot non compare più «Agnos»: FAB e dialog si
   chiamano «Assistente virtuale ClinicOS», l'intestazione mostra «Assistente virtuale» con badge
   **IA** e la riga «Non è un operatore umano · risponde solo con i dati presenti in ClinicOS»; i
   messaggi di stato/errore e l'hint iniziale sono stati riscritti senza il nome prodotto.
3. **Niente più scelta manuale dell'assistente.** I chip «Assistente clinico / Gestione struttura»
   sono rimossi e la chat non invia più il campo `agent`: è l'intent a decidere. (Il brief
   automatico continua a chiedere esplicitamente la lettura di struttura, invariato.)

I nomi interni dei file/tipi (`AgnosPanel`, `useAgnosChat`, …) restano invariati: la richiesta
riguardava ciò che l'utente vede.

## Files Changed

- `backend/src/ai/assistant/agents.ts` — `resolveAgent` sostituisce `redirectMessage`
- `backend/src/ai/assistant/service.ts` — niente short-circuit di rimando; `agent` = agente che risponde
- `backend/src/ai/assistant/plan.ts`, `backend/src/ai/actions/orchestrate.ts` — commenti allineati
- `backend/src/ai/__tests__/agents.test.ts`, `backend/src/ai/__tests__/staff-list.test.ts` — test aggiornati
- `frontend/src/components/shared/AgnosPanel.tsx` — header assistente virtuale, chip rimossi, stringhe
- `frontend/src/components/shared/agnos/useAgnosChat.ts` — niente `agent` nel payload, messaggi riscritti
- `frontend/src/components/shared/agnos/AgnosBrief.tsx` — hint iniziale riscritto
- `frontend/src/App.css` — stili `.assistant-id*`
- `e2e/remediation/issue-239.spec.ts` — selettori aggiornati alle nuove etichette accessibili

## Acceptance Criteria Result

| AC                                                                                 | Result | Evidence                                                                                                                     |
| ---------------------------------------------------------------------------------- | -----: | ---------------------------------------------------------------------------------------------------------------------------- |
| AC1 — `resolveAgent` instrada al proprietario                                      |   PASS | `logs/backend-unit.txt` (test «resolveAgent routes an out-of-domain intent to its owner instead of refusing»)                |
| AC2 — `redirectMessage` eliminato, nessun «Selezionalo…»                           |   PASS | `logs/routing-check.txt` (test 2) + grep: la stringa resta solo in `backend/dist/` (artefatto di build) e in questo contract |
| AC3 — domanda clinica con `agent:'facility'` eseguita, risposta `agent:'clinical'` |   PASS | `logs/routing-check.txt` (test 1: `results.length===1`, `refusal===undefined`, `agent==='clinical'`)                         |
| AC4 — nessun «Agnos» visibile; pannello dichiara di essere un assistente virtuale  |   PASS | `logs/ui-evidence.txt` + `screenshots/01-pannello-aperto.png`, `screenshots/03-pannello-dettaglio.png`                       |
| AC5 — niente chip di selezione, niente `agent` inviato dalla chat                  |   PASS | `logs/ui-evidence.txt` (3 check: gruppo assente, pulsante assente, `postData.agent === undefined`)                           |
| AC6 — build frontend verde + test AI backend verdi                                 |   PASS | `logs/frontend-build.txt`, `logs/backend-unit.txt`                                                                           |

## Test Results

| Test                                                                      |                                                                  Result | Evidence                                                     |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------: | ------------------------------------------------------------ |
| Unit (backend AI)                                                         |          PASS 282 / FAIL 10 (pre-esistenti, `DATABASE_URL is required`) | `logs/backend-unit.txt`                                      |
| Integration (`assistantQuery` reale, gateway services stubbato)           |                                                                PASS 4/4 | `logs/routing-check.txt`                                     |
| API                                                                       |                                                                      NA | nessun contratto HTTP nuovo                                  |
| Playwright (browser reale, build di produzione servita da `vite preview`) |                                                        PASS 14/14 check | `logs/ui-evidence.txt`, `screenshots/`                       |
| Persistence                                                               |                                                                      NA | nessuna scrittura dati                                       |
| Agnos AI                                                                  |                                                                    PASS | è il percorso testato sopra (plan → resolveAgent → dispatch) |
| Voice                                                                     |                                                                      NA | percorso voce invariato (stesse stringhe di stato riusate)   |
| OCR                                                                       |                                                                      NA | non toccato                                                  |
| Security/privacy                                                          | NA per test dedicati; nessun guardrail modificato (vedi Residual Risks) |

## Runtime Evidence

- `assistant-agent-routing.check.mts` — esegue il **servizio reale** (`assistantQuery`) con
  `agent:'facility'` su «che allergie ha?»: prima rispondeva con il rimando, ora restituisce il dato
  e `agent:'clinical'`. Solo il gateway services (unico punto che tocca Postgres) è stubbato.
  Comando: `cd backend && npx tsx --test --experimental-test-module-mocks ../artifacts/task-validation/<slug>/assistant-agent-routing.check.mts`
  (fuori dalla suite CI: `mock.module` richiede Node ≥22.3 e il flag, la CI gira su Node 20).
- `ui-evidence.mjs` — Chromium reale sulla build di produzione (`vite preview`, ruolo **Operatore**):
  apre il pannello, verifica intestazione/badge/assenza di «Agnos», assenza dei chip, invia
  «che allergie ha?» e verifica che compaia la risposta con la fonte e nessun messaggio di rimando.
  Screenshot: `screenshots/01-pannello-aperto.png`, `02-risposta-clinica-operatore.png`,
  `03-pannello-dettaglio.png`.

## Logs

Only sanitized logs are allowed.

- `logs/backend-unit.txt` — test unitari backend AI
- `logs/routing-check.txt` — integrazione servizio (instradamento)
- `logs/ui-evidence.txt` — check Playwright
- `logs/frontend-build.txt` — `npm run build` (tsc -b && vite build)

## Residual Risks

- **Nessun Postgres locale su questa macchina** (né podman/docker): i 10 test backend che
  richiedono il DB falliscono con `DATABASE_URL is required` **prima e dopo** la modifica, e la
  risposta clinica nel browser è servita da uno stub di rete. Il comportamento del backend è però
  provato dal check di integrazione sul servizio reale. Manca la verifica end-to-end su ambiente
  con DB (fattibile in CI/su ambiente di validazione).
- **Perimetro dei dati**: l'instradamento non allarga i permessi — la selezione dell'agente non era
  un controllo di accesso. Chi non può leggere un dato continua a ricevere il rifiuto dai guardrail
  (role clamp / tenant / cross-patient / refuse_clinical), invariati.
- La chat non invia più `agent`; l'endpoint continua ad accettarlo (usato dal brief automatico),
  quindi nessuna rottura di contratto per altri client.

## Final Decision

CLOSED — VERIFIED
