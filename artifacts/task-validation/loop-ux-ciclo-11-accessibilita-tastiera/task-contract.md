# Task Contract

## Task
- Title: Loop UX ciclo 11 - Accessibilita da tastiera sulle kpi-alert-card cliccabili
- Slug: loop-ux-ciclo-11-accessibilita-tastiera
- Type: fix (accessibilita, frontend-only)
- Date: 2026-08-08

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

## Contesto

Debito di accessibilita' segnalato dal gate QA in DUE cicli precedenti (9 e 10): tutte le
`.kpi-alert-card` cliccabili in `OperatorDashboard.tsx` (5) e `AdminDashboard.tsx` (1) avevano
`onClick` ma nessun `role`/`tabIndex`/`onKeyDown` — non azionabili da tastiera, a differenza delle
`.stat-card--clickable` nello stesso file `OperatorDashboard.tsx`, che gia' seguono il pattern
corretto. Un utente che naviga solo da tastiera (o un tablet con navigazione assistita) non poteva
raggiungere ne' attivare queste card — direttamente rilevante per il pillar "mobile/tablet
readiness" dell'iniziativa Clinic Control Center.

## Expected Behaviour

Ogni card cliccabile e' raggiungibile con Tab, mostra un indicatore di focus visibile, e si attiva
con Invio o Spazio esattamente come con il click del mouse. Le card SENZA `onClick` (statiche)
restano fuori dalla sequenza di tabulazione — non diventano falsi bottoni.

## Acceptance Criteria

### Verificati staticamente

- AC1 — Le 5 card cliccabili di `OperatorDashboard.tsx` e la 1 di `AdminDashboard.tsx` ricevono
  `role="button"`, `tabIndex={0}`, e un `onKeyDown` che intercetta Invio/Spazio, chiama
  `e.preventDefault()` (per non far scorrere la pagina con lo Spazio) e richiama la STESSA
  funzione gia' passata a `onClick` per quella specifica card.
  *Verifica: gate QA indipendente, riga per riga contro l'`onClick` corrispondente — non un
  copia-incolla errato dalla card adiacente.*
- AC2 — Le card SENZA `onClick` preesistente (es. "Dimessi in archivio" in Admin) NON ricevono
  `role`/`tabIndex` — nessun falso bottone introdotto.
  *Verifica: gate QA + conteggio esatto delle occorrenze (6 totali: 5+1).*
- AC3 — Nuova regola CSS `.kpi-alert-card[role='button']:focus-visible` (outline visibile), non
  duplicata rispetto a regole `:focus-visible` gia' esistenti nel file, scoperta solo alle card
  ora cliccabili (selettore per attributo, non su tutte le `.kpi-alert-card`).
  *Verifica: gate QA, grep indipendente su `focus-visible` in tutto il file.*
- AC4 — `npx tsc --noEmit` pulito, `npm run build` verde, `npm test` 140/140 invariato,
  `eslint --no-cache` zero errori nuovi.
  *Verifica: eseguiti da clinicos-implementer, ri-verificati da clinicos-qa.*

### Aperti — verificati a runtime nel validation-report

- AC-R1: le card sono davvero raggiungibili via `Tab`/`.focus()`, il focus e' visibile, Invio e
  Spazio attivano davvero la navigazione (non solo attributi statici presenti nel DOM).
- AC-R2: una card statica (senza onClick) non ha `role="button"` a runtime — nessun falso
  positivo osservabile.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | fix puramente di markup/attributi, nessuna logica di dominio nuova |
| Integration | no | nessun modulo backend toccato |
| API | no | nessuna modifica |
| Playwright | yes | l'accessibilita' da tastiera (focus, attivazione con Invio/Spazio) e' verificabile solo con un browser reale, non con la sola lettura del codice |
| Persistence after refresh | no | nessuna modifica al modello dati |
| Security/privacy | no | nessun dato coinvolto |

## Risks

**R1 — Fuori ambito, deliberatamente.** Non esteso ad altri pattern di card cliccabili nel
prodotto oltre `.kpi-alert-card` (es. altre viste non toccate dai cicli 9-10) — questo ciclo
risolve specificamente il debito segnalato dal gate QA su QUESTE card, non un audit di
accessibilita' generale dell'app.

## Gate Status

CLOSED — VERIFIED (vedi validation-report.md)
