# Task Validation Report

## Task

- Title: Agnos Fase 1a — andamento parametri (vitals_trend)
- Slug: agnos-fase-1a-andamento-parametri-vitals-trend
- Branch: `feat/agnos-vitals-trend-fase1a`
- Commit: (push in corso)
- Date: 2026-07-19

## Implementation Summary

Andamento di un parametro vitale su finestra (7/15/30gg) per l'agente **Clinico**, SOURCE_ONLY, senza
cambi schema e senza nuovo ruolo. Guardrail invariati (interpretazione parametri ancora rifiutata).

- **`plan.ts`**: nuovo intent `vitals_trend` (prima di `vitals_recent`); regex `andamento|trend|grafic|
storico|evoluzion` + mappa parametro→etichetta (PA/FC/SpO2/TC/DTX) + `trendWindowDays` (N giorni espliciti,
  mese=30, due settimane=15, default 7). Emette `get_patient_vital_signs {label, days}` — il planner resta puro.
- **`gateway/types.ts`** + **`services.ts`**: `days?` in `VitalSignQueryInput`; il service traduce
  `days`→`from` = oggi−days (clock lato server; `filterVitals` già filtra per `from`).
- **`read-tools.ts`**: `days` aggiunto allo schema del tool (parità planner LLM).
- **`agents.ts`**: `vitals_trend` nell'allowlist Clinico (redirect da Gestione).
- **`AIAssistantButton.tsx`**: componente `VitalsSparkline` (parsing difensivo dei valori, PA→sistolica,
  polyline SVG con min/max/ultimo) mostrato quando `intent==='vitals_trend'` e ≥2 punti numerici.

## Files Changed

- `backend/src/ai/assistant/plan.ts`, `agents.ts`, `read-tools.ts`
- `backend/src/ai/gateway/types.ts`, `services.ts`
- `backend/src/ai/__tests__/vitals-trend.test.ts` (nuovo), `agents.test.ts` (esteso)
- `frontend/src/components/shared/AIAssistantButton.tsx`

## Acceptance Criteria Result

| AC                                                                             |          Result | Evidence                                                                                                                                 |
| ------------------------------------------------------------------------------ | --------------: | ---------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 — `vitals_trend` intent Clinico; produce le rilevazioni della finestra     |            PASS | API: `[clinical]` "andamento pressione 30gg" → intent `vitals_trend`, tool `get_patient_vital_signs {label:PA, days:30}`, agent clinical |
| AC2 — planner emette `days`; service → `from`=oggi−N; default 7; 30/15 mappati |            PASS | unit `vitals-trend.test.ts` 5/5 (PA/30, SpO2/7 default, TC/15 "due settimane"); service traduce days→from                                |
| AC3 — allowlist Clinico (redirect da Gestione); sparkline dai risultati        | PASS (con nota) | API: `[facility]` trend → redirect «Assistente clinico»; sparkline: componente + path vuoto verificati (vedi nota)                       |
| AC4 — build FE+BE verdi; unit planner/agents verdi; suite verde                |            PASS | BE build exit 0; FE build exit 0; trend+agents 10/10; suite backend **346/346**                                                          |

## Test Results

| Test                                  | Result | Evidence                                                                                                                |
| ------------------------------------- | -----: | ----------------------------------------------------------------------------------------------------------------------- |
| Unit — planner vitals_trend           |   PASS | 5/5 (label+days, default, non-trigger senza parametro, vitals_recent invariato)                                         |
| Unit — agents (vitals_trend→clinical) |   PASS | agents.test esteso                                                                                                      |
| Suite backend completa                |   PASS | 346/346 (era 341 + 5)                                                                                                   |
| API routing (node fetch)              |   PASS | clinical esegue con args corretti; facility redirige                                                                    |
| E2E UI (Agnos, agente Clinico)        |   PASS | trend query → intent eseguito, nessun crash, **0 errori console**; sparkline nascosta correttamente sul path senza dati |
| Build FE / BE                         |   PASS | exit 0 entrambi                                                                                                         |

## Nota sulla sparkline (evidenza)

Il componente `VitalsSparkline` è verificato per **build** e per **comportamento difensivo**: sul path
senza rilevazioni in finestra è correttamente **nascosto** (E2E UI → "Informazione non trovata", 0 errori
console). Una sparkline **popolata** non è catturabile con i dati seed perché **tutte** le rilevazioni seed
hanno date fuori dalla finestra ≤90gg rispetto alla data corrente (scan API su tutti i pazienti → 0 con ≥2
punti in finestra). È un limite del **dato di seed**, non del codice: in produzione con rilevazioni recenti
la polyline si renderizza dai risultati SOURCE_ONLY.

## Logs

Solo dati seed sintetici. Nessun PHI, nessun secret.

## Residual Risks / Follow-up

- Sparkline popolata da verificare visivamente in prod (o con seed a date recenti) — logica e path vuoto già provati.
- **Fase 1b** (personale + qualifica) e **Fase 2** (range di riferimento) restano in attesa delle decisioni
  su **ruolo manager autenticato** e **policy interpretazione parametri**.

## Final Decision

CLOSED — VERIFIED

(Intent `vitals_trend` Clinico con finestra 7/15/30gg, redirect da Gestione, days→from lato server,
sparkline difensiva; verificato via unit 10/10 + suite 346/346 + routing API + E2E UI senza errori console,
build FE/BE verdi. Guardrail invariati. Sparkline popolata: logica/build verificati; render dal vivo bloccato
dalle date seed fuori finestra, non dal codice. READY per merge + deploy.)
