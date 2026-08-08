# Task Contract

## Task

- Title: Loop UX ciclo 15 - Il bottone indietro della cartella mostra dove va davvero
- Slug: loop-ux-ciclo-15-il-bottone-indietro-della-cartella-mostra-dove-va-davvero
- Type: fix (design system, frontend-only)
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

Backlog gia' individuato nel Ciclo 12 (`design-system/README.md`): il bottone indietro icon-only
della cartella paziente (`PatientCompactHeader.tsx`) ha sempre `title="Torna alla lista"`
hardcoded. Ma il click reale (`onBack` -> `goBack('pazienti')` in `App.tsx`) usa
`window.history.back()` quando c'e' profondita' di history (`historyDepth.current > 0`, quasi
sempre vero) — che puo' riportare l'utente a qualunque schermata precedente: la dashboard, le
consegne, o, dopo uno switch paziente via ricerca globale (Ciclo 13), **il paziente precedente**,
non la lista. `App.tsx` gia' calcolava un'etichetta corretta
(`backLabel={NAV_LABELS[prevNavKeyRef.current ?? 'pazienti']}`, riga 1689) e la passava a
`PatientDetail`, ma `PatientDetail` non la destrutturava dalle props (silenziosamente scartata) ne'
la propagava a `PatientCompactHeader`, che non aveva nemmeno un prop `backLabel` da accettare.

## Expected Behaviour

Il tooltip/aria-label del bottone indietro riflette sempre la reale destinazione: "Torna a
Pazienti" quando si arriva dalla lista, "Torna a Scheda Paziente" quando si arriva da un altro
paziente (switch via ricerca), "Torna a Dashboard"/"Torna a Consegne" ecc. per gli altri punti di
ingresso — fallback "Torna alla lista" solo se nessuna label e' disponibile.

## Acceptance Criteria

### Verificati staticamente

- AC1 — `PatientCompactHeaderProps` accetta un `backLabel?: string` opzionale; il componente lo usa
  per comporre `` `Torna a ${backLabel}` `` con fallback a `'Torna alla lista'`.
- AC2 — `PatientDetail` destruttura `backLabel` dalle props e lo passa a `PatientCompactHeader`
  (prima veniva silenziosamente scartato).
- AC3 — Il bottone indietro e' un vero elemento `<button type="button">` (prima un `<div onClick>`
  senza supporto da tastiera) — nessuna nuova regressione visiva, CSS aggiornato per neutralizzare
  gli stili di default del browser (`background: none; padding: 0; font: inherit;`).
- AC4 — `npx tsc --noEmit`, `npm run build`, `npm test` invariati/verdi.

### Aperti — verificati a runtime nel validation-report

- AC-R1: entrando nella cartella dalla lista pazienti, il bottone indietro mostra davvero "Torna a
  Pazienti" (non piu' il testo statico "Torna alla lista").
- AC-R2: dopo uno switch paziente via ricerca globale (scenario del Ciclo 13), il bottone indietro
  mostra davvero "Torna a Scheda Paziente" — riflettendo che "indietro" torna al paziente
  precedente, non alla lista.
- AC-R3: `aria-label` coerente con il `title`, il bottone e' davvero un `<button>` (verificabile via
  `tagName`).

## Test Plan

| Test type                 | Required | Reason                                                                                                   |
| ------------------------- | -------: | -------------------------------------------------------------------------------------------------------- |
| Unit                      |       no | markup/prop-plumbing puro, coperto meglio da Playwright end-to-end                                       |
| Integration               |       no | nessun modulo backend toccato                                                                            |
| API                       |       no | nessuna modifica                                                                                         |
| Playwright                |      yes | il fix cambia il testo RENDERIZZATO in due scenari di navigazione diversi, non verificabile staticamente |
| Persistence after refresh |       no | nessuno stato persistito                                                                                 |
| Security/privacy          |       no | nessun dato coinvolto                                                                                    |

## Evidence Plan

Required evidence:

- validation-report.md
- test output (tsc/build/test/eslint)
- screenshots (label prima/dopo nei due scenari)
- Playwright script

## Risks

**R1 — Cambiamento visivo intenzionale.** Il tooltip del bottone indietro cambia testo a seconda
del contesto di navigazione invece di essere sempre statico. Nessun rischio di regressione
comportamentale (la destinazione reale del click non cambia, solo l'etichetta ora la riflette
correttamente).

**R2 — Conversione `<div>` a `<button>`.** Verificato che nessun CSS dipenda dal tag specifico
(`.patient-compact-header__back` e' l'unico selettore, per classe non per tag); aggiunto un reset
minimo (`background: none; padding: 0; font: inherit;`) per neutralizzare gli stili UA di default
del bottone.

**R3 — Fuori ambito, deliberatamente.** Resto del backlog design system (PatientList, unificazione
header, tab-bar, badge, `btn-sm`) — vedi `frontend/src/design-system/README.md`.

## Gate Status

READY FOR IMPLEMENTATION (implementazione gia' completata, verifica runtime in corso)
