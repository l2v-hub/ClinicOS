# Independent issue 419 QA gate

Final Decision: READY FOR CODEX QA

Application: fa028c11ffe5dbfe514df8110e6ccf7f6b977602. Accepted baseline: d028e1ee4c5c44d96b5005362b28f54e5c05fee1. Detached isolated checkout C:/w-419-qa; application/config/dependency tracked files not edited. Known unrelated launchers left untouched.

| Phase | Result | Evidence relative to this independent bundle |
| --- | --- | --- |
| Original contract | PASS, literal four original AC and no comments | original-issue.json, task-contract.md |
| Six-path independent review | PASS, no scoped correctness/security finding | diff-review.md |
| Frontend/backend types, tsc/Vite build | PASS independently executed | commands/*types.log, commands/frontend-tsc-build.log, commands/vite-build.log |
| Focused | 16/16 PASS, no skips | commands/focused.log |
| Full frontend regression | 1230 total / 1218 pass / 12 exact known baseline failures; 0 new, 0 skipped | commands/full-regression.log, commands/command-results.json |
| Browser | 13/13 PASS new independently authored scenarios; actual SPA/config/compiler in own loopback7493 | recipe.mjs, server.mjs, attempt-1/run/test-results/results.json |
| Security | PASS scoped review and frontend secret scanner; expanded artifact scan zero findings | diff-review.md, commands/security-scan.log, privacy-scan-receipt.json |
| Exact source binding | 1466 tracked inputs before/after same physical hash 82a6918c8c29796b0501f27eead6c859fac0ea2ef22a3ee227be45a6e9bffd06; canonical per-file Git blob binding verified | source-before/source-receipt.json, source-after/source-receipt.json, canonical-source-receipt.json |

| Original AC | Result and runtime proof |
| --- | --- |
| Same authorization button/slots | PASS denied daily/weekly mouse/key have no creation; runtime focus revocation closes open dialog; restore cannot resurrect draft. denied-role-daily-and-weekly, permission-revocation-and-restoration traces/guards. |
| Primary usable or visible requirement text | PASS empty day primary opens date/time; past/full/after-hours/denied visibly explain. The stale-clock click recheck rejects primary/slot/key after time advances without render tick, then minute tick updates visible state. |
| Empty comprehensible creation path | PASS explicit primary-or-slot guidance with patient-in-form requirement; empty-primary-explicit-context and mobile-visible-help-and-context. |
| Empty, populated and missing patient | PASS primary/slots date/time asserted; populated status-hidden occupancy remains blocked and primary chooses08:30; patient absent disables save, required text visible, choosing synthetic patient enables save. |

13 final outcome PNGs in attempt-1/run/screenshots/, 13 trace ZIPs in attempt-1/run/trace/, 13 original webm recordings in attempt-1/run/video/, real assertion and request guard JSON in attempt-1/run/test-results/. attempt-1/run/playwright-report/index.html is honestly labelled a **Playwright-library assertion receipt**, not the Playwright Test CLI native HTML reporter. No skipped/flaky case or doctored application override. All artifacts and .source pre-run recipe snapshots retained from the original attempt. No failed attempt occurred. Screenshot pixels inspected for desktop explicit context, full-day reason, past-day help, and mobile required patient/date-time form; no clipping of the new help or new patient guidance.

Limits: original issue did not ask final save; save never clicked, so no backend/DB persistence or final authorization-API outcome claim. All clinical APIs intercepted before network, no production patient writes; simulator POSTs/search POST are synthetic fixtures. The injected browser clock is a controlled test clock, not actual wall-clock recency. No ward hardware, real screen reader, intensive light/glove/device signoff. Admin calendar temporal behavior unchanged. Full suite is not globally green; 12 pre-existing pinned failures explicitly disclosed.

Before browser execution, prepare.mjs captured recipe/fixture/server/config hashes and bytes in attempt-1/before/ with .source suffix. No archived recipe discovery. Source receipt before build and after browser matches. Immutable manifest seals every original proof file; own Vite cache is separately hashed and excluded from proof. Server own PID stopped by exact command-line check before seal; root servers left alone. Codex/root must inspect full report and recipe, validate manifest, and independently rerun before publication. No Git write, publication, deployment or issue change was performed by QA.

Codex must now re-run the QA Gate.
