# QA Report (independent session): estrazione terapia da documenti

- Slug: `estrazione-terapia-da-documenti-tutti-i-farmaci-schemi-insulina-a-scale-glicemic`
- Scope: uncommitted diff in worktree `C:/w-tx` (branch `feat/therapy-extraction-scan`, HEAD = origin/main `30f0b14d6`)
- Date: 2026-10-11. QA did not write the change. No application code was edited, nothing was committed, pushed or deployed, and no prod or Railway database was touched.
- Data: synthetic only, on the local throwaway Postgres `txe2e` / `txtest` (127.0.0.1:54331).

## Verdict history

| Round | Date | Verdict | Reason |
|---|---|---|---|
| 1 | 2026-10-11 | FAILED VALIDATION | F1 HIGH (scale merged into a non-insulin row and marked `ok`); AC2 partial (drug name "DURANTE") |
| 2 | 2026-10-11 | **READY FOR QA** | F1–F5 fixed and verified on a fresh DB; the remaining findings are MEDIUM/LOW and none of them can create a prescription without an explicit operator check |

## Round 2: re-certification after the fixes for F1–F5

### Final verdict (round 2): **READY FOR QA**

The diff now also touches `DischargeTherapyReview.tsx`. `task-contract.md` was updated: AC3/AC4 now reference `doseMode`/`doseProtocol` with no migration, and units ≥0.

Environment:
- Fresh databases `txe2e2` (browser) and `txqa2` (tests), both created from template0 with UTF8 and migrated with `prisma migrate deploy`.
- Same real stack as round 1. The only stub is `GET /ai/extraction/status`.

### Tests (QA, round 2)

| Suite | Result | Output |
|---|---|---|
| Backend: `intake/__tests__/*`, `ai/__tests__/intake-confirm,intake-draft`, `ai/upload/pages/__tests__/*`, `routes/__tests__/patient-therapy-route-regime,therapy-authoritative-write`, `therapies/__tests__/*`, `tools/__tests__/intake` on fresh `txqa2` | **614/614 pass** | `test-results/r2-backend-qa-tests.txt` |
| Backend `tsc --noEmit` | exit 0 | `test-results/r2-backend-tsc.txt` |
| Frontend full `npm test` | 1281/1299; the 18 failures are identical by name to the origin/main baseline | `test-results/r2-frontend-full-suite.txt`, `r2-frontend-full-failures.txt` |
| Frontend `npm run build` | exit 0 | `test-results/r2-frontend-build.txt` |
| Browser E2E (fresh `txe2e2`) | 34/35. The one failure is the calendar-view check; the scale isn't shown there by design, and the reload check below covers it | `test-results/r2-qa-browser-run.txt`, `r2-qa-browser-results.json` |
| Browser after full reload (new context) | 4/4 | `test-results/r2-qa-after-reload-run.txt` |
| Legacy (no-manifest) job, real `POST /intake/drafts/from-import` | 201; same 6 rows; FUROSEMIDE has `outsideTherapySection:true` and no provenance in `note` | `logs/r2-legacy-from-import-summary.txt` |
| Parser probes (round-1 reproductions plus new cases) | see below | `logs/qa-probe-r2.mts` → `logs/qa-probe-r2-output.txt` |

Traces: `trace/r2-qa-therapy-extraction-trace.zip`, `trace/r2-qa-after-reload-trace.zip`. Screenshots: `screenshots/r2/`.

### Acceptance criteria (round 2)

| AC | Verdict | Evidence |
|---|---|---|
| AC1 | PASS | 6 rows. ATORVASTATINA and PANTOPRAZOLO come after the prose paragraph and `--- Pagina 2/2 ---` and are `ok`. See `screenshots/r2/03-…`, `04-…`. |
| AC2 | PASS | The outside-section row is **FUROSEMIDE**, `da_verificare`, with the alert "Trovata fuori dalla sezione terapia: verifica nel documento…" (`data-testid=discharge-outside-section`) and the source sentence. See `screenshots/r2/05b-outside-section-alert.png` and `05-…`. QA left it in draft, and it was not prescribed. |
| AC3 | PASS | HUMALOG is in glucose-scale mode with the editor at 10–149:0, 150–200:2, 201–250:4, ≥251:6 (`screenshots/r2/06-…`). The merged row is now `da_verificare`. QA verified it with «Ho verificato questa terapia» after checking the bands and times against the document (`06b-…`). |
| AC4 | PASS | DB: `doseMode='glucose_scale'`, `doseProtocol.rules` equal the document (`logs/r2-db-patient-therapies.json`). After reload the Piano terapeutico shows the 4 bands (`screenshots/r2/13-after-reload-humalog-detail.png`, `logs/r2-after-reload-piano-terapeutico.txt`). |
| AC5 | PASS | Data inizio is 2026-10-11 on every row (backend and UI). Data presa in carico 2026-10-11 and Ora 11:30 are prefilled without focusing the field (`screenshots/r2/07-…`, `08-…`). |
| AC6 | PASS | See the Tests table. |

