# Task Contract

## Task

- Title: Loop UX ciclo 14 - Ricerca globale ignorata quando un modale clinico e' gia' aperto
- Slug: loop-ux-ciclo-14-ricerca-globale-ignorata-quando-un-modale-clinico-e-gia-aperto
- Type: change
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

Scoperto durante l'evidenza runtime del Ciclo 13
(`artifacts/task-validation/loop-ux-ciclo-13-patient-switch-safety/`): la scorciatoia globale
`Ctrl+K` (listener su `window`, `App.tsx:486-496`) resta attiva anche quando un modale clinico
full-overlay e' gia' aperto (es. "Invio in PS", `.modal-overlay`, z-index 1000). Premendo `Ctrl+K`
si apre comunque `.search-overlay` (z-index 300 in `App.css`), che pero' finisce VISIVAMENTE SOTTO
il modale gia' aperto: l'utente vede (o crede di vedere) l'interfaccia di ricerca aprirsi, digita
una query, ma il risultato non e' cliccabile (il modale sopra intercetta ogni click). Nessun rischio
per i dati (il click non arriva mai a un risultato, quindi nessun retarget), ma comportamento
confuso e incoerente: con il mouse la ricerca e' semplicemente irraggiungibile (comportamento
corretto e prevedibile), con la tastiera sembra funzionare ma silenziosamente non lo fa.

## Expected Behaviour

Comportamento coerente indipendentemente dal metodo di apertura: se un modale clinico full-overlay
e' gia' aperto, `Ctrl+K` non apre una seconda ricerca invisibile/inutilizzabile — esattamente come
il click sul bottone di ricerca in topbar e' gia' bloccato dallo stesso modale. Nessun nuovo overlay
"fantasma" dietro quello attivo.

## Acceptance Criteria

- AC1 — Con un modale full-overlay aperto (`.modal-overlay` o `.therapy-modal-overlay` presente nel
  DOM), `Ctrl+K` non apre `.search-overlay`: il modale gia' aperto resta l'unico overlay visibile e
  interagibile.
- AC2 — Senza alcun modale aperto, `Ctrl+K` continua a funzionare esattamente come prima (nessuna
  regressione sul percorso normale).
- AC3 — `Escape` chiude ancora la ricerca quando e' lei stessa il modale attivo (nessuna regressione
  sul comportamento esistente).
- AC4 — `npx tsc --noEmit`, `npm run build`, `npm test` invariati/verdi.

## Test Plan

| Test type                 | Required | Reason                                                                                  |
| ------------------------- | -------: | --------------------------------------------------------------------------------------- |
| Unit                      |       no | comportamento di un singolo event handler, coperto meglio da Playwright end-to-end      |
| Integration               |       no | nessun modulo backend toccato                                                           |
| API                       |       no | nessuna modifica                                                                        |
| Playwright                |      yes | comportamento runtime (DOM query al momento del keydown), non verificabile staticamente |
| Persistence after refresh |       no | nessuno stato persistito                                                                |
| Agnos action registry     |       no | non tocca Agnos                                                                         |
| Voice simulation          |       no | non tocca voice                                                                         |
| OCR/import test           |       no | non tocca OCR                                                                           |
| Security/privacy scan     |       no | nessun dato coinvolto                                                                   |

## Evidence Plan

Required evidence:

- validation-report.md
- test output (tsc/build/test)
- screenshots (comportamento prima/dopo con modale aperto)
- Playwright script/trace

## Risks

**R1 — Falso negativo del selettore DOM.** Se in futuro un nuovo modale usasse una classe overlay
diversa da `.modal-overlay`/`.therapy-modal-overlay`, il guard non lo rileverebbe. Accettabile: sono
le uniche due classi overlay full-screen bloccanti nel repo (verificato via grep), coerente con
l'ambito minimo di questo ciclo; non introduce un nuovo pattern, riusa quelli esistenti.

**R2 — Fuori ambito, deliberatamente.** Non tocca il resto del backlog design system (PatientList,
bottone indietro, unificazione header, tab-bar, badge, `btn-sm`) — vedi
`frontend/src/design-system/README.md`.

## Gate Status

READY FOR IMPLEMENTATION
