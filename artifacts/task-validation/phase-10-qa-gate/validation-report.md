# QA Gate — Phase 10 E2E bug hunt + UX fix loop

- Branch / worktree: `feat/phase10-bughunt` @ 12da5c98 + uncommitted diff (73 tracked files, 18 untracked)
- Contract: `artifacts/task-validation/phase-10-e2e-bug-hunt-ux-fix-loop/task-contract.md` (AC1–AC4, AT-01..AT-15)
- QA session: independent (did not write the code). Date: 2026-10-03. Local synthetic stack only (DB p10qa, p10e2e).

## Round 3 re-gate (2026-10-03) — Verdict: **READY FOR QA**

Change reviewed: `frontend/src/components/operator/PatientDetail.tsx:2364-2398`. The target part stays pinned for up to 5 s
(MutationObserver + ResizeObserver on the part and its parent, re-scroll when it moves ≥2 px). The pin stops on
wheel/touchstart/keydown/pointerdown (capture, passive) or on timeout, and is cleaned up when the effect unmounts. No new
dependency, no backend change.

| Check                                                             | Result                                                                                                                                                                                                    | Evidence                                                        |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| tsc / build                                                       | PASS (0 / 0)                                                                                                                                                                                              | `r3/tsc.txt`, `r3/build.txt`                                    |
| Frontend tests                                                    | 1034 tests: 1025 pass, 9 fail. Same 9 baseline names, 0 new                                                                                                                                               | `r3/frontend-tests.txt`                                         |
| Acceptance (p10e2e reset first)                                   | 27/27 PASS, incl. the 2 cold AT-01 checks. `httpErrors` [] / `consoleErrors` []                                                                                                                           | `r3/acceptance/`                                                |
| F1 cold probes, 820 px viewport, Consegne top after the first tap | from Panoramica/hash link 619 · after Parametri 619 · after Terapia 619 · from Pazienti list 619 · from Turno 619 · second visit 619. All in view; 619 is the max scroll, since Consegne is the last part | `qa-probe-consegne2/4/5.mjs`, `r3/screens/QA-DL-Consegne-*.png` |
| Pin vs user scroll                                                | Wheel up 250 ms after the tap: the part stays where the user put it (1211 px) for the next 4 s, no re-pin. Touch + scroll: stays at 3814 px, no re-pin                                                    | `qa-probe-userscroll.mjs`, `r3/screens/QA-F1-userscroll-*.png`  |

Round 2 items (F2–F5) and the round 1 security checklist are unchanged. Backend files are unchanged since round 2
(the targeted backend suites are still 136/137, with 1 pre-existing failure). Remaining non-blocking notes: the «ricoverati» header change is an owner
question. Do not commit `artifacts/task-validation/po-16-giro/backend/*` (test side effects) or the two `.ps1` CRLF
files. Minor: a pointerdown on a native scrollbar may not stop the pin within the 5 s window (not reproduced, low).

## Round 2 re-gate (2026-10-03, after the lead's F1–F5 fixes) — Verdict: **FAILED VALIDATION** (F1 only)

Evidence: `r2/` (tsc.txt, build.txt, frontend-tests.txt, backend-targeted.txt, acceptance/, intake/,
qa-adversarial/ incl. screens/QA-DL-Consegne-*.png). The p10e2e DB was reset with p10-reset.sh before the runs.

