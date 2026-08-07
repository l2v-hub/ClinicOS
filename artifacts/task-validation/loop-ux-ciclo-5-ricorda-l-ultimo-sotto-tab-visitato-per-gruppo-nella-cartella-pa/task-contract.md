# Task Contract

## Task
- Title: Loop UX ciclo 5: ricorda l'ultimo sotto-tab visitato per gruppo nella cartella paziente
- Slug: loop-ux-ciclo-5-ricorda-l-ultimo-sotto-tab-visitato-per-gruppo-nella-cartella-pa
- Type: refactor
- Date: 2026-08-07

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

`PatientDetail.tsx` organizza i tab clinici in gruppi (Panoramica, Clinica, Diario, Moduli,
Documenti); il gruppo "Clinica" ha 7 sotto-tab (Presa in Carico, Sezioni Cliniche, Diagnosi,
Terapia Farmacologica, Parametri Vitali, Note & Visite, Esami & Consulenze). `switchGroup()`
resetta sempre al primo sotto-tab (`group.tabs[0].id`) quando il tab corrente non appartiene al
gruppo target. Risultato: un operatore su "Terapia Farmacologica" che passa a "Diario" per un
controllo e poi torna su "Clinica" si ritrova su "Presa in Carico" — il primo sotto-tab, non
quello che stava effettivamente consultando — perdendo il contesto.

## Expected Behaviour

Un `Map` (per React ref, non persistito) ricorda l'ultimo sotto-tab visitato per ciascun gruppo,
nella stessa sessione sullo stesso paziente. Tornando a un gruppo già visitato, si riapre sul
sotto-tab dove si era, non sul primo. Azzerato al cambio paziente (coerente col reset esistente di
`tab`/`activeGroup`/`diarioFilter` allo stesso evento).

## Acceptance Criteria

- AC1: `lastTabByGroup` (ref) tiene traccia dell'ultimo tab per gruppo; `switchGroup()` lo
  consulta invece di andare sempre al primo sotto-tab.
- AC2: `switchTab()` deriva il gruppo proprietario del tab direttamente da `TAB_GROUPS` (non
  dallo stato `activeGroup`, che può essere stale nello stesso handler quando `switchGroup()` e
  `switchTab()` sono chiamate in sequenza — vedi i bottoni "Apri X" che saltano direttamente a un
  sotto-tab di un altro gruppo).
- AC3: la memoria si azzera al cambio paziente (stesso useEffect che già resetta tab/activeGroup).
- AC4: verificato dal vivo: Clinica→Terapia Farmacologica→Diario→Clinica riporta su Terapia
  Farmacologica, non su Presa in Carico.
- AC5: `tsc --noEmit`, `npm run build`, `npm test` puliti su frontend.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | `npm test` non deve regredire. |
| Integration | no | |
| API | no | Nessuna route backend toccata. |
| Playwright | yes | Unico modo per osservare la sequenza di navigazione reale e confermare quale sotto-tab risulta attivo. |
| Persistence after refresh | no | Stato solo in-memory, per design (un refresh riparte da "Riepilogo", comportamento invariato e non nello scope di questo ciclo). |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | |

## Evidence Plan

Required evidence:

- validation-report.md
- output build (`tsc --noEmit`, `npm run build`, `npm test`)
- screenshot della sequenza di navigazione (Terapia → Diario → torna su Clinica, ancora su Terapia)

## Risks

- Il fix non copre il caso "chiudi la cartella e riaprila" (il componente smonta e rimonta,
  perdendo `lastTabByGroup` insieme al resto dello stato) — comportamento preesistente e
  intenzionale (si riparte sempre da "Riepilogo" all'apertura), non toccato in questo ciclo.
- I bottoni "Apri X" che saltano direttamente a un sotto-tab di un altro gruppo (es. "Apri Terapia
  Farmacologica" da un modale) sovrascrivono la memoria di quel gruppo col tab appena aperto —
  comportamento corretto e voluto (l'utente ha appena scelto esplicitamente quel tab).

## Gate Status

READY FOR IMPLEMENTATION
