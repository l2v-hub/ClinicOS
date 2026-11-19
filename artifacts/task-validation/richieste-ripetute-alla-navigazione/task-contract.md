# Task Contract

## Task

- Title: Richieste ripetute alla navigazione
- Slug: richieste-ripetute-alla-navigazione
- Type: change
- Date: 2026-11-19

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

Note: ultima parte della richiesta dell'utente (2026-11-18) «rendere il sito più efficiente in
termini di risposta e rapidità di navigazione», ripresa su «Prosegui» (2026-11-19). Solo frontend.
Si eliminano solo richieste identiche partite insieme o richieste ripetute senza motivo; nessuna
cache aggiunta sui dati clinici (non cambia quanto i dati sono aggiornati).

## Current Behaviour

Misurato sul bundle di produzione (analisi di rete del 2026-11-18, `logs/network-before.txt`):

1. Turno: la prima pagina della coda «da leggere» (`GET /patients/diary-unread?limit=20`, ~7 kB)
   parte due volte nello stesso istante, all'apertura e a ogni aggiornamento ogni 30 s (due hook
   indipendenti: coda «Da leggere» e urgenze).
2. Apertura di un paziente: `GET /consegne?patientId=…` parte due volte (l'effetto dipende
   dall'oggetto paziente, che viene sostituito dopo il caricamento).
3. Accesso: `GET /appointments` di oggi parte due volte con lo stesso intervallo (effetto del
   Turno ed effetto di sessione nello stesso commit).

## Expected Behaviour

Una sola richiesta per ciascuno dei tre casi, con gli stessi dati a schermo e gli stessi momenti di
aggiornamento (30 s, ritorno sulla finestra, conferme di lettura).

## Acceptance Criteria

- AC1: Turno: una sola `diary-unread?limit=20` per apertura e per aggiornamento; badge, «Da
  leggere» e urgenze mostrano gli stessi dati di prima; le pagine successive della coda restano
  richieste separate come prima.
- AC2: apertura di un paziente: una sola `consegne?…patientId=` per apertura; cambiando paziente
  le consegne si ricaricano.
- AC3: accesso dell'operatore: una sola `appointments` per la giornata; tornare al Turno
  dall'Agenda con un altro periodo ricarica ancora la giornata.
- AC4: build e suite frontend passano; nessuna `cache` aggiunta alle letture cliniche.

## Test Plan

| Test type                 | Required | Reason                                                  |
| ------------------------- | -------: | ------------------------------------------------------- |
| Unit                      |      yes | suite esistente + test della lettura condivisa          |
| Integration               |       no |                                                         |
| API                       |       no | backend non toccato                                     |
| Playwright                |      yes | conteggio delle richieste prima/dopo sul percorso tipico |
| Persistence after refresh |       no |                                                         |
| Agnos action registry     |       no |                                                         |
| Voice simulation          |       no |                                                         |
| OCR/import test           |       no |                                                         |
| Security/privacy scan     |       no |                                                         |

## Evidence Plan

Required evidence:

- validation-report.md
- conteggio delle richieste per passo, prima e dopo, in `logs/`
- test output

## Risks

- Una lettura condivisa che si interrompe per un componente non deve interrompersi per l'altro:
  la richiesta condivisa non usa il segnale di annullamento dei singoli componenti.
- Saltare una richiesta già partita non deve mai saltare una rilettura dopo un salvataggio: il
  controllo vale solo per la richiesta d'avvio della sessione.

## Gate Status

READY FOR IMPLEMENTATION