| Item                                    | Round 2 result                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| tsc / build                             | PASS (exit 0 / exit 0)                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Frontend tests                          | 1034 tests: 1025 pass, 9 fail. Exactly the 9 baseline names, 0 new                                                                                                                                                                                                                                                                                                                                                                       |
| Backend targeted (fresh DB p10qa2)      | 137 tests: 136 pass. The 1 failure is the pre-existing `confirmDraft: persists therapies…` (also fails on base). Upload-limit test and proactive K (supervisor) PASS                                                                                                                                                                                                                                                                     |
| `phase10-acceptance.mjs` (strengthened) | 25/25 PASS, `httpErrors` [] and `consoleErrors` [] for all roles. Assertions reviewed: real (active `.top-nav__item.is-active`, `partInView` polling bounding box, `.cr-inline-form` date inputs, Europe/Rome skew)                                                                                                                                                                                                                      |
| `phase10-intake-deferred.mjs`           | 7/7 PASS                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `qa-adversarial.mjs`                    | 19/19 PASS. QA-ADMIN-c is now a real assertion: no «operazioni negate dalla policy» signal in the admin Copilot after all journeys. 0 4xx for OSS/admin from the app                                                                                                                                                                                                                                                                     |
| F2 (denied background reads)            | **FIXED**: OSS Panoramica shows no error, the app sends no 403, and the admin Copilot shows no denied-operations signal. All capability ids used (`narrative.list`, `therapy.list_page`, `diary.list`, `assessments.catalog`, `intake.patient_review`, `patients.clinical_summary`) exist in `backend/src/authz/capability-registry.json`. Server-side denial unchanged (401 without the app's session, 403 for OSS identity in round 1) |
| F3, F4, F5                              | FIXED (verified in the scripts/tests above). The «ricoverati» change stays an owner question                                                                                                                                                                                                                                                                                                                                             |
| **F1 (Consegne deep link)**             | **STILL FAILING on the first visit of the Clinica section in a session** (see below)                                                                                                                                                                                                                                                                                                                                                     |

### F1 — round 2 detail (MEDIUM, AT-01)

`frontend/src/components/operator/PatientDetail.tsx:2364-2384`: the MutationObserver now finds the part and
calls `scrollIntoView` once, about 70 ms after the click (instrumented: `siv consegne` at +70 ms). At that moment
the Clinica parts above it (diagnosi, esami-consulenze, note) have not loaded yet. When they render,
they push Consegne down, and nothing re-reveals it. Measured `[data-chart-part=consegne]` top in an 820 px viewport, 5 s after the
click, fresh nurse session:

- opened from Turno: 3222 (not in view); from Pazienti list: 3222; from a hash link: 3222;
  after Parametri or Terapia first: 3222;
- the **second** Consegne click in the same session: 619 (in view). Data is cached by then, so nothing shifts.

The strengthened AT-01 passes only because, in that script, the journey has already warmed the data
(`r2/acceptance/screens/AT-01-consegne.png`). For an operator who opens a patient and taps «Consegne», the
first tap still lands on «Patologie note…» (`r2/qa-adversarial/screens/QA-DL-Consegne-turno.png`,
`QA-DL-Consegne-pazienti.png`). Probes: `qa-probe-consegne2.mjs`…`qa-probe-consegne5.mjs`.
Fix direction: keep the reveal active until the part's position is stable (re-scroll on layout changes
while the parts above are loading, e.g. ResizeObserver on the section container within the 5 s window,
cancelled on user scroll), or render the target part first. Then make AT-01 open the chart fresh
(new context, directly from Turno) before tapping Consegne.

---

## Round 1 verdict (superseded by round 2 above): **FAILED VALIDATION**

Two acceptance tests are not met in the running app even though the implementer's script reports PASS
(its assertions are too weak to catch them). No security blocker found.

## Phase table

| Phase           | Result                                         | Evidence                                                                                                                                                                                                                                                                  |
| --------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 Contract      | AT-01..AT-15 + owner intake bugs (AC1–AC4)     | task-contract.md, PROMPT_10 §23                                                                                                                                                                                                                                           |
| 1 Diff review   | FAIL (2 functional gaps, several low findings) | findings below                                                                                                                                                                                                                                                            |
| 2 Build & tests | PASS                                           | `tsc.txt` (exit 0), `build.txt` (exit 0), `frontend-tests.txt` (1034 tests, 1025 pass, 9 fail = the 9 known baseline failures, 0 new), `backend-targeted.txt` (137 tests, 136 pass, 1 fail — pre-existing: same test fails on base code in the phase9-hardening worktree) |
| 3 Playwright    | FAIL for AT-01 and AT-13; PASS for the rest    | `acceptance-original/` (23/23 PASS, but see false positives), `intake-original/` (7/7 PASS), `qa-adversarial/` (19 PASS / 3 FAIL), `qa-adversarial/screens/QA-DL-Consegne-4s.png`                                                                                         |
| 4 Security      | PASS                                           | checklist below                                                                                                                                                                                                                                                           |

## Findings

### F1 — MEDIUM (fails AT-01): ward «Consegne» inside the chart does not show the handovers

