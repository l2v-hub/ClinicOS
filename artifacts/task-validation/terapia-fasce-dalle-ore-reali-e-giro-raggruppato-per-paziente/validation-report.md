# Task Validation Report

## Task

- Title: Terapia: fasce dalle ore reali e giro raggruppato per paziente
- Slug: terapia-fasce-dalle-ore-reali-e-giro-raggruppato-per-paziente
- Commit: (vedi PR)
- Date: 2026-09-29

## Implementation Summary

- **`lib/therapyGiro.ts`**: nuova trasformazione pura `giroTimes(slots)`.
  - Raccoglie le somministrazioni di tutte le fasce del server e le raggruppa per ora reale della prescrizione (`scheduledTime`): 07:00, 08:00, 12:00, 16:00, 18:00, 20:00.
  - Dentro ogni ora le raggruppa per paziente, nell'ordine del giro del server.
  - Ogni farmaco conserva la sua fascia del server, che resta la chiave di registrazione.
  - Conteggi per ora (fatte/totale/da erogare) calcolati sulle somministrazioni caricate.
  - Aggiunte anche `giroTimeDone` e `initialGiroTime` (prima ora con farmaci da fare).
- **`TherapyRoundsPage`**:
  - Le fasce sono le ore reali; se un'ora non ha farmaci non compare.
  - Barra di avanzamento e filtri per stato calcolati sull'ora scelta.
  - Il caricamento parziale ora dice "Ore e conteggi riguardano le N terapie caricate", invece di "I totali sono esatti".
  - Dal calendario, una fascia apre la prima ora reale di quella fascia.
- **`TherapyGiroRows`**: un gruppo per paziente.
  - Testata: camera, nome con il carattere di prima (600 16px), camera/letto e identificativo.
  - Sotto la testata, tutti i farmaci del paziente a quell'ora, con un carattere diverso e più piccolo (500 14px, via e quantità a 13px).
  - Le azioni di ogni farmaco sono invariate:
    - "Non somm." con i motivi;
    - "Somministra" con protezione dal doppio invio e fuoco sul farmaco dopo l'azione;
    - stati fatti "✓ HH:MM · operatore" e "Non somm. · motivo";
    - sola lettura per l'admin.
  - Le richieste inviano la fascia del server del farmaco e la sua ora reale. Il backend comunque ricava l'ora dallo schema della prescrizione (`therapy-write.ts:203`).
- **CSS**: `giro-patients`, `giro-patient`, `giro-drugs`, `giro-drug`. Sul telefono i farmaci vanno a tutta larghezza.
- **Test**: aggiornati `therapyGiro.test.ts` e il test della pagina (ore reali, niente ora senza farmaci), più due test nuovi: raggruppamento per ora e paziente, e un gruppo per paziente con tutti i suoi farmaci.

## Files Changed

- frontend/src/lib/therapyGiro.ts
- frontend/src/components/operator/TherapyRoundsPage.tsx, TherapyGiroRows.tsx, TherapyRoundsPage.css
- frontend/src/components/operator/\_\_tests\_\_/therapyGiro.test.ts

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                                                                                                                |
| --- | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | Fasce "07:00 · 0/2, 08:00 · 1/3, 12:00 · 0/2, 16:00 · 0/1, 18:00 · 0/1, 20:00 · 0/2" da prescrizioni distribuite su mattina/pranzo/pomeriggio/sera; l'ora iniziale è 07:00 (prima con farmaci da fare).                                                                                                                 |
| AC2 |   PASS | Alle 08:00 ci sono due gruppi: Moretti Davide (Cardioaspirin, Ramipril) e Moretti Luca (Metformina). Nome in `600 16px`, farmaco in `500 14px`.                                                                                                                                                                         |
| AC3 |   PASS | "Somministra" su Ramipril delle 08:00 → `/confirm` con fascia `mattina`, therapyId e ora 08:00. "Non somm." su Enoxaparina delle 18:00 → `/not-administered` con fascia `sera` e motivo `rifiutata_paziente`. Il fuoco resta sul farmaco; il filtro "Erogate" mostra solo i farmaci erogati; l'admin è in sola lettura. |
| AC4 |   PASS | Il caricamento parziale è dichiarato ("terapie caricate", senza "esatti"). Dal calendario la cella della sera di oggi apre le 18:00. Nessuno scorrimento orizzontale e nessun pulsante fuori schermo a 390/768/1024/1440. Audit DS 21/21 su 102 + 68 stati.                                                             |
| AC5 |   PASS | build.txt exit 0; unit-full.txt 896/905, con i soli 9 fallimenti della baseline (test nuovi del giro verdi).                                                                                                                                                                                                            |

## Test Results

| Test                                    | Result | Evidence                                   |
| --------------------------------------- | -----: | ------------------------------------------ |
| Unit                                    |   PASS | therapyGiro (ore reali, pazienti), suite   |
| Playwright                              |   PASS | evidence.mjs 14/14; ds-audit 21/21 + 21/21 |
| Integration, API, Persistence, Security |     NA | nessuna API toccata                        |

## Runtime Evidence

- screenshots/giro-per-paziente-1180.png, giro-per-paziente-390/768/1024/1440.png
- logs/playwright-evidence.txt, ds-audit-390-768-1180.txt, ds-audit-1024-1440.txt, unit-full.txt, build.txt

## Independent QA

- clinicos-qa: READY FOR QA, senza bloccanti. Sonde con stub che conserva lo stato: 7 ore compresa la notte; stessa fascia con ore diverse (richiesta e aggiornamento del farmaco giusto); stesso therapyId in due fasce; doppio clic con risposta lenta; errore 500 sulla conferma; calendario; "Carica altre terapie"; admin; tastiera; 5 larghezze con un farmaco di 90 caratteri. Audit 21/21 + 21/21; suite 896/905 (baseline).
- Avviso corretto dopo la QA: giroTimes con useMemo, così la protezione dal doppio invio ("Invio…") funziona di nuovo in modo indipendente dall'aggiornamento ottimistico. Evidence 14/14, suite e build rieseguiti.

## Residual Risks

- Limite del backend, preesistente: una terapia con due orari nella stessa fascia del server (per esempio 18:00 e 20:00, entrambe "sera") mostra solo il primo, perché la somministrazione è unica per terapia, data e fascia. Da segnalare all'utente.
- Il farmaco usa la stessa famiglia di caratteri (Inter), più piccola e meno marcata (500 14px contro 600 16px): da confermare con l'utente.
- Con il filtro "Da erogare", dopo l'ultimo farmaco dell'ora il fuoco va sul body (come prima).

- Nell'evidence la camera compare come "non disponibile" perché la posizione è simulata. Con il server reale la posizione arriva come prima.
- Il calendario settimanale resta per fascia del server: le righe usano l'ora più presto della fascia.
- Con il caricamento parziale, le ore e i conteggi riguardano solo le terapie caricate, ed è dichiarato.

## Final Decision

CLOSED — VERIFIED
