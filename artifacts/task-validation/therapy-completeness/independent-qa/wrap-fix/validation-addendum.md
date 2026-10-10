# Fresh independent QA — canonical PRN wrap correction

Final Decision: FAILED VALIDATION

Candidate `8490fa9b97bbad159dd758aec6fbde3f7f87ea8f`; previous candidate `14a03038f758cf728e563807752da1642dc35fa8`; original base `30f0b14d63ae69acec66cd82dcaee1d0abbb1cf6`.

## Scope and preservation

Dedicated QA updated its detached isolated checkout only after retaining historical evidence. Original151 artifacts and174 styled-addendum artifacts are hash-verified unchanged. New evidence lives exclusively in `wrap-fix/` plus `wrap-fix-surface.tsx`.

Exact frontend delta is one existing class addition on the PRN button: `ds-btn--wrap` at `frontend/src/components/operator/cartella/PatientTherapyCalendar.tsx:326`. No global CSS, backend/API/schema/env/dependency or application behavior change. The candidate commit also includes244 historical proof files already staged by the integration owner; this QA certifies the frontend delta and generated QA evidence, not a new claim about every historical evidence file. No application writes/push/deployment by QA.

## Fresh results on8490

| Check | Result | Evidence |
|---|---|---|
| Focused and independent adversarial tests |51/51PASS |`logs/focused51.txt` |
| TypeScript project build |PASS |`logs/types.txt` |
| Production Vite build |PASS |`logs/production-build.txt`; existing large-chunk warnings only |
| Actual components, canonical global styles |10/10PASS |`logs/browser10.txt`, `playwright-report/index.html`, `test-results/` traces/videos/screenshots |
| Readable responsive result clips |2/2PASS |`logs/readable2.txt`, `readable-report/index.html`, `readable-results/` traces/videos/screenshots |
| Fresh mobile390 and desktop1256 geometry |2/2PASS |`logs/geometry2.txt`, `geometry-report/index.html`, `geometry-results/` JSON/PNG/trace/video |
| Secret scan source/production build/new QA inputs |0 findings |`logs/secret-scan.txt` |

No page/console errors, HTTP4xx/5xx or unknown/mutating requests in the successful browser scenarios. Synthetic clinical GET interception and deny-all capability map are retained. QA lane7543 was acquired after root release, used serially, then its owned server stopped.

## Layout finding retested

Previous canonical mobile PRN control right349.359375 exceeded card right329. On8490, measured right316 is within card right329 (width242); label wraps onto two fully readable lines. Desktop measured right826.03125 is within card right1195. Actual mobile result clip was inspected visually. The previously recorded PRN card-fit failure is no longer reproduced on the new exact source.

## Whole-gate limits retained

This is not unconditional READY FOR CODEX QA. Whole issue#432 remains unresolved: import reconciliation has reproducible omissions, and the original independent full-suite run on14a was1308 tests/1296PASS/12FAIL, with exact baseline failure names. Full regression was not rerun by this QA on8490; its single-class delta was reviewed and fresh focused/browser/build checks run. No full-suite waiver, no import/OCR/DB-persistence certification, and no production deployment/issue closure/full-goal completion follows from this report. Overall mandatory verdict remains FAILED VALIDATION.

Source/evidence hashes and immutable historical preservation receipt are in `wrap-artifact-manifest.json`.

Codex must now re-run the QA Gate.
