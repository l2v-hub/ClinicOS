# QA Gate — Schemi insulina a fasce glicemiche (tabella, pompa ml/h, dosi multiple, avvisi)

- Worktree: `C:\w-ins`, branch `feat/insulin-glucose-scale-schemes`, uncommitted diff vs origin/main (26 modified files + 2 new test files)
- QA session: independent (did not write the code). Date: 2026-10-12
- Stack used: disposable Postgres 127.0.0.1:54347, DB `ins` (browser) and `insqa` (test suites, created + migrated for this run); backend :3097 (AUTH_MODE=demo, role simulator), vite :5197. Both servers were stopped at the end. No prod, Railway or Vercel resource was touched. Nothing was committed.
- All evidence paths below are relative to this task folder.

## Verdict (Round 1): **FAILED VALIDATION** — superseded by Round 2 below: **READY FOR QA**

All six acceptance criteria pass on the fixtures in the contract. Tests, builds and browser runs are green.

The verdict is FAILED VALIDATION because the diff review found two clinical-safety defects in the new parser, outside the contract fixtures:

- **F1:** a scale written in mixed units gets the wrong unit on some bands.
- **F2:** the route of the primary dose in a multi-dose band is dropped without any notice.

Both rows still import as `da_verificare`, but nothing stops an operator from confirming them. This is the "unit mislabelled / dose silently changed" class that the lead asked QA to look for. Both fixes are small (see Findings).

## Acceptance criteria

| AC                                                                                                                                                                       | Result | Evidence                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 — table text gives ONE `glucose_scale` row with 9 bands, `>350` = 15 U s.c. + 5 U e.v. bolo, no per-band orphan rows                                                 | PASS   | `test-results/qa-parse-probe.json`; API + UI in `test-results/qa-s3-import-review.json` (steps A/API, A/UI); `screenshots/qa-s3a-table-one-row-warning.png`, `screenshots/qa-s3a-table-9-bands-editor.png`; `trace/qa-s3-import-review-trace.zip`; `video/qa-s3-import-review.webm`                                                     |
| AC2 — pump scheme gives one row, `doseUnit: 'ml/h'`, `>350` with extra 6 U bolo                                                                                          | PASS   | Unit test `insulin-scale-schemes.test.ts` "AC2" (`test-results/qa-backend-targeted.txt`); probe `test-results/qa-parse-edge-probe.txt` (case `pump`); the ml/h editor and administration ran in the browser (S1, S2)                                                                                                                    |
| AC3 — Imola scale imported exactly as written, with overlap at 250 and gap 301–349 warnings; `11-120` kept with a suspicious-value warning; no band corrected            | PASS   | `test-results/qa-parse-probe.json` (IMOLA, TABLE_OCR_11); UI `screenshots/qa-s3b-imola-overlap-gap-warnings.png`; DB proof that bands were not corrected before the operator acted (`qa-s3-import-review.json`)                                                                                                                         |
| AC4 — normalize accepts ml/h + extraDoses, rejects overlap with 400, old protocols stay valid; administration records the right unit and the extra doses                 | PASS   | `qa-backend-targeted.txt` (glucose-scale, glucose-administration, glucose-scale-pump-db, insulin-scale-schemes AC4); browser S2: DB `farmacoDose = "6 ml/h + 6 unità (bolo) (glicemia 420 mg/dL)"` and `doseContext {doseUnit:'ml/h', extraDoses:[…]}` (`test-results/qa-s2-somministrazione.json`); API overlap confirm gives 400 (S3) |
| AC5 — editor (Aggiungi terapia + import review): unit choice, N bands, extra doses, overlap/gap warnings; administration shows primary + extra doses with the right unit | PASS   | S1 `screenshots/qa-s1-editor-1280-gap-warning.png`, `qa-s1-editor-overlap-blocked.png`, `qa-s1-after-reload-ml-h-scale.png`; S2 `screenshots/qa-s2-dose-prevista-ml-h-plus-bolo.png`, `qa-s2-uncovered-120-blocked.png`; S3 import review screenshots                                                                                   |
| AC6 — no regression: suites green, backend tsc, frontend build                                                                                                           | PASS   | see "Commands run"                                                                                                                                                                                                                                                                                                                      |

