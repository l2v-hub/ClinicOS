# Validation Report — QA Gate for PR #297 (issue #296)

- PR: #297 `fix/therapy-blank-line-terminator` — head `5f249ccd0513493bcf6e6b379aee03882481d45a` (base: main)
- Issue: #296 — Import documenti: righe vuote come delimitatore di fine terapia
- Gate: independent QA session (did not write the code); date 2026-07-20
- Evidence root: `artifacts/task-validation/296-qa-gate-pr297/`

## Phase summary

| Phase                | Result                                                                      | Evidence                                                                                                                                                     |
| -------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0 Contract           | DONE                                                                        | `task-contract.md` (5 AC extracted verbatim from `gh issue view 296` → `logs/issue-296.txt`)                                                                 |
| 1 Diff review        | PASS (findings F1–F5, none blocking)                                        | `logs/pr-297.diff`; review notes below                                                                                                                       |
| 2 Build & tests      | PASS — parser 18/18, backend 360/360, tsc 0 errors, TDD red-check confirmed | `logs/parser-suite.tap`, `logs/backend-full-suite.log`, `logs/tsc-noemit.log`, `logs/tdd-red-check-old-parser.tap`                                           |
| 3 Objective evidence | PASS — Playwright 1 passed, 0 failed, 0 console errors                      | `qa-report.html`, `screenshots/qa-report-296.png`, `test-results/**/trace.zip`, `test-results/results.json`, `playwright-report/`, `logs/playwright-run.log` |
| 4 Security           | PASS                                                                        | checklist below                                                                                                                                              |
| 5 Verdict            | **QA PASSED**                                                               | this file                                                                                                                                                    |

## Exact commands (all executed independently in an isolated worktree at PR head 5f249cc)

```
git checkout --detach origin/fix/therapy-blank-line-terminator   # head 5f249cc
npm install && npm run prisma:generate -w backend                # logs/npm-install.log
cd backend && node --import tsx --test src/intake/__tests__/parse-discharge-therapy.test.ts
    → # tests 18 / # pass 18 / # fail 0                          # logs/parser-suite.tap
npm run test -w backend                                          # e2e Postgres :5433
    → # tests 360 / # pass 360 / # fail 0                        # logs/backend-full-suite.log
cd backend && npx tsc -p tsconfig.json --noEmit → exit 0, no output  # logs/tsc-noemit.log
# TDD red-check: new test file run against origin/main's parser (scratch copy outside the repo):
node --import tsx --test <scratch>/intake/__tests__/parse-discharge-therapy.test.ts
    → # pass 16 / # fail 2 — EXACTLY the two "#296 AC2" tests fail  # logs/tdd-red-check-old-parser.tap
# QA surface (evidence folder only, never repo source): qa-surface-generate.mjs runs BOTH parsers
# on (#156 fixture + blank line + advice prose) and emits qa-report.html:
    → old parser: 13 rows, 3 spurious (SI, PROSEGUIRE, IN — all da_verificare)
    → new parser: 10 rows, 0 spurious                            # logs/qa-surface-run.json
npx playwright test --config .../playwright.qa296.config.mjs (chromium, trace on)
    → 1 passed, 0 failed; asserts: 18/18 pass, 5 #296 tests PASS, #new-spurious = 0,
      exact 10-name farmacoNome list, zero console errors        # logs/playwright-run.log
```

Frontend build: **N/A by scope** — `git diff origin/main...HEAD --stat` shows exactly 4 files
(parser, its test file, 2 artifact md files); no frontend file touched.

## Per-AC results (issue #296)

| AC                                                                                      | Result   | Evidence                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 — segmentazione in paragrafi su ≥1 riga vuota                                       | **PASS** | `splitTherapyParagraphs` (parser :92–106): split on `/\r?\n/` (CRLF ok), lines trimmed so whitespace-only lines count as blank, runs of ≥1 blank collapse to one delimiter, empty paragraphs never emitted. Exercised by AC4 multi-block test (incl. a double blank line) and the demo.                                                                        |
| AC2 — primo paragrafo non farmacologico dopo contenuto farmacologico termina la terapia | **PASS** | 2 unit tests `#296 AC2` green at head, **red on origin/main** (16/18, only these 2 fail — TDD confirmed). Demo: prose after blank line produced 3 spurious rows (SI/PROSEGUIRE/IN) with the old parser, 0 with the new; termination is permanent (`break` at parser :205 — the AUGMENTIN-after-prose test proves everything after the terminator is excluded). |
| AC3 — nessuna regressione fixture #156/#274                                             | **PASS** | The 13 historical #156/#274 tests pass unchanged; `#296 AC3` proves PEVARYL (no structural signals, same paragraph) is still kept as `da_verificare` — lines inside a drug paragraph are never dropped (rows.push over all paragraph lines, parser :206).                                                                                                      |
| AC4 — blocchi multipli / header iniziale                                                | **PASS** | `#296 AC4` multi-block: KEPPRA + LASIX + PANTOPRAZOLO across blank lines (1 and 2 blanks) all parsed. Header "Terapia domiciliare:" is filtered per-line by `HEADER_RE` (parser :80, :100) so it never forms a paragraph and cannot terminate; test green.                                                                                                     |
| AC5 — unit test nuovi + suite completa verde                                            | **PASS** | 5 new `#296` tests present; parser suite 18/18; full backend suite 360/360; tsc --noEmit 0 errors.                                                                                                                                                                                                                                                             |

