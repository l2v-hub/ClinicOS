# Task Contract

## Task

- Title: HMI: coda Adesso ordinata per urgenza nella dashboard operatore
- Slug: hmi-coda-adesso-ordinata-per-urgenza-nella-dashboard-operatore
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

- La colonna "Adesso" della dashboard operatore raccoglie due blocchi distinti: la card "Prossime
  terapie" (prima "In programma", poi "In ritardo", poi "Senza orario") e "Le Mie Consegne
  Urgenti".
- Non esiste un unico punto che dica all'operatore cosa fare per primo: le terapie in ritardo
  stanno sotto quelle in programma, le consegne urgenti scadute stanno in un altro blocco, le
  anomalie farmaci sono solo un numero negli indicatori.

## Expected Behaviour

- In cima alla colonna "Adesso" compare la lista **"Da fare subito"**: un unico elenco ordinato
  per urgenza, costruito solo dai dati già caricati dalla dashboard (nessuna nuova chiamata):
  1. terapie in ritardo, la più in ritardo per prima;
  2. consegne urgenti scadute, la più scaduta per prima;
  3. consegne urgenti in scadenza entro 60 minuti;
  4. terapie in programma entro 30 minuti;
  5. pazienti con farmaci da verificare (anomalie), per numero decrescente;
  6. altre consegne urgenti, per scadenza.
- Ogni riga: tipo, paziente (apre la cartella), dettaglio (farmaco · dose · via / tipo consegna /
  "N farmaci da verificare"), tempo ("In ritardo di N min", "Tra N min", "Scaduta alle HH:MM",
  "Entro le HH:MM", "Entro oggi"). Righe alte almeno 48 px. Al massimo 6 righe, poi "Altre N".
- Stati onesti: se le scadenze terapia sono in caricamento o non disponibili, la lista lo dice e
  non si presenta come vuota; lo stesso per le consegne. "Niente in sospeso adesso" compare solo
  quando tutte le fonti sono pronte e non c'è nulla.
- I blocchi esistenti ("Prossime terapie", consegne urgenti, indicatori, notifiche, "Oggi") restano
  invariati sotto: nessun contenuto, dato o azione viene tolto.

## Acceptance Criteria

- AC1: test unitari della funzione pura di ordinamento: ritardi prima delle consegne scadute, poi
  consegne entro 60 min, poi terapie entro 30 min, poi anomalie, poi le altre consegne; etichette
  di tempo corrette; una consegna senza ora usa la sola data.
- AC2: nel browser, con lo stub (terapie in ritardo e consegne urgenti), "Da fare subito" è il
  primo blocco di "Adesso", le prime righe sono le terapie in ritardo in ordine decrescente di
  ritardo, seguono le consegne urgenti; al massimo 6 righe e "Altre N".
- AC3: il paziente di ogni riga è un pulsante che apre la cartella (stesso `onSelectPaziente` dei
  blocchi esistenti).
- AC4: con le scadenze terapia non disponibili (stub in errore) la lista mostra l'avviso e le
  consegne restano; con le fonti pronte e vuote mostra "Niente in sospeso adesso".
- AC5: i blocchi esistenti restano tutti presenti e nello stesso ordine (test di contratto della
  dashboard verdi); nessuno scorrimento orizzontale a 390, 768, 1024, 1280 px; righe ≥ 48 px.
- AC6: build ok; nessun nuovo test fallito rispetto alla baseline.

## Test Plan

| Test type                 | Required | Reason                                           |
| ------------------------- | -------: | ------------------------------------------------ |
| Unit                      |      yes | ordinamento e etichette di tempo (funzione pura) |
| Integration               |       no |                                                  |
| API                       |       no |                                                  |
| Playwright                |      yes | ordine reale con lo stub, stati, larghezze       |
| Persistence after refresh |       no |                                                  |
| Agnos action registry     |       no |                                                  |
| Voice simulation          |       no |                                                  |
| OCR/import test           |       no |                                                  |
| Security/privacy scan     |       no |                                                  |

## Evidence Plan

Required evidence:

- validation-report.md
- test-results (unit, suite completa, build)
- logs/playwright-evidence.txt; screenshots a 1280, 1024, 768 e 390 px e dello stato "non
  disponibile"

## Risks

- Le terapie in ritardo compaiono sia nella coda sia nella card "Prossime terapie": è voluto (la
  coda è la vista di triage, la card il dettaglio con Aggiorna, "Mostra altre", senza orario).
- Le regole di soglia (60 min consegne, 30 min terapie) sono scelte di HMI, non cliniche: vanno
  confermate con il direttore sanitario come le soglie NEWS2.

## Gate Status

READY FOR IMPLEMENTATION
