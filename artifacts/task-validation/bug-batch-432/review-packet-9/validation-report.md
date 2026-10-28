# Validation Report — PR483 QA9 candidate

Final Decision for the scoped writer correction: **READY FOR CODEX QA** at `e405399427e7c738dc32070b17a50494b629608b`.

This is a limited independent QA verdict. It confirms the legacy one-off writer correction and selected current-runtime checks. It does not make the retained QA7/QA8 history into a clean global run or approve overall PR release.

The exact QA9 `summary.json` retains `retained.noClinicalRuntime=true` as inherited preparation-phase metadata. QA9 subsequently executed the 19 HTTP/PostgreSQL tests and four selected actual App/HTTP/SQL continuation checks described below; the sealed summary is copied byte-for-byte and left unchanged.

| Check | Result | Evidence |
|---|---|---|
| Contract and scoped diff review | PASS | independent-qa/validation-report.md; private QA9 static review retained in the sealed QA9 directory |
| Actual-writer pure tests | 15 PASS, 0 FAIL, 0 SKIP | QA9 summary; complete stdout remains in the sealed private QA9 directory |
| Slot scheduling | 4 PASS, 0 FAIL, 0 SKIP; 19 combined | QA9 summary |
| Affected HTTP/PostgreSQL file | 19 PASS, 0 FAIL, 0 SKIP | QA9 summary; 3 new top-level tests contain outcome/priority/identity loops |
| Backend official types | PASS | QA9 summary |
| Fresh private Vite build | PASS | QA9 summary |
| Selected actual App/HTTP/SQL continuation | 4 PASS | QA9 summary and published safe screenshots/video; no UI correction button claim |
| Security / integrity | PASS | QA9 report and sealed QA9 integrity records; 61,120 checks, 0 errors |
| Historical final Codex F1 | FAILED VALIDATION on earlier source | history/actual-final-codex-failed-report.md and summary |
| Overall PR/release status | PENDING | native publication checks, actual Claude5, fresh final Codex, and release/deployment decision remain root-owned |

Runtime specifics: four actual rendered valid/repaired legacy given/refused cases survived reload; 14 stale/pending/omitted/already-given authenticated HTTP requests returned 409 with full SQL rows and receipts unchanged; two explicit observed-refusal corrections each changed one historical row, created zero clinical rows and one receipt, retained the historical ID/null therapyId/date/band, and attributed actor `SIM-NURSE-1`. Keyed replay remained stable; non-keyed repeat returned 409. Corrections used authenticated HTTP after a rendered refusal, not a UI correction control. Page, console, HTTP and UI administration-post errors were zero.

The first QA9 runtime attempt failed during a private SQL snapshot before browser launch because the harness assumed a nonexistent receipt `id` column. Its failure remains in QA9 history. A separate continuation corrected the private snapshot ordering and passed only the remaining UI phase; it did not rerun the already passed HTTP19, types or build. The prior author report and final failed source review also remain unchanged.

Remaining unrun work: unchanged full backend/frontend suites; the unchanged original seven-feature/QA8 browser matrix; the scheduled individual drug-dose actual App mount; native current-publication checks; actual Claude5; fresh final Codex; and any release/deployment action. No closure or release status is asserted.
