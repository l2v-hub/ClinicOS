# #243 — Rendere operativa la sezione Moduli (READY FOR CODEX QA)

## Analisi
- La sezione "Moduli" della SCHEDA PAZIENTE (`PatientDetail.tsx`) è GIÀ operativa: tabs reali
  Medicazioni, Contenzioni, Scala Braden, Scala Tinetti, Scala NRS, Dimissione (componenti
  `MedicazioniTab`, `ContenzioniTab`, `ScalaBradenTab`, … implementati).
- L'unico blocco "in arrivo" era lo **step 4 "Moduli" del wizard di intake**
  (`IntakeWorkspace.tsx:381`: `"Moduli configurabili — in arrivo."`).

## Fix
`IntakeWorkspace.tsx` step 4: sostituito il placeholder con una **griglia dei moduli operativi**
(`intake-modules-grid`) — ogni modulo con titolo, descrizione e **status badge** ("Disponibile").
Testo introduttivo: i moduli sono compilabili dalla sezione Moduli della scheda paziente dopo la
presa in carico. CSS aggiunto in `App.css` (`.intake-modules-grid`, `.intake-module-card`), riuso di
`.status-badge` esistente (nessun rosso come brand).

## Acceptance Criteria
- AC1 (niente blocco generico "in arrivo"): PASS — sostituito da lista operativa.
- AC2 (lista/griglia moduli): PASS — griglia con 6 moduli.
- AC3 (stato moduli non disponibili chiaro, non bloccante): PASS — status badge per-modulo; struttura
  pronta per `available:false` → badge "In arrivo" senza bloccare gli altri.
- AC4 (navigazione): i moduli restano accessibili dalla sezione Moduli della scheda paziente.

## Evidence
- Build: `logs/build.txt` — `tsc -b && vite build` OK.
- Visual: la **preview Vercel della PR** mostra la griglia allo step 4 dell'intake (superficie di
  verifica visiva per Codex). Diff piccolo e presentazionale.
