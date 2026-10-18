# Task Validation Report

Group: #450, #472, #473, #475, #476. Branch `codex/bug-batch-450`. Baseline `a516d42e31f6674c39c1d130c9706cd80a7ab4c6`. Implementation round 1/4 unchanged. Historical PR469 source head `29b2f5c9b72b4d909b954d5360ec08095825f29e` was adopted as scoped source; no historical validation verdict was inherited.

## Result

The implementer completed the grouped fixes and verified the final unchanged source using **17/17 real full-stack checks in Docker mode and 17/17 in native PostgreSQL mode**, with zero unexpected browser console/page/relevant HTTP errors. Both runs use fresh synthetic data, actual browser fields/canvas/HTTP upload, real backend/parser/storage/jobs/drafts and SQL persistence. Source receipts match across both runs and the final worktree. The owned native child database is removed; its isolated parent remains without public tables. All seven frozen packet/amendment hashes remain intact.

**Independent QA, external Claude review, required CI, publication and verified release remain pending controller gates. No commit, push, PR, GitHub state mutation, external Claude invocation or issue closure was performed by the implementer.**

## Acceptance and evidence

| Issue | Implementer verification | Evidence |
|---|---|---|
| #450 | Two combined/document+manual choices at 1180/820/390 widths; actual Tab/Enter and ShiftTab/Enter activation; automatic admission dates remain incomplete; complete one-page manual form retained; real synthetic patient created and read after browser reload and SQL query. | `evidence/issue450.png`, `.zip`, `.webm`; both mode results |
| #472 | Full viewport review with persistent original; editing the address then closing saves its actual SQL value; exact draft appears in the list and resumes after reload; required/recommended fields remain distinct. | `evidence/issue472.png`, `.zip`, `.webm`, responsive PNGs |
| #473 | Valid-CF missing sex is reviewable and explicit contradictory values are preserved in behavioral tests. Real heading-free parser produces reviewable prescriptions retaining provenance/times, with zero administration events. Actual demographic and therapy fields are edited beside the original at all three widths; edited therapy note survives close/reload/resume. | `evidence/issue473.png`, `.zip`, `.webm`, handoff PNGs; backend report |
| #475 | Two real PDF thumbnails and selected JPEG2000 scanned page render nonblank pixels through PDF.js/OpenJPEG; correct development decoder URL is reproduced/red then fixed; production/non-root/version/security resource tests remain green. Source is denied anonymously and to another operator without leaking synthetic identity. | `evidence/issue475.png`, `.zip`, `.webm`; decoder regression logs |
| #476 | Name/surname/validCF can progress while missing DOB remains null; invalid CF and supplied future date show actual blockers; unsafe prescriptions are explicitly left in draft before the real 201 commit. 200 replay produces the same patient and no duplicate; incomplete registered identity remains actionable after reload. Existing duplicate/conflict regression coverage is retained. | `evidence/issue476.png`, `.zip`, `.webm`; real SQL/readback assertions |

At 390x844 the final shell has `scrollTop=0`, y0/bottom844, and 79.2px of actual original canvas remain visible with 276 dark PDF pixels while the therapy note is edited. The runner intersects actual canvas/stage/host/viewport bounds, checks absence of overlay occlusion and horizontal overflow, and measures actual field values. Phone/tablet images were inspected by the implementer. Prior development failures are retained as diagnostics, not current verdicts.

## Checks

| Check | Result | Record |
|---|---|---|
| Full frontend suite | 1386 passed, 0 failed, 0 skipped | `logs/frontend-all-tests-release-candidate.log` |
| Frontend build on final layout | PASS | `logs/frontend-build-final-layout.log` |
| Backend build/typecheck | PASS; backend source hashes match the tested subtask receipt | `logs/frontend-build-simplified-rerun.log`, `backend-import-subtask-report.json` |
| Targeted backend behavior | 74 pure tests passed; three existing DB-only seed tests deliberately excluded from that pure run | `backend-import-subtask-report.json`, `logs/backend-import-subtask.log` |
| Docker real full stack | 17/17 PASS, no errors | `test-results/docker-mode/fullstack.json` |
| Native real full stack | 17/17 PASS, no errors | `test-results/native-mode/fullstack.json` |
| Native isolation/cleanup | Parent 0 public tables; owned child absent after cleanup | `test-results/runtime-modes.json` |
| Source/frozen packet integrity | PASS; 30 changed source files within 47 allowed files; both source receipts identical | `test-results/runtime-modes.json`, `scope-receipt.json` |
| Trace/privacy integrity | ZIPs structurally valid, trace JSON parses, ephemeral simulator tokens redacted; frontend secret scan 0 findings | `test-results/trace-integrity-scan.json`, `logs/frontend-secret-scan-final.log` |
| Whitespace | PASS | `git diff --check` |

## Runtime boundaries

Only external OCR/extraction inference is a deterministic synthetic fixture; paid-provider inference is **not verified**. Medication extraction does not inject expected therapy rows: the real backend parser handles heading-free OCR prose. The font dependency fixture serves actual pinned official font bytes from the bundled relative-path assets, verified against registry integrity, licence and file hashes; actual font loading and normal/bold geometry are asserted. Business APIs, application fields, canvas results and database queries are real. See `test-results/runtime-provider-contract.md` and `implementation-notes.md`.

The canonical harness **does not acquire flock**. In this shared environment its caller must hold a single outer `flock /tmp/clinicos-browser-qa.lock` through the entire database/service/browser/teardown lifecycle. The local two-mode driver uses that same outer lock and no nested lock. Native CI directly uses the trusted PostgreSQL16 parent at loopback 5432/clinicos_test and creates only its owned child. Local native proof used an explicitly marked separate fixture on 55450; it never accessed the pre-existing 5432 service.

## Controller handoff

Run independent QA against these stable source files, with a separate output directory containing a copy of the bundled `font-assets/`. Complete required CI, including classification of the historical unrelated PR469 proactive denied-access-ack test U; this implementation changes none of its assertions or production behavior. The pure backend result above does not claim that the complete backend suite ran on this branch. External Claude review and release verification must finish before issue closure.

Final decision: **IMPLEMENTED — NOT VERIFIED BY INDEPENDENT QA**.
