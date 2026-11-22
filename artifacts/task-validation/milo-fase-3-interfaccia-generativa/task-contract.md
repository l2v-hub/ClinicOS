# Task Contract

## Task

- Title: Milo fase 3 interfaccia generativa
- Slug: milo-fase-3-interfaccia-generativa
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
| Auth / Permissions   |       no |
| Privacy / Security   |      yes |
| Config / Env         |       no |

Note: richiesta dell'utente (2026-11-22): procedere con le fasi del piano
`docs/architecture/milo-ai-first.md` (§4, Fase 3). Nessuna modifica a Prisma né a rotte nuove: la
risposta di Milo aggiunge il campo `blocks`. Nessun permesso nuovo: i blocchi nascono solo dai dati
che le letture già autorizzate hanno restituito.

## Current Behaviour

Milo risponde con testo, elenco di fonti e un piccolo grafico solo per l'andamento di un parametro.
Indicatori, tabelle e grafici multi-parametro esistono solo nelle pagine; non si può tenere una
risposta come «cruscotto» né stamparla.

## Expected Behaviour

Sotto la risposta Milo disegna blocchi costruiti dal backend in modo deterministico dai dati letti
(indicatori, tabelle, andamento con lo stesso grafico della scheda Parametri, NEWS2 con fonte del
protocollo); il modello non scrive mai un numero di un blocco. Una risposta si può fissare come
cruscotto personale (la domanda, non i dati: riaprendola Milo rilegge i dati aggiornati) e stampare
come report.

## Acceptance Criteria

- AC1: il backend costruisce i blocchi solo da strumenti noti (parametri, NEWS2, parametri in
  cartella, somministrazioni, scale, diario, turni, agenda); uno strumento senza regola non produce
  blocchi; i valori dei blocchi coincidono con i dati letti; massimo 8 blocchi e 50 righe per tabella.
- AC2: percorso classico e team restituiscono entrambi `blocks`; per il team i blocchi derivano dalle
  letture fatte con la delega.
- AC3: il pannello di Milo disegna indicatori (con tono di rischio), tabelle e l'andamento con il
  grafico della scheda Parametri; nessun blocco ⇒ nulla di nuovo.
- AC4: «Fissa» salva nel browser la sola domanda (mai dati clinici); i cruscotti fissati si
  riaprono rilanciando la domanda; si possono togliere.
- AC5: «Stampa» produce un report con domanda, risposta, blocchi e fonti.
- AC6: test backend e frontend nuovi, suite frontend, typecheck e build senza errori.

## Test Plan

| Test type                 | Required | Reason                                              |
| ------------------------- | -------: | --------------------------------------------------- |
| Unit                      |      yes | costruzione dei blocchi, pin nel browser            |
| Integration               |      yes | blocchi da letture reali su PGlite                  |
| API                       |      yes | campo `blocks` nella risposta di Milo               |
| Playwright                |      yes | dopo il rilascio: blocchi visibili nel pannello     |
| Persistence after refresh |      yes | cruscotti fissati restano dopo il ricaricamento     |
| Agnos action registry     |       no | nessuna azione nuova                                |
| Voice simulation          |       no |                                                     |
| OCR/import test           |       no |                                                     |
| Security/privacy scan     |      yes | nessun dato clinico nel browser, niente HTML grezzo |

## Evidence Plan

Required evidence:

- validation-report.md
- `logs/` test, suite e build

## Risks

- Grafico pesante nel pannello stretto: il grafico si adatta alla larghezza (ResizeObserver).
- Le date «di parete» del diario non hanno fuso: mostrate come sono.

## Gate Status

READY FOR IMPLEMENTATION
