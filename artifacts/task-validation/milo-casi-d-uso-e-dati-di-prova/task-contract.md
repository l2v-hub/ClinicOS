# Task Contract

## Task

- Title: Milo casi d'uso e dati di prova
- Slug: milo-casi-d-uso-e-dati-di-prova
- Type: change
- Date: 2026-11-23

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |      yes |
| Database/Persistence |      yes |
| Agnos AI / Chatbot   |      yes |
| Voice                |      yes |
| OCR / Import         |       no |
| Auth / Permissions   |      yes |
| Privacy / Security   |      yes |
| Config / Env         |       no |

Note: richiesta dell'utente (2026-11-23):

- creare pazienti di prova con dati fittizi;
- poter provare Milo e i suoi agenti su 5 casi d'uso.

Le competenze degli agenti (skill versionate, feedback e skill creator) hanno il loro contratto
separato.

Dati: solo sintetici, tramite il seed esistente (`POST /admin/synthetic-data/seed`), abilitato sulla
demo (`CLINICOS_ENV=demo`, `DEMO_DATASET_ID=synthetic-v1`). Mai sul sito di sviluppo isolato.

## Current Behaviour

Il dataset sintetico:

- mette 8 pazienti in 4 camere doppie, tutte piene, senza singole né dimissioni previste;
- ha parametri solo di ieri;
- non ha medici né visite.

Milo:

- non dice chi ha registrato i parametri né i turni di una persona;
- non sa quando si libera un letto;
- registra un solo parametro alla volta nel JSON storico;
- rifiuta qualunque prescrizione;
- non ha alcun avviso a fine terapia.

## Expected Behaviour

1. «Come va il paziente X, valori dell'ultima settimana, cosa devo controllare»:
   - valori e andamento della settimana;
   - punti di attenzione SOLO da protocollo: NEWS2 e i suoi parametri a punteggio, valori mancanti,
     variazioni marcate;
   - fonti; nessuna diagnosi né terapia.
2. «Chi ha fatto l'ultima visita e registrazione parametri del paziente X, quali sono stati i suoi
   turni»:
   - autore dell'ultima rilevazione e dell'ultima visita;
   - turni di quelle persone.
3. «Quante camere sono occupate e quando si libererà una singola e una doppia»:
   - occupazione per tipo;
   - date di dimissione previste.
4. «Registra del paziente X pressione, ha evacuato, stato vigile, battito»:
   - un'unica rilevazione nella pagina Parametri;
   - prima anteprima, poi conferma esplicita.
5. «Va modificata la terapia: aggiungi un diuretico ogni 8 ore per 5 giorni, poi avvisami quando ha
   completato la terapia»:
   - solo il medico, con anteprima e conferma (flusso di prescrizione esistente);
   - alla data di fine terapia, un avviso al medico che l'ha prescritta.

## Acceptance Criteria

- AC1: il seed crea scenari deterministici e ripetibili:
  - una settimana di parametri con andamenti diversi;
  - un medico con turni e una visita;
  - camere singole e doppie;
  - dimissioni previste.
  - Il seed resta idempotente e i test del seed passano.
- AC2: per i casi 1–3 Milo legge i dati giusti con fonti, rispettando perimetro e permessi del ruolo.
  Test di pianificazione e d'integrazione.
- AC3: caso 4: dal pannello di Milo un'anteprima con tutti i valori dettati e, alla conferma, una sola
  rilevazione con quei valori. Niente prima della conferma.
- AC4: caso 5:
  - per il medico, anteprima della prescrizione con frequenza ogni 8 ore e durata 5 giorni;
  - conferma esplicita;
  - un segnale al prescrittore quando la terapia termina.
  - Per gli altri ruoli: rifiuto.
- AC5: suite toccate, typecheck, build.
- AC6 (dopo il rilascio): sulla demo, dopo il seed, i 5 casi provati con i profili giusti, con
  evidenze.

## Test Plan

| Test type                 | Required | Reason                                             |
| ------------------------- | -------: | -------------------------------------------------- |
| Unit                      |      yes | pianificazione, parser, regole                     |
| Integration               |      yes | letture e scritture su database reale              |
| API                       |      yes | `/ai/actions/plan`, conferma, seed                 |
| Playwright                |      yes | dopo il rilascio: i 5 casi sulla demo              |
| Persistence after refresh |      yes | rilevazione e terapia salvate                      |
| Agnos action registry     |      yes | nuove azioni di scrittura con conferma             |
| Voice simulation          |      yes | dettatura dei casi 4 e 5 come testo trascritto     |
| OCR/import test           |       no |                                                    |
| Security/privacy scan     |      yes | ruoli, perimetro, nessuna scrittura senza conferma |

## Evidence Plan

Required evidence:

- validation-report.md
- `logs/` test e build; prove sulla demo

## Risks

- La prescrizione da Milo resta una proposta: valida solo dopo la conferma del medico.
- I dati di prova sono fittizi e si rigenerano con il seed; non toccano «Prova Milo».

## Gate Status

READY FOR IMPLEMENTATION