## Browser evidence (Playwright library, real assertions, trace + video)

Every scenario asserts: no console errors and no backend 4xx/5xx in the browser. The intentional API 400 in S3 is sent from node, not from the page.

**S1 — Aggiungi terapia**

- Files: `qa/s1-aggiungi-terapia.mjs` → `test-results/qa-s1-aggiungi-terapia.json`, `trace/qa-s1-aggiungi-terapia-trace.zip`, `video/qa-s1-aggiungi-terapia.webm`
- Actions: Medico 1 → Terapia → Nuova terapia. Free-text drug, then Schema glicemico, then ml/h (pompa). The dose field label switches to "Velocità (ml/h)".
- Bands entered: 140–200 → 2, 250–300 → 3, ≥301 → 4 + extra dose "6 unità (bolo)".
- Gap warning "Glicemia 201–249 mg/dL non coperta dallo schema" is shown.
- Overlap test (190–200): both blocking errors are shown, 0 POST requests, 0 DB rows. No confirmation dialog is offered.
- Fix and save: the DB `doseProtocol` matches exactly.
- After a hard reload, the Piano terapeutico shows `["140–200 mg/dL → 2 ml/h","250–300 mg/dL → 3 ml/h","≥301 mg/dL → 4 ml/h + 6 unità (bolo)"]`.
- Width check: no horizontal page scroll at 1280 or 375 (`qa-s1-editor-375-viewport.png`, `qa-s1-editor-375-full.png`).

**S2 — Somministrazione**

- Files: `qa/s2-somministrazione.mjs` → `test-results/qa-s2-somministrazione.json`, `trace/qa-s2-somministrazione-trace.zip`, `video/qa-s2-somministrazione.webm`
- The therapy is created through the real API (201) as Medico 1.
- Infermiere 1 opens the calendar slot:
  - glucose 120 (uncovered): confirm is disabled;
  - glucose 420: status shows "Dose prevista: 6 ml/h + 6 unità (bolo)".
- On confirm: POST `/therapy-slots/confirm` returns 200 with measuredGlucose 420, and the DB `MedicationAdministration` farmacoDose and doseContext are asserted.

**S3 — Import review**

- Files: `qa/s3-import-review.mjs` → `test-results/qa-s3-import-review.json`, `trace/qa-s3-import-review-trace.zip`, `video/qa-s3-import-review.webm`
- The draft comes from the real deterministic path: ImportJob `review_ready` with a narrative `therapyText`, then `POST /intake/drafts/from-import` (parser), then opened in the intake workspace.
- **A (table):**
  - One row "1. INSULINA", `da verificare`.
  - 9 bands, input values asserted one by one, including the extra dose 5 / unità / EV / bolo.
  - Warning "Glicemia 110 mg/dL non coperta dallo schema" is shown in the amber box (`.glucose-scale-warnings`).
  - No horizontal scroll at 1280 or 375 (`qa-s3a-table-review-375.png`).
- **B (Imola):**
  1. The overlap and gap warnings are shown. The editor shows a blocking error and "Ho verificato questa terapia" stays disabled, with route and time already filled so the overlap is the only blocker.
  2. Draft round-trip while the scale overlaps: after the autosave and a full reload, the editor still shows 200–250/4, 250–300/6, 350–450/8. Nothing is lost. In the DB, the row's `glucoseScale` is `null`, while `reviewedTherapy.glucoseScale` keeps the three bands.
  3. Forged API confirmation (draft row marked `ok` with an overlapping reviewed form): 400 "Terapia 2: Le fasce glicemiche non possono sovrapporsi…", and no patient is created.
  4. The operator fixes band 2 to 251–300. "Ho verificato" becomes enabled and is clicked. LANTUS is left in draft. Anagrafica is filled, then Crea paziente.
  5. DB check: `PatientTherapy` HUMALOG `doseProtocol` = `{blood_glucose, mg/dL, unità, [200–250:4, 251–300:6, 350–450:8]}` (gap 301–349 kept), and no LANTUS therapy.

