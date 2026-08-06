# Task Contract

## Task
- Title: Loop UX ciclo 1: dashboard operatore e lista pazienti
- Slug: loop-ux-ciclo-1-dashboard-operatore-e-lista-pazienti
- Type: refactor
- Date: 2026-08-06

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | yes (nuovo endpoint additivo, nessuna route esistente modificata) |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

Al login, `App.tsx` carica `GET /patients` e poi, per OGNI paziente restituito, una `GET
/patients/:id/cartella` separata (`Promise.all` su tutta la lista) — N+1 richieste, ognuna delle
quali scarica l'intero fascicolo clinico del paziente (diario, terapie, anamnesi, tutto), solo per
calcolare 4 flag/contatori usati dai badge della lista (`PatientList.tsx`) e dai KPI della
dashboard (`OperatorDashboard.tsx`, `AdminDashboard.tsx`): stato ricovero, "critico", allergie
gravi, terapie completate/totali. Con 30+ pazienti questo satura il pool di connessioni del
browser insieme alle altre fetch critiche del login (appuntamenti, consegne, note...).

## Expected Behaviour

Una singola chiamata `GET /patients/clinical-summary` all'avvio restituisce solo i flag/contatori
derivati per tutti i pazienti (non la cartella intera). Badge lista e KPI dashboard si popolano
da questa; nessuna fetch `/cartella` viene più fatta al login. La cartella completa resta caricata
on-demand quando si apre un paziente specifico (invariato) e per la vista "Parametri
multipaziente" (che mostra i parametri vitali reali di tutti i pazienti e quindi ha bisogno dei
dati completi) — caricata lazy solo quando quella vista viene aperta, non più al login.

## Acceptance Criteria

- AC1: `GET /patients/clinical-summary` esiste, richiede operatore (stesso gate delle altre route
  cliniche), restituisce per ogni paziente con una cartella: `statoRicovero`, `hasCriticalVitals`,
  `hasHighRisk`, `allergieCount`, `hasSevereAllergy`, `terapieTotali`, `terapieCompletate`.
- AC2: al login zero chiamate `GET /patients/:id/cartella` (prima N, una per paziente); una sola
  chiamata `GET /patients/clinical-summary`.
- AC3: badge stato clinico/allergie nella lista pazienti e KPI della dashboard operatore/admin
  invariati nel risultato visibile (stessi dati, fonte diversa) — nessuna regressione visiva.
- AC4: pazienti senza cartella (nessuna riga `Cartella`) non rompono il render: nessun badge/pill
  "null", solo assenza del badge o "—".
- AC5: la vista "Parametri multipaziente" continua a mostrare i dati completi (caricati lazy
  all'apertura di quella vista, non più al login).
- AC6: `tsc --noEmit` e `npm run build` puliti su frontend e backend.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | Nessun test unitario dedicato esistente su questi componenti; coperto da build+smoke live. |
| Integration | no | |
| API | yes | Verifica diretta di `GET /patients/clinical-summary` contro dati reali. |
| Playwright | yes | Conta le chiamate di rete reali al login (era l'unico modo per misurare l'N+1) e verifica visivamente badge/KPI. |
| Persistence after refresh | no | Nessun dato scritto. |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | Nessun nuovo secret/PII esposto: il nuovo endpoint restituisce solo flag derivati, meno dati clinici in transito rispetto a prima, non di più. |

## Evidence Plan

Required evidence:

- validation-report.md
- output build (`tsc --noEmit`, `npm run build`)
- conteggio chiamate di rete reali al login (prima/dopo)
- screenshot dashboard + lista pazienti con badge/KPI popolati

## Risks

- Endpoint nuovo scansiona TUTTE le righe `Cartella` (`findMany` senza filtro): accettabile alla
  scala attuale (decine/centinaia di pazienti), da rivedere con un indice o paginazione se la
  clinica cresce di molto — stesso ordine di grandezza di `GET /patients` già esistente.
- La vista "Parametri multipaziente", ora lazy, avrà un piccolo ritardo di caricamento alla prima
  apertura (prima i dati erano già pronti dal prefetch di login) — normale progressive disclosure,
  non un difetto.

## Gate Status

READY FOR IMPLEMENTATION