## Phase 1 findings (file `backend/src/intake/parse-discharge-therapy.ts` @ 5f249cc)

- **F1 (Low, per-spec residual risk)** :117 — the "ore HH:MM" signal in `talksAboutDrugs` can
  false-positive on follow-up appointment prose (e.g. "Controllo cardiologico il 30/07 ore 10:30"),
  which would keep the therapy block open and yield spurious rows. The issue itself lists "orari
  'ore HH:MM'" as a structural signal, so this is per-spec; noted as residual risk (also declared
  in the PR's own task-contract Risks).
- **F2 (Low, pre-existing heuristics reused)** :116 with ROUTE_PHRASES :47–60 — free-text route
  detection can false-positive on prose containing route-like words ("igiene orale" → OS,
  "ferita cutanea" / "medicazione cutanea" → TOP), keeping the block open. These #274 heuristics
  are reused by design; same failure mode existed before (such prose already became rows).
- **F3 (Info)** :114 — DOSE_RE matches quantities in prose like "30 ml di acqua"; advice
  containing dose-like tokens keeps the block open. Same per-spec class as F1/F2. Note the shipped
  prose fixture ("tra 30 giorni") correctly does NOT match ("giorni" is not a unit).
- **F4 (Info, hygiene)** :83 — `splitTherapyLines` remains exported but now has zero callers
  anywhere in the repo (`parseDischargeTherapy` no longer uses it; only caller of the module is
  `draft-service.ts:177` via `parseDischargeTherapy`). Dead export; behavior identical to before
  (the HEADER_RE extraction is a pure refactor). Non-blocking.
- **F5 (Info, per-spec)** :200–209 — a leading non-drug paragraph BEFORE any drug content still
  produces rows (`sawDrugs` false → no termination). Consistent with the #156 never-drop invariant
  and the contract's stated behavior; only post-drug prose terminates.

No blocking defect found. Termination logic is correct: `break` (not `continue`) makes it
permanent; rows inside a drug paragraph are never filtered; headers filtered per-line.

## Phase 4 security checklist

| Check                             | Result                                                                                                                                                                                                                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secrets in diff                   | NONE (grep password/secret/api-key/token/bearer over full diff: clean)                                                                                                                                                                                                       |
| Fixtures synthetic                | YES — drug names + generic advice sentences only; no patient data/PHI                                                                                                                                                                                                        |
| Logging added to parser module    | NONE — 0 matches for console/logger/winston/pino in module and test file; privacy invariant ("this module never logs") preserved                                                                                                                                             |
| New dependencies                  | NONE — no package.json/package-lock changes vs main                                                                                                                                                                                                                          |
| Injection surface                 | NONE — pure string parsing, no eval/exec/SQL/network                                                                                                                                                                                                                         |
| ReDoS / catastrophic backtracking | LOW — `talksAboutDrugs` only reuses existing anchored/bounded regexes (DOSE_RE, QTY_RE, ROUTE_RE/PHRASES) plus `\bore\b` and `\b\d{1,2}:\d{2}\b`; literal alternations, bounded quantifiers, no nested unbounded groups; input is per-trimmed-line. No catastrophic pattern. |

## Verdict

**QA PASSED**

All 5 acceptance criteria of issue #296 are objectively verified at head 5f249cc: parser suite
18/18, full backend suite 360/360, tsc clean, TDD red→green independently reproduced, and the
old-vs-new demonstration shows spurious prose rows go from 3 to 0 with all 10 real prescriptions
retained. Findings F1–F5 are informational/per-spec residual risks, none blocking.

This gate does not merge, close, comment, or deploy — the lead session owns those actions.
