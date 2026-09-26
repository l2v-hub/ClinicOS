# Task Contract

## Task

- Title: Intake: dati di ingresso visibili in Presa in carico
- Slug: intake-dati-di-ingresso-visibili-in-presa-in-carico
- Type: bugfix
- Date: 2026-09-26

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |       no |
| Database/Persistence |      yes |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

Database/Persistence: cambia la forma del JSON `cartella.data` scritto alla conferma dell'intake
(nessuna modifica allo schema Prisma, nessuna migrazione, backend invariato).

## Current Behaviour

- `buildConfirmCartella` (frontend/src/components/shared/intake/confirmCartella.ts) spalma i campi
  del passaggio Ingresso alla radice della cartella: `dataPresa`, `oraPresa`, `provenienza`,
  `centroInviante`, `modalitaIngresso`, `motivoIngresso`, `operatoreResponsabile`, `noteIniziali`.
- `PresaInCaricoTab` legge solo `cartella.presaInCarico` con chiavi diverse (`dataIngresso`,
  `oraIngresso`) e vocabolari diversi (`provenienza: ospedale` non esiste, il tab usa
  `dimissione_ospedaliera`; `modalitaIngresso` nel wizard = urgenza/programmato/trasferimento/
  day_hospital, nel tab = mezzo di arrivo ambulante/barella/sedia_rotelle).
- Risultato: i dati inseriti all'ingresso non compaiono nel tab e l'operatore li reinserisce.
- Inoltre, se la presa in carico non è mai stata compilata, il tab mostra i default del modulo
  ("Vigile", "Orientato", "Autonomo", "Buone"…) come se fossero valutazioni registrate; il
  salvataggio inline di un solo campo persiste tutti quei default come dati.

## Expected Behaviour

- La conferma dell'intake scrive `cartella.presaInCarico` con le chiavi e i vocabolari del tab;
  il tipo di ingresso del wizard è conservato nel nuovo campo `tipoIngresso` (non confuso con il
  mezzo di arrivo).
- Le cartelle già create con il formato vecchio (campi alla radice) vengono lette dal tab come
  presa in carico parziale, senza migrazione.
- In vista, i campi mai valutati sono vuoti ("—"), non valori predefiniti; il modulo di modifica
  resta precompilato con i default, visibili e confermati dall'operatore.

## Acceptance Criteria

- AC1: `buildConfirmCartella` con `ingresso` completo produce `presaInCarico` con dataIngresso,
  oraIngresso, provenienza (ospedale → dimissione_ospedaliera), centroInviante, tipoIngresso,
  motivoIngresso, operatoreResponsabile, noteIniziali, e nessuna chiave di ingresso alla radice.
- AC2: nessun campo di valutazione clinica (statoCoscienza, autonomia, orientamento,
  condizioniGenerali, dolore…) viene inventato dal mapper.
- AC3: `resolvePresaInCarico` restituisce la presa in carico esistente invariata, deriva quella
  parziale dai campi legacy alla radice, e restituisce undefined se non c'è nulla.
- AC4: nel browser, una cartella con soli campi legacy mostra nel tab data, ora, provenienza,
  struttura inviante, tipo di ingresso e motivo; i campi di valutazione non compilati appaiono vuoti.
- AC5: nel browser, una cartella senza presa in carico non mostra più "Vigile"/"Autonomo" come dati.
- AC6: `npm run build` (tsc -b && vite build) passa; i test unitari esistenti di confirmCartella passano.

## Test Plan

| Test type                 | Required | Reason                                                                                |
| ------------------------- | -------: | ------------------------------------------------------------------------------------- |
| Unit                      |      yes | mapper e resolver puri: casi completo, parziale, legacy, vuoto, vocabolario           |
| Integration               |       no | nessuna modifica backend                                                              |
| API                       |       no | endpoint invariati                                                                    |
| Playwright                |      yes | tab Presa in carico con cartella legacy e vuota (API stubbata)                        |
| Persistence after refresh |       no | il payload JSON è coperto dagli unit test; nessun Postgres locale (limite dichiarato) |
| Agnos action registry     |       no |                                                                                       |
| Voice simulation          |       no |                                                                                       |
| OCR/import test           |       no |                                                                                       |
| Security/privacy scan     |       no |                                                                                       |

## Evidence Plan

Required evidence:

- validation-report.md
- test output (test-results/unit.txt, test-results/build.txt)
- screenshots del tab Presa in carico (legacy e vuota)
- log Playwright sanitizzato

## Risks

- Cartelle confermate prima del fix hanno i campi alla radice: coperte dal resolver in lettura.
- Una presa in carico parziale salvata inline ora persiste campi vuoti invece dei default: è il
  comportamento corretto (non valutato ≠ valore), ma cambia ciò che si vede per i pazienti mai
  compilati. Mitigazione: il modulo di modifica resta precompilato.
- Nessun Postgres locale: la persistenza end-to-end non è provata in questo ciclo.

## Gate Status

READY FOR IMPLEMENTATION