`frontend/src/components/operator/PatientDetail.tsx:2361-2365` (the scroll-to-part effect) with
`frontend/src/components/operator/tabGroups.ts:199-210` / `App.tsx:750-759`.
From Nanni's chart, the sidebar «Consegne» opens the **Clinica** section (correct patient), but the
Consegne part stays 3222 px below the fold at 0.5 s, 2 s and 4 s
(`qa-probe-consegne.mjs`: `[data-chart-part="consegne"]` top=3222, vh=820). The effect looks up
`[data-chart-part=tab]` once, when `tab` changes, before the lazy part is mounted, and never retries.
The operator lands on «Patologie note…» and has to scroll the whole page. The original
`AT-01` assertion only checks `page.url().includes(NANNI)`, so it passes anyway. The same applies to
every `consegne` deep link (Adesso «Apri» on a handover, `ADESSO_KIND_TAB`).

### F2 — MEDIUM (fails AT-13): OSS chart still requests denied resources and shows an error

OSS on Verdi Olga, Panoramica: «Impossibile caricare le terapie rimaste in bozza. [Riprova]»
(`acceptance-original/screens/AT-13-oss-chart.png`, `qa-adversarial/screens/QA-OSS-panoramica.png`).
The UI still calls `GET /patients/:id/intake-review` → 403 (`frontend/src/lib/patientIntakeReview.ts:17`),
`GET /patients/:id/narrative-sections` → 403 (`frontend/src/lib/patientDetailPrefetch.ts:33`), and
`GET /patients/:id/therapies/page` → 403. The admin dashboard calls `GET /patients/clinical-summary`
→ 403 (`frontend/src/lib/patientPage.ts:122`, console error «Failed to load resource: 403»).
Side effect: the admin Copilot shows «10 operazioni negate dalla policy — Priorità alta»
(`qa-adversarial/screens/QA-ADMIN-assistant-mode.png`). So the security audit signal is full of
denials that the UI caused by itself. Only the chart rail and sidebar are gated; the panoramica and
admin-dashboard fetches are not. The original script records these 403s in `httpErrors` but never
asserts on them.

### F3 — LOW (evidence quality): assertions in `scripts/e2e/phase10-acceptance.mjs` that can pass when the feature is broken

- AT-01 (l.~118): URL only. It passes even when F1 is present.
- AT-02 (l.~107): `/Parametri/i` over the whole `main`. The chart rail always contains «Parametri». Use the active `.top-nav [aria-selected=true]` instead (done in `qa-adversarial.mjs`, real PASS).
- AT-06a (l.~150): `form input[type=datetime-local]`. The diary form is a `div.cr-inline-form`, so the count is always 0. Re-checked on `.cr-inline-form` in QA-DY-a, real PASS.
- AT-06 (l.~170): the skew is computed on `createdAt`, which is always «now». It does not test `entryDateTime`. Re-checked against facility time in QA-DY-b, real PASS (±0 min).
- No console-error assertion, and `httpErrors` are not asserted (this hides F2).

### F4 — LOW: AT-08 / AT-09 / AT-10 have no Playwright evidence

AT-08 (personal acknowledgement) is covered only by `backend/src/proactive/__tests__/proactive-e2e.test.ts`.
Its new supervisor check is conditional (`if (supervisorView)`) and could pass without checking
anything. AT-09/AT-10 (import errors) are covered by backend tests only
(`import-error-specificity.test.ts`, `confirm-therapy-validation.test.ts`, all PASS).

### F5 — LOW / hygiene

- `backend/src/routes/ai-jobs.ts:46-51` / `upload-errors.ts:31-37`: every other `MulterError` (e.g.
  `LIMIT_UNEXPECTED_FILE`) now returns 413 instead of 400, with a file-type message. The message is specific, but the status code is semantically wrong.
- `frontend/src/components/operator/OperatorDashboard.tsx:102-107`: the «ricoverati» count is now
  `totalPatients − dimessi`. This semantic change was not among the claimed fixes, so confirm it with the owner.
- `frontend/src/components/operator/cartella/DiarioPazienteTab.tsx:338,355,684-686`: not prettier-formatted
  (long lines, mis-indented label).
- Unrelated modified files must not be committed:
  `artifacts/task-validation/po-16-giro/backend/*.json|*.pdf` (test side effects), `run-claude-queue.ps1`,
  `start-claude-team.ps1` (known CRLF quirk). `undefined/` is no longer present in the worktree.

## Claimed fixes verified (code + runtime)

