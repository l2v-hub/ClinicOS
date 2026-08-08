# Task Validation Report

## Task

- Title: Loop UX ciclo 16 - Rimuovi la coppia Salva/Annulla duplicata in Profilo
- Slug: loop-ux-ciclo-16-rimuovi-la-coppia-salva-annulla-duplicata-in-profilo
- Commit: uncommitted working-tree changes on branch loop-ux-ciclo-16-profilo-single-save-cancel (staged for commit)
- Date: 2026-08-08

## Implementation Summary

Sesto ciclo dell'iniziativa "design system globale", dal backlog del Ciclo 12
(`design-system/README.md`, "Profilo ha due coppie Salva/Annulla duplicate per la stessa azione").
`renderProfilo()` (`PatientDetail.tsx`) mostrava, in modifica, DUE coppie Salva/Annulla
funzionalmente identiche: una nell'header della sezione (`ClinicalTableSection actions`, bottoni
bare `btn-sm` senza ruolo — violazione della regola del design system), l'altra nel footer del
form (`InlineForm`, correttamente stilizzata con icona e stato disabled durante il salvataggio).
Nessun'altra sezione della cartella ha questo problema (Rischi/Note/Visite/Consegne mostrano un
singolo bottone statico "+ Aggiungi", non una coppia condizionale). Fix: `actions` diventa
`undefined` quando `editProfilo === true` — l'unica coppia visibile resta quella del footer
`InlineForm`, gia' corretta.

## Files Changed

- `frontend/src/components/operator/PatientDetail.tsx` (unico file applicativo toccato)
- `e2e/loop-ux-ciclo-16-profilo-single-save-cancel.mjs` (nuovo — evidenza runtime)

## Acceptance Criteria Result

| AC                                                          | Result | Evidence                          |
| ----------------------------------------------------------- | -----: | --------------------------------- |
| AC1 - actions e' undefined in modifica                      |   PASS | Lettura diretta del file          |
| AC2 - bottone Modifica invariato fuori modifica             |   PASS | Lettura diretta del file          |
| AC3 - tsc/build/test verdi, eslint invariato                |   PASS | Eseguiti direttamente, vedi sotto |
| AC-R1 - una sola coppia Salva/Annulla visibile in modifica  |   PASS | Runtime: vedi sotto, 5/5          |
| AC-R2 - il salvataggio funziona ancora (footer InlineForm)  |   PASS | Runtime: vedi sotto               |
| AC-R3 - bottone Modifica invariato fuori modifica (runtime) |   PASS | Runtime: vedi sotto               |

## Test Results

| Test             |                   Result | Evidence                                                            |
| ---------------- | -----------------------: | ------------------------------------------------------------------- |
| Unit             | NA (per scelta motivata) | markup puro, coperto da Playwright end-to-end                       |
| Integration      |                       NA | nessun modulo backend toccato                                       |
| API              |                       NA | nessuna modifica                                                    |
| Playwright       |                     PASS | `node e2e/loop-ux-ciclo-16-profilo-single-save-cancel.mjs`: **5/5** |
| Persistence      |                       NA | nessuna modifica al modello dati                                    |
| Security/privacy |                       NA | nessun dato coinvolto                                               |

Eseguiti direttamente (io, il coordinatore):

- `npx tsc --noEmit`: pulito.
- `npm run build`: verde (`✓ built in 8.27s`).
- `npm test -- --run`: 140/140 invariato.
- `eslint --no-cache src/components/operator/PatientDetail.tsx`: stessi 8 errori pre-esistenti
  (`react-hooks/refs` su `switchTab`, non collegati a questo fix — gia' confermati pre-esistenti nei
  Cicli 13/14/15).

## Runtime Evidence

Nessun Postgres/Podman disponibile; evidenza via browser reale con `page.route` stubbing.
**5/5 verifiche superate**:

1. Fuori modifica, il bottone "Modifica" e' presente e invariato (screenshot
   `01-profilo-vista-sola-lettura.png`).
2. **In modifica, un solo bottone "Salva" e un solo bottone "Annulla" sono visibili nella pagina**
   (contati con `page.locator('button', {hasText: ...}).count()`) — prima del fix ce n'erano due di
   ciascuno (screenshot `02-profilo-in-modifica.png`, confrontabile con lo screenshot del Ciclo 12
   se necessario per il "prima").
3. Il salvataggio tramite il footer `InlineForm` (unica coppia rimasta) chiude ancora correttamente
   il form — nessuna regressione funzionale, solo rimozione della ridondanza (screenshot
   `03-profilo-dopo-salvataggio.png`).
4. Zero errori JavaScript in console durante l'intero scenario.

Dettaglio in `screenshots/verifiche.json`.

## Residual Risks

- **R1 (dal contract)**: l'header di "Dati e Contatti" in modifica appare ora "vuoto" a destra
  invece di una seconda coppia Salva/Annulla — verificato via screenshot che il layout resta
  coerente (nessuno spazio vuoto anomalo).
- **Backlog design system ampio e deliberatamente differito** — vedi
  `frontend/src/design-system/README.md` (in particolare la classe `btn-sm` bare del bottone
  "Modifica" resta invariata, parte del backlog piu' ampio delle 24 occorrenze isolate).
- **Autocertificazione**: fix, implementazione e verifica runtime eseguiti tutti da me in questo
  ciclo (nessun sub-agente Ruflo: root cause gia' individuata dal Ciclo 12, cambio a un singolo file
  applicativo, coerente con la regola dell'iniziativa "il lavoro gia' ben definito e di ambito
  ridotto resta single-agent").

## Final Decision

CLOSED — VERIFIED

Tutti gli AC del contract sono verificati: staticamente per il markup, a runtime tramite uno
scenario Playwright end-to-end che conta gli elementi effettivamente RENDERIZZATI (non solo che il
codice sorgente e' cambiato) e verifica che il salvataggio resti funzionante attraverso l'unica
coppia di controlli rimasta. tsc/build/test verificati direttamente; eslint confrontato per
escludere regressioni.