### Status of the round-1 findings

| ID | Status | Verification |
|---|---|---|
| F1 HIGH | **FIXED** | METFORMINA followed by scale lines stays `fixed`/`ok`. The scale lines become nameless `da_verificare` rows (probes P1, P2). A merge happens only into a row that announces a schema, and a merged row is always `da_verificare` (P7, browser). If a non-insulin row mentions "glicemia" it can still take the scale (P2b), but it comes out `da_verificare`, so the operator must review it. That is acceptable. |
| F2 MEDIUM | **FIXED for the reported cases**, with a residual (R1) | DURANTE → FUROSEMIDE, CASO → PARACETAMOLO. EVITARE, PREGRESSA and the lab/vital lines (diuresi, glicemia, Hb, proteinuria) no longer produce rows (probe O1). |
| F3 LOW | FIXED | The provenance text is no longer in `note`; the UI alert is driven by the flag (browser check, legacy API). |
| F4 MEDIUM | FIXED | `--- Pagina 2/2 ---` produces no phantom row. A bracketed line that contains a dose is kept as a `da_verificare` row (probe PM). |
| F5 LOW | FIXED | "CLEXANE 4000 UI 10-15 gg" gives no scale and keeps the 4000 UI dose. "se aPTT 50-70: 2 UI" gives no glucose scale (probes P3, P4). |

### New or residual findings (round 2): none blocking

**R1 (MEDIUM, `da_verificare` only).** `prescriptionInSentence` takes the word right before the dose as the drug name. So:
- A dosage form between name and dose becomes the name: "Lansoprazolo cps 30 mg" → **CPS**; "Furosemide fl 20 mg" → **FL**.
- Compound names are cut to their first word: "Insulina Lantus 14 UI" → INSULINA; "Acido acetilsalicilico 100 mg" → ACIDO. That truncation is pre-existing behaviour of `parseTherapyLine`.
- Non-drug prose still produces rows: "Infusione di fisiologica 500 ml x 2 al giorno" → FISIOLOGICA; "TC con mezzo di contrasto 100 ml la sera" → CONTRASTO.

All of these are outside-section rows: always `da_verificare`, with the alert and the full source sentence on screen. A wrong name also weakens the dedup by drug name. Suggested fix: skip the form abbreviations (cpr|cps|cp|fl|bust|gtt…) when walking back to the name.

**R2 (LOW-MEDIUM).** The units-first lookahead `(?:se|glicemi|tra|fra|da)\b` never matches "glicemia", because `\b` fails between "glicemi" and "a". "NOVORAPID ore 08:00 4 U glicemia 200-250, 6 U se glicemia 251-300" yields only [251–300:6]. The unparsed band stays in `note`, the row is `da_verificare`, and a glucose value outside the scale blocks administration, so this fails safe. Origin/main didn't parse that form either. Fix: `glicemi\w*`.

**R3 (INFO).** On a single 20,000-digit line the parser takes ~2.0 s, against ~1.1 s on origin/main. It's still quadratic only on unrealistic input.

**R4 (INFO).** `start-claude-team.ps1` is still modified in the worktree. It's unrelated to this task and must not ship with it.

The round-1 F6–F8 notes still apply unchanged.

---

## Round 1 (historical record, superseded by round 2)

### Final verdict (round 1): **FAILED VALIDATION**

The browser evidence confirms the happy path end to end: every drug is present, the outside-section row is `da_verificare`, the insulin row uses the document's scale and persists as `glucose_scale`, and the dates are prefilled.

The review found one HIGH clinical-safety defect, and AC2 is only partly met on realistic prose. Both have concrete reproductions (see Findings).

## Acceptance criteria

