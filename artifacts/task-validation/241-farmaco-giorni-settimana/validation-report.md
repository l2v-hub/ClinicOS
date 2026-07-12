# Validation report — Issue #241 (Posologia per giorni specifici della settimana)

**Final Decision: READY FOR CODEX QA**

Ambiente: stack locale reale (Postgres Podman + backend :3001 + frontend :5173). **Migration applicata**: `ALTER TABLE "PatientTherapy" ADD COLUMN "giorniSettimana" TEXT` (nullable, additiva, backward-compatible) — verificata in `information_schema`; Prisma client rigenerato; backend riavviato. Codice PR #250 (file terapia) sovrapposto al tree in esecuzione. Paziente sintetico Moretti, Elena. Data: 2026-07-09.

## Esito acceptance criteria (Playwright UI reale — 10/10 PASS)

| AC | Esito | Evidenza |
|----|-------|----------|
| AC1 — selezione giorni (Lun–Dom) | ✅ toggle `therapy-weekdays` visibile per terapia periodica · `screenshots/weekdays-selected.png` |
| AC2 — giorno singolo/multipli salvati e mostrati | ✅ pill riepilogo `therapy-days-summary` = "Lun Mar Gio Dom" · `screenshots/after-save-days-pill.png` |
| AC3 — multipli (Lun/Mar/Gio/Dom) | ✅ ciascun `weekday-{1,2,4,7}` con `aria-pressed=true`; hint "Solo: Lun, Mar, Gio, Dom" |
| AC4 — persistenza dopo reload | ✅ dopo `reload()` + riapertura scheda, pill ancora "Lun Mar Gio Dom" · `screenshots/after-refresh-days-pill.png` |
| AC5 — backward-compat (terapie senza giorni) | ✅ colonna nullable, NULL = tutti i giorni; API pazienti/terapie risponde |
| Salvataggio | ✅ POST therapy → **201**; `giorniSettimana` persistita come CSV ISO (1,2,4,7) |
| Regressione | ✅ nessun NUOVO console error (4 warning React dev preesistenti filtrati) |

## Percorso verificato
Operatore → Pazienti → Moretti, Elena → Clinica → Terapia Farmacologica → "+ Aggiungi" → terapia **periodica** (orario 08:00 default) → toggle Lun/Mar/Gio/Dom → "Salva terapia" (POST 201) → pill "Lun Mar Gio Dom" → reload → pill persiste.

## Note
- Migration additiva/nullable: le terapie preesistenti (senza giorni) restano valide (AC5).
- Il diario `/therapy-slots` filtra i farmaci sui giorni ISO (1=Lun…7=Dom): coperto dal test backend `giorni-settimana.test.ts` del PR.
- Dato di test **sintetico** (nessun PHI).

## Artefatti
`screenshots/` (before, weekdays-selected, after-save-days-pill, after-refresh-days-pill) · `trace/trace.zip` · `video/*.webm` · `logs/console-errors.log` · `ui-report.json` · test `e2e/issue-241-giorni-settimana.mjs`.

Claude non chiude, non mergia, non deploya. Codex resta l'unico QA Gatekeeper.

## Codex final gate — 2026-07-12

Final Decision: CLOSED — VERIFIED

| Check | Result | Evidence |
|---|---:|---|
| Acceptance criteria | PASS | Weekday selection, API normalization and filtering verified |
| Code review | PASS | PR #250 integrated through verified PR #257 |
| Tests | PASS | Gate #256; targeted weekday tests 3/3 |
| Playwright | PASS | Integrated scenario #241 PASS |
| Runtime validation | PASS | Combined stack validation #256 |
| Persistence | PASS | 0→19 and 18→19 migration proofs; historical row preserved with NULL |
| Privacy/security | PASS | Synthetic data only; no sensitive logs |
| Evidence complete | PASS | Issue artifact plus integrated #256 bundle |
| Final decision | CLOSED — VERIFIED | Integrated release candidate verified |
