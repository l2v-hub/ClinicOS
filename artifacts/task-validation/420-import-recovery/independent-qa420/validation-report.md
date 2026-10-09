# Independent QA #420

Final Decision: READY FOR CODEX QA

Fresh independent session; application commit **c00bff678dfc9845c31742bc5d0d750fbbb9603e**, baseline **fa028c11ffe5dbfe514df8110e6ccf7f6b977602**. No application/config/Git edits, publication or deployment by QA. Initial assigned 57 candidate superseded before runtime; all execution snapshots bind c00, even though preserved pre-run contract-header text still names initial assignment. Independent GitHub issue/comments retrieval: issue-original.json (four literal AC, no comments).

| Phase | Result | Evidence |
| --- | --- | --- |
| Contract | PASS — four original AC, explicit audit limitations | task-contract.md, issue-original.json |
| Diff review | PASS — only modal, API, pure recovery helper and tests; no correctness finding remaining at c00 | security-review.md; exact source/canonical receipts |
| Build/types | PASS — actual frontend config/React compiler; frontend/backend noEmit; tsc build and Vite build | commands/*.log, commands/results.json |
| Focused tests | PASS — 32/32 all import tests + capabilities | commands/import-focused.log |
| Full regression | 1238 total / 1226 pass / 12 fail, exact same failures as pinned accepted419; zero new | commands/full-regression.log, regression-comparison.json, accepted419-full-regression.log |
| Browser | PASS — 20/20 fresh adversarial cases, desktop1150x1004/mobile390x844 | attempt-2/run/test-results/results.json; per-case guards; screenshots/trace/video/report |
| Security | PASS scoped — no new AuthZ/PHI/XSS/config/dependency finding; frontend source scanner 0 critical/high, three pre-existing medium outside changed paths | security-review.md, security-scan.log, scanner-generated-state.json, privacy-scan-receipt.json |

## Original acceptance evidence

1. Unavailable never claims preservation: authoritative expired/cancelled/confirmed200 distinctly rendered, masked404 neutral, no replacement POST, neutral close label. `attempt-2/run/screenshots/authoritative-expired.png`, authoritative-cancelled.png, authoritative-confirmed.png and masked404-neutral-not-deleted.png; corresponding `.zip` traces and guards. Terminal poll/mutation clear stale saved-page UI. Future/undated saved pages alone show qualified availability; past/invalid/clock expiry doesn't fabricate terminal status.
2. Explicit new: `creation-pending.png`, `creation-success.png`, `mobile-creation-success.png`; status announcements are actual role=status text. Keyboard-visible footer close returns to patients. Client close/reload preserves new opaque ID and no duplicate creation. Lost-response fault conservatively says retry without a new import and reuses exactly the same idempotency key. No actual backend idempotency/DB claim: controlled transport fixture models that contract.
3. Distinct terminal and temporary: all three terminal states separately tested; 503/network/403 retain original reference with retry and zero creation POST; nested result/page404 do not classify parent deleted. Alternate actor does not query old actor reference. Explicit expected HTTP status/text/URL/counts are matched exactly; zero unexpected HTTP, console, page errors, external/API escape or guarded domain writes.
4. No general malfunction claim: original audited explicit new already worked; source change corrects recovery explanations and conservative presentation only. No claim that fresh sessions incorrectly expire; backend/provider/OCR untouched.

## Visual inspection

Independently viewed original desktop expired PNG, mobile terminal BEFORE close PNG and creation success PNG pixels. All actual outcome text, New and visible return fit with no horizontal overflow; desktop modal aligned and mobile wraps. Mobile post-return assertion is separate, not substituted for terminal result screenshot. Canonical public suggestion: `attempt-2/run/screenshots/authoritative-expired.png`, `creation-success.png`, `mobile-terminal-before-return.png`. Parent must visually inspect originals and rerun.

## Retention, provenance and limitations

Attempt1 retained intact: six PASS cases then strict expected guard failed only because own fixture mapped403 to `Internal Server Error` instead of standard `Forbidden`; no app bug. Never ignored error. Corrected only own fixture and reran all in separate attempt2; original traces/video/screenshots/guards/pre-run source archives retained. See attempt-retention.md. Original `.source` recipes are bytes captured before each attempt; snapshotAt precedes first browser case. No reports overwritten; distinct attempt directories.

Actual runtime uses original `frontend/vite.config.ts` and React compiler on owned7503, no define/env/app overrides. Synthetic API interception installed before navigation, external requests aborted, fonts fulfilled empty CSS; source synthetic image contains only QA letters. No real clinical API requests or provider calls. Reload tests prove opaque frontend identity and fixture-state handling, not real persistence/extraction/clinical import completeness. Library assertion HTML receipt openly labelled, not a native Playwright Test runner report. Original raw trace/video and per-case result JSON remain rerunnable.

Source guard compares1468 physical files before/after and each against c00 Git blobs allowing only independently verified CRLF/LF differences; canonical-source-receipt.json. Known unrelated launchers untouched/outside app scope. Ruflo scanner wrote inert JSON in frontend path; source guard caught it and byte-preserving validated move retained own scanner-generated-state.json, no deletion, then source guard passed. Three inherited medium source heuristics not a global/CVE clean claim. Existing 12 tests remain failures, not represented as green. Desktop/mobile emulation not actual human hardware/ward/device signoff. CI/deploy/production compiled behavior belong to parent integration gate; no issue closure by QA.

Codex must now re-run the QA Gate.
