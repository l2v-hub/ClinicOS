# Task Validation Report

## Task

- Title: Richieste ripetute alla navigazione
- Slug: richieste-ripetute-alla-navigazione
- Commit: vedi la pull request verso `main`
- Date: 2026-11-19

## Implementation Summary

Solo frontend, nessuna cache aggiunta sui dati clinici. Quattro richieste doppie eliminate:

1. **Turno, coda «da leggere»**: la prima pagina (`diary-unread?limit=20`) è letta da due punti
   (coda e urgenze). Ora le letture contemporanee condividono la richiesta in corso
   (`fetchUnreadDiaryFirstPage` in `lib/diaryUnreadQueue.ts`); finita la richiesta, la lettura
   successiva ne fa una nuova. A ogni conferma di lettura o presa in carico la lettura in corso
   viene dimenticata, così la rilettura dopo la conferma non riusa dati di prima.
2. **Apertura del paziente, consegne**: l'effetto dipende dall'id del paziente e non più
   dall'oggetto, che viene arricchito (indirizzo, referente) subito dopo l'apertura.
3. **Apertura del paziente, cartella**: il clic riusa la lettura già partita al passaggio del
   puntatore sulla riga, invece di scartarla e ripeterla. Le riletture dopo un salvataggio non
   cambiano.
4. **Accesso, appuntamenti**: l'avvio della sessione non ripete la stessa giornata già chiesta dal
   Turno nello stesso istante. Il controllo vale solo per quella richiesta d'avvio.

## Files Changed

`frontend/src/App.tsx`, `lib/diaryUnreadQueue.ts`, `lib/useUnreadUrgencies.ts`,
`components/operator/useUnreadDiaryQueue.ts`, `lib/__tests__/diaryUnreadQueue.test.ts`.

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                       |
| --- | -----: | ------------------------------------------------------------------------------------------------------------------------------ |
| AC1 |   PASS | `logs/network-compare.txt`: prima pagina della coda 2 → 1 all'accesso e al ritorno sul Turno; `test-results/behaviour.txt`: «Da leggere» e urgenze visibili, rilettura dopo «Ho capito» |
| AC2 |   PASS | `logs/network-compare.txt`: consegne del paziente 2 → 1 all'apertura                                                            |
| AC3 |   PASS | `logs/network-compare.txt`: appuntamenti 2 → 1 all'accesso                                                                      |
| AC4 |   PASS | build OK, suite frontend 1598/1598 (un test nuovo per la lettura condivisa); nessuna `cache` aggiunta (le letture restano `no-store` dove lo erano) |

## Test Results

| Test             | Result | Evidence                                                                               |
| ---------------- | -----: | -------------------------------------------------------------------------------------- |
| Unit             |   PASS | suite frontend 1598/1598                                                               |
| Integration      |     NA |                                                                                        |
| API              |     NA | backend non toccato                                                                    |
| Playwright       |   PASS | `logs/network-before.txt`, `logs/network-after.txt`, `logs/network-compare.txt` (91 → 86 richieste sul percorso tipico); `test-results/behaviour.txt` (7 PASS) |
| Persistence      |     NA |                                                                                        |
| Agnos AI         |     NA |                                                                                        |
| Voice            |     NA |                                                                                        |
| OCR              |     NA |                                                                                        |
| Security/privacy |     NA |                                                                                        |

## Runtime Evidence

Bundle di produzione servito in locale con il backend locale (dati sintetici), stesso percorso
prima e dopo: accesso operatore → Turno → Pazienti → apertura paziente → indietro → Terapia →
Parametri → Consegne → Agenda → Turno → Pazienti. `screenshots/turno.png`, `screenshots/paziente.png`.

## Logs

Only sanitized logs are allowed. `logs/`.

## Residual Risks

- Non fatte (cambierebbero quanto i dati sono aggiornati o richiedono il backend): cache più
  lunga del NEWS2 in elenco pazienti, lettura delle allergie in blocco nel giro terapia, elenco
  bozze più leggero, compressione delle risposte e cache delle richieste preliminari CORS.
- Il lampo «Caricamento modulo…» alla prima visita di una pagina (~280 ms) non è stato toccato.

## Final Decision

CLOSED — VERIFIED