| AC                                                                                      | Verdict                                            | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1: drugs across paragraphs/pages each produce a row                                   | PASS (with a pre-existing caveat, F4)              | Real UI shows 6 rows. ATORVASTATINA and PANTOPRAZOLO come after a prose paragraph and the page break and are `ok`. See `screenshots/03-therapy-review-all-rows.png`, `04-page2-row-*.png`, `logs/ui-therapy-rows.json`, `logs/from-import-terapiaImport.json`. Unit tests in `therapy-extraction-scan.test.ts` pass.                                                                                                                                                            |
| AC2: prescription outside the therapy section becomes a `da_verificare` row with a note | **PARTIAL**                                        | The row is created as `da_verificare` with note "Trovata fuori dalla sezione terapia" and the source sentence (`screenshots/05-…png`, `test-results/qa-browser-run5.txt`). But **farmacoNome = "DURANTE" instead of FUROSEMIDE** for the realistic sentence "Durante la degenza si è iniziata terapia con Furosemide 25 mg 1 cpr al mattino." The probe also shows narrative and lab prose becoming rows (F2).                                                                  |
| AC3: glucose scale structured with the document's values, no fixed values               | PASS for the insulin case; **FAIL on safety** (F1) | `glucoseScale` = [10–149:0, 150–200:2, 201–250:4, ≥251:6]. UI shows the "Schema glicemico" toggle pressed and the editor holds the document ranges (`screenshots/06-insulin-humalog-glucose-scale.png`). But a scale line merges into **any** preceding row, including non-insulin rows, and can come out `ok` (F1).                                                                                                                                                            |
| AC4: scale reaches PatientTherapy, is validated, visible/editable                       | PASS (with contract deviation, see Residual risks) | DB: HUMALOG `doseMode='glucose_scale'`, `doseProtocol.rules` equal the document ranges (`logs/db-patient-therapies.json`). After a full reload in a new browser context the Piano terapeutico shows "10–149 → 0, 150–200 → 2, 201–250 → 4, 251–oltre → 6" (`screenshots/13-after-reload-humalog-detail.png`, `logs/after-reload-piano-terapeutico.txt`, `test-results/qa-after-reload-results.json`). Validation is the existing `normalizeGlucoseScaleProtocol` (tests green). |
| AC5: `dataInizio` = local processing day; Data presa in carico prefilled; both editable | PASS                                               | Backend seeded `dataInizio=2026-10-11` (Europe/Rome) on all 6 rows. UI date inputs = 2026-10-11 (`screenshots/07-…png`). Data presa in carico 2026-10-11 and Ora 11:00 were prefilled without focusing the field (`screenshots/08-…png`). Persisted PatientTherapy.dataInizio = 2026-10-11.                                                                                                                                                                                     |
| AC6: no regressions                                                                     | PASS                                               | Backend: 236/236. Backend `tsc --noEmit`: exit 0. Frontend targeted: 262/262. Frontend full suite: 1281/1299, with the 18 failures identical by name to the origin/main baseline (`test-results/frontend-full-failures.txt` == `frontend-baseline-failures.txt`). `npm run build`: exit 0.                                                                                                                                                                                      |

## Browser E2E (real stack)

The stack was real Vite on 5199, the real backend on 3099 (AUTH_MODE=demo, role simulator "Medico 1" = SIM-DOCTOR-1) and real Postgres `txe2e`.

**Only stub:** `GET /ai/extraction/status` was stubbed to `available:true`. The AI runtime isn't configured locally, and the job is already `review_ready`.

**Seeded job** (`logs/qa-seed-jobs.mts`):

- It is a page-session ImportJob (manifest v1) with a synthetic 2-page PDF, built with the repo's own `buildGroupResult` / `assembleResult`.
- The therapy section is split by a prose paragraph and a page break. The pipeline normalized the page break to `--- Pagina 2/2 ---`.
- It contains an insulin prescription followed by a 4-line glucose scale.
- `hospitalCourseText` contains a Furosemide prescription.

**Flow, all by clicks** (`logs/qa-browser-evidence.mjs`):

1. Pazienti → Nuovo ingresso → Da lettera.
2. The real review step opens, and the OCR text is shown.
3. "Crea paziente" fires the real `POST /intake/drafts/from-import` (201).
4. The intake workspace opens.
5. The outside row is deferred with «Lascia in bozza». QA did not accept it.
6. Motivo is filled and «Conferma la terapia» clicked.
7. Crea paziente → the patient is created, with the DB proof above.

**Result:** 29/32 checks pass (`test-results/qa-browser-run5.txt`):

- The failure "outside-section row farmacoNome" is finding F2.
- The other two failures were a selector issue in the same-session reload check. They were re-done in `logs/qa-browser-after-reload.mjs`, and 4/4 pass.

**Traces:** `trace/qa-therapy-extraction-trace.zip` and `trace/qa-after-reload-trace.zip`.

**Legacy path** (job without manifest): the real `POST /intake/drafts/from-import` returned 201. It gives the same 6 rows, the same scale, dataInizio 2026-10-11, and the DURANTE row flagged `outsideTherapySection:true` (`logs/legacy-from-import-summary.txt`).

## Tests run (QA, independently)

