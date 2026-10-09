# Independent QA — GitHub #411

## Verdict

READY FOR CODEX QA

Fresh QA agent did not implement or architect this fix and made no application, configuration, dependency, Git, deployment, or GitHub writes. Root remains sole application writer and release gatekeeper. Original issue and empty comment collection fetched directly from GitHub; no real-patient attachment inspected or reproduced.

## Exact source

- Application commit: `8b327ca55ab5d8d4c5e0c19afcb828c017eeb3df`.
- Accepted baseline: `47a4b16c111d9b9bfd0b138991958a8ca8f6c351`; regression proof `5c9f094fe62fa8deedf0c6b9fa7afd85022e87fd`.
- Source SHA256: `d5c10518d55750fb19731dbfbbd03da4b52b0769f8d25b83bff07d99fe781580`, 1441 tracked source/build inputs, identical independent before/after receipts.
- Source scopes clean and no untracked application override; known unrelated launcher line-ending difference excluded, not a whole-worktree cleanliness claim.
- Own Vite runtime bound only loopback 7474; closed after serialized browser execution and listener absence checked. No production-patient writes or real database writes.

## Original acceptance criteria

| Criterion | Result | Evidence |
|---|---|---|
| AC1: label, count and predicate represent same set | PASS | `independent-qa/commands/focused.log`; actual SPA dashboard7 global versus first page3/4, explanatory scope; exact known regime/signal intersections and empty0 chips; `independent-qa/browser/screenshots/desktop-broad3-loaded4.png` |
| AC2: Day Hospital/outpatient filters and states understandable | PASS | Strict canonical membership tests; supplied browser exact1 and later2 DH, outpatient1, nurse and physician; independently authored real native-keyboard Home/ArrowDown transitions; `independent-qa/adversarial-browser/screenshots/native-keyboard-day-hospital.png` |
| AC3: unavailable distinct from admitted and discharged | PASS | Null, omitted summary, legacy, empty/whitespace/unsupported inputs cannot become admission/discharge; state counters withheld when unverified, failure retains identities and retry recovers; guarded denied enrichment sends no prohibited summary request; `independent-qa/browser/screenshots/desktop-unavailable3-loaded8.png` |
| AC4: states and records without regime covered | PASS | Focused20/20, independent exhaustive/SSR3/3, supplied browser11 groups plus independently authored keyboard/sex composition2 groups; mixed pages/search/KPI reset, reload, mobile grayscale, loading/failure/retry/capability checks |

## Five-phase gate

| Phase | Result | Evidence |
|---|---|---|
| 0 Contract | PASS: original4 criteria and presentation-only scope | `task-contract.md`, directly fetched GitHub issue411 |
| 1 Diff | PASS: 16 scoped frontend source/test files; no backend/API/Prisma/config/dependency edits | Full accepted baseline-to-frozen diff inspected; strict equality classification and React-escaped static labels; original predicate/internal key retained |
| 2 Build/tests | PASS for focused/build/types, no new regression | `independent-qa/commands/command-results.json`: frontend/backend types, frontend tsc-b/Vite build, focused20 and secret scan exit0; full1195 tests/1183 pass/12 identical baseline failures, zero new |
| 3 Actual SPA browser | PASS local synthetic | `independent-qa/browser/test-results/browser-results.json`:11 groups;6 traces/videos and screenshot/report bundle; `independent-qa/adversarial-browser/test-results/browser-results.json`:2 further independently authored groups and trace/video/report |
| 4 Scoped security/privacy | PASS scoped, existing findings retained | Manual changed-boundary review plus independently checked scan:481 existing findings,7 unchanged dependency findings,0 touched-path findings; no new endpoint, permission, package, secret, unsafe rendering, or data write |

## Required validation areas

| Area | Test | Result | Evidence |
|---|---|---|---|
| Frontend | Type/build, focused, full delta, actual SPA and visually inspected desktop/mobile | PASS scoped;12 unchanged suite failures disclosed | `independent-qa/commands/`; `independent-qa/browser/`; `independent-qa/adversarial-browser/` |
| Backend | No source/API/data modification; backend noEmit compatibility | PASS compatibility only; database test not required by this frontend-only issue | `independent-qa/commands/backend-types.log` |
| Agnos | Not changed | Not applicable; no AI/voice certification | Frozen scoped diff |
| Security | Secret scan, changed-boundary review, guarded requests, scan delta | PASS scoped; not a clean global-security claim | `independent-qa/commands/security-scan.log`; `independent-qa/independent-checks.json` |

## Evidence and limitations

- Visually opened independent desktop unavailable3/loaded8 and mobile390 grayscale DH images: result labels and scopes legible, control contained, no horizontal overflow. Browser fixtures use synthetic names with no fiscal identifiers. Grayscale/mobile are emulation, not real glare/hardware or screen-reader certification.
- Browser success contexts have no console/page errors, no relevant HTTP errors, external calls, forbidden writes or unexpected requests. Failure fixture deliberately returns503 only for clinical-summary and checks visible retry/recovery; this is not a waived production HTTP failure. Capability denial concerns page enrichment only; overview remains allowed in that fixture.
- No clinical persistence changed, so reload is presentation reset rather than saved-data assertion. Original data taxonomy remains unchanged; unknown/unsupported state is presentation-only unavailable, never written back.
- Initial independent SSR probe failed because root-level TSX default was classic JSX; rerun with the application's `TSX_TSCONFIG_PATH=frontend/tsconfig.app.json` passes3/3. Initial supplemental browser had an incorrect assertion expecting unknown-state warning for empty exact Day Hospital intersection; reviewed result correctly certifies that empty known intersection0. Corrected only own test to assert0; application untouched. Initial SSR log retained and limitations disclosed.
- Existing12 full-suite failures and7 dependency findings are not resolved by this issue. Root must rerun own gate and verify exact production deployment before any closure or release claim.
- Independent immutable file hashes: `independent-qa/evidence-manifest.json`; before/after source receipts `independent-qa/before/source-receipt.json`, `independent-qa/after/source-receipt.json`.

Codex must now re-run the QA Gate.
