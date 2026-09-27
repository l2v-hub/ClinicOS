# Task Contract

## Task

- Title: HMI: ingresso paziente unificato (documenti o a mano)
- Slug: hmi-ingresso-paziente-unificato-documenti-o-a-mano
- Type: feature
- Date: 2026-09-27

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |       no |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

## Current Behaviour

- Nella lista pazienti ci sono due pulsanti separati:
  - "Importa dimissione" apre l'import AI dei documenti;
  - "Nuovo paziente" (e "Aggiungi primo paziente" a lista vuota) apre direttamente il wizard
    manuale in 5 passi.
- Chi preme "Nuovo paziente" con una lettera di dimissione in mano la ricopia a mano, cioè il
  percorso più lento, senza che l'interfaccia proponga quello rapido.

## Expected Behaviour

- "Nuovo paziente" e "Aggiungi primo paziente" aprono una scelta unica "Nuovo paziente", con due
  opzioni grandi (touch ≥ 48 px):
  1. **Da documenti** (proposta per prima): carichi lettera di dimissione, PDF o foto; l'AI compila
     e tu verifichi. Porta all'import AI esistente. Se il servizio AI non è disponibile l'opzione è
     disattivata e dice perché; durante la verifica mostra "verifica in corso".
  2. **A mano**: porta al wizard manuale esistente (5 passi).
- Dopo la creazione l'arrivo è quello di oggi: si apre la cartella del paziente creato, sul modulo
  scelto.
- "Importa dimissione" resta nell'intestazione come scorciatoia diretta.
- Nessun cambiamento a import, wizard, dati o API.

## Acceptance Criteria

- AC1: "Nuovo paziente" apre la scelta. È un dialogo accessibile: titolo, focus iniziale sulla
  prima opzione disponibile, Esc chiude e il focus torna al pulsante.
- AC2: "Da documenti" apre l'import dimissione (passo documenti); "A mano" apre il wizard manuale
  al passo Anagrafica.
- AC3: con il servizio AI non disponibile, "Da documenti" è disattivata e mostra il motivo, mentre
  "A mano" resta utilizzabile.
- AC4: l'arrivo dopo la creazione è invariato: onImported / onCreated con patientId e
  moduleTabId arrivano ad App (test di cablaggio).
- AC5: opzioni ≥ 48 px di altezza; nessuno scorrimento orizzontale a 390, 768 e 1280 px.
- AC6: build ok; nessun nuovo test fallito rispetto alla baseline.

## Test Plan

| Test type                 | Required | Reason                                       |
| ------------------------- | -------: | -------------------------------------------- |
| Unit                      |      yes | render della scelta e cablaggio dei callback |
| Integration               |       no |                                              |
| API                       |       no |                                              |
| Playwright                |      yes | apertura, scelta, AI non disponibile, Esc    |
| Persistence after refresh |       no |                                              |
| Agnos action registry     |       no |                                              |
| Voice simulation          |       no |                                              |
| OCR/import test           |       no | l'import non cambia, cambia solo l'accesso   |
| Security/privacy scan     |       no |                                              |

## Evidence Plan

Required evidence:

- validation-report.md
- test-results (unit, suite completa, build)
- logs/playwright-evidence.txt; screenshots della scelta a 1280 e 390 px e con AI non disponibile

## Risks

- Il wizard manuale passa da uno a due clic. È compensato dal percorso documenti, proposto come
  primo e molto più rapido.

## Gate Status

READY FOR IMPLEMENTATION
