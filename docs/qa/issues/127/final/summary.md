# Issue #127 — Creazione paziente non funzionante (manuale + import) — RISOLTO

**Iterazione**: 1/4 — PASS (7/7 check E2E)

## Cause radice (due difetti concatenati)

1. **Crash del wizard intake (entrambi i flussi)** — `AnamnesisEditor.tsx:67` dereferenziava
   `value['patologicaProssima']` con `value === undefined`. I draft manuali non hanno mai la
   chiave `data.anamnesi`; quelli da import ce l'hanno solo se l'estrazione produce
   `anamnesisText`. Risultato: `TypeError` non gestito → schermo bianco (nessun error
   boundary) → il paziente non veniva mai creato. Nessuna `POST /patients` veniva eseguita:
   il backend non c'entrava.
2. **Perdita dei dati revisionati (flusso import)** — `DischargeImportModal.handleReviewConfirm`
   riceveva l'anagrafica corretta dall'operatore nella Revisione ma `handleProceedToWorkspace()`
   la scartava: la bozza era seminata solo dalla narrativa del job (`POST /intake/drafts/from-import`
   con `{importJobId}`), quindi lo step Verifica bloccava con «Nome, cognome e data di nascita
   sono obbligatori».

## Fix (minimale, solo frontend)

- `frontend/src/components/operator/sections/AnamnesisEditor.tsx` — l'editor tollera `value`
  assente (`const anamnesi = value ?? {}`), come già fanno gli altri editor del registry
  (`AllergiesEditor`/`DiagnosisEditor`/`TherapyEditor`: `value ?? []`).
- `frontend/src/components/shared/DischargeImportModal.tsx` — dopo `createDraftFromImport`,
  l'anagrafica revisionata viene riportata nella bozza via `patchDraft` (i valori non vuoti
  dell'operatore vincono su quelli seminati; mapping `emergencyContact*` → `referente*`).
  Nessuna logica duplicata: si riusa la stessa API di autosave del wizard.

## Evidenze

- `before.png` — schermo bianco dopo «Crea paziente» (crash, stato pre-fix).
- `after-step3-clinica.png` — step 3 Clinica renderizza (punto esatto del crash pre-fix).
- `after.png` / `after-manual-created.png` — paziente creato dal flusso manuale, visibile in lista.
- `after-import-workspace.png` — workspace intake aperto dall'import senza crash.
- `after-import-created.png` — paziente creato dal flusso import.
- `after-refresh.png` — entrambi i pazienti presenti dopo refresh completo (persistenza).

## Test

- E2E `e2e/issue-127-verify.mjs` (Playwright, committato): 7/7 PASS — copre AC1 (manuale),
  AC2/AC7 (import con dati revisionati), AC6 (lista aggiornata), persistenza post-refresh,
  zero pageerror.
- Gate: `tsc --noEmit` pulito, `vite build` verde. Backend non toccato.
- AC3 (campi obbligatori) e AC5 (doppio submit): comportamento già presente nel wizard
  (pulsante `busy`/'Creazione…' + validazione «nome/cognome/data obbligatori» in Verifica),
  verificato manualmente durante la riproduzione.
