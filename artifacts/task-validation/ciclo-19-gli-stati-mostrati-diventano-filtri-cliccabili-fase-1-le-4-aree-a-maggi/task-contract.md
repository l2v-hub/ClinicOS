# Task Contract

## Task

- Title: Ciclo 19 - Gli stati mostrati diventano filtri cliccabili (fase 1: le 4 aree a maggior traffico)
- Slug: ciclo-19-gli-stati-mostrati-diventano-filtri-cliccabili-fase-1-le-4-aree-a-maggi
- Type: change (frontend, pattern UX globale)
- Date: 2026-08-10

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |       no |
| Database/Persistence |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

## Contesto

Direttiva utente: "in tutte le schermate dove sono mostrati gli stati, gli stati rappresentati
devono diventare dei filtri". Analisi (agente Explore reale) ha mappato TUTTE le schermate
dell'app che mostrano uno "stato" come riepilogo/badge/conteggio non interattivo, distinguendo
quelle GIA' conformi (escluse) da quelle con un gap reale.

**Gia' conformi, verificate ed escluse**: `ConsegnePage.tsx` (filtri stato+priorita' gia'
presenti), `PatientList.tsx` (filtro sesso, ma NON stato clinico — gap distinto), `NotesPage.tsx`
(filtro "Non lette (N)" — GIA' il pattern esatto da replicare altrove), `OperatorManagement.tsx`
(filtro attivo/inattivo gia' presente), `RoomsManagement.tsx` (filtro reparto, ma NON stato letto —
gap distinto), `AdminAgenda.tsx` (filtro operatore, ma NON stato appuntamento — gap distinto),
`TerapiaFarmacologicaTab.tsx` (i sotto-tab attivi/programmazione/giornaliere/storico/sospese GIA'
fungono da filtro-per-stato con badge di conteggio).

**Pattern canonico da replicare** (gia' esistente nel codice, non inventato): `.filter-chips` >
`.filter-chip{--active}` per bottone, un bottone per ogni valore dell'enum + un "Tutte/Tutti"
onnicomprensivo, con il conteggio nel testo del bottone quando rilevante (`NotesPage.tsx`:
`` `Non lette${n>0?` (${n})`:''}` ``). Stato locale (`useState`) gia' in memoria in ogni schermata
target — nessuna nuova chiamata API in nessuno dei 4 casi (dato gia' caricato client-side,
verificato dall'analisi).

**Ambito di questo ciclo (fase 1, i 4 gap a maggior traffico giornaliero)**:

1. **Riepilogo somministrazioni terapia** (`TherapySlotCard`/`TherapySlotDot`/`TherapySlotModal`,
   condiviso da agenda admin, agenda operatore, e "Somministrazioni giornaliere" nella cartella) —
   oggi mostra solo testo statico "N erogate / N non erogate / N da erogare"; diventa una riga di
   filtri sullo stato della singola somministrazione (erogata/non erogata/da erogare) DENTRO il
   modale di dettaglio (il conteggio sulla card in agenda resta un riepilogo, non un filtro — la
   card e' un trigger di apertura, il filtro vive dove la lista e' effettivamente mostrata).
2. **Stato appuntamento in agenda** (`OperatorAgenda.tsx`, `AdminAgenda.tsx`) — il rapporto
   "N completati / totale" diventa un filtro per stato appuntamento (programmato/in_corso/
   completato/annullato).
3. **Stato clinico paziente in lista** (`PatientList.tsx`) — nuova riga di filtri per
   `statoRicovero` (ricoverato/ambulatoriale/day_hospital/dimesso), accanto a quella gia' esistente
   per il sesso, stesso pattern visivo.
4. **Stato letto in gestione camere** (`RoomsManagement.tsx`) — i 3 numeri statici
   "Occupati/Liberi/Manutenzione" diventano filtri, accanto al filtro reparto gia' esistente.

## Expected Behaviour

In ognuna delle 4 aree, cliccare sullo stato mostrato (badge/conteggio/riga di riepilogo) filtra
la lista sottostante a quello stato, con lo stesso comportamento visivo (`.filter-chip.active`)
gia' usato in `ConsegnePage.tsx`/`NotesPage.tsx`. Un filtro "Tutti/Tutte" onnicomprensivo resta
sempre disponibile. Nessuna nuova chiamata di rete: il filtro opera sui dati gia' in memoria.

## Acceptance Criteria

### Verificati staticamente

- AC1 — Riepilogo somministrazioni (`TherapySlotModal.tsx`): riga `.filter-chips` per stato
  (Da erogare/Erogate/Non erogate/Tutte) con conteggio nel testo, filtra le righe mostrate nel
  modale. Nessuna modifica a `TherapySlotCard`/`TherapySlotDot` (restano trigger di apertura, il
  filtro vive nel modale dove la lista e' davvero mostrata).
- AC2 — Agenda (`OperatorAgenda.tsx` + `AdminAgenda.tsx`): riga `.filter-chips` per stato
  appuntamento, stesso pattern in entrambi i file (nessuna duplicazione di logica se estraibile
  in un helper condiviso, altrimenti implementazione parallela coerente).
- AC3 — `PatientList.tsx`: nuova riga `.filter-chips` per `statoRicovero`, accanto a quella del
  sesso, stesso stile.
- AC4 — `RoomsManagement.tsx`: nuova riga `.filter-chips` per stato letto, accanto a quella del
  reparto, stesso stile.
- AC5 — `npx tsc --noEmit`, `npm run build`, `npm test` invariati/verdi.

### Aperti — verificati a runtime nel validation-report

- AC-R1 — AC-R4: per ciascuna delle 4 aree, cliccare un filtro di stato riduce davvero la lista
  visibile a quello stato (verificabile via conteggio righe/elementi renderizzati prima/dopo).
- AC-R5: zero errori console in tutti gli scenari.

## Test Plan

| Test type        | Required | Reason                                                                  |
| ---------------- | -------: | ----------------------------------------------------------------------- |
| Unit             |       no | markup/stato locale, coperto da Playwright end-to-end                   |
| Playwright       |      yes | comportamento di filtraggio RENDERIZZATO, non verificabile staticamente |
| Security/privacy |       no | nessun dato coinvolto, nessuna nuova chiamata di rete                   |

## Risks

**R1 — Ambito volutamente limitato a 4 aree (fase 1 di 2).** L'analisi ha trovato altri 6 gap
minori (Diario, Documenti, Medicazioni, Diagnosi in cartella paziente; pre-filtro dalle card KPI
dashboard) — a traffico giornaliero inferiore, deliberatamente rinviati a un ciclo 2 per non
gonfiare questo ciclo oltre un ambito verificabile in un solo giro.

**R2 — `ClinicalTable`'s dropdown "Filtri" (gia' esistente, usato da `TerapiaFarmacologicaTab`/
`OperatorManagement`/`PatientList` desktop) soddisfa la lettera della direttiva ma non lo spirito
letterale ("click sul badge/conteggio mostrato") — e' un filtro secondario dietro un pulsante
"Filtri", non un click diretto sullo stato visualizzato. Non toccato in questo ciclo (fuori
ambito, richiederebbe una scelta di design piu' ampia sul componente condiviso).

## Gate Status

READY FOR IMPLEMENTATION
