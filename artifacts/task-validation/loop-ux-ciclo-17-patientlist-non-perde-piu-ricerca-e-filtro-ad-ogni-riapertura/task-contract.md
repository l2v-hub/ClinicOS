# Task Contract

## Task

- Title: Loop UX ciclo 17 - PatientList non perde piu' ricerca e filtro ad ogni riapertura
- Slug: loop-ux-ciclo-17-patientlist-non-perde-piu-ricerca-e-filtro-ad-ogni-riapertura
- Type: change (design system, frontend-only)
- Date: 2026-08-08

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

Backlog dal Ciclo 12 (`design-system/README.md`): `<PatientList>` e' renderizzato in `App.tsx` solo
mentre `navKey === 'pazienti'` (`{!isAdmin && navKey === 'pazienti' && (<PatientList .../>)}`) —
aprire la cartella di un paziente smonta completamente il componente, distruggendo il suo stato
locale (`ricerca`, `filtroSesso`, gestiti con `useState` interno). Tornando alla lista, un'istanza
nuova monta con stato di default: ricerca e filtro sesso tornano sempre vuoti/"Tutti", anche se
l'operatore li aveva appena impostati.

## Expected Behaviour

Ricerca e filtro sesso sopravvivono a un'apertura-e-ritorno della cartella paziente: se
l'operatore cerca "Rossi", apre un paziente, poi torna alla lista, la ricerca "Rossi" e' ancora
applicata.

## Acceptance Criteria

### Verificati staticamente

- AC1 — `ricerca`/`filtroSesso` e i relativi setter sono sollevati in `App.tsx`
  (`pazientiRicerca`/`pazientiFiltroSesso`, mai smontati perche' vivono nel componente `App` che
  resta sempre montato) e passati a `PatientList` come prop controllate (`ricerca`,
  `onRicercaChange`, `filtroSesso`, `onFiltroSessoChange`).
- AC2 — `PatientList` non ha piu' `useState` locale per questi due valori — legge/scrive solo
  tramite le prop.
- AC3 — Unico call site di `<PatientList>` in tutto `frontend/src` (`App.tsx`) aggiornato — nessuna
  altra chiamata da correggere.
- AC4 — `npx tsc --noEmit`, `npm run build`, `npm test` invariati/verdi.

### Aperti — verificati a runtime nel validation-report

- AC-R1: impostando una query di ricerca, aprendo un paziente, e tornando alla lista, la query
  digitata e' ancora presente nel campo di ricerca (non svuotata).
- AC-R2: impostando un filtro sesso diverso da "Tutti", lo stesso ciclo apri/torna lo mantiene
  selezionato.
- AC-R3: il filtro/la ricerca continuano a funzionare correttamente (filtrano davvero l'elenco),
  nessuna regressione sul comportamento di filtraggio.

## Test Plan

| Test type                 | Required | Reason                                                                                              |
| ------------------------- | -------: | --------------------------------------------------------------------------------------------------- |
| Unit                      |       no | prop-plumbing/state-lifting puro, coperto meglio da Playwright end-to-end                           |
| Integration               |       no | nessun modulo backend toccato                                                                       |
| API                       |       no | nessuna modifica                                                                                    |
| Playwright                |      yes | comportamento runtime di persistenza dello stato attraverso un unmount/remount reale del componente |
| Persistence after refresh |       no | persistenza in-memory per la sessione corrente, non tra refresh di pagina (fuori ambito)            |
| Security/privacy          |       no | nessun dato coinvolto                                                                               |

## Evidence Plan

Required evidence:

- validation-report.md
- test output (tsc/build/test)
- screenshots (ricerca/filtro prima e dopo il ciclo apri/torna)
- Playwright script

## Risks

**R1 — Ambito volutamente ridotto: solo ricerca e filtro sesso, non lo scroll.** Il backlog
originale del Ciclo 12 raggruppava "ricerca/filtro/scroll" insieme, ma il ripristino della
posizione di scroll richiede un meccanismo diverso (ref al contenitore + effect di restore) e una
scelta di design aggiuntiva (quando/come ripristinare) — deliberatamente differito a un ciclo
successivo per mantenere questo cambio piccolo e verificabile.

**R2 — Persistenza solo in sessione, non tra refresh.** Il nuovo stato vive in `App.tsx`
(in-memory), non in `sessionStorage`/URL — un refresh di pagina lo azzera comunque. Coerente con lo
scope del backlog originale (che parlava di "riapertura cartella", non di refresh) e con la
direttiva del design system di iniziare con il cambiamento piu' piccolo che risolve il problema
osservato.

**R3 — Fuori ambito, deliberatamente.** Resto del backlog design system (unificazione header,
tab-bar, badge, `btn-sm`) — vedi `frontend/src/design-system/README.md`.

## Gate Status

READY FOR IMPLEMENTATION (implementazione gia' completata, verifica runtime in corso)
