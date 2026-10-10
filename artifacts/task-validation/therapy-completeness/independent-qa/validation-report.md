# Independent QA report — issue #432 assigned-prescription stage

Final Decision: FAILED VALIDATION

The mandatory whole gate is not green. The full frontend suite has 12 failures, and the broader import reconciliation acceptance criterion remains unresolved. No deployment, publication or issue closure is authorized by this report. Successful scoped evidence below does not certify the entire medication-completeness goal.

## Ownership and source

- Dedicated fresh reviewer `/root/therapy_complete_qa`, not the application implementer/coordinator.
- Isolated checkout `C:/w-therapy-qa`, detached candidate `14a03038f758cf728e563807752da1642dc35fa8`.
- Exact base `30f0b14d63ae69acec66cd82dcaee1d0abbb1cf6`.
- Sole QA-artifact writer in `artifacts/task-validation/therapy-completeness-qa`; no application edits, push, deployment, real API/DB access or patient writes.
- Launcher line-ending-only dirt was preserved and excluded. No application working diff against frozen HEAD.
- Root released browser lane before QA. QA used allowlisted local port7543 exclusively, then stopped its owned server and returned the lane.

## Mandatory phases

| Phase | Result | Objective evidence |
|---|---|---|
| 0 Contract | READ | `task-contract.md`, `issue.json` (#432 initial OPEN snapshot; comments empty at creation) |
| 1 Full application diff | PASS scoped | Eight frontend files; no backend/schema/routes/env/dependency changes; `source-receipt.json` |
| 2 Focused tests | PASS | `logs/focused.txt`, 46/46 |
| 2 Independent adversarial tests | PASS | `logs/adversarial.txt`, 5/5; repeat cursor, cross-page duplicate, cancellation ignoring abort, cap, print cursor/cache mismatch |
| 2 Types / production build | PASS | `logs/types.txt`, `logs/build.txt`; only existing large-chunk warnings |
| 2 Full regression | FAIL | `logs/regression.txt`:1308 tests,1296 pass,12 fail. Exact failure names match supplied independently source-bound baseline comparison (`root-regression-comparison.json`); no introduced failure observed, but this is not an exemption from the mandatory gate |
| 3 Real-component Playwright | PASS scoped | `logs/playwright.txt`:10/10; `playwright-report/index.html`, `test-results/` traces/videos/screenshots |
| 3 Readable responsive result proof | PASS scoped | `logs/readable-playwright.txt`:2/2; `readable-report/index.html`, `readable-results/` traces/videos/screenshots |
| 4 Security/privacy | PASS scoped | `logs/secret-scan.txt`:0 findings in source/build/QA fixture/surface/build; manual checklist below |

## Acceptance criteria assessment

- AC1: Audit explicitly incomplete. Imported medicine parser/reconciliation defects reported by investigators are not fixed by this frontend candidate. This QA did not certify import/OCR, confirmation or DB persistence.
- AC2: PASS assigned-display stage. Actual complete plan has106 active names and2 inactive names, including prescriptions after page100, future one-off, off-weekday, incomplete and conditional prescriptions. Short replies yield explicit error and retry; patient switch both during a pending read and after a loaded inventory shows only current-patient rows. Refresh re-reads immutable synthetic manifest, not real DB persistence.
- AC3: PASS scoped day/week applicability. Week PRN deduplicates two synthetic prescriptions; future-only PRN has no today button; future week exposes no registration buttons. No PRN is manufactured as a scheduled event.
- AC4: PASS missing-feed read-only. Loaded feed covering one drug does not hide absent drug. Independently tested foreign-patient feed and second occurrence of the same therapy in the same fascia at10:00 while feed represents08:00; original prescription stays visible without a registration button or fabricated administration identity.
- AC5: PASS tested count/cursor failure paths. Printing list rejects a terminal short response and inconsistent terminal cursor. This does not claim complete print authorization/data-shape hardening or fix any previously existing parser omission.
- AC6: PARTIAL. Dedicated QA, focused/build and responsive actual-component evidence exist. Mandatory full regression is not green, baseline browser reproduction and final release/deployment are outside this QA lane. Overall issue/goal stays open.

## Independent graphical probes

The original six implementer scenarios were independently rerun; four additional actual UI probes were authored in this QA checkout: already-loaded patient switch; two exact hours within one fascia; foreign-patient feed cannot suppress a prescription; off-date/inactive/incomplete/conditional medicine inventory. Additional readable proof captures result elements rather than downscaled14k-pixel full mobile pages.

Readable clips inspected visually:

- `readable-results/readable-mobile-readable-v-cc45b-icines-PRN-and-missing-feed/mobile-prn-readable.png`
- `readable-results/readable-desktop-readable--65152-icines-PRN-and-missing-feed/desktop-missing-feed-readable.png`
- Corresponding desktop/mobile late-plan viewport clips and native traces/videos are in those same directories.

## Security checklist

| Check | Result |
|---|---|
| Secrets | Scanner0; no credentials configured or read by QA; fixtures contain only synthetic IDs |
| PHI | No real patient identity/document/therapy; names explicitly synthetic; no production responses |
| Logging | No added production logging; command/test logs are synthetic evidence |
| Input boundary | Scoped all-page reader validates patient/state/identity/summary/page size/count/cursor/cancellation;5000-record cap and timeout retained |
| Authorization | Existing role/capability gates unchanged; explicit empty capability map denies all writes in QA surface; missing-feed prescription has no write controls |
| Injection | React text rendering; no new raw HTML/SQL or user-supplied selectors/URLs |
| Dependencies | Manifest/lockfile unchanged |
| Config | API/env/CORS/auth unchanged; QA entry lives under artifacts, not production application imports/build entry |
| Network safety | Static same-origin7543 and public Google font GET allowlist only. All clinical GETs intercepted synthetically; unknown requests and every mutation blocked. Each scenario asserts zero blocked requests, zero console/page errors and zero HTTP4xx/5xx |

## Limits and handoff

No new scoped correctness/security finding was reproduced. Nevertheless, the mandatory verdict is FAILED VALIDATION, not READY FOR CODEX QA, because the full suite fails and the whole issue still has unresolved import criteria. Root must preserve these limits in any pinned partial-evidence comment and must not represent issue#432 as resolved. No screenshot alone proves clinical completeness or a deployment.

Codex must now re-run the QA Gate.
