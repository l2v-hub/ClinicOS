# Task Contract

## Task

- Title: AI assistant: instradamento automatico invece del rimando all altro agente + de-branding Agnos nel chatbot
- Slug: ai-assistant-instradamento-automatico-invece-del-rimando-all-altro-agente-de-bra
- Type: change
- Date: 2026-08-13

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
| Privacy / Security   |       no |
| Config / Env         |       no |

## Current Behaviour

1. Il pannello chatbot espone due chip («Assistente clinico» / «Gestione struttura»). Il backend
   (`backend/src/ai/assistant/service.ts:429`) rifiuta ogni intent di dominio dell'altro agente e
   risponde con `redirectMessage()`:
   «Questa richiesta è di competenza dell'assistente «Assistente clinico». Selezionalo per ottenere
   la risposta.»
   Un operatore con la chip «Gestione struttura» attiva che chiede allergie/terapie/parametri non
   riceve il dato, pur avendone diritto per ruolo (i guardrail veri — role clamp, tenant, cross-patient,
   refuse_clinical — sono controlli separati e restano).
2. Il chatbot è marchiato «Agnos» nella UI (FAB, titolo pannello, stato «Agnos sta elaborando…»,
   aria-label, messaggi di errore, hint) e non dichiara esplicitamente di essere un assistente
   virtuale/IA.

## Expected Behaviour

1. L'intent determina l'agente: se la domanda appartiene a un dominio, il servizio instrada
   automaticamente all'agente proprietario ed esegue la richiesta. Nessun messaggio «Selezionalo
   per ottenere la risposta». I guardrail di sicurezza esistenti restano invariati.
2. La selezione manuale dell'agente sparisce dalla UI (non gatekeeper: l'instradamento è automatico).
3. Nel chatbot non compare più il nome «Agnos» nei testi visibili all'utente; l'intestazione dichiara
   che si tratta di un assistente virtuale (IA) che risponde solo con dati presenti in ClinicOS.

## Acceptance Criteria

- AC1: `resolveAgent(selected, intent)` restituisce l'agente proprietario dell'intent quando
  l'agente selezionato non lo copre, e l'agente selezionato per intent condivisi/di dominio proprio.
- AC2: `redirectMessage` non esiste più nel codice: nessuna risposta contiene la stringa
  «Selezionalo per ottenere la risposta».
- AC3: una richiesta clinica (`allergies`/`therapies`/`vitals_recent`) inviata con `agent:'facility'`
  viene eseguita e restituisce `agent:'clinical'` nella risposta, non un refusal.
- AC4: nessuna stringa visibile all'utente nel pannello chatbot contiene «Agnos»; il pannello mostra
  «Assistente virtuale» con la nota che è un assistente virtuale basato sui dati di ClinicOS.
- AC5: la UI non espone più i chip di selezione dell'assistente e non invia più `agent` da chat.
- AC6: `cd frontend && npm run build` verde; test backend `node --test` sui file AI verdi.

## Test Plan

| Test type                 | Required | Reason                                                                                          |
| ------------------------- | -------: | ----------------------------------------------------------------------------------------------- |
| Unit                      |      yes | routing agent↔intent (`backend/src/ai/__tests__/agents.test.ts` + staff-list/facility-snapshot) |
| Integration               |      yes | `runAssistantQuery` con agent non proprietario deve eseguire, non rifiutare                     |
| API                       |       no | nessun contratto HTTP nuovo (campo `agent` in risposta già esistente)                           |
| Playwright                |      yes | evidenza UI: pannello senza «Agnos», senza chip, risposta clinica da operatore                  |
| Persistence after refresh |       no | nessuna scrittura dati                                                                          |
| Agnos action registry     |       no | catalogo azioni invariato                                                                       |
| Voice simulation          |       no | percorso voce invariato (stesse stringhe di stato riusate)                                      |
| OCR/import test           |       no | non toccato                                                                                     |
| Security/privacy scan     |       no | i guardrail (role clamp, tenant, cross-patient, refuse_clinical) non sono modificati            |

## Evidence Plan

Required evidence:

- validation-report.md
- test output (node --test backend AI + npm run build frontend)
- screenshots if UI
- Playwright trace if UI
- sanitized logs if backend/AI

## Risks

- Rischio: l'instradamento automatico potrebbe essere scambiato per un allargamento dei permessi.
  Mitigazione: la selezione dell'agente non è mai stata un controllo di sicurezza (commento in
  `agents.ts:1-4`); i controlli reali (role clamp, tenant isolation, cross-patient gate,
  refuse_clinical) restano nel percorso e sono invariati.
- Rischio: rinominare stringhe rompe test che asseriscono i testi. Mitigazione: aggiornare i test
  che citano «Agnos» nelle asserzioni di testo utente.

## Gate Status

READY FOR IMPLEMENTATION
