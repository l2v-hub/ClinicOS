# Task Contract

## Task

- Title: Milo fase 2 team di agenti
- Slug: milo-fase-2-team-di-agenti
- Type: change
- Date: 2026-11-22

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |      yes |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |      yes |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |      yes |
| Privacy / Security   |      yes |
| Config / Env         |      yes |

Note: richiesta dell'utente (2026-11-22): procedere con le fasi del piano
`docs/architecture/milo-ai-first.md` (§4, Fase 2). Nessuna modifica a Prisma. Nuova rotta
interna `/internal/ai/tools/:tool` (servizio AI → backend, token di servizio + delega). Nuova rotta
del servizio AI `/v1/assistant/team`. Interruttore `AI_ASSISTANT_TEAM_ENABLED` spento di default.

## Current Behaviour

Agno serve solo come involucro di una chiamata al modello; un pianificatore e un compositore
generici, un passaggio solo, nessuno specialista con strumenti propri; la risposta discorsiva
composta dal modello non è mostrata dall'interfaccia; nessuna memoria della conversazione.

## Expected Behaviour

Un team Agno (coordinatore Milo + specialisti clinico, sorveglianza, struttura) che legge i dati
in ciclo SOLO tramite il backend, con una delega per domanda; risposta verificata dal backend (fonti
citate ⊆ fonti restituite, nessuna dichiarazione di azioni); in caso di errore il percorso classico;
risposta discorsiva visibile con fonti numerate e specialisti; ultimi scambi della conversazione
passati come contesto; interruttore per vietare i dati clinici al modello.

## Acceptance Criteria

- AC1: il team Agno gira davvero (coordinatore → specialista → strumento → backend → risposta) in un
  test con un modello simulato compatibile e un backend simulato; gli strumenti offerti sono solo
  quelli consentiti al ruolo.
- AC2: la rotta interna richiede token di servizio E delega valida; la delega impone perimetro,
  permessi per strumento, gate fra più pazienti e limite di letture; scade e si revoca a fine domanda.
- AC3: una risposta del team con fonti inventate, dichiarazioni di azioni o senza letture è scartata
  e risponde il percorso classico; con il servizio AI irraggiungibile la risposta classica arriva.
- AC4: le richieste di giudizio clinico sono rifiutate prima di chiamare il team.
- AC5: l'interfaccia mostra la risposta discorsiva con fonti numerate e gli specialisti; il pannello
  invia gli ultimi 6 scambi (solo testo) e il backend li accetta solo in quella forma.
- AC6: `AI_CLINICAL_DATA_TO_MODEL=deny` spegne team e compositore.
- AC7: suite backend senza fallimenti nuovi, suite frontend, suite del servizio AI, build.
- AC8 (dopo il rilascio): sulla demo, con il team acceso, domande reali di paziente e struttura con
  risposta del team e fonti; tempi registrati.

## Test Plan

| Test type                 | Required | Reason                                               |
| ------------------------- | -------: | ---------------------------------------------------- |
| Unit                      |      yes | configurazione, deleghe, verifica risposte, storia   |
| Integration               |      yes | rotta interna e team con database reale (PGlite)     |
| API                       |      yes | `/internal/ai/tools/:tool`, `/v1/assistant/team`     |
| Playwright                |      yes | dopo il rilascio: pannello con risposta del team     |
| Persistence after refresh |       no | sola lettura                                         |
| Agnos action registry     |      yes | strumenti del team = strumenti consentiti            |
| Voice simulation          |       no |                                                      |
| OCR/import test           |       no |                                                      |
| Security/privacy scan     |      yes | delega, perimetro, dati non attendibili racchiusi    |

## Evidence Plan

Required evidence:

- validation-report.md
- `logs/` suite e test del team; dopo il rilascio, risposte sulla demo

## Risks

- Il comportamento del modello vero (`gpt-6.1-sol`) nel team si misura solo sulla demo.
- Il team fa più chiamate al modello: tempi e costi maggiori di una lettura classica.
- Delega in memoria del processo: valida con una sola istanza del backend.

## Gate Status

READY FOR IMPLEMENTATION
