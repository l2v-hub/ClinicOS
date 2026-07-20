# Validation Report — QA Gate PR #295 (issue #294)

- PR: #295 `feat/cf-chiave-univoca-paziente` — first audit at head **56435f9**, delta re-audit at
  remediation head **c1b62a3** (both audited detached in isolated worktree)
- Issue: #294 — codice fiscale as unique patient key (required or computed at creation)
- QA session: independent (did not write the code; no production code modified)
- Date: 2026-07-20
- Evidence root: `artifacts/task-validation/294-qa-gate-pr295/`

## Final Decision

**QA PASSED** — at remediation head **c1b62a3**.

History: the first audit at head 56435f9 ended in **FAILED VALIDATION** (findings F1, F2, F3 below —
the PR's own evidence spec failed 2/2 and the intake wizard gave no reachable CF feedback). The
remediation commit c1b62a3 (3 files) resolves F1+F3 at the root, F2 in the spec and F6; the delta
re-verification below shows the PR spec now passes **2/2** and the #282 regression stays green.
F4 and F5 are **accepted deviations** per lead decision (documented, not blocking).

## Delta re-verification at c1b62a3 (2026-07-20)

Delta diff (`git diff 56435f9..c1b62a3`, 3 files):

1. `frontend/src/components/shared/intake/IntakeWorkspace.tsx` — removed
   `(step === 1 && !anagraficaValid())` from the footer button's `disabled`; the click now goes
   through `handleNext`, which on invalid anagrafica sets `submitAttempted` → field errors
   (including CF) become visible and the wizard stays on step 1. **Resolves F1 + F3.**
   Reviewed: `loading || !!error || (isLast && (submitting || !acceptanceComplete()))` gating is
   intact — last-step acceptance/submit gating unchanged; intermediate steps were never
   button-gated. No regression path identified.
2. `backend/src/routes/patients.ts` (demo-setup cartella) — `FRLFBA48E12H501X` → `…N` (valid
   checksum, previously verified by the QA probe). **Resolves F6.**
3. `qa-evidence/tests/issue-294.spec.ts` — duplicate test now filters the expected
   `Failed to load resource` console artifact. **Resolves F2.** Note: the filter
   (`/Failed to load resource/i`) is broader than the single 400 artifact, but the adjacent
   assertion (every HTTP >=400 must be on `/confirm`) still fails the test on any other error —
   acceptable.

Delta results (stack restarted from worktree at c1b62a3, backend :3001 → DB :5433, Vite :5173 with
local `VITE_API_URL`, serialized 1 worker; stack shut down after the runs, ports verified free):

| Check                          | Result                                                                                                                                                                                                                                         | Evidence                                                                                                                   |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `npx tsc --noEmit` (frontend)  | exit 0                                                                                                                                                                                                                                         | `logs/frontend-tsc-delta.log`                                                                                              |
| PR spec `issue-294.spec.ts`    | **2/2 PASS** — negative test clicks the now-enabled Avanti, asserts the visible `Codice fiscale obbligatorio` error and permanence on step 1; Calcola/column-persistence/reload assertions green; duplicate test green with tolerated artifact | `logs/playwright-294-delta.log`, `delta-c1b62a3/` (screenshots, `test-results/**/trace.zip` + video, `playwright-report/`) |
| Regression `issue-282.spec.ts` | **1/1 PASS** (happy path with Avanti now clickable)                                                                                                                                                                                            | `logs/playwright-282-delta.log`, `delta-c1b62a3/282/` (trace + screenshots)                                                |

No new findings from the delta.

## Findings status after remediation

| #   | Status                                                                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | **RESOLVED** (c1b62a3, verified by 294 spec 2/2)                                                                                                                           |
| F2  | **RESOLVED** (spec fix, verified)                                                                                                                                          |
| F3  | **RESOLVED** (error feedback reachable on submit attempt — consistent with the wizard's existing Nome/Cognome pattern)                                                     |
| F4  | **ACCEPTED DEVIATION** (lead): duplicate CF on confirm paths returns 400 (clear message, non-forcible) instead of the AC-literal 409; POST /patients returns 409 correctly |
| F5  | **ACCEPTED DEVIATION** (lead): migration backfill checks structure only, not checksum; no duplicate/constraint risk                                                        |
| F6  | **RESOLVED** (c1b62a3)                                                                                                                                                     |
| F7  | RECORDED (info) — name+MRN disclosure to authenticated operators, within accepted bound                                                                                    |

---

# First audit (head 56435f9) — historical record

**Outcome at that head: FAILED VALIDATION.** The feature itself worked (proven by QA diagnostic
Playwright runs, API probes and the full backend suite), but the PR's own objective-evidence spec
`qa-evidence/tests/issue-294.spec.ts` failed 2/2 as delivered (findings F1, F2), and the intake
wizard gave the operator no reachable feedback for a missing/invalid CF (finding F3), partially
failing AC3's "validato in tempo reale". Phases 1, 2 and 4 below remain valid for c1b62a3 (the
delta touches nothing they cover beyond the three reviewed hunks).

## Phase summary

| Phase           | Result                                                                                                | Evidence                                                                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 Contract      | DONE                                                                                                  | `task-contract.md`, `logs/issue-294.txt`                                                                                                                            |
| 1 Diff review   | DONE — F1..F7                                                                                         | `logs/pr-295.diff` (60.4K, 28 files), `logs/cf-validator-probe.log`                                                                                                 |
| 2 Build & tests | **PASS** — backend 361/361, CF unit 5/5, tsc 0 err, vite build ok                                     | `logs/backend-tests.log`, `logs/cf-unit-tests.log`, `logs/frontend-tsc.log`, `logs/frontend-build.log`                                                              |
| 3 Playwright    | **FAIL (delivered spec)** — issue-294.spec 0/2; issue-282 regression 1/1 PASS; QA diagnostic 2/2 PASS | `logs/playwright-294.log`, `logs/playwright-282*.log`, `logs/playwright-qa294-diag*.log`, `screenshots/`, `test-results/**/trace.zip`, `282/`, `playwright-report/` |
| 4 Security      | PASS (notes F6, F7)                                                                                   | `logs/api-probe.log`, log-leak scan below                                                                                                                           |
| 5 Verdict       | FAILED VALIDATION                                                                                     | this file                                                                                                                                                           |

## Per-AC results (issue #294)

| AC                                                                                                               | Result                       | Evidence                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC1 `Patient.codiceFiscale` UNIQUE, nullable legacy                                                              | **PASS**                     | `prisma/schema.prisma` `@unique`; index `Patient_codiceFiscale_key` confirmed in e2e DB (`\d "Patient"`); legacy seed rows (no CF) still work                                                                                                                            |
| AC2 400 missing/invalid (checksum, omocodia ok) / 409 duplicate on all creation paths                            | **PASS with deviation (F4)** | API probe: POST missing→400, wrong checksum→400, lowercase valid→201 normalized `QAETST64E03H294A`, duplicate→409+`existingPatientId`; confirm paths block missing/dup CF but return **400** for duplicates (AC letter says 409)                                         |
| AC3 CF mandatory in NewPatientModal + StepAnagrafica: typed with live validation or computed (codice-fiscale-js) | **PARTIAL (F1, F3)**         | "Calcola" works (Imola recognized; computed CF valid, 16 chars); typed CF works (#282 spec green); but in the intake wizard the inline error `Codice fiscale obbligatorio…` is unreachable — only a silently disabled "Avanti"                                           |
| AC4 dedup: CF match = hard duplicate non-forcible, name+dob fallback                                             | **PASS**                     | `requireFreeCodiceFiscale` before dup-check on BOTH `confirmDraft` (confirm-service.ts:249) and `confirmJob` create path (:433), not on mode='existing' (:397); `confirmDuplicate:true` cannot bypass (unit `intake-confirm.test.ts` + QA diag test 2: 400 + UI message) |
| AC5 CF persisted on column, survives reload                                                                      | **PASS**                     | QA diag test 1: computed CF === `/patients` column value; patient visible after full reload; cartella JSON also carries CF                                                                                                                                               |
| AC6 additive migration, prudent backfill (well-formed, non-duplicated only)                                      | **PASS (note F5)**           | migration.sql: ADD COLUMN → regex-filtered backfill with `HAVING count(*)=1` (cannot backfill two patients with the same CF; Cartella.patientId is unique) → UNIQUE INDEX created **after** backfill                                                                     |

## Findings

| #      | Severity                | Where                                                                                                           | Finding                                                                                                                                                                                                                                                                                      |
| ------ | ----------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F1** | **HIGH (gate-failing)** | `qa-evidence/tests/issue-294.spec.ts:36` vs `frontend/src/components/shared/intake/IntakeWorkspace.tsx:613-618` | Test 1 clicks "Avanti" expecting to stay on step 1 with an inline error; but the footer button is hard-`disabled` when `anagraficaValid()` is false (pre-existing gate, now CF-aware) → `locator.click` timeout. 2/2 tests fail (test 2 cascades). The PR's own evidence cannot be produced. |
| **F2** | **HIGH (gate-failing)** | `qa-evidence/tests/issue-294.spec.ts:130` (`expect(g.consoleErrors).toEqual([])`)                               | Even with F1 fixed, the expected 400 on `/confirm` always emits a browser console error ("Failed to load resource … 400"), so the strict console-clean assertion in test 2 can never pass. Verified empirically (QA diag run 1).                                                             |
| **F3** | **MEDIUM (AC3 gap)**    | `frontend/src/components/shared/intake/StepAnagrafica.tsx:970-973 (diff)` + `IntakeWorkspace.tsx:379-386`       | In the intake wizard, `submitAttempted` can only be set by `handleNext()`, which is unreachable while "Avanti" is disabled → the CF error messages are dead code; no blur/touched live validation (unlike `NewPatientModal`). Operator sees a disabled button with no explanation of why.    |
| F4     | MINOR (AC2 deviation)   | `backend/src/routes/intake-drafts.ts:25` (and ai-jobs analog)                                                   | Duplicate CF on intake/import confirm → `AiExtractionError('config')` → HTTP **400**, not 409 as the AC literally requires (POST /patients correctly returns 409). Message is clear and duplicate is non-forcible; deviation documented.                                                     |
| F5     | MINOR                   | `prisma/migrations/20260720160000_patient_codice_fiscale/migration.sql:16`                                      | Backfill validates structure only, not the control character — a cartella CF with a bad checksum would be backfilled even though every runtime path would reject it. No duplicate/constraint risk (`HAVING count(*)=1`, unique index after backfill).                                        |
| F6     | INFO (pre-existing)     | `backend/src/routes/patients.ts:124`                                                                            | Demo-setup cartella still contains `FRLFBA48E12H501X`, which **fails the checksum** (probe: valid=false). The PR fixed the same value to `…N` in `scripts/e2e-full-patient-api-test.ts` but not in the demo route (cartella JSON only, column untouched).                                    |
| F7     | INFO (recorded)         | `confirm-service.ts:33`, `patients.ts:756-759`                                                                  | Duplicate-CF errors disclose the existing patient's surname+name+MRN (confirm message) / `existingPatientId` (POST 409) to authenticated operators — within the accepted name+MRN bound.                                                                                                     |

## Phase 1 — Diff review details

- **CF validator** (`backend/src/lib/codice-fiscale.ts`): ODD/EVEN tables verified char-by-char
  against the official DM 23/12/1976 conversion tables — correct. Structure regex enforces month
  letters `ABCDEHLMPRST` and omocodia letters `LMNPQRSTUV` in numeric positions; checksum computed
  over raw 16 chars (correct for omocodia — verified with recomputed variant `RSSMRA80A01H50MM`).
  Lowercase/whitespace normalized; 15/17 chars, wrong month, wrong checksum all rejected (probe log).
- **patients.ts**: 400 (names/dob) → 400 (CF) → 409 (pre-check) ordering; P2002 discriminated by
  `meta.target` (CF race→409, MRN collision→retry with new MRN); PATCH cannot clear a CF (empty →
  400; field omitted → untouched; verified by API probe steps 5-6); **no CF in any log line** (only
  names/ids logged; runtime log scan found 0 CF-like tokens after creating several patients).
- **confirm-service.ts**: guard placed exactly on the two creating paths, skipped for
  mode='existing'; normalized CF persisted to column (`materializePatient`) and cartella JSON.
- **Migration**: additive; backfill can never produce duplicates; unique index after backfill.
- **e2e/spec updates**: all 11 synthetic CFs in the diff verified against the backend validator —
  all valid (`logs/cf-validator-probe.log`); `qa-evidence/helpers.ts syntheticCF()` verified for 3
  seeds. `new-vs-existing-smoke` correctly switched to an alternate CF to still exercise the
  forcible name+dob 409.
- **Design system**: reuses existing `npm-input`, `npm-mono`, `npm-input--error`, `btn-secondary`
  (all pre-existing in App.css/app-additions.css); no new colors, no red misuse.

## Phase 2 — Independent build & tests (worktree, e2e DB :5433)

```
npm install (root, workspaces)               → OK
npm run prisma:generate -w backend           → OK
npm run test -w backend                      → 361 pass / 0 fail   (logs/backend-tests.log)
node --import tsx --test codice-fiscale.test → 5 pass / 0 fail     (logs/cf-unit-tests.log)
cd frontend && npx tsc --noEmit              → exit 0
cd frontend && npm run build                 → exit 0
```

## Phase 3 — Playwright (serialized, 1 worker, backend :3001 → DB :5433, Vite :5173, VITE_API_URL set)

| Run                                                                                         | Result                                                                                                                                                                                                                                                                                                                                                                                                  | Log                                                                                                                                     |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| PR spec `issue-294.spec.ts`                                                                 | **0/2 — FAIL** (F1: click on disabled Avanti timeout; test 2 cascade)                                                                                                                                                                                                                                                                                                                                   | `logs/playwright-294.log`                                                                                                               |
| Regression `issue-282.spec.ts` (typed CF)                                                   | **1/1 PASS** — creation + persistence after reload                                                                                                                                                                                                                                                                                                                                                      | `logs/playwright-282.log`; re-run with trace: `282/` + `logs/playwright-282-run2.log`                                                   |
| QA diagnostic `qa294-diagnostic.spec.ts` (archived in evidence root; removed from worktree) | **2/2 PASS** — step-1 blocked without CF (disabled Avanti); Calcola with comune **Imola** → valid 16-char CF; confirm 201; **computed CF === API column value**; persists after reload; duplicate CF → 400 non-forcible + UI message "Codice fiscale già presente"; no unexpected HTTP >=400 (only the expected /confirm 400); console clean except the browser's mandatory resource-error for that 400 | `logs/playwright-qa294-diag-run3.log`, `screenshots/qa294-diag-*.png`, `test-results/**/trace.zip` + `video.webm`, `playwright-report/` |

Note: the "Imola" compute concern did NOT materialize — codice-fiscale-js resolves Imola correctly.

Harness note: the worktree lacked `@playwright/test` (installed `--no-save` at main-repo root per
prior gotcha); QA installed `@playwright/test@1.61.1 --no-save` in the worktree to resolve the
two-instances error. `package.json`/lockfile untouched (verified via git status).

## Phase 4 — Security checklist (CF = personal data)

- **Synthetic fixtures only**: all CFs in code/tests/evidence are fabricated (QAETST*/SNT*/TRGMCK/
  NTKSNT/BNC*/RSSMRA doc-example/FRLFBA demo). No match for the issue-#279 real-PHI pattern
  (`SBBL…`: 0 hits in diff).
- **No CF in logs**: no new console.log in the diff; runtime backend log after the full test session
  contains 0 CF-like tokens.
- **Bounded input**: normalize (trim/upper) → 16-char structure regex → checksum; no unbounded
  processing; `maxLength={16}` client-side.
- **Dependency**: single new dep `codice-fiscale-js@2.3.23`, resolved from
  `https://registry.npmjs.org/codice-fiscale-js/-/codice-fiscale-js-2.3.23.tgz` (legitimate npm
  package, not a typosquat; frontend-only — backend validator is dependency-free). No other
  lockfile additions.
- **No config weakening**; no secrets in diff or evidence.
- **Disclosure**: duplicate errors expose name+MRN / existingPatientId to authenticated operators
  only (F7 — recorded, within accepted bound).

## Required remediation (to reach QA PASSED)

1. F1 — fix `issue-294.spec.ts` test 1: assert `Avanti` is **disabled** without CF (and/or implement
   reachable inline feedback per F3), instead of clicking it.
2. F2 — in test 2, tolerate exactly the browser's "Failed to load resource … 400" console entry tied
   to the expected /confirm 400 (pattern proven in the archived `qa294-diagnostic.spec.ts`).
3. F3 (recommended) — give StepAnagrafica live/blur CF validation or surface why "Avanti" is
   disabled; today the operator gets no explanation.
4. F4 (optional, PO decision) — map duplicate-CF on confirm paths to 409 to match AC2 literally, or
   amend the AC text.

## Constraints honored

No production code modified; no merge/close/comment/deploy; stack started from the worktree and
fully shut down (ports 3001/5173 free); QA diagnostic spec removed from the worktree and archived at
`artifacts/task-validation/294-qa-gate-pr295/qa294-diagnostic.spec.ts`. Residual: a few synthetic QA
patients remain in the e2e test DB (`clinicos_test`), and the untracked evidence copy in the
worktree could not be deleted (permission denied) — both harmless.