| Claim                                                                                | Result             | Evidence                                                                                                                                                      |
| ------------------------------------------------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Conflict-deferred intake row: no «Reincludi», explanation, autosave OK, not blocking | PASS               | DischargeTherapyReview.tsx:56,99-166; intake-original P10-INT-1a..e                                                                                           |
| Specific autosave error reason                                                       | PASS (code)        | IntakeWorkspace.tsx:449,749-755; intakeDraftApi.ts `draftRejectionReason`                                                                                     |
| Allergies copy; «Vedi documento» chip                                                | PASS (code)        | AnamnesisEditor.tsx:101; intakeDocumentPages.ts `therapySourceChip` (no job in manual flow, so no runtime)                                                    |
| Prescriber «Dimissione ospedaliera» one tap, never pre-filled                        | PASS               | P10-INT-4 (aria-pressed false→true)                                                                                                                           |
| IP M/P removed, DTX 20 (frontend + backend DAY_KEYS)                                 | PASS               | P10-INT-5a; parameters-month-dtx20.test.ts PASS; legacy firmaIp data kept, not deleted                                                                        |
| Calendar slot clickable, administration from chart, capability gating                | PASS               | AT-04/05, QA-NS (reason required, persisted `non_erogata/rifiutata_paziente`, operator SIM-NURSE-1), QA-NS-b (after reload, state shown, no duplicate action) |
| Therapy form field errors, save not disabled, «+ Aggiungi farmaco» gated             | PASS               | AT-11, AT-12, nurse AT-13                                                                                                                                     |
| Diary server timestamp, NORMAL/URGENT, no Stato, labels                              | PASS               | QA-DY-a/b; diary-write-validation tests (a client value is still validated: `entryDateTime: 1700000000` → 400)                                                |
| Diary edit: date editable, legacy priority/status preserved                          | PASS               | QA-DY-c/d (`importante`/`da_rivedere` untouched; PUT omits status)                                                                                            |
| Ward deep links Terapia / Parametri                                                  | PASS               | QA-DL (active section asserted)                                                                                                                               |
| Ward deep link Consegne                                                              | **FAIL**           | F1                                                                                                                                                            |
| Hash deep link, Assistant patientTab, Adesso tabs                                    | PASS (code + unit) | App.tsx:899-906, classicScreenTarget.ts, adessoQueue tests                                                                                                    |
| Role isolation: sidebar / chart rail / intake / admin Assistente                     | PASS               | AT-13 sidebar for 5 roles, QA-OSS-a                                                                                                                           |
| Role isolation: no denied loads / error states                                       | **FAIL**           | F2                                                                                                                                                            |
| Import / therapy error specificity, operator language                                | PASS               | import-error-specificity, therapy-create, input-validation tests                                                                                              |

## Phase 4 — Security checklist

| Check                   | Result                                                                                                                                                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secrets                 | PASS: none in the diff                                                                                                                                                                                                     |
| PHI                     | PASS: synthetic seeds only (Nanni Miriam DEMO-P10), local DBs                                                                                                                                                              |
| Logging                 | PASS: no new `console.*`/logger calls. Error messages carry row numbers and field labels, never clinical values                                                                                                            |
| Input validation        | PASS: diary `entryDateTime` is still validated when sent (the default applies only to undefined/null/''). Therapy and identity validation is unchanged in strength, only reworded. Clinical text is not sanitized          |
| AuthZ                   | PASS: `backend/src/authz/baseline.ts:60` changes description copy only. Frontend gating only hides controls. The server denies OSS therapy reads (403 seen with the OSS identity) and unauthenticated administration (401) |
| Injection/XSS           | PASS: no raw SQL, no `dangerouslySetInnerHTML`                                                                                                                                                                             |
| Dependencies            | PASS: no package.json changes                                                                                                                                                                                              |
| Config / schema / audit | PASS: no Prisma schema change, no CORS/env change, no `deleteMany` / audit deletion                                                                                                                                        |

## What must change before re-gating

1. F1: make the part-scroll effect wait for the target part to mount (or retry once after Suspense resolves), then assert in Playwright that `[data-chart-part=consegne]` is inside the viewport.
2. F2: gate the panoramica intake-review/narrative and therapies fetches, and the admin clinical-summary fetch, on the same read capabilities. Assert 0 4xx and 0 console errors per role.
3. F3: replace the weak assertions in `phase10-acceptance.mjs` (see `qa-adversarial.mjs` for working selectors).
