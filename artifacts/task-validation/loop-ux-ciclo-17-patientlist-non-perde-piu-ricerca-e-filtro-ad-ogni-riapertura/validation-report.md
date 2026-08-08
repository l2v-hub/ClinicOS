# Task Validation Report

## Task

- Title: Loop UX ciclo 17 - PatientList non perde piu' ricerca e filtro ad ogni riapertura
- Slug: loop-ux-ciclo-17-patientlist-non-perde-piu-ricerca-e-filtro-ad-ogni-riapertura
- Commit: uncommitted working-tree changes on branch loop-ux-ciclo-17-patientlist-state-persistence (staged for commit)
- Date: 2026-08-08

## Implementation Summary

Settimo ciclo dell'iniziativa "design system globale", dal backlog del Ciclo 12
(`design-system/README.md`, "PatientList perde ricerca/filtro/scroll ad ogni riapertura cartella").
`<PatientList>` e' renderizzato in `App.tsx` solo mentre `navKey === 'pazienti'` — aprire una
cartella smonta completamente il componente, distruggendo `ricerca`/`filtroSesso` (`useState`
locale). Sollevati entrambi in `App.tsx` (`pazientiRicerca`/`pazientiFiltroSesso`, sempre montato)
e passati come prop controllate. Ambito volutamente ridotto: solo ricerca e filtro sesso, non lo
scroll (richiede un meccanismo diverso — ref al contenitore + restore — differito).

## Files Changed

- `frontend/src/components/operator/PatientList.tsx`
- `frontend/src/App.tsx`
- `frontend/src/design-system/README.md`
- `e2e/loop-ux-ciclo-17-patientlist-state-persistence.mjs` (nuovo — evidenza runtime)

## Acceptance Criteria Result

| AC                                                          | Result | Evidence                          |
| ----------------------------------------------------------- | -----: | --------------------------------- |
| AC1 - ricerca/filtroSesso sollevati in App.tsx              |   PASS | Lettura diretta dei file          |
| AC2 - PatientList senza piu' useState locale per questi due |   PASS | Lettura diretta del file          |
| AC3 - unico call site aggiornato                            |   PASS | Grep repo-wide: 1 solo risultato  |
| AC4 - tsc/build/test verdi, eslint invariato                |   PASS | Eseguiti direttamente, vedi sotto |
| AC-R1 - ricerca sopravvive ad apri-e-torna                  |   PASS | Runtime: vedi sotto, 5/5          |
| AC-R2 - filtro sesso sopravvive ad apri-e-torna             |   PASS | Runtime: vedi sotto               |
| AC-R3 - il filtro continua a funzionare correttamente       |   PASS | Runtime: vedi sotto               |

## Test Results

| Test             |                   Result | Evidence                                                               |
| ---------------- | -----------------------: | ---------------------------------------------------------------------- |
| Unit             | NA (per scelta motivata) | state-lifting/prop-plumbing puro, coperto da Playwright end-to-end     |
| Integration      |                       NA | nessun modulo backend toccato                                          |
| API              |                       NA | nessuna modifica                                                       |
| Playwright       |                     PASS | `node e2e/loop-ux-ciclo-17-patientlist-state-persistence.mjs`: **5/5** |
| Persistence      |                       NA | persistenza in-memory di sessione, non tra refresh (fuori ambito, R2)  |
| Security/privacy |                       NA | nessun dato coinvolto                                                  |

Eseguiti direttamente (io, il coordinatore):

- `npx tsc --noEmit`: pulito.
- `npm run build`: verde (`✓ built in 5.87s`).
- `npm test -- --run`: 140/140 invariato.
- `eslint --no-cache` su entrambi i file toccati: 10 problemi totali (9 errori, 1 warning), tutti
  gia' presenti a `HEAD` — confermato copiando `git show HEAD:<path>` sui due file di lavoro,
  ri-lintando, e ripristinando le copie modificate (non `git stash`): `PatientList.tsx` aveva gia' 1
  errore pre-esistente (`_onAddPaziente` unused-vars, riga diversa solo per lo spostamento causato
  dalle nuove prop), `App.tsx` gli 8 errori pre-esistenti gia' confermati nei Cicli 13-16.

## Runtime Evidence

Nessun Postgres/Podman disponibile; evidenza via browser reale con `page.route` stubbing (due
pazienti sintetici, Elena Esposito F e Franco Ferri M). **5/5 verifiche superate**:

1. Setup: impostata ricerca "Esposito" + filtro "Femmina" — la lista si riduce davvero a un solo
   risultato (screenshot `01-ricerca-e-filtro-impostati.png`).
2. Apertura della cartella di Esposito, poi ritorno alla lista (`page.goBack()`, che attraversa un
   vero smontaggio/rimontaggio di `PatientList` via la history API reale dell'app, non un mock).
3. **La ricerca "Esposito" e' ancora presente nel campo dopo il ciclo apri-e-torna** — prima del fix
   sarebbe tornata vuota (screenshot `02-dopo-apri-e-torna.png`).
4. **Il filtro "Femmina" e' ancora selezionato** dopo lo stesso ciclo.
5. Il filtro continua a funzionare correttamente: Ferri (maschio) resta escluso dai risultati.
6. Zero errori JavaScript in console durante l'intero scenario.

Dettaglio in `screenshots/verifiche.json`.

## Residual Risks

- **R1/R2 (dal contract)**: scroll non ripristinato (deliberatamente differito), persistenza solo
  di sessione non tra refresh (deliberatamente fuori ambito) — entrambi documentati nel README del
  design system come prossimo passo, non regressioni.
- **Backlog design system ampio e deliberatamente differito** — vedi
  `frontend/src/design-system/README.md`.
- **Autocertificazione**: fix, implementazione e verifica runtime eseguiti tutti da me in questo
  ciclo (nessun sub-agente Ruflo: root cause gia' individuata dal Ciclo 12, cambio di ambito
  ridotto e ben definito — 2 file applicativi, un solo call site).

## Final Decision

CLOSED — VERIFIED

Tutti gli AC del contract sono verificati: staticamente per il plumbing di stato/prop, a runtime
tramite uno scenario Playwright end-to-end che attraversa un VERO smontaggio/rimontaggio del
componente (via history reale dell'app, click su un paziente + `page.goBack()`, non uno stub) — la
prova piu' diretta possibile che lo stato sopravvive davvero all'unmount, non solo che il codice e'
cambiato. tsc/build/test verificati direttamente; eslint confrontato esplicitamente con la baseline
di `HEAD` per escludere regressioni su entrambi i file toccati.
