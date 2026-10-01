# Phase 6 — Current State (Clinical Safety & Adversarial Guardrails)

Status: see `.ai-architecture/CURRENT_STATE.json` (`phase_status`) and `SECURITY_TEST_REPORT.md`.
Loop executed: THREAT MODEL → TEST → FIND GAP → MINIMAL FIX → RETEST → REGRESSION.

## 1. What was assessed

Three independent read-only sweeps (authorization/identity, resident/data, write
integrity/audit/injection) over Phases 1–5 code, then the threat model (`THREAT_MODEL.md`) and an
executable adversarial suite against the real app, real Postgres, Role Simulator identities and
the real policy API (`backend/src/safety/__tests__/adversarial.test.ts`), a browser suite on the
real frontend + backend + Agno runtime (`scripts/safety/safety-browser-e2e.mjs`) and runtime
prompt tests (`clinicos-ai-runtime/tests/test_untrusted.py`).

## 2. Gaps found and fixed (minimal fixes, change-budget order)

| #    | Gap (severity)                                                                                          | Fix                                                                                                                                     | Proof                                          |
| ---- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| G-01 | `query_data` planner returned residents outside the operator scope (HIGH, data leakage)                 | `scopeToPermittedPatients` ANDs the permitted ids into every patient-scoped entity query                                                | RES-05                                         |
| G-02 | Patient documents ignored the Resident Access Scope (HIGH)                                              | `requirePatientDocumentAccess` → `requirePatientScope` (Entra + demo); supersedes the «struttura» exception                             | RES-06, document tests                         |
| G-03 | Administration preview not bound to the prescription at commit (HIGH, stale confirmation)               | executor re-reads the slot: still `pending`, same drug / dose / route, else 409 `preview_stale`                                         | TX-05                                          |
| G-04 | GUI therapy / diary create not idempotent (HIGH/MED, duplicate write)                                   | `lib/idempotency.ts` `runIdempotent` (actor + requestId + payload hash, replay header, 409 on mismatch); frontend `createSubmissionKey` | TX-02, TX-03, UI-D1                            |
| G-05 | Audit rows mutable (MED, audit integrity)                                                               | migration `20261001090000_ai_audit_append_only` (UPDATE / DELETE / TRUNCATE refused)                                                    | AUD-04                                         |
| G-06 | AI-prepared prescriptions audited with channel `ui` (MED, wrong origin)                                 | Tool origin propagated to `recordOperationalAudit`                                                                                      | AUD-03                                         |
| G-07 | Body-scoped writes audited without resident (LOW)                                                       | `patientIdOf` reads `body.patientId` / `pazienteId` (registry + route gate)                                                             | AUD-01                                         |
| G-08 | LLM prompts without an untrusted-data boundary (MED, injection)                                         | `fence` / `fenceUntrusted` + `UNTRUSTED_RULE` in runtime plan / compose / skill-route and backend extraction / diary-AI prompts         | INJ-02, RT-INJ-01/02                           |
| G-09 | Composer could relay injected «ho registrato…» / override text (MED, false success)                     | `claimsActionOrOverride` post-check discards the prose                                                                                  | INJ-03                                         |
| G-10 | Uncatalogued routes allowed by default (MED, hidden privilege)                                          | route gate default deny                                                                                                                 | AUTH-06                                        |
| G-11 | No final error handler; async rejections could hang or crash (MED, fail closed / disclosure)            | `app.ts` handler (500/403 generic), `guardAsyncRoutes` on skills, `unhandledRejection` logger                                           | FC-01, FC-02                                   |
| G-12 | Public AI status exposed paths / env names; intake drafts cacheable (LOW, disclosure / leakage)         | `publicErrors()`; `Cache-Control: private, no-store`                                                                                    | FC-02, LEAK-01                                 |
| G-13 | Lost confirm response shown as a retryable failure (HIGH, result integrity)                             | frontend `reconcileWorkflow` + «Esito NON verificato»                                                                                   | UI-R1..R3, Phase 4 browser I                   |
| G-14 | Assistant could stay open across logout / identity change (MED, leakage)                                | `App.tsx` logout closes it                                                                                                              | UI-S1 (negative control fails without the fix) |
| G-15 | Wrong number silently shortened: «1200/80» → 200/80, «1000» → 100, «375» → 37 (HIGH, voice/wrong value) | delimited numeric patterns in `skills/interpreter.ts`                                                                                   | VOI-01                                         |
| G-16 | Physiologically impossible vitals accepted and stored («120/800», «375» °C) (HIGH, found by VOI-02)     | plausibility ranges in `parseParameterReading` (same ranges as the GUI), reject never correct                                           | VOI-02, unit test                              |
| G-17 | (independent QA) fc / dtx / fr numbers and «120/80/70» still cut at a comma or extra slash (MED-LOW) | same delimiters on every numeric pattern | VOI-01 |
| G-18 | (independent QA) passive success claims slipped through the composer post-check; client 4xx errors became 500 (MED-LOW / LOW) | passive-claim patterns; last-resort handler keeps 4xx with a generic body | INJ-03, FC-02 |

## 3. Tests adapted to an intentionally changed contract (intent preserved and strengthened)

- `patient-documents-security.test.ts`, `patient-document-archive.test.ts`,
  `patient-documents-entra.test.ts`: fixtures now model resident ownership; each file gained an
  explicit «other operator → 404» assertion.
- `patient-diary-contract.test.ts`, `patient-clinical-scope-contract.test.ts`: the source-shape
  regexes follow `takeRequestId(req.body)`; the authorship assertions are unchanged.
- `patient-diary-therapy-db.test.ts`, `tools/__tests__/diary.test.ts`: no longer delete audit
  rows (refused by the trigger).
- `scripts/assistant/assistant-browser-e2e.mjs` step I: a confirm that never arrives is now
  reported from the server («nessuna registrazione eseguita») instead of a generic alert; the
  no-write / retry assertions are unchanged, one check added.

## 4. Residual

`PROMPT7_HANDOFF.md` §11 (R-01 … R-20). None is a critical bypass on the AI path; R-16 (prod
`AUTH_MODE` unset) and R-20 (Azure STT) are pending user decisions outside Phase 6.