## Findings

| #   | Severity                     | Where                                                                                                         | Finding / reproduction                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F1  | **Medium (clinical safety)** | `backend/src/intake/parse-discharge-therapy.ts:654-658`                                                       | **Mixed-unit scale gets the wrong unit.**<br>Repro: `qa/parse-edge-probe.ts`, case `mixedUnits`. Text: `150-200 2 U / 201-250 3 ml/h / >250 4 ml/h`.<br>Result: `glucoseDoseUnit: 'ml/h'`, and the band written as "2 U" becomes "2 ml/h". The per-band unit is discarded, so the editor and summary show `150–200 → 2 ml/h`.<br>The row does get `da_verificare` and a generic warning ("Fasce scritte in unità diverse"). But the warning names no band, and confirmation is not blocked: "Ho verificato" plus confirm persists 2 ml/h for a prescription of 2 U.<br>Fix: either block confirmation the way overlaps are blocked until the operator edits, or keep the per-band unit and do not prefill a single scale unit. |
| F2  | **Medium (clinical safety)** | `backend/src/intake/parse-discharge-therapy.ts:204-225` (`multiDoseBand`)                                     | **The primary dose's route is dropped without notice.**<br>Repro: case `noBoloTwoDoses`. Text: `>200 5 U.I e.v. + 15 U.I s.c`.<br>Result: primary = `5 unità` with no route (the "e.v." is lost), extra = `15 unità SC`. Administration would read "5 unità + 15 unità SC", so an IV dose shows with no route on a scale whose therapy route may be SC. No warning is raised.<br>On the contract fixture (`Bolo 5 e.v. + 15 s.c`) the dropped primary route is "s.c", which matches the therapy route, so nothing visible goes wrong there.<br>Fix: keep `route` on the primary dose (or add a warning when the primary dose's route differs from, or is missing in, the therapy route).                                       |
| F3  | Low                          | `backend/src/therapies/glucose-scale.ts:205`, `frontend/src/components/operator/cartella/glucoseScale.ts:274` | **No suspicious-value warning for a band starting at exactly 10.**<br>The value 10 is excluded from the check because it is the floor of an open `< N` band. Case `ocr10`: `10-120 2 U.I` (likely OCR of "110-120") imports as 10–120 → 2 U with no warning, so it would dose insulin at 10–109 mg/dL.<br>Mitigation: the row is `da_verificare` and the original text is visible.<br>Suggestion: only skip the check when the band came from a `<`/`≤` operator (track it in the parser).                                                                                                                                                                                                                                     |
| F4  | Info                         | `frontend/src/components/shared/intake/dischargeTherapy.ts:229-232`                                           | When the edited form overlaps, the draft row's `glucoseScale` is saved as `undefined`. The bands survive in `reviewedTherapy`, which the UI and server both read, so no loss was observed (S3-B round-trip).<br>However, the parser's as-written scale is no longer kept on the draft row once an operator edits it. Only `originalText` remains, and the old `glucoseScaleWarnings` stay on the row.                                                                                                                                                                                                                                                                                                                          |
| F5  | Info                         | parser                                                                                                        | The table header line (`GLUCOSTIX INSULINA`) is left out of the row's `originalText` ("Dal documento"). The full therapy text stays visible in the side panel, so there is no clinical impact.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| F6  | Info (cosmetic)              | editor at 375px                                                                                               | The "Senza limite" placeholder is cut to "Senz" in the narrow A (mg/dL) field. There is no horizontal page scroll.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

## Security / hygiene (Phase 4)

