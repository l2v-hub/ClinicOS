# Task Contract

## Task

- Title: Milo AI first analisi e piano
- Slug: milo-ai-first-analisi-e-piano
- Type: analysis
- Date: 2026-11-22

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |       no |
| Backend/API          |       no |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |      yes |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

Note: richiesta dell'utente (2026-11-22): verificare tutto il flusso AI di Milo (agenti Agno, skill,
dati, voce, proattività) rispetto all'obiettivo «AI first» e predisporre l'applicazione. Questo
task è SOLO analisi e piano: nessuna modifica a codice applicativo. Output: documento
`docs/architecture/milo-ai-first.md`.

## Current Behaviour

Milo è distribuito su due assistenti indipendenti (`/ai/assistant|actions` e `/skills`), il servizio
AI usa Agno solo come chiamata al modello, non esistono score clinici lato server né risposte con
grafici o dashboard.

## Expected Behaviour

Un documento che descrive lo stato reale (con file e righe), le lacune rispetto all'obiettivo,
l'architettura di arrivo (team di agenti con skill, accesso ai dati, interfaccia generativa,
protocolli clinici, proattività, voce e dispositivi), le decisioni che spettano al committente e un
piano a fasi con criteri di accettazione verificabili.

## Acceptance Criteria

- AC1: ogni affermazione sullo stato attuale cita file e riga, ed è stata verificata a campione sul
  codice (ruolo forzato, archivio dei parametri, `query_data` senza paziente corrente).
- AC2: il documento elenca le lacune per area (agenti, dati, clinica, interfaccia, voce,
  proattività, sicurezza e privacy).
- AC3: l'architettura di arrivo rispetta i vincoli esistenti: dati solo dal backend con
  autorizzazioni lato server, scritture sempre confermate dall'operatore, l'AI non calcola gli
  score né formula diagnosi.
- AC4: piano a fasi con criteri di accettazione verificabili per ogni fase e decisioni aperte
  esplicite.

## Test Plan

| Test type                 | Required | Reason                              |
| ------------------------- | -------: | ----------------------------------- |
| Unit                      |       no | nessun codice modificato            |
| Integration               |       no |                                     |
| API                       |       no |                                     |
| Playwright                |       no |                                     |
| Persistence after refresh |       no |                                     |
| Agnos action registry     |       no | analisi in sola lettura             |
| Voice simulation          |       no |                                     |
| OCR/import test           |       no |                                     |
| Security/privacy scan     |       no | analisi; i rischi sono nel documento |

## Evidence Plan

Required evidence:

- validation-report.md
- `docs/architecture/milo-ai-first.md`

## Risks

- Analisi statica: i comportamenti in esecuzione (es. latenza dei modelli) non sono misurati qui.

## Gate Status

READY FOR IMPLEMENTATION
