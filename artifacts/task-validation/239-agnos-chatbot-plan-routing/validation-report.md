# Validation report — Issue #239

**Final Decision: READY FOR CODEX QA**

Ambiente: stack locale reale — Postgres (Podman `clinicos-postgres`) + backend `:3001` (DB seeded, 15 pazienti sintetici) + frontend `:5173`. Data: 2026-07-09.
Questo è l'ambiente con DB attivo che mancava a Codex in locale (`ECONNREFUSED`).

## Esito acceptance criteria

| AC | Esito | Evidenza |
|----|-------|----------|
| 1. Chat text → `POST /ai/actions/plan` | ✅ | Playwright intercetta la request; `reqText == "quante camere sono occupate oggi"` — `screenshots/agnos-rooms-occupancy.png`, `trace/trace.zip` |
| 2. Read non-write non più `unknown` | ✅ | `logs/no-unknown-fallback-proof.log`: tutte le read → `actionType=read` |
| 3. `quante camere sono occupate oggi` → aggregato sourced | ✅ | UI: "Occupazione camere · 1/4 letti occupati; 3 camere censite · Fonte: ROOM_OCCUPANCY"; `results[0].occupiedBeds=1` (numerico), `notFound=false` |
| 4. Letture con paziente in contesto | ✅ | `che terapie assume il paziente` (plurale) → `intent=therapies`, `scope=current_patient` (fix stem `terapi`) |
| 5. `rooms_occupancy` senza PHI | ✅ | `logs/no-phi-room-occupancy-proof.log`: nessun nome/cognome/patient nell'aggregato |
| 6. Scritture protette invariate | ✅ | `actions.test.ts` 33/33 (incl. T027 isolamento delete, refuse write) |
| 7. Build + test + evidenza Playwright reale | ✅ | plan 16/16, actions 33/33, backend build exit 0, `ui-report.json` 15/15 |
| 8. Nessun secret/PHI nei log | ✅ | log sanificati: solo prompt sintetici + conteggi aggregati; `console-errors.log` vuoto |

## Test eseguiti (output in `logs/test-output.txt`)

- `assistant-plan.test.ts` — **16/16 PASS** (include regressione plurale "terapie").
- `actions.test.ts` — **33/33 PASS**.
- `npm --prefix backend run build` — **PASS (exit 0)**.
- `e2e/issue-239-plan-routing.mjs` — **15/15 PASS** (UI reale, trace + video).

## Nota di trasparenza

Nello scenario 2 la risposta `therapies` risulta `notFound=true` **perché il paziente sintetico Moretti, Elena non ha terapie a DB** — l'instradamento dell'intent è corretto (`therapies`, non più `patient_search`); il risultato vuoto riflette il dato reale, non un errore di routing. L'AC dello scenario 2 (intent `therapies`) è soddisfatto.

## Fix aggiuntivo rispetto alla patch base Codex

La patch base Codex non copriva il **plurale "terapie"**: `assistant/plan.ts` classificava con `/terapia|farmac/` (singolare) → "che terapie assume il paziente" cadeva su `patient_search`. Fix minimo e sicuro: stem `terapia`→`terapi` (dopo il guard `CLINICAL_REFUSAL`, quindi "che terapia dovrei prendere" resta rifiutato). Coperto da regressione dedicata.

## Artefatti

```
task-contract.md
validation-report.md
logs/backend-actions-plan-direct.log
logs/backend-to-assistant-routing.log
logs/no-unknown-fallback-proof.log
logs/no-phi-room-occupancy-proof.log
logs/console-errors.log
logs/test-output.txt
screenshots/{before-agnos-open,agnos-rooms-occupancy,agnos-patient-therapies,agnos-info-paziente,after-refresh-rooms}.png
trace/trace.zip
video/*.webm
ui-report.json
```

Claude non chiude, non mergia, non deploya. Codex resta l'unico QA Gatekeeper.