| Check                 | Result                                                                                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secrets               | PASS — none in the diff or fixtures                                                                                                                              |
| PHI                   | PASS — synthetic names only (Qaschema/Qasomm/Qatabella/Qaimola, Sintetico); the Imola and table texts are the anonymised fixtures from the contract              |
| Logging               | PASS — no new `console.*` or logger calls in the diff                                                                                                            |
| Input validation      | PASS — `extraDoses` ≤ 4, amount in 0.5 steps and > 0, unit enum, route/label ≤ 40 chars, doseUnit enum, overlap rejected with 400 (create/PUT and draft confirm) |
| AuthZ                 | PASS — no new routes; existing prescription/administration gating is unchanged (Medico prescribes, Infermiere administers)                                       |
| Injection/XSS         | PASS — Prisma only, no `dangerouslySetInnerHTML`                                                                                                                 |
| Dependencies / Config | PASS — no package, schema, migration, CORS or env change                                                                                                         |
| Design system         | PASS — warnings use the amber `--c-warning` tokens, not brand red; blocking errors reuse the existing error style                                                |

## Commands run

| Command                                                                                                                                                                                                                                                                                                                                                                            | Result                            | Output                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `cd frontend && npx tsc -b --noEmit`                                                                                                                                                                                                                                                                                                                                               | EXIT 0                            | `test-results/qa-frontend-tsc.txt`                                                                      |
| `cd frontend && npm run build`                                                                                                                                                                                                                                                                                                                                                     | EXIT 0 (chunk-size warnings only) | `test-results/qa-frontend-build.txt`                                                                    |
| `cd frontend && npm test`                                                                                                                                                                                                                                                                                                                                                          | 1353 tests, 1353 pass, 0 fail     | `test-results/qa-frontend-test.txt`                                                                     |
| `cd backend && npx tsc --noEmit -p .`                                                                                                                                                                                                                                                                                                                                              | EXIT 0                            | `test-results/qa-backend-tsc.txt`                                                                       |
| backend targeted suites (`NODE_ENV=test AUTH_MODE=demo DATABASE_URL=…/insqa node --import tsx --test --test-concurrency=1` on insulin-scale-schemes, glucose-review-selection, therapy-extraction-scan, therapy-real-letter, parse-discharge-therapy, therapies/glucose-scale, therapies/glucose-administration, routes/glucose-scale-pump-db, routes/therapy-authoritative-write) | 125 tests, 125 pass, 0 fail       | `test-results/qa-backend-targeted.txt`                                                                  |
| Parser probes (contract fixtures + edge cases)                                                                                                                                                                                                                                                                                                                                     | see F1–F3                         | `test-results/qa-parse-probe.json`, `test-results/qa-parse-edge-probe.txt`                              |
| Playwright S1 / S2 / S3                                                                                                                                                                                                                                                                                                                                                            | 8/8, 5/5, 9/9 steps PASS          | `test-results/qa-s1-*.json`, `qa-s2-*.json`, `qa-s3-*.json`; `logs/qa-s2-run.log`, `logs/qa-s3-run.log` |

