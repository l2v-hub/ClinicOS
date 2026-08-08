# Task Validation Report

## Task

- Title: Loop UX ciclo 15 - Il bottone indietro della cartella mostra dove va davvero
- Slug: loop-ux-ciclo-15-il-bottone-indietro-della-cartella-mostra-dove-va-davvero
- Commit: uncommitted working-tree changes on branch loop-ux-ciclo-15-back-label-accuracy (staged for commit)
- Date: 2026-08-08

## Implementation Summary

Quinto ciclo dell'iniziativa "design system globale", dal backlog del Ciclo 12
(`design-system/README.md`, "Bottone indietro della cartella dichiara sempre 'Torna alla lista' ma
puo' tornare al paziente precedente"). `App.tsx` gia' calcolava l'etichetta corretta
(`backLabel={NAV_LABELS[prevNavKeyRef.current ?? 'pazienti']}`) e la passava a `PatientDetail`, ma
`PatientDetail` non la destrutturava dalle props (scartata silenziosamente) ne' la propagava a
`PatientCompactHeader`, che non aveva nemmeno un prop `backLabel` — il tooltip del bottone indietro
era sempre il testo statico "Torna alla lista", indipendentemente da dove il click reale
(`window.history.back()`) avrebbe portato l'utente.

Fix: `backLabel?: string` aggiunto a `PatientCompactHeaderProps`, propagato da `PatientDetail`,
usato per comporre `` `Torna a ${backLabel}` `` (fallback `'Torna alla lista'`). Colto anche un gap
di accessibilita' collaterale nello stesso elemento: il bottone indietro era un `<div onClick>`
senza supporto da tastiera — convertito a `<button type="button">` con `aria-label` coerente,
reset CSS minimo per neutralizzare gli stili di default del browser.

## Files Changed

- `frontend/src/components/operator/PatientCompactHeader.tsx`
- `frontend/src/components/operator/PatientDetail.tsx`
- `frontend/src/App.css`
- `e2e/loop-ux-ciclo-15-back-label-accuracy.mjs` (nuovo — evidenza runtime)

## Acceptance Criteria Result

| AC                                                         | Result | Evidence                          |
| ---------------------------------------------------------- | -----: | --------------------------------- |
| AC1 - PatientCompactHeader accetta e usa backLabel         |   PASS | Lettura diretta del file          |
| AC2 - PatientDetail propaga backLabel                      |   PASS | Lettura diretta del file          |
| AC3 - bottone indietro e' un vero `<button>`, CSS coerente |   PASS | Runtime: vedi sotto               |
| AC4 - tsc/build/test verdi, eslint invariato               |   PASS | Eseguiti direttamente, vedi sotto |
| AC-R1 - "Torna a Pazienti" entrando dalla lista            |   PASS | Runtime: vedi sotto, 5/5          |
| AC-R2 - "Torna a Scheda Paziente" dopo switch via ricerca  |   PASS | Runtime: vedi sotto               |
| AC-R3 - aria-label coerente, tagName BUTTON                |   PASS | Runtime: vedi sotto               |

## Test Results

| Test             |                   Result | Evidence                                                     |
| ---------------- | -----------------------: | ------------------------------------------------------------ |
| Unit             | NA (per scelta motivata) | markup/prop-plumbing puro, coperto da Playwright end-to-end  |
| Integration      |                       NA | nessun modulo backend toccato                                |
| API              |                       NA | nessuna modifica                                             |
| Playwright       |                     PASS | `node e2e/loop-ux-ciclo-15-back-label-accuracy.mjs`: **5/5** |
| Persistence      |                       NA | nessuno stato persistito                                     |
| Security/privacy |                       NA | nessun dato coinvolto                                        |

Eseguiti direttamente (io, il coordinatore):

- `npx tsc --noEmit`: pulito.
- `npm run build`: verde (`✓ built in 5.83s`).
- `npm test -- --run`: 140/140 invariato.
- `eslint --no-cache` su entrambi i file toccati: `PatientCompactHeader.tsx` zero errori;
  `PatientDetail.tsx` stessi 8 errori pre-esistenti (`react-hooks/refs` su `switchTab`, non
  collegati a questo fix — gia' confermati come pre-esistenti nel Ciclo 13/14, solo shiftati di 1
  riga per l'aggiunta della destrutturazione `backLabel`).

## Runtime Evidence

Nessun Postgres/Podman disponibile; evidenza via browser reale con `page.route` stubbing (due
pazienti sintetici, A="Amato" e B="Bonelli"). **5/5 verifiche superate**:

1. Entrando nella cartella dalla lista pazienti, il bottone indietro mostra davvero
   `title="Torna a Pazienti"` (screenshot `01-back-label-da-lista-pazienti.png`).
2. Il bottone indietro e' realmente un elemento `<button>` (`tagName === 'BUTTON'`), non piu' un
   `<div>` senza supporto da tastiera.
3. **Dopo uno switch paziente via ricerca globale (scenario del Ciclo 13), il bottone indietro
   mostra davvero `title="Torna a Scheda Paziente"`** — riflette correttamente che "indietro" ora
   torna al paziente precedente, non alla lista (screenshot
   `02-back-label-dopo-switch-paziente.png`).
4. `aria-label` coerente col `title` (accessibile agli screen reader).
5. Zero errori JavaScript in console durante l'intero scenario.

Dettaglio in `screenshots/verifiche.json`.

## Residual Risks

- **R2 (dal contract)**: conversione `<div>` -> `<button>` verificata visivamente via screenshot —
  nessuna differenza di stile percepibile (reset CSS applicato: `background: none; padding: 0;
font: inherit;`).
- **Backlog design system ampio e deliberatamente differito** — vedi
  `frontend/src/design-system/README.md`.
- **Autocertificazione**: fix, implementazione e verifica runtime eseguiti tutti da me in questo
  ciclo (nessun sub-agente Ruflo: root cause gia' individuata dal Ciclo 12, cambio a 2 file
  applicativi + 1 CSS, coerente con la regola dell'iniziativa "il lavoro gia' ben definito e di
  ambito ridotto resta single-agent").

## Final Decision

CLOSED — VERIFIED

Tutti gli AC del contract sono verificati: staticamente per il plumbing dei prop e la conversione
dell'elemento, a runtime tramite uno scenario Playwright end-to-end che riproduce esattamente il
meccanismo del bug (entrata dalla lista vs. switch paziente via ricerca) — non solo "il testo e'
nel codice", ma la prova che il `title`/`aria-label` RENDERIZZATO cambia correttamente nei due
scenari. tsc/build/test verificati direttamente; eslint confrontato per escludere regressioni.
