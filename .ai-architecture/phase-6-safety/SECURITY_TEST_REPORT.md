# Phase 6 — Security Test Report

Date: 2026-10-01 · Branch `feat/phase6-safety` (from `origin/main`) · all runs on local embedded
Postgres (127.0.0.1:54329, fresh UTF8 databases), never production.

## 1. Adversarial matrix

`ADVERSARIAL_TEST_MATRIX.json` — **51 scenarios, 51 PASS, 0 FAIL**.

| Category           | Scenarios | Pass |
| ------------------ | --------- | ---- |
| authorization      | 6         | 6    |
| wrong-patient      | 5         | 5    |
| data-leakage       | 4         | 4    |
| prompt-injection   | 7         | 7    |
| voice              | 7         | 7    |
| idempotency        | 6         | 6    |
| result-integrity   | 4         | 4    |
| audit              | 5         | 5    |
| fail-closed        | 3         | 3    |
| error-disclosure   | 1         | 1    |
| provider-failure   | 2         | 2    |
| session-transition | 1         | 1    |

Sources: 44 backend scenarios on the real app (`backend/src/safety/__tests__/adversarial.test.ts`,
44/44), 5 browser scenarios on real Vite + backend + Agno runtime
(`scripts/safety/safety-browser-e2e.mjs`, 18/18 checks), 2 runtime prompt tests
(`clinicos-ai-runtime/tests/test_untrusted.py`, 4/4).

Evidence: `artifacts/task-validation/phase-6-clinical-safety-guardrails/evidence/`
(`adversarial-backend.json`, `safety-browser-e2e.json`, `screens/R1…D1`).

## 2. Definition of Done (Prompt 6 §23)

| #   | Criterion                                          | Result | Evidence                                                                |
| --- | -------------------------------------------------- | ------ | ----------------------------------------------------------------------- |
| 1   | Threat model complete                              | PASS   | `THREAT_MODEL.md` (8 areas, every Prompt 6 §2 item)                     |
| 2   | ≥30 adversarial scenarios documented               | PASS   | 51                                                                      |
| 3   | No known critical authorization bypass             | PASS   | AUTH-01…06, INJ-05, LEAK-02; QA route sweep: 188 routes, 0 uncatalogued |
| 4   | Wrong-patient protection tested                    | PASS   | RES-01…04, RES-07, VOI-03                                               |
| 5   | Dynamic authorization recheck tested               | PASS   | AUTH-02, AUTH-03, AUD-05                                                |
| 6   | Resident scope recheck tested                      | PASS   | RES-01, RES-04, FC-04                                                   |
| 7   | Prompt injection cannot override policy            | PASS   | INJ-01…05, RT-INJ-01/02                                                 |
| 8   | Partial / ambiguous voice cannot write             | PASS   | VOI-01…07, Phase 5 browser (78/78)                                      |
| 9   | Sensitive action cannot auto-confirm               | PASS   | INJ-04, VOI-04                                                          |
| 10  | Duplicate / retry does not duplicate writes        | PASS   | TX-01…06, UI-D1, UI-R1                                                  |
| 11  | Backend failure never becomes false success        | PASS   | PROV-02, TX-04, UI-R1…R3                                                |
| 12  | Audit reconstructs actions correctly               | PASS   | AUD-01…05                                                               |
| 13  | Fail closed for identity / policy / scope failures | PASS   | AUTH-04, FC-03, FC-04                                                   |
| 14  | Provider failure degrades safely                   | PASS   | PROV-01, PROV-02, `FAILURE_MODE_MATRIX.md`                              |
| 15  | Data leakage tests pass                            | PASS   | RES-05, RES-06, LEAK-01, LEAK-02, UI-S1                                 |
| 16  | Regression Prompt 1–5 + GUI passes                 | PASS   | §3                                                                      |
| 17  | Critical gaps resolved or BLOCKED                  | PASS   | G-01…G-18 fixed (`CURRENT_STATE.md`); residuals R-01…R-20 non-critical  |
| 18  | `PROMPT7_HANDOFF.md` complete                      | PASS   | `PROMPT7_HANDOFF.md` §1–§13                                             |

## 3. Regression

| Suite                                              | Result                                                                | Baseline                                                                                                      |
| -------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Backend full suite, serial, fresh DB               | 1642 tests, 1620 pass, 21 fail                                        | the same 21 failures pre-exist on main (Phase 5 list); **0 new** (`regression-backend-baseline-failures.txt`) |
| Frontend `npm test`                                | 999 tests, 990 pass, 9 fail                                            | the same 9 pre-existing failures; 0 new                                                                       |
| Frontend `npm run build` / `tsc -b`                | pass                                                                  | —                                                                                                             |
| Runtime unittest                                   | 187/187                                                               | —                                                                                                             |
| Phase 4 Assistant browser E2E (real Agno)          | 47/47                                                                 | 46 + 1 new check                                                                                              |
| Phase 5 voice browser E2E (real Gemini STT + Agno) | 78/78                                                                 | 78                                                                                                            |
| Phase 6 safety browser E2E                         | 18/18                                                                 | new                                                                                                           |
| Classic GUI                                        | Phase 5 browser step M: 8 operator sections render, no console errors | unchanged                                                                                                     |
| Real interpreter                                   | all 41 skill requests of the browser runs: `interpreter:agno`         | —                                                                                                             |

Notes: one voice run hit a Gemini STT timeout (504, provider-side), and one Phase 4 run skipped
step I because the seeded slot had already been administered by the previous run (DB state). Both
were rerun on the final code: 78/78 and 47/47.

## 4. Independent QA

A general-purpose QA agent (not the author) reviewed the full diff, reran the suites on its own
database, ran 9 extra attacks and swept 188 routes. Verdict: **READY FOR QA**, no critical or
high findings. Follow-ups applied before release:

| QA finding                                                                                                 | Action                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| fc / dtx / fr numbers and `120/80/70` not delimited                                                        | fixed (G-17), VOI-01 extended                                                                                                        |
| Passive success claims («Somministrazione registrata.», «…salvata nel sistema») not caught by the composer | fixed (G-18), INJ-03 extended; remaining false positives only fall back to the structured view (safe)                                |
| Client 4xx errors (malformed URI, charset) mapped to 500                                                   | fixed: last-resort handler keeps 4xx, generic body; FC-02 extended                                                                   |
| Phase 4 browser step I check matched the whole transcript                                                  | scoped to the last message / alert                                                                                                   |
| Entra documents now follow the Resident Access Scope (supersedes the PO «struttura» decision of #260)      | kept (Prompt 6 data-leakage mandate); **owner confirmation requested** — Entra is not active in production today (`AUTH_MODE` unset) |
| Global `unhandledRejection` handler can hide bugs                                                          | accepted: logs every rejection with route and error name; availability over crash                                                    |
| Unrelated dirty files                                                                                      | excluded from the commit                                                                                                             |

## 5. Residual risks

`PROMPT7_HANDOFF.md` §11, R-01 … R-20. No critical residual on the AI or GUI write path.