| Suite                                                                                                                                                                                                                                                                   | Result                                                                 | Output                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Backend: `src/intake/__tests__/*` + `ai/__tests__/intake-confirm,intake-draft` + `ai/upload/pages/__tests__/*` + `routes/__tests__/patient-therapy-route-regime,therapy-authoritative-write` + `therapies/__tests__/glucose-*` + `tools/__tests__/intake` (DB `txtest`) | 236 pass / 0 fail                                                      | `test-results/backend-qa-tests.txt`                               |
| Backend `npx tsc --noEmit`                                                                                                                                                                                                                                              | exit 0                                                                 | `test-results/backend-tsc.txt`                                    |
| Frontend: intake `__tests__/*`, `cartella/__tests__/*`, `appointmentRange`, `importLandsOnPatient`                                                                                                                                                                      | 262 pass / 0 fail                                                      | `test-results/frontend-qa-tests.txt`                              |
| Frontend full `npm test`                                                                                                                                                                                                                                                | 1281 pass / 18 fail; same 18 names as origin/main baseline `C:/w-base` | `test-results/frontend-full-suite.txt`, `frontend-*-failures.txt` |
| Frontend `npm run build`                                                                                                                                                                                                                                                | exit 0                                                                 | `test-results/frontend-build.txt`                                 |
| Browser E2E                                                                                                                                                                                                                                                             | 29/32 + after-reload 4/4                                               | `test-results/qa-browser-run5.txt`, `qa-after-reload-run.txt`     |

## Review findings

### F1: HIGH (clinical safety). A glucose scale is merged into whatever row precedes it, with no insulin check, and the row can end up `ok`

**Where:** `backend/src/intake/parse-discharge-therapy.ts:572`. The condition is `previousWasRow && last && isGlucoseScaleOnlyLine(line)`, and `previousWasRow` survives blank lines between drug paragraphs.

**Reproduction** (`logs/qa-probe.mts` → `logs/qa-probe-output.txt`):

- `METFORMINA CPR 500 MG (OS) 1 Cpr ore 08:00\n\n150-200: 2 UI\n>200: 4 UI` gives METFORMINA `doseMode=glucose_scale`, scale [150–200:2, ≥201:4], **stato `ok`**.
- If the insulin line comes first and the scale follows a different drug, the insulin loses its scale and the other drug gets it, also as `ok` (probe P1).
- With a basal insulin listed between them (`logs/qa-probe-wrong-merge-output.txt`), LANTUS 14 UI takes Humalog's correction scale. It is `da_verificare` there, but its fixed 14 UI dose is displaced.

**Impact:** `ok` rows don't need «Ho verificato». A single «Conferma la terapia» would prescribe metformin "per schema glicemico". On origin/main a standalone scale line became a nameless `da_verificare` row, so this is a safety regression.

**Suggested fix:** merge only into a row recognised as insulin, or one that announces a schema ("secondo schema/glicemia"). Force `da_verificare` on any merged row.

### F2: MEDIUM. Outside-section extraction picks the wrong word as drug name and turns clinical/lab prose into rows

**Where:** `prescriptionInSentence` at `:644` and `PROSE_WORDS` (~`:590–640`). The name is the first word not in a short stop-list.

**Wrong names:**

- "Durante la degenza si è iniziata terapia con Furosemide 25 mg 1 cpr al mattino" → **DURANTE**. This was reproduced in the real UI and in the legacy API.
- "In caso di dolore assumere Paracetamolo 1 g al bisogno" → **CASO**.

**Negated / past therapy that becomes rows:**

- "Evitare Ibuprofene 600 mg 1 cpr x 2" → **EVITARE**. This is a "do not give" instruction that becomes a prescribable candidate. `NOT_CURRENT_RE` lacks evitare/non assumere/stop.
- "Pregressa terapia con Amiodarone 200 mg die, ora non più indicata" → **PREGRESSA**.

**Lab and vital values that become rows:** "Diuresi 1500 ml/die", "Glicemia 250 mg/dl al mattino", "Proteinuria 3 g/die", "Infusione di fisiologica 500 ml x 2 al giorno".

All of these are `da_verificare`, so nothing is prescribed without an operator click. But the names are wrong, there is noise in every letter with lab prose, and «Ho verificato» on "EVITARE / Ibuprofene" would prescribe a drug the letter forbids.

A wrong name also defeats the dedup at `:698` (`seen` by farmacoNome). If a drug is in the section and also in "Durante …" prose, it would be duplicated.

Evidence: `logs/qa-probe-output.txt` (O1), `test-results/qa-browser-run5.txt`.

### F3: LOW. The provenance note leaks into the clinical note

