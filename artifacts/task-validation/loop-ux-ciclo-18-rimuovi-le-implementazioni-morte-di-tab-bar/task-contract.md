# Task Contract

## Task

- Title: Loop UX ciclo 18 - Rimuovi le implementazioni morte di tab bar
- Slug: loop-ux-ciclo-18-rimuovi-le-implementazioni-morte-di-tab-bar
- Type: cleanup (design system, frontend-only, dead code)
- Date: 2026-08-09

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

Backlog dal Ciclo 12 (`design-system/README.md`): "4 implementazioni parallele di tab bar (2 morte
in CSS, mai importate)". Analisi (agente Explore, verificata indipendentemente da me con grep
diretto su tutto `frontend/src`) ha trovato piu' di 2 implementazioni morte:

1. `components/shared/NavComponents.tsx` (`MainHorizontalNav`/`PageTabs`, `ContextSubTabs`/
   `SectionTabs`, `SubSectionControl`) — componente interamente orfano, zero import in tutto il
   repo (confermato `grep -rn "NavComponents\|MainHorizontalNav\|ContextSubTabs\|SubSectionControl"
frontend/src --include=*.tsx` → solo il file di definizione stesso).
2. CSS corrispondente: `.page-tabs*`/`.section-tabs*` (`App.css`), `.subsection-ctrl*`
   (`app-additions.css`) — mai referenziato da nessun `.tsx`.
3. `.cr-tab-btn`/`.cr-tab-badge` (`app-additions.css`, DUE definizioni duplicate di `.cr-tab-btn`
   alle righe 3695 e 4627+una regola in media query) — mai referenziato da nessun `.tsx` (da non
   confondere con `.cr-tab-content`, classe diversa e viva, usata in ~17 file).
4. `.npm-tab-bar`/`.npm-tab`/`.npm-tab--active`/`.npm-tab__dot` (`app-additions.css`) — sotto-
   funzionalita' morta all'interno di un modale altrimenti vivo (il resto della famiglia `.npm-*` e'
   usato da `StepAnagrafica.tsx`/`StepIngresso.tsx`/`VitaleModal.tsx`).

`TopNav.tsx` (`components/navigation/TopNav.tsx`) e' l'unica implementazione VIVA e canonica,
confermato usato in `PatientDetail.tsx` per la navigazione L2/L3 reale.

## Expected Behaviour

Il componente orfano e tutto il CSS morto sopra elencato sono rimossi. Nessun cambiamento visivo o
comportamentale in nessuna pagina reale (nessuna di queste classi era mai renderizzata da JSX
attivo). `TopNav.tsx` resta l'unica implementazione di tab bar L2/L3.

## Acceptance Criteria

### Verificati staticamente

- AC1 — `components/shared/NavComponents.tsx` eliminato.
- AC2 — `.page-tabs*`, `.section-tabs*`, `.subsection-ctrl*`, `.cr-tab-btn`, `.cr-tab-badge*`,
  `.npm-tab-bar`, `.npm-tab`, `.npm-tab--active`, `.npm-tab__dot` rimossi da `App.css` e
  `app-additions.css` (incluse tutte le occorrenze scatterate in media query/liste di selettori
  condivisi — verificato con grep ricorsivo finale su tutto `frontend/src`, zero risultati residui).
- AC3 — `npx tsc --noEmit` pulito (conferma che nessun `.tsx` importava gli export eliminati).
- AC4 — `npm run build` verde; bundle CSS ridotto (244.46 kB vs 248.54 kB precedente — prova
  quantitativa che del codice morto e' stato davvero rimosso, non solo rinominato).
- AC5 — `npm test` invariato (140/140).

### Aperti — verificati a runtime nel validation-report

- AC-R1: la navigazione L2/L3 reale della cartella paziente (`TopNav`) e' visivamente invariata.
- AC-R2: il modale "Nuovo paziente" (famiglia `.npm-*`, tab rimossi ma il resto vivo) si apre e
  renderizza correttamente, nessuna regressione visiva sulle classi `.npm-*` sopravvissute.
- AC-R3: zero errori console durante la navigazione delle superfici toccate.

## Test Plan

| Test type                 | Required | Reason                                                                                      |
| ------------------------- | -------: | ------------------------------------------------------------------------------------------- |
| Unit                      |       no | rimozione di codice morto, nessuna logica                                                   |
| Integration               |       no | nessun modulo backend toccato                                                               |
| API                       |       no | nessuna modifica                                                                            |
| Playwright                |      yes | verifica visiva che nessuna pagina reale dipendeva (inconsapevolmente) da queste regole CSS |
| Persistence after refresh |       no | nessuna modifica al modello dati                                                            |
| Security/privacy          |       no | nessun dato coinvolto                                                                       |

## Evidence Plan

Required evidence:

- validation-report.md
- test output (tsc/build/test)
- screenshots (TopNav L2/L3 e modale Nuovo paziente, invariati)
- Playwright script

## Risks

**R1 — Rischio di regressione visiva quasi nullo per costruzione.** Ogni classe rimossa e' stata
verificata con grep ricorsivo (zero occorrenze in `.tsx`) PRIMA della rimozione — non stiamo
rimuovendo codice "probabilmente" morto, ma codice verificato meccanicamente irraggiungibile da
qualunque componente React montato. `tsc --noEmit` pulito conferma indipendentemente che nessun
import si e' rotto.

**R2 — Fuori ambito, deliberatamente.** Trovate durante l'analisi ma NON rimosse in questo ciclo
perche' fuori dal perimetro esatto del backlog item "tab bar": `.cr-tab-bar` (dead, ma non e' una
classe "tab", e' il contenitore strip) e `.section-sub-menu` (dead, categoria diversa) — annotate
nel backlog per un ciclo di pulizia CSS futuro piu' ampio. Resto del backlog design system
(unificazione header, 5 sistemi badge, `btn-sm` isolato, scroll PatientList) — vedi
`design-system/README.md`.

## Gate Status

READY FOR IMPLEMENTATION (implementazione gia' completata, verifica runtime in corso)
