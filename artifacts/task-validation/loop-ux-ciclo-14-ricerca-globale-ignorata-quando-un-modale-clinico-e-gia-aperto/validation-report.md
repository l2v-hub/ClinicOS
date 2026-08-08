# Task Validation Report

## Task

- Title: Loop UX ciclo 14 - Ricerca globale ignorata quando un modale clinico e' gia' aperto
- Slug: loop-ux-ciclo-14-ricerca-globale-ignorata-quando-un-modale-clinico-e-gia-aperto
- Commit: uncommitted working-tree changes on branch loop-ux-ciclo-14-ricerca-globale-ignorata-quando-un-modale-clinico-e-gia-aperto (staged for commit)
- Date: 2026-08-08

## Implementation Summary

Quarto ciclo dell'iniziativa "design system globale", direttamente derivato da una scoperta
collaterale del Ciclo 13: il listener globale `Ctrl+K` (`App.tsx:538-...`) apriva
`.search-overlay` (z-index 300) anche quando un modale clinico full-overlay
(`.modal-overlay`/`.therapy-modal-overlay`, z-index >= 1000) era gia' aperto — finendo dietro di
esso, incliccabile. Comportamento incoerente rispetto al click col mouse (gia' bloccato dallo
stesso modale). Fix: un guard nell'handler che verifica `document.querySelector('.modal-overlay,
.therapy-modal-overlay')` prima di aprire la ricerca; se un modale e' gia' presente nel DOM,
`Ctrl+K` non fa nulla (coerente con l'equivalente click, gia' bloccato).

## Files Changed

- `frontend/src/App.tsx` (unico file toccato)
- `e2e/loop-ux-ciclo-14-search-blocked-by-modal.mjs` (nuovo — evidenza runtime)

## Acceptance Criteria Result

| AC                                                          | Result | Evidence                          |
| ----------------------------------------------------------- | -----: | --------------------------------- |
| AC1 - Ctrl+K non apre la ricerca con un modale gia' aperto  |   PASS | Runtime: vedi sotto, 7/7          |
| AC2 - Ctrl+K funziona normalmente senza modali aperti       |   PASS | Runtime: vedi sotto               |
| AC3 - Escape chiude ancora la ricerca (nessuna regressione) |   PASS | Runtime: vedi sotto               |
| AC4 - tsc/build/test verdi, eslint invariato                |   PASS | Eseguiti direttamente, vedi sotto |

## Test Results

| Test             |                   Result | Evidence                                                                 |
| ---------------- | -----------------------: | ------------------------------------------------------------------------ |
| Unit             | NA (per scelta motivata) | comportamento runtime di un singolo event handler, coperto da Playwright |
| Integration      |                       NA | nessun modulo backend toccato                                            |
| API              |                       NA | nessuna modifica                                                         |
| Playwright       |                     PASS | `node e2e/loop-ux-ciclo-14-search-blocked-by-modal.mjs`: **7/7**         |
| Persistence      |                       NA | nessuno stato persistito                                                 |
| Security/privacy |                       NA | nessun dato coinvolto                                                    |

Eseguiti direttamente (io, il coordinatore, non un sub-agente):

- `npx tsc --noEmit`: pulito.
- `npm run build`: verde (`✓ built in 5.81s`).
- `npm test -- --run`: 140/140 invariato.
- `eslint --no-cache src/App.tsx`: 9 problemi (8 errori, 1 warning), tutti gia' presenti a `HEAD`
  (confermato copiando `git show HEAD:frontend/src/App.tsx` sul file di lavoro, ri-lintando, e
  ripristinando la copia modificata — non `git stash`): stesso conteggio, stesso identico errore
  (`react-hooks/refs` su `prevNavKeyRef.current` in `backLabel`, non collegato a questo fix), solo
  numero di riga diverso per lo spostamento del blocco.

## Runtime Evidence

Nessun Postgres/Podman disponibile; evidenza via browser reale con `page.route` stubbing.
**7/7 verifiche superate**:

1. Senza modali aperti, `Ctrl+K` apre `.search-overlay` normalmente — nessuna regressione
   (screenshot `01-ricerca-normale-senza-modali.png`).
2. `Escape` chiude ancora la ricerca — nessuna regressione.
3. Setup: modale "Invio in PS" (`.modal-overlay`) aperto (screenshot
   `02-modale-invio-ps-aperto.png`).
4. **Dopo `Ctrl+K` con il modale aperto, `.search-overlay` NON compare nel DOM** — nessun overlay
   fantasma dietro il modale (screenshot `03-dopo-ctrl-k-con-modale-aperto.png`, visivamente
   identico al precedente: nessun cambiamento, come atteso).
5. Il modale "Invio in PS" resta l'unico overlay visibile e interagibile dopo `Ctrl+K`.
6. Dopo aver chiuso il modale, `Ctrl+K` torna a funzionare normalmente (screenshot
   `04-ricerca-di-nuovo-funzionante-dopo-chiusura-modale.png`) — il guard non "blocca" la ricerca
   in modo permanente, solo mentre un modale e' davvero presente nel DOM.
7. Zero errori JavaScript in console durante l'intero scenario.

Dettaglio in `screenshots/verifiche.json`.

## Residual Risks

- **R1 (dal contract)**: il guard riconosce solo `.modal-overlay`/`.therapy-modal-overlay` — le
  uniche due classi overlay full-screen bloccanti verificate via grep su tutto `frontend/src`
  (12 file). Un futuro terzo pattern di overlay non le riuserebbe automaticamente; accettabile per
  l'ambito minimo di questo ciclo.
- **Backlog design system ampio e deliberatamente differito** — vedi
  `frontend/src/design-system/README.md`.
- **Autocertificazione**: fix, implementazione e verifica runtime eseguiti tutti da me in questo
  ciclo (nessun sub-agente Ruflo: cambio a singolo file, comportamento gia' interamente
  root-causato durante il Ciclo 13, coerente con la regola dell'iniziativa "il lavoro banale resta
  single-agent").

## Final Decision

CLOSED — VERIFIED

Tutti gli AC del contract sono verificati a runtime con uno scenario Playwright end-to-end che
riproduce esattamente il meccanismo del bug osservato durante il Ciclo 13 (modale clinico gia'
aperto + scorciatoia da tastiera), non solo "i test passano": la prova e' che `.search-overlay`
non compare affatto nel DOM quando un modale e' attivo, e che il comportamento normale (senza
modali) resta identico a prima. tsc/build/test verificati direttamente; eslint confrontato
esplicitamente con la baseline di `HEAD` per escludere regressioni.
