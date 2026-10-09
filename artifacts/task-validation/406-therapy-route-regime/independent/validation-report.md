# Independent QA — issue #406

Final Decision: READY FOR CODEX QA

Independent application candidate: `c11c0990f6313a53a8bcde467046eecef69e012a`.
Released baseline: `45f3582dae64b0f34d2c1181286ed1d919d85d97`.
Application source hash: `dbf9633c6e28bef714e813852b3c954d79b79d2e1dd790a966f38ca6868a3895` (1,427 tracked source/schema/manifest/build inputs; exact scope/file hashes in `source-receipt.json`).
Application source matches the frozen commit, with no untracked application overrides. Whole checkout is not claimed clean: unrelated launcher changes/generated coordination metadata are excluded. #405 application changes are not part of this candidate.

## Gate

| Phase | Result | Evidence relative to this report |
| --- | --- | --- |
| 0 Contract | PASS: independently read issue body/comments and validated scoped AC1–4 | `../issue-source.json`, `../task-contract.md` |
| 1 Diff review | PASS: 11 scoped application/test/document files; no schema, dependencies, auth capability or deploy-config edits | Frozen diff `45f3582d..c11c0990`, `source-receipt.json` |
| 2 Types/build | PASS frontend/backend types, frontend tsc/Vite, backend tsc/font-copy | `command-results.json`, corresponding `.log` files |
| 2 Focused tests | PASS frontend 38/38; backend 48/48 | `frontend-focused.log`, `backend-focused.log` |
| 2 Full frontend suite | Baseline waiver: 1,179 total / 1,167 PASS / 12 exact existing failures / 0 NEW | `full-regression.log`, `command-results.json` |
| 2 Real database | PASS 6/6 issue-specific API/persistence cases, 56 migrations; additional existing scoped regressions 21/21 | `db-results.json`, `db-regression-results.json`, 3 `db-regression-*.log` |
| 3 Actual SPA | PASS 9/9 desktop 1280×720 and mobile 390×844, guarded synthetic API transport | `test-results/browser-results.json`, `playwright-report/index.html`, 3 traces, screenshots, 3 named videos |
| 4 Security | PASS scoped review/zero secret-scan findings; no new dependencies or real patient data | `security-scan.log`, checklist below |

## Acceptance evidence

AC1 — All 13 actual route choices are enumerated/asserted in browser JSON, with no programming regimen. Shared create/edit/intake unit tests cover variants. Ambiguous legacy route is not an option: select shows review placeholder, associated field error and `aria-invalid`, while original transport record remains `al bisogno`. Desktop/mobile field screenshots show the actual review message.

AC2 — Selecting Periodica → Al bisogno → Una tantum → Periodica preserves `SC`, `10:30` and quantity 2. The PRN preview contains no latent scheduled time; create payload keeps `SC`, `al_bisogno`, `schedules:[]`, and actual SPA edit after reload/re-login retains these values. Re-login is required by the existing dev simulator; fixture state is not reset. No real database persistence is attributed to this browser mock.

AC3 — Actual preview labels separately expose `Tipo terapia` and `Via`. Legacy preview says `Via: da verificare`; repaired preview shows `Via: SC` with `Tipo terapia: Al bisogno`. Native label click focuses the route select; Tab focuses the selected regimen radio. Calendar-created dialogs on desktop/mobile retain route/type and Escape closes with no write. Mobile has no horizontal page overflow. No real screen-reader or hardware-sunlight validation is claimed or required for #406.

AC4 — Real isolated PostgreSQL tests establish HTTP400/zero created rows for 6 regimen variants × 3 types; partial legacy edits/reactivation leave persisted state exactly unchanged; exact suspension/conclusion update only `stato` (and normal `updatedAt`), preserving route/type/dose/protocol; explicit reviewed fixed-dose repair persists `SC`/PRN with no schedules. Actual aliases remain accepted across all three types. Unauthorized/out-of-scope mutations return 401/403/404 and leave DB unchanged. Shared intake preflight also rejects regimen-as-route before writes. The doctor-led review procedure is in `docs/therapy-route-regime-review.md`; no data migration/conversion/production patient scan is performed.

## Result media

