# Task Contract

## Task
- Title: Loop UX ciclo 4: elimina rifiltraggio O(N) per cella in agenda admin/operatore
- Slug: loop-ux-ciclo-4-elimina-rifiltraggio-o-n-per-cella-in-agenda-admin-operatore
- Type: refactor
- Date: 2026-08-06

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

## Current Behaviour

`AdminAgenda.tsx` (vista giornaliera) e `OperatorAgenda.tsx` renderizzano la griglia oraria
iterando `TIME_SLOTS × operatori visibili` (Admin) o solo `TIME_SLOTS` (Operator, già filtrato al
proprio id). Per OGNI cella chiamano `getApts(...)`/`myApts(...)`, che rifiltra e riordina
l'intero array `appuntamenti` (tutti gli appuntamenti mai creati, non solo quelli del giorno
mostrato) da zero. Con `TIME_SLOTS.length = 22` e N operatori visibili, sono fino a 22×N
filter+sort completi per render in AdminAgenda, e 22 in OperatorAgenda — ripetuti a ogni
interazione (cambio filtro operatore, selezione slot, navigazione data) perché l'intero componente
si ri-renderizza.

## Expected Behaviour

Un indice (`Map`) costruito una sola volta per render con `useMemo`, chiave `operatoreId::ora`
(Admin) o `ora` (Operator, già scoperto per operatore), filtrato al solo giorno mostrato. Ogni
cella fa un lookup O(1) invece di un filter+sort O(N). Nessun cambiamento visivo o di
comportamento: stesso appuntamento nella stessa cella, stessa vista settimanale/mensile (non
toccate, usano `getApts`/`myApts` un numero di volte molto minore — 7 per la settimana, non
O(celle)).

## Acceptance Criteria

- AC1: `AdminAgenda.tsx` — nuovo indice memoizzato `aptByOpAndOra`, il lookup per cella nella
  vista giornaliera usa `.get()` invece di `getApts(...).find(...)`.
- AC2: `OperatorAgenda.tsx` — stesso pattern (`todayAptByOra`), costruito da `todayApts` già
  calcolato (nessun ricalcolo aggiuntivo).
- AC3: nessuna regressione visiva/funzionale nella vista giornaliera di entrambe le agende;
  settimanale/mensile invariate (fuori scope, non nel percorso caldo).
- AC4: `tsc --noEmit`, `npm run build`, `npm test` puliti su frontend.
- AC5: miglioramento misurato — micro-benchmark riproducibile che confronta il pattern
  "prima" (filter+sort per cella) col pattern "dopo" (indice + get), a una scala realistica.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | `npm test` non deve regredire. |
| Integration | no | |
| API | no | Nessuna route backend toccata. |
| Playwright | yes | Conferma visiva che la griglia giornaliera renderizza correttamente dopo il cambio. |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | |

## Evidence Plan

Required evidence:

- validation-report.md
- output build (`tsc --noEmit`, `npm run build`, `npm test`)
- output del micro-benchmark prima/dopo
- screenshot della vista giornaliera Agenda Globale (admin)

## Risks

- Il DB di test usato per la verifica dal vivo non ha operatori/appuntamenti seminati per la data
  odierna: la griglia renderizza correttamente ma vuota, quindi non si osserva visivamente un
  appuntamento posizionato nella cella giusta — la correttezza funzionale della sostituzione
  (stessa chiave, stesso filtro per data) è verificata per lettura del codice, non per screenshot
  con dati reali in questa sessione.
- Le viste settimanale/mensile continuano a usare `getApts`/`myApts` senza indice: non ottimizzate
  in questo ciclo perché chiamate O(giorni) volte (7/mese), non O(celle) — non erano il collo di
  bottiglia.

## Gate Status

READY FOR IMPLEMENTATION
