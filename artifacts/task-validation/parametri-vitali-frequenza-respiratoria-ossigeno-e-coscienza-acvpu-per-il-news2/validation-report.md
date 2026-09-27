# Task Validation Report

## Task

- Title: Parametri vitali: frequenza respiratoria, ossigeno e coscienza ACVPU per il NEWS2
- Slug: parametri-vitali-frequenza-respiratoria-ossigeno-e-coscienza-acvpu-per-il-news2
- Commit: (vedi PR)
- Date: 2026-09-27

## Implementation Summary

- **Backend** (`backend/src/patients/parameter-reading-input.ts`): `PARAMETER_KEYS` più `fr`, `o2`,
  `coscienza`, con queste regole:
  - `fr`: intero 1–80;
  - `o2`: `si` / `no`;
  - `coscienza`: A / C / V / P / U.

  Nessun cambio di schema (`values` è JSON). Il controllo di idempotenza itera già
  `PARAMETER_KEYS`.

- **Frontend `lib/patientParameterReadings.ts`:**
  - nuovi campi in `PARAMETER_FIELDS`;
  - `PARAMETER_OPTIONS`, cioè i menu per O₂ e coscienza;
  - `formatParameterValue` ("Sì"/"No", "V · Risponde alla voce");
  - `parameterValuesError` applica le stesse regole del backend;
  - `legacyParameterEntries` limitato ai campi che la griglia mensile storica ha davvero.
- **Moduli:**
  - `PatientParameterEntry` e `ParameterEntryRow` rendono O₂ e coscienza come menu a scelta;
  - l'intestazione della tabella multipaziente deriva da `PARAMETER_FIELDS`, con la sigla ACVPU
    nella colonna stretta.
- **Storico e tabella mensile:** valori formattati. Trend: aggiunta FR.
- **CSS della tabella multipaziente:**
  - 9 colonne;
  - due livelli compatti per 1180 e 1100 px;
  - `justify-content: start`, così intestazioni e campi coincidono;
  - intestazioni Note e Salva larghe quanto i pulsanti.

## QA round 1 (FAILED VALIDATION) → correzioni

1. **[BLOCCANTE] "Salva" tagliato fra 1181 e circa 1300 px** (1280 compreso): la prova misurava
   solo 1024, 1180 e 1366. **Corretto:** il livello compatto parte da 1320 px (1100 per il
   secondo livello). Nuovo controllo W su 11 larghezze (1024–1920): tabella intera, Salva
   visibile, colonne allineate.
2. Invio salva anche dai menu O₂ e ACVPU della riga.
3. FR usa il tastierino solo numerico (`inputMode="numeric"`).
4. Il menu ACVPU della riga mostra al passaggio il significato della lettera scelta (`title`).
5. `patientRosterGuard.test.ts`: le asserzioni sulle etichette scritte a mano nell'intestazione ora
   verificano che l'intestazione derivi da `PARAMETER_FIELDS`. Il test era già rosso su main per
   altre asserzioni; non peggiora.

## Files Changed

- backend/src/patients/parameter-reading-input.ts, backend/src/patients/**tests**/parameter-reading-input.test.ts
- frontend/src/lib/patientParameterReadings.ts, frontend/src/lib/**tests**/patientParameterReadings.test.ts
- frontend/src/lib/patientParameterTrends.ts
- frontend/src/components/operator/PatientParameterEntry.tsx, ParameterEntryRow.tsx, MultiPatientParametri.tsx, PatientParameterHistory.tsx, PatientParameterMonthTable.tsx
- frontend/src/App.css

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                                      |
| --- | -----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | backend test "accepts the NEWS2 parameters and rejects values outside their rules" (in unit-full-backend.txt; 6/6 nel file)                                                                                                                   |
| AC2 |   PASS | frontend test "NEWS2 parameters follow the same rules as the backend" (unit-full-frontend.txt)                                                                                                                                                |
| AC3 |   PASS | logs/playwright-evidence.txt S (modulo singolo, payload `{pa, fr:'22', o2:'si', coscienza:'V'}`, FR 90 bloccato) e M (tabella multipaziente con menu, allineata, senza scorrimento a 1024 px)                                                 |
| AC4 |   PASS | S: lo storico mostra "FR 22", "Sì", "V · Risponde alla voce"                                                                                                                                                                                  |
| AC5 |   PASS | build-frontend.txt exit 0. Frontend 809/818, stessi 9 fallimenti della baseline. Backend 597/699 contro 596/698 su origin/main: i 101 fallimenti sono identici per nome (test che richiedono Postgres), vedi baseline-origin-main-backend.txt |

## Test Results

| Test             | Result | Evidence                                                                       |
| ---------------- | -----: | ------------------------------------------------------------------------------ |
| Unit             |   PASS | frontend e backend come sopra                                                  |
| Integration      |     NA | nessun Postgres locale                                                         |
| API              |   PASS | `parseParameterReading` è la validazione del corpo di POST /parameter-readings |
| Playwright       |   PASS | evidence.mjs 20/20 (compresi gli 11 controlli di larghezza) (rilevazioni simulate con page.route)                         |
| Persistence      |     NA | nessun DB locale; `values` è JSON, nessun cambio di forma                      |
| Agnos AI         |     NA |                                                                                |
| Voice            |     NA | il vocale scrive `parametriVitali`, un modello diverso                         |
| OCR              |     NA |                                                                                |
| Security/privacy |     NA | dati sintetici                                                                 |

## Runtime Evidence

- screenshots/S1-modulo-compilato.png, S2-storico.png, M-multipaziente-1024.png

## Logs

Only sanitized logs are allowed. Solo esiti e nomi dei campi.

## Residual Risks

- Deploy backend automatico al merge (Railway). La modifica è additiva: i client esistenti
  continuano a funzionare.
- La tabella multipaziente sul tablet è compatta: colonne da 50 px, altezza dei controlli invariata.
- Le soglie NEWS2 arrivano nel ciclo 6b e vanno validate dal direttore sanitario.

## QA

QA indipendente: FAILED VALIDATION al round 1 (Salva tagliato a 1181–1300 px), READY FOR QA al
round 2. Il QA ha rieseguito da sé tutte le verifiche:
- larghezze 1024–1920 px, a pagina appena caricata e dopo un salvataggio;
- Invio sui menu, cancellazione di una scelta;
- telefono a 390 px.

## Final Decision

CLOSED — VERIFIED