- `screenshots/desktop-created-prn-after-reload.png`: saved synthetic PRN, route/type separated after reload.
- `screenshots/desktop-legacy-review-field.png`: nonselectable legacy route and explicit review error.
- `screenshots/desktop-legacy-review-no-conversion.png`: legacy preview remains “da verificare”.
- `screenshots/desktop-legacy-repaired-after-reload.png`: explicit repair persists `SC`/Al bisogno after reload.
- `screenshots/mobile-legacy-review-field.png` and `screenshots/mobile-route-regime-separated.png`: mobile review and distinct resulting values.
- `screenshots/desktop-calendar-create-dialog.png`, `screenshots/mobile-calendar-create-dialog.png`: actual shared form/dialog result before verified Escape cancellation.
- `screenshots/denied-role-controls.png`: nurse lacks prescription edit/create controls, zero writes.
- `trace.zip`, `mobile-trace.zip`, `denied-role-trace.zip`; `video/desktop.webm`, `video/mobile.webm`, `video/denied-role.webm`.
- `playwright-report/index.html`, `test-results/browser-results.json`: exact assertions and guarded request/write observations.

All media use synthetic names/IDs/drugs. These are current-code result screenshots, not a claim to have reproduced the earlier PHI-containing live audit images. Initial state screenshot `desktop-periodic-before-prn.png` is before regimen selection, not before the code change.

## Security / scope review

- No token, real credential, real PHI, raw SQL, HTML injection, dependency/schema/CORS/production-flag changes.
- Route guard is a bounded scalar-input check. It classifies existing known regimen tokens without normalizing/persisting/inventing a clinical route, and preserves valid aliases/custom routes.
- PUT guard runs after the scoped therapy lookup and before transaction. The exact raw one-key legacy status exception bypasses dose rewriting; all other legacy repairs require explicit nonblank route and valid explicit type.
- Existing `requireOperator` / `requirePatientScope` remain unchanged. Real DB 401/403/404 and PRN role/capability regressions pass; browser denied nurse has no mutation controls/requests.
- React renders labels/errors/text safely. API error does not erase the form or silently update the synthetic original.
- Browser external requests abort; no unexpected API/external call occurred. Unexpected runtime/console/HTTP errors are zero. One intentional nominal HTTP400 and its browser resource-error console line are recorded for the negative save test, not concealed as a success response.
- Real database clusters are newly initialized loopback-only, use no inherited database URL, and shut down after testing. Additional DB-test provider credentials are blank/mocked; no external AI invocation is used.

## Honest harness attempts / remaining limits

Initial harness attempts failed because the simulator requires re-login after reload, button accessible name includes the drug name, and API `allowedFractions` is a string rather than a form-state array. These fixtures/locators were corrected using application source without changing or weakening assertions. Initial DB-regression wrapper incorrectly enabled simulator-only auth for legacy X-Operator header tests; final wrapper enables it only for the session-based PRN suite. Correct final suites pass 6+6+9. Initial media are preserved separately in `debug-attempts/` and excluded from the successful publication manifest. A move attempt during active recording was prevented by Windows file locking; final named media were completed and verified after browser exit.

Local PostgreSQL is 18.4; CI uses 16. This is genuine local persistence evidence, not a claim of identical CI environment. The 12 existing frontend failures are explicitly waived by the source-bound root baseline, not presented as a clean full suite. No production deployment was executed or verified by this QA worker; root must re-run this gate and perform the independently authorized release/deployment proof before any issue closure. No application fixes were authored by QA.

## Re-run (PowerShell, cwd C:/w-406)

```powershell
$env:QA406_OUTPUT='artifacts/task-validation/406-therapy-route-regime/root-independent-rerun'
$env:PO05_PG_BIN='C:/Users/Claudio/AppData/Local/Temp/claude/C--Workspace-ClinicOSHouse/8f38df7f-f662-4544-a826-be262b0e6cf2/scratchpad/pg/node_modules/@embedded-postgres/windows-x64/native/bin'
node artifacts/task-validation/406-therapy-route-regime/qa-commands.mjs
node --import tsx artifacts/task-validation/406-therapy-route-regime/qa-db.mjs
node artifacts/task-validation/406-therapy-route-regime/qa-db-regression.mjs
node artifacts/task-validation/406-therapy-route-regime/qa-source-receipt.mjs
# Start separately, one browser lane only; owned port 7470:
node artifacts/task-validation/406-therapy-route-regime/qa-server.mjs
# While server runs, second terminal:
node artifacts/task-validation/406-therapy-route-regime/qa-browser.mjs
```

Lifecycle: browser contexts close; both issue-specific and extra regression PostgreSQL fixtures shut down with exit0; owned Vite7470 is stopped and no task PostgreSQL process remains at handoff. No other writer/server was stopped. Root receives ownership after this report is frozen.

Codex must now re-run the QA Gate.
