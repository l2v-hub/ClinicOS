# Task Contract

## Task

- Title: Terapia: fasce dalle ore reali e giro raggruppato per paziente
- Slug: terapia-fasce-dalle-ore-reali-e-giro-raggruppato-per-paziente
- Type: feature
- Date: 2026-09-29

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

Il giro terapia (`TherapyRoundsPage` e `TherapyGiroRows`) mostra le cinque fasce del backend: mattina 08, pranzo 12, pomeriggio 16, sera 20, notte 22. Una somministrazione prescritta alle 07:00 compare nella fascia "08:00" e una delle 18:00 nella fascia "20:00", quindi non si vedono le ore reali del reparto.

L'elenco ha una riga per somministrazione: paziente e farmaco sono ripetuti per ogni farmaco, invece di raggrupparli per paziente come nella vista precedente. Il nome del paziente e il farmaco usano lo stesso carattere.

Richiesta dell'utente (2026-09-29):

- le fasce sono le ore reali (07:00, 08:00, 12:00, 16:00, 18:00, 20:00);
- l'aggregazione per paziente con tutti i suoi farmaci va ripristinata dentro la nuova UI;
- il nome del paziente resta con il carattere attuale, la terapia usa un carattere diverso e più piccolo.

Decisione dell'utente: le fasce sono le ore reali delle prescrizioni del giorno. Un orario senza farmaci non compare.

## Expected Behaviour

- **Fasce per ora reale.** Le fasce del giro sono gli orari reali delle somministrazioni del giorno (`scheduledTime`), raccolti da tutte le fasce del server e ordinati. Ogni fascia mostra "HH:MM · fatte/totale".
  - I conteggi si calcolano sulle somministrazioni caricate. Se il caricamento è parziale (`hasMore`), la pagina lo dice esplicitamente e non li presenta come esatti.
- **Raggruppamento per paziente.** Dentro la fascia selezionata l'elenco è per paziente, nell'ordine del giro del server:
  - una testata con camera, nome (carattere attuale), camera/letto e identificativo;
  - sotto, i farmaci del paziente a quell'ora, con un carattere diverso e più piccolo: farmaco e dose, quantità, via;
  - ogni farmaco ha le sue azioni, invariate: "Non somm." con i motivi e "Somministra".
  - Gli stati fatti restano: "✓ HH:MM · operatore" oppure "Non somm. · motivo".
- **Registrazione invariata.** Ogni azione invia la fascia del server della somministrazione. Il backend ricava l'ora dallo schema della prescrizione, quindi niente cambia lato server.
  - Filtri per stato, data, ordine del giro, sola lettura dell'admin, protezione dal doppio invio e fuoco dopo l'azione restano uguali.
- **Calendario.** Dal calendario settimanale, "Apri il giro" di una cella porta alla prima ora reale di quella fascia.

## Acceptance Criteria

- AC1: Con somministrazioni alle 07:00, 08:00, 12:00, 16:00, 18:00 e 20:00, il giro mostra le sei fasce in ordine, ciascuna con "fatte/totale" calcolato dalle somministrazioni di quell'ora. Nessuna ora senza farmaci viene mostrata.
- AC2: Nella fascia selezionata c'è un gruppo per paziente, con la testata (camera, nome, identificativo) e sotto tutti i suoi farmaci di quell'ora. Il nome del paziente usa lo stesso carattere di prima; il farmaco usa un carattere diverso e più piccolo.
- AC3: "Somministra" e "Non somm." inviano le stesse richieste di prima (fascia del server, therapyId, data). Doppio invio bloccato, fuoco sul farmaco dopo l'azione, filtri per stato che agiscono sui farmaci, admin in sola lettura.
- AC4: Il caricamento parziale è dichiarato e i conteggi non sono presentati come esatti. Il calendario apre il giro sulla prima ora reale della fascia scelta. Nessuno scorrimento orizzontale a 390/768/1024/1180/1440. Audit DS verde.
- AC5: npm run build passa; la suite completa non ha fallimenti nuovi rispetto alla baseline; il test unitario della trasformazione per ora e paziente passa.

## Test Plan

| Test type                 | Required | Reason                                                                                                                                                             |
| ------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit                      |      yes | trasformazione pura fasce→ore reali→pazienti (lib/therapyGiro), suite completa                                                                                     |
| Integration               |       no |                                                                                                                                                                    |
| API                       |       no | nessuna API toccata                                                                                                                                                |
| Playwright                |      yes | evidence con fasce e somministrazioni simulate (page.route): 6 ore, gruppi paziente, caratteri, azioni, filtri, parziale, calendario, admin, 5 larghezze; audit DS |
| Persistence after refresh |       no |                                                                                                                                                                    |
| Agnos action registry     |       no |                                                                                                                                                                    |
| Voice simulation          |       no |                                                                                                                                                                    |
| OCR/import test           |       no |                                                                                                                                                                    |
| Security/privacy scan     |       no |                                                                                                                                                                    |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots del giro raggruppato a 390/768/1024/1180/1440
- log dell'evidence Playwright e dell'audit DS

## Risks

- **Conteggi per ora con caricamento parziale.** Con molte terapie i dettagli sono paginati e i conteggi per ora sono parziali. Va dichiarato, mai presentato come esatto.
- **Una stessa ora in due fasce del server.** Non dovrebbe succedere, ma il raggruppamento usa l'ora e ogni farmaco porta con sé la sua fascia per l'azione.
- **Calendario settimanale.** Resta per fascia del server: le righe mostrano l'ora più presto di quella fascia. Allinearlo alle ore reali sarebbe un ciclo a parte.

## Gate Status

READY FOR IMPLEMENTATION