`test-results/backend-full-serial.txt` was already in the folder before this QA run (the implementer's). It was not produced or re-checked here.

## Notes

- Untracked `C:\w-ins\backend\artifacts\` (assessment PDF snapshots, created 22:26, before this QA session) is not mine. It looks like output from the implementer's full backend suite run and should not be committed with this change.
- The disposable DBs `ins` and `insqa` keep the synthetic QA patients, therapies and administrations from these runs.

---

## Round 2 — re-verification after the fixes for F1–F3

Final verdict after Round 2: **READY FOR QA**

The fixes changed `backend/src/intake/parse-discharge-therapy.ts` and added tests to `insulin-scale-schemes.test.ts` and `glucoseIntake.test.ts`. I reviewed the diff: there are no model or API changes, and the contract fixtures produce the same output as in Round 1.

### Findings re-check
| # | Round 2 result | Evidence |
|---|---|---|
| F1 mixed units | **RESOLVED.** Parser output is `glucoseScale: []`, no `glucoseDoseUnit`, a single warning "Fasce scritte in unità diverse (unità e ml/h): schema non importato, trascrivilo dal documento", and the row is `da_verificare`. In the browser (S4, real import path): the warning is visible, the editor has 0 bands, and "Ho verificato" and "Crea paziente" are both disabled even with route and time filled. Two forged API confirmations were rejected with 400 "Aggiungi almeno una fascia glicemica": one with the row marked `ok` and invented bands, one with an empty scale. No patient was created. After the operator transcribes 3 bands in ml/h, "Ho verificato" becomes enabled, the patient is created, and the DB `doseProtocol` equals the transcription exactly (`{blood_glucose, mg/dL, ml/h, [150–200:2, 201–250:3, ≥251:4]}`). | `qa/s4-mixed-units.mjs`, `test-results/qa-r2-s4-mixed-units.json`, `screenshots/qa-r2-s4-mixed-units-warning-blocked.png`, `qa-r2-s4-mixed-units-empty-editor.png`, `qa-r2-s4-mixed-units-transcribed.png`, `qa-r2-s4-mixed-units-confirmed.png`, `trace/qa-r2-s4-mixed-units-trace.zip`, `video/qa-r2-s4-mixed-units.webm`, `logs/qa-r2-s4-run.log` |
| F2 primary-dose route | **RESOLVED (by warning).** `>200 5 U.I e.v. + 15 U.I s.c` now gives the warning "Fascia da 201 mg/dL: dose principale 5 unità per via EV, verifica la via della terapia", and the row stays `da_verificare`. The contract table fixture (primary s.c., therapy route SC) gets no spurious route warning. Residual: the rule model still has no per-band route field, so after confirmation the EV route exists only in the original text and the operator's own choice (accepted design limit, documented by the coordinator). | `test-results/qa-r2-parse-edge-probe.txt` (case `noBoloTwoDoses`), `test-results/qa-r2-parse-probe.json` |
| F3 written 10 | **RESOLVED.** `10-120` now warns "Valore 10 mg/dL sospetto: confrontalo con il documento". The `<110` floor in the table fixture still gets no such warning (correct). | `test-results/qa-r2-parse-edge-probe.txt` (case `ocr10`), `qa-r2-parse-probe.json` |
| F4, F5 | Info only, unchanged | — |
| F6 | Cosmetic, unchanged (not blocking) | — |

### Regression (Round 2)
- **Browser re-runs, all PASS:**
  - S1 Aggiungi terapia: 8/8 steps
  - S2 Somministrazione: 5/5 steps
  - S3 Import review (table + Imola): 9/9 steps
  - Logs: `logs/qa-r2-s1-aggiungi-terapia.log`, `logs/qa-r2-s2-somministrazione.log`, `logs/qa-r2-s3-import-review.log`
  - The JSON results, traces and videos for S1–S3 were overwritten by the Round 2 runs (same file names as in Round 1).
- **Contract fixtures:** parser output is unchanged.
  - Table: 9 bands, warning "Glicemia 110 mg/dL non coperta dallo schema".
  - Imola: overlap at 250 and gap 301–349.
  - Table with OCR "11-120": suspicious 11, plus the overlap.
  - Source: `test-results/qa-r2-parse-probe.json`.

### Commands (Round 2)
| Command | Result | Output |
|---|---|---|
| frontend `npx tsc -b --noEmit` | EXIT 0 | `test-results/qa-r2-frontend-tsc.txt` |
| frontend `npm run build` | EXIT 0 | `test-results/qa-r2-frontend-build.txt` |
| frontend `npm test` | 1354 tests, 1354 pass, 0 fail | `test-results/qa-r2-frontend-test.txt` |
| backend `npx tsc --noEmit -p .` | EXIT 0 | `test-results/qa-r2-backend-tsc.txt` |
| backend targeted suites (same 9 files, DB `insqa`) | 128 tests, 128 pass, 0 fail | `test-results/qa-r2-backend-targeted.txt` |

### Housekeeping (Round 2)
- I stopped my backend (:3097) and vite (:5197) after checking their command lines.
- Nothing was committed. No production resource was touched.
- **Do not commit with this change:**
  - `git status` shows *tracked* evidence files of other tasks modified in the worktree (`artifacts/task-validation/po-16-giro/backend/*`, `artifacts/task-validation/ux-direct-access-cycle/w3/pdf-unit/*.pdf`).
  - The untracked `backend/artifacts/` from Round 1 is also still there.
  - None of these come from the QA scripts. They appear to be output from the implementer's full backend suite run.