"Trovata fuori dalla sezione terapia · è iniziata terapia con Furosemide al mattino." goes into the form's «Note e indicazioni». If the operator verifies the row, the note persists into `PatientTherapy` notes. `dischargeTherapy.ts:208` itself says provenance should stay separate from clinical notes. The `outsideTherapySection` flag has no dedicated UI badge.

### F4: MEDIUM, not a regression. The pipeline's own page marker is not recognised

`PAGE_MARKER_RE` (`:303`) matches "---", "[Lettera 2]" and "Pagina 2 di 2". It does **not** match `--- Pagina 2/2 ---`, which is the format `header-filter.ts:359` actually emits.

When that marker sits inside a drug paragraph (no blank lines), it becomes a nameless `da_verificare` row (`logs/qa-probe-pagemarker-output.txt`). Repeated hospital headers also become rows ("OSPEDALE", same file). Main has the same behaviour, so this is not a regression, but the change claims "OCR page markers ignored".

Separately, `\[[^\]]{1,80}\]` drops any whole line in brackets, including a bracketed prescription (probe O2: `[RAMIPRIL 5 MG 1 cpr ore 08:00]` was dropped silently). That is low likelihood.

### F5: LOW, pre-existing. Non-glucose ranges are read as glucose scales

- "CLEXANE 4000 UI 10-15 gg ore 20:00" gives a scale of 10–15 mg/dL → 4000 units, and the dose is lost.
- "se aPTT 50-70: 2 UI" gives a glucose scale on a row named "SE".

Both are `da_verificare`, and the same regex shape existed on main (`GLUCOSE_SCALE_RE`). The new parser keeps the behaviour (probe P3/P4).

### F6: INFO. Regex performance

`findGlucoseRules` is quadratic on a single 20,000-digit line (~1.1 s). `parseDischargeTherapy` on origin/main has the same cost (1.13 s), so it is not a regression and the input is unrealistic. No catastrophic backtracking was found on the other adversarial inputs (≤10 ms).

### F7: INFO, verified OK. Dedup/hash with the new `dataInizio` default

- `pageTherapyRows` (`draft-source.ts:108`) hashes the row including `dataInizio`. Every group is parsed in the same call with the same date, so the dedup is stable.
- `refreshedPageData` matches existing rows and proposals by `originalText`, not by hash. A refresh on a later day therefore creates no duplicate rows and no spurious proposals.
- Rows that are genuinely new on refresh get the refresh day as start date. That is expected per the contract.
- A cross-group gap: `known` is per group, so a drug in group A's therapy section and in group B's prose yields an extra `da_verificare` row. This is low severity.

### F8: INFO. Frontend prefill behaviour

- `StepIngresso` (`:92`): the effect runs once per mount. `IntakeWorkspace` renders sections once with empty data before `loading` flips (initial `loading=false`). The first mount's prefill is then overwritten by the loaded draft, and the component remounts after load and prefills correctly. Browser evidence confirms the final state.
- Opening an existing draft that has an empty `dataPresa` prefills it with the reopening day and triggers an autosave PATCH. That is acceptable but worth knowing.
- `todayStr()` and `localIsoDate()` now follow the device time zone; the backend uses Europe/Rome. They differ only for devices outside Italy.

## Residual risks and deviations from the contract

**Contract text vs implementation:**

- The contract specifies a new `glycemiaScale` field and an additive migration on `PatientTherapy`. The implementation reuses the existing `doseMode` / `doseProtocol` with no schema change. That is functionally equivalent and verified in the DB, but `task-contract.md` should be updated.
- AC4 says "unità >0", yet the document's "< 150: 0 UI" is accepted, persisted and displayed as 0 units. That is clinically plausible but contradicts the AC text; it needs an owner decision.

**Not covered here:**

- The local AI runtime/OCR was not exercised. The narrative was produced by the repo's deterministic `parseNarrativeFromMarkdown` from synthetic text, and real OCR output may differ.

**Unrelated change in the diff:** `start-claude-team.ps1` is modified. It is outside this task and should not ship with it.

## Required before re-certification

1. Fix F1: restrict scale merging to insulin / schema rows, and never `ok` after a merge. Add regression tests for METFORMINA + scale and for basal + correction scale.
2. Fix F2: extract the drug name properly. At minimum, skip leading adverbial/temporal words and the "in caso di" pattern, extend `NOT_CURRENT_RE` (evitare, non assumere, pregress*, stop), and exclude lab/vital nouns or "/dl" units. Add tests with the probe sentences.
3. Recommended: recognise `--- Pagina N/Tot ---` (F4), and keep provenance out of the clinical note (F3).
