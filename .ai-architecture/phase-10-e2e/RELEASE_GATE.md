# Phase 10 — Release gate

**Recommendation: CONDITIONALLY READY** (derived from the test results below; conditions in §9).

## 1. Scope tested

Prompt 10 AT-01..AT-15 + the owner's intake reports (screenshot + two voice notes, 2026-10-02),
code-first discovery of every area touched (navigation, parameters, therapy calendar /
administration / form, diary / handovers / notes, intake, import errors, role isolation, tablet).

## 2. Roles

Administrator, Supervisor, Doctor, Nurse, OSS — all through the Role Simulator on the local stack
(`AUTH_MODE=demo`), each with a real browser journey (`scripts/e2e/phase10-acceptance.mjs`).

## 3. Demo data

Synthetic only: **Nanni Miriam** (`scripts/e2e/seed-phase10-demo.mts`, DEMO-P10-Miriam-Nanni) plus the
Phase 4 synthetic residents. Fresh local Postgres per run; the production database was never used.

## 4. Bugs

44 findings (S0 0 · S1 3 · S2 19 · S3 18 · S4 4), 38 fixed, 6 open (S3 5, S4 1) — `BUG_CATALOG.json`.
Two S2 were found by the independent QA gate and fixed (Consegne part not in view on first tap;
background reads denied to OSS/Admin).

| Remaining                                                      | Severity | Why not fixed now                                             |
| -------------------------------------------------------------- | -------- | ------------------------------------------------------------- |
| P10-UX-R1 ~180 unassociated form labels outside the diary flow | S3       | cross-cutting accessibility refactor, no shared component     |
| P10-UX-R2 simulator session lost on reload                     | S3       | Phase 9 security choice for simulator tokens — owner decision |
| P10-UX-R4 nested interactive control in collapsible headers    | S3       | shared design-system component                                |
| P10-NAV-R6 Admin can open charts whose sections it cannot read | S3       | needs a decision on what Admin may open                       |
| P10-NAV-R7 OSS Clinica section partially denied                | S3       | section split = navigation contract change                    |
| P10-UX-R5 bed wording «non disponibile» vs «non assegnato»     | S4       | cosmetic                                                      |

## 5. Blockers

None for S0/S1/S2. External: the AI document runtime is not available locally → document import and
«Vedi documento» are verified by unit/API tests only (MANUAL_ACCEPTANCE_CHECKLIST M1–M3).

## 6. Regression

Backend full serial 1722 tests, 0 new failures (6 base failures fixed); frontend 1034 tests, the same
9 baseline failures, 0 new; tsc + production build pass; browser acceptance 27/27 (no 403/5xx, no
console errors for any role), intake 7/7; proactive per-user ack 23/23 — `REGRESSION_REPORT.md`.

## 7. Manual tests not executed

`MANUAL_ACCEPTANCE_CHECKLIST.md` M1–M9 (real tablet, AI document runtime, real Agno, printer).

## 8. Security / safety regression

Independent QA gate security phase: PASS. Backend authorization unchanged (the only
`authz/baseline.ts` edit is the OSS description text); frontend gating only hides controls and
avoids requests the server would deny; diary server timestamp applies only when the client sends
none (client values still validated); no Prisma schema change, no audit deletion, no new dependency,
no new logs with clinical content, clinical text never sanitized.

## 9. Conditions / owner decisions

1. Consegne: keep the task lifecycle (aperta → in corso → completata) or move to NORMAL/URGENT notes
   with per-user «visionato» (Prompt 10 §6.2 vs existing workflow).
2. Confirm DTX 20 = capillary glucose at 20:00.
3. Administration buttons on future dates in the patient calendar (server refuses non-due slots).
4. Tablet finger/stylus signature (bed-rails consent) — new feature, out of Phase 10 scope.
5. «ricoverati» header now counts non-discharged residents; backend KPI definition; Pazienti entry
   in the Supervisor/Admin sidebar.
6. Run MANUAL_ACCEPTANCE_CHECKLIST on a real tablet after deploy.

## 10. Independent QA gate

`artifacts/task-validation/phase-10-qa-gate/validation-report.md` — round 1 FAILED VALIDATION (F1–F5),
round 2 FAILED VALIDATION (F1 only), round 3 **READY FOR QA** (F1 fixed on every entry path, pin does not fight user scroll; 27/27 acceptance, 0 new frontend failures).
