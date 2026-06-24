# REQ-093 / BUG-055 — Acceptance Matrix

Issue: #93 — "La terapia farmacologica non viene impostata all'ingresso" + redesign directive
(graphical fractional dosing, exact fractions, additive migration).

## Extended directive — 6 required test scenarios

| # | Scenario | Method | Verified |
|---|----------|--------|----------|
| 1 | Kanrenol 100 mg at 08:00 as 1/2 tablet | Real API POST + UI | ✅ stored `quantityNumerator:1 / quantityDenominator:2`, fascia=mattina |
| 2 | Kanrenol 100 mg at 18:00 as 1/4 tablet | Real API POST + UI | ✅ stored `1/4`, fascia=sera |
| 3 | Exact persistence after refresh | GET round-trip | ✅ 08:00→1/2, 18:00→1/4 returned unchanged (exact fractions, not decimals) |
| 4 | Correct generation of two administration events | GET /therapy-slots | ✅ mattina 08:00 → "1/2 compressa — 50 mg", sera 18:00 → "1/4 compressa — 25 mg" |
| 5 | Editing one quantity without changing the other | PUT + GET | ✅ 18:00 edited to 1/3 (≈33.33 mg), 08:00 stayed 1/2 (50 mg) |
| 6 | Correct display in therapy, administration and print views | UI screenshots + InvioPS | ✅ therapy list, daily administration, InvioPS print all show fraction + mg |

## Design constraints from the directive

| Constraint | Status |
|-----------|--------|
| Model PatientTherapy (drug ref, commercial strength, pharmaceutical form, route) | ✅ additive columns |
| Model TherapySchedule (therapyId, time, quantityNumerator, quantityDenominator, administrationUnit) | ✅ new table |
| Preserve exact fractions, do NOT store 1/3 as approximated decimal | ✅ Int/Int stored; mg only derived for display |
| Quick options 1, 3/4, 1/2, 1/3, 1/4, Other | ✅ fraction chips + custom parser |
| Units: ml, drops (gocce), units (unità), sachets (bustina), … | ✅ ADMIN_UNITS |
| Allowed fractions configurable; tablet not assumed divisible | ✅ `allowedFractions` defaults to "1" (whole); operator enables fractions |
| No duplicate therapy rows for multiple times/quantities | ✅ one PatientTherapy + N TherapySchedule; dedupe by (time, unit) |
| Additive Prisma migration | ✅ 20260624090000_req093_therapy_schedules — ADD COLUMN + CREATE TABLE only |

## Original acceptance criteria

| Criterion | Status |
|-----------|--------|
| Farmaco/dose/via/frequenza/orari conservati | ✅ richer model, exact fractions |
| Persistente nella Scheda Paziente | ✅ round-trip verified |
| Visibile nel riepilogo | ✅ therapy list + administration views |
| Nessun duplicato | ✅ single therapy row per drug |
| Terapia aggiungibile all'ingresso | PARTIAL: fully addable/persistent in Scheda Paziente; pre-entry from the New-Patient admission modal remains a documented follow-up |

## Verification environment

- Migration applied to LOCAL Podman Postgres (additive, authorized). No production writes.
- Backend + frontend run locally; real API round-trips; Playwright screenshots (1366×768 desktop, 1024×768 tablet).
- `npm run build` passes (frontend + backend). New unit tests 5/5 pass.
- Pre-existing unrelated failure: voice `idempotent replay` test (in-memory, untouched by this change).
