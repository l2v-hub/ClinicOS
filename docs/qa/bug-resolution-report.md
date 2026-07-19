# ClinicOS — Import bug batch resolution report (#60–#73)

Batch: BUG-038 … BUG-051 (GitHub issues #60–#73), label `import`.
Processed sequentially in dependency order (root causes first), no same-area parallelism.

## Headline finding

**All 14 issues were filed against a STALE PRODUCTION build.** The discharge-import
subsystem was refactored to be narrative-only (REQ-026/028/029/030/033/035/036/037/038),
which already resolves the reported behaviours in committed code. Production still shows the
old behaviour because **every deploy pipeline (Railway backend, Azure SWA frontend, AI Import
E2E gate) fails at job-start with a GitHub Actions billing block** ("recent account payments
have failed or your spending limit needs to be increased"). The dominant fix for the batch is
therefore: **resolve billing → deploy current `main` → re-verify in prod → close passing issues.**

On top of that, three genuine code gaps/hardenings were implemented locally (see table).

## Per-issue triage

| Issue | Bug     | Title                            | Classification          | Resolved by                                                                               | Local change this batch                                          |
| ----- | ------- | -------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| #73   | BUG-051 | Narrative blocks not populated   | **Code gap (fixed)**    | REQ-035 + new save-block guard                                                            | `assertNoNarrativeSectionLoss` wired into confirm; tests         |
| #72   | BUG-050 | Legacy table renderer still used | **Resolved + hardened** | REQ-033 (narrative renderer mounted)                                                      | runtime contract assertion now runs in prod (was DEV-only no-op) |
| #62   | BUG-040 | Diagnosis exploded into 36 rows  | Resolved in code        | REQ-028/030/033 (narrative-only)                                                          | regression lock test                                             |
| #63   | BUG-041 | Diagnosis type/status inferred   | Resolved in code        | narrative-only (no structured fields)                                                     | regression lock test                                             |
| #64   | BUG-042 | Diagnosis rows with empty ICD    | Resolved in code        | narrative-only (no ICD field)                                                             | regression lock test                                             |
| #60   | BUG-038 | Duplicate allergies              | Resolved in code        | narrative-only allergies (`allergiesText`+status); legacy `allergene`-only merge bypassed | — (verify-on-deploy)                                             |
| #61   | BUG-039 | DOB format inconsistent          | Resolved in code        | import review uses `<input type=date>` + `toIso` ISO payload; `AAAA-MM-GG` label gone     | — (verify-on-deploy)                                             |
| #65   | BUG-043 | Clinical text truncated          | Resolved in code        | narrative cards render full multiline `SemanticTaggedText` (no fixed-width fields)        | — (verify-on-deploy)                                             |
| #66   | BUG-044 | No return to documents           | Resolved in code        | REQ-036 `reopenToDocuments` + "← Torna ai documenti"                                      | — (verify-on-deploy)                                             |
| #67   | BUG-045 | Page break interrupts blocks     | Resolved in code        | REQ-036 cross-page continuation (+ test)                                                  | — (verify-on-deploy)                                             |
| #68   | BUG-046 | Repeated header in extraction    | Resolved in code        | REQ-037 `filterRepeatedHeaders`                                                           | — (verify-on-deploy)                                             |
| #69   | BUG-047 | Initial dates not bold           | Resolved in code        | REQ-038 `datePrefix.ts` + `DATE_PREFIX` tag                                               | — (verify-on-deploy)                                             |
| #70   | BUG-048 | No permanent source compare      | Resolved in code        | REQ-035 v2 `onCompareSource` / "Confronta con il documento"                               | — (verify-on-deploy)                                             |
| #71   | BUG-049 | Import files not persisted       | Resolved in code        | REQ-035 v2 `persistImportDocuments` (`PatientDocument`)                                   | — (verify-on-deploy)                                             |

## Local commits (branches, NOT pushed — deploy/close held on billing)

- `fix/issue-73-narrative-original-text` — `33520f6` BUG-051 save-block guard + tests
- `fix/issue-72-import-contract-runtime-assertion` — `abf852f` BUG-050 prod contract assertion + tests
- `fix/issue-62-64-narrative-diagnosis-contract` — `f37d92b` BUG-040/041/042 regression lock

Each branch is off `main`, touches disjoint files → conflict-free merge.

## Verification status

- Backend `npm test`: 161/162 (1 PRE-EXISTING failure unrelated — `voice.test.ts:119`, REQ-041).
- New BUG tests: markdown-parse 16/16, patient-narrative 8/8, import-contract 6/6 — all PASS.
- Backend build PASS · Frontend build PASS.
- **Browser E2E + production verification: BLOCKED** by the Actions billing block — required before any issue can be closed per the mandatory deploy rule.

## Recommended next actions

1. Fix the GitHub **Billing & plans** spending limit/payment.
2. Merge the three fix branches (and re-run CI) → deploy current `main` (Railway + Azure SWA).
3. Re-verify each issue against the redeployed prod (Playwright). Expectation: the narrative
   review replaces the legacy tables and the reported symptoms disappear.
4. Close the issues that pass, attaching before/after evidence + commit + deploy manifest.

## Separate finding (not in this batch)

- `voice.test.ts` "execute: double confirmation does NOT duplicate (idempotent replay)" (REQ-041)
  is **red on `main`** independent of this work — worth its own ticket.
