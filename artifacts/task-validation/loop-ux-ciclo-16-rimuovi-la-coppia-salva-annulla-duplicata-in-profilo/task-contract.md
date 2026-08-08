# Task Contract

## Task

- Title: Loop UX ciclo 16 - Rimuovi la coppia Salva/Annulla duplicata in Profilo
- Slug: loop-ux-ciclo-16-rimuovi-la-coppia-salva-annulla-duplicata-in-profilo
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

Backlog gia' individuato nel Ciclo 12 (`design-system/README.md`): quando `editProfilo` e' `true`,
`renderProfilo()` (`PatientDetail.tsx`) mostra DUE coppie Salva/Annulla funzionalmente identiche
contemporaneamente — una nell'header della sezione (`ClinicalTableSection actions`, bottoni bare
`btn-sm` senza ruolo, in violazione della regola del design system "`.btn-sm` da solo e' VIETATO"),
l'altra nel footer del form (`InlineForm`, correttamente stilizzata `btn-secondary`/`btn-success`
con icona e stato disabled durante il salvataggio). Nessuna altra sezione della cartella ha questo
problema: Rischi/Note/Visite/Consegne mostrano nell'header un singolo bottone statico
"+ Aggiungi" (stesso testo sia aperto che chiuso), non una coppia condizionale che duplica
`InlineForm`.

## Expected Behaviour

In modifica, l'header della sezione "Dati e Contatti" non mostra piu' Salva/Annulla (ne mostra
`undefined`) — l'unica coppia visibile e' quella del footer di `InlineForm`, gia' correttamente
stilizzata e con lo stato "Salvataggio…"/disabled durante il salvataggio. Fuori modifica, il
bottone "Modifica" nell'header resta invariato.

## Acceptance Criteria

### Verificati staticamente

- AC1 — `actions` di `ClinicalTableSection` in `renderProfilo()` e' `undefined` quando
  `editProfilo === true` (prima renderizzava una seconda coppia Salva/Annulla).
- AC2 — Il bottone "Modifica" (view mode) resta invariato — nessuna regressione fuori dall'ambito
  di questo fix.
- AC3 — `npx tsc --noEmit`, `npm run build`, `npm test` invariati/verdi.

### Aperti — verificati a runtime nel validation-report

- AC-R1: entrando in modifica Profilo, l'header della sezione NON mostra piu' bottoni Salva/Annulla
  — nella pagina e' presente una sola coppia Salva/Annulla (quella del footer `InlineForm`).
- AC-R2: il salvataggio funziona ancora correttamente tramite il footer `InlineForm` (click su Salva
  chiude il form di modifica, come da comportamento pre-esistente di `saveProfiloHandler`).
- AC-R3: fuori modifica, il bottone "Modifica" e' ancora presente e funzionante (nessuna
  regressione).

## Test Plan

| Test type                 | Required | Reason                                                                          |
| ------------------------- | -------: | ------------------------------------------------------------------------------- |
| Unit                      |       no | markup puro, coperto meglio da Playwright end-to-end                            |
| Integration               |       no | nessun modulo backend toccato                                                   |
| API                       |       no | nessuna modifica                                                                |
| Playwright                |      yes | il fix cambia il numero di elementi RENDERIZZATI, non verificabile staticamente |
| Persistence after refresh |       no | nessuna modifica al modello dati                                                |
| Security/privacy          |       no | nessun dato coinvolto                                                           |

## Evidence Plan

Required evidence:

- validation-report.md
- test output (tsc/build/test/eslint)
- screenshots (prima/dopo — conteggio bottoni Salva/Annulla visibili)
- Playwright script

## Risks

**R1 — Cambiamento visivo intenzionale.** L'header di "Dati e Contatti" in modifica ora appare
"vuoto" a destra (nessun bottone) invece di mostrare una seconda coppia Salva/Annulla — riduzione
deliberata di ridondanza, non una regressione funzionale (il salvataggio resta raggiungibile tramite
il footer del form, sempre visibile).

**R2 — Fuori ambito, deliberatamente.** Non tocca la classe `btn-sm` bare del bottone "Modifica"
(fa parte del backlog piu' ampio "24 occorrenze `btn-sm` isolato", ciascuna richiede una scelta
editoriale — vedi `design-system/README.md`) ne' il resto del backlog (PatientList, unificazione
header, tab-bar, badge).

## Gate Status

READY FOR IMPLEMENTATION (implementazione gia' completata, verifica runtime in corso)
