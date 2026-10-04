# Independent QA gate

Candidate: `203bb256d9ba913be84345be2259bd2c7652cafc`.
Reviewed range: `3fa81a27..203bb256`.
QA checkout: `C:/Workspace/ClinicOSHouse/.worktrees/ux-discovery-qa`.
The pre-existing change to `start-claude-team.ps1` was preserved and excluded from app/build identity. QA changed no application, test, backend, manifest or configuration source. No issue number was supplied; the user annotations and tracked task contract are the criteria.

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS | `../task-contract.md`, AC1–AC5; frontend-only release, no production persistence certification |
| 1 Diff review | PASS | Entire 15-file diff reviewed; `git diff --check 3fa81a27..203bb256` clean; findings below |
| 2 Build and tests | PASS | `test-results/focused.txt` 70/70; `test-results/discovery-focused.txt` 65/65; `test-results/build.txt` TypeScript project build and Vite, 664 modules; separate `tsc --noEmit` exit 0 |
| 3 Browser evidence | PASS | `test-results/runtime.json` 18 original groups plus independent HTTP observer; `test-results/discovery-runtime.json` 12 groups; screenshots, traces, videos and HTML reports below |
| 4 Security | PASS | Explicit checklist below; `source-receipt.json` records source/output identity and excludes QA markers from production assets |

## Diff findings

No correctness or security finding. `PatientDetail.tsx:2791` derives severe colour from actual severe allergies; one actionable band remains. `PatientRecordData.css:457` scopes red to severe clinical alerts; nonsevere remains amber. `DiarioPazienteTab.tsx:547` retains original priority and `:624` identifies the original author. `DiaryThreadReceipt.tsx:35` validates the shared protocol before rendering a named reader; `:48` renders the server identity and `:53` full facility date/time. `:63` retains the existing action and author restriction; `:77` distinguishes no confirmation required, historical unknown and absent protocol. Personal legacy reads stay distinct at `:92`. The existing mutation handler was not modified. New component 107 lines, CSS 76 lines. No backend/schema/API/environment/dependency edits.

## Browser assertions and visual review

- Severe red and mild amber computed colours verified in actual App, single band, no duplicated header/mobile strip, actionable management, at least 24 px bottom separation and no document/band overflow at 390 and 1150 px.
- Active signal identifies its author, waits for confirmation, exposes one explicit Ho capito to an eligible non-author, never to the author. Intentionally injected acknowledgement failure leaves the pending state and count intact.
- Successful server receipt attaches a response to the original entry, names Infermiere Test (Infermiere), preserves the urgent original priority, and renders `2026-10-03T16:35:00Z` as `03/10/2026 18:35` in Europe/Rome. Response and counters survive reload. Screenshots at 390 and 1150 px verified visually.
- Historical missing reader does not invent identity/time. Absent protocol stays unavailable. Real legacy personal-read fixture remains labelled personal. Verified nonurgent state requires no Ho capito and fabricates no clinical completion. No COMPLETATA or valore precedente chip.
- Existing responsive patient/dashboard, calendar, prescribing/administration permissions, invalid dose rejection, pagination failure/retry, malformed feed, navigation and expansion regressions passed.
- Original turno runner has no response-status listener. An artifact-only derived runner (`qa-harness.mjs`, `qa-turno-http.mjs`) adds status and transport observation without source changes. Only explicit 503 faults on `/consegne/critical/ack` and `/consegne/overview` are exempted; zero unexpected HTTP, transport or console errors. Discovery runner independently observes statuses and transport.

Final result screenshots: `screenshots/diary-thread-1150.png`, `screenshots/diary-thread-390.png`, `screenshots/allergy-severe-1150.png`, `screenshots/allergy-severe-390.png`, `screenshots/allergy-mild-1150.png`, `screenshots/allergy-mild-390.png`. Actual production App diary regression: `screenshots/actual-diary-1074.png`.
Traces: `trace/ux-turno.zip`, `trace/ux-discovery.zip`.
Videos: `video/ux-turno.webm`, `video/ux-discovery.webm`.
HTML report: `playwright-report/discovery.html`, `playwright-report/diary.html`.

## Security checklist

| Check | Result and scope |
| --- | --- |
| Secrets | PASS: full added-line review and secret-pattern scan of new code/tests found no credentials, keys or connection strings. Simulator fixture tokens are explicit synthetic local-only values. |
| PHI | PASS: only synthetic fixture patients/operators; no production browser or real API was accessed for QA. |
| Logging | PASS: no new product logging. Evidence records synthetic paths, outcomes and assertions. |
| Input validation | PASS: no changed endpoint; new receipt rendering requires existing runtime UrgencyView validation. Malformed identities/receipt never render success. |
| AuthZ | PASS: existing non-author/canAcknowledge policy and role gating preserved and independently exercised. No auth bypass. |
| Injection/XSS | PASS: names and clinical content rendered as React text; hostile name is escaped by the new unit test; no raw HTML or SQL introduced. |
| Dependencies | PASS: no new package, lockfile or manifest changes. |
| Configuration | PASS: no CORS/env/auth/prod flag changes. QA is local-only, all localhost API requests intercepted; production marker scan in source receipt is empty. |

## Limits

This gate verifies the frontend against the existing shared urgency protocol and persisted synthetic server state. It does not approve a backend/database release or certify online persistence. The previously identified production backend lacks the shared receipt protocol; the frontend must truthfully show unavailable until that separately authorized release. Ho capito remains required only for urgent notes in the existing protocol. Read/understood confirmation does not claim clinical intervention completion. Existing build chunk-size/deprecation warnings are nonfatal and pre-existing. Initial sandbox execution failed before test execution with Windows Node/tsx `uv_os_get_passwd` ENOMEM; the same scoped tests passed under approved escalation. No product test failed.

Final Decision: READY FOR CODEX QA
