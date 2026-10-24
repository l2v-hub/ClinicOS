# Independent QA — issue 507

Final Decision: FAILED VALIDATION

Reserved independent session: nonce `6592e6d1-eca2-4d1e-8bf0-81ad48b8765b`. QA did not implement or coordinate the patch. Branch `codex/bug-batch-507`; native baseline/HEAD `715a4b9e47ff9bd0192b7f58f24271e48da4900d`. Patch is uncommitted and frozen. Manifest SHA256 `474ede4ad65b449748fe9d3f2585f5bbb615823ed7c654dc899871803777a41b`; all 10 actual file hashes match before and after (hashes-before.json, hashes-after.json).

## Finding F507-1 — cold chart hydration retains fallback dates

Severity: P2, correctness; AC1 fails for asynchronous admission arrival.

`frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx:179` initializes form dates once. `openAdd` at line 394 uses the admission available at that moment, and direct navigation opens creation immediately at line 630. There is no differentiation between an untouched automatic fallback and an operator-provided date when admission context later becomes available. App.tsx:909 navigates before `loadCartella`; App.tsx:2862 supplies an empty default chart while its request is pending. Therefore this is a reachable production data-loading order.

Reproduction, using the actual PatientDetail → lazy TherapyEditor → TerapiaFarmacologicaTab chain with synthetic props/localhost intercepted HTTP:

1. Mount a cold chart with a direct new-therapy target and no admission context, matching App's pending-chart state.
2. Observe automatic dates initialized to current Europe/Rome day, `2026-10-25` in this run. Do not touch either date.
3. Deliver loaded `cartella.presaInCarico.dataIngresso = 2026-09-15` to the same host. (Private harness control simulates the async prop update; the App HTTP orchestration itself is statically traced, not browser mounted.)
4. Start date stays `2026-10-25`. Selecting Una tantum reveals administration date also `2026-10-25`. Expected both to use `2026-09-15` while still untouched automatic defaults.

Reproduced in Europe/Rome and America/Los_Angeles. `cold-hydration-probe.mjs` exits 1 on a real assertion; `cold-hydration-probe/results.json` contains actual/expected values, zero browser errors, zero unexpected requests. Screenshots: `cold-hydration-probe/Europe-Rome-cold-admission.png`, `cold-hydration-probe/America-Los_Angeles-cold-admission.png`. Traces: corresponding `.zip` files. Videos: `cold-hydration-probe/video/*.webm`.

Remediation for implementer: distinguish untouched automatic defaults from explicit/operator/imported/saved/calendar dates when admission loads, or defer new-form creation until chart context is ready. Preserve the independently passing edited-draft behavior. QA made no source fixes.

## Mandatory phase results

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS | task-contract.md; issue507-readonly.json includes issue body and all current comments; issue attachment itself not inspected |
| 1 Full diff review | FAIL, F507-1 | source-diff.patch plus 4 untracked files inspected against manifest and baseline |
| 2 Build/tests | PASS | frontend-tests.log; targeted-tests.log; frontend-typecheck.log; frontend-build.log |
| 3 Browser | FAIL for cold hydration; other scenarios PASS | component-smoke/, production-probe/, cold-hydration-probe/ |
| 4 Security | PASS for scoped patch and synthetic runtime | checklist below; no API/database/provider operations |
| 5 Report/verdict | FAILED VALIDATION | this report, result.json, STOP.json |

## Acceptance criteria

| Criterion | Result | Independent evidence |
| --- | --- | --- |
| AC1 new chart start/once defaults, reopening/types/current patient | FAIL overall | loaded-admission defaults, cancel/reopen, once field, real host patient remount pass in both timezones; cold hydration F507-1 fails twice |
| AC2 intake ingresso.dataPresa defaults without overwriting existing rows/operator edits | PASS | real StepClinica browser tests in both timezones; earlier row explicit date preserved as context changes |
| AC3 explicit saved/imported/operator/calendar dates and payload precedence | PASS within scoped evidence | saved edit and explicit operator dates in browser; focused unit mapping tests prove saved/imported/calendar payload dates; no browser save or real storage claimed |
| AC4 invalid/missing fallback, valid leap/DST/UTC calendar day, timezone stability | PASS for helper and loaded context | 8 focused tests include Rome midnight, malformed/impossible dates, leap/DST dates and UTC serialization; real host legacy leap/invalid fallback in both timezones |

## Independent commands/results

Node executable: `/tmp/clinicos-node22-native12/node_modules/node/bin/node` v22.23.4. Existing installed dependencies reused; no npm ci, dependency or lockfile edits. Backend sparse files are read-only pure helper dependencies.

- Frontend `npm test`: **1567 PASS, 0 FAIL, 0 SKIP, 0 cancelled, 0 todo**; 105309.636004 ms.
- Focused `node --import tsx --import ./scripts/stub-css-loader.mjs --test frontend/src/components/operator/cartella/__tests__/therapyAdmissionDefaults.test.ts`, TSX_TSCONFIG_PATH=frontend/tsconfig.app.json: **8 PASS, 0 FAIL, 0 SKIP**. These 8 are included in the full 1567, not additional unique coverage.
- Independent `node ../node_modules/typescript/bin/tsc --noEmit`: exit 0.
- Frontend `VITE_API_URL=http://127.0.0.1:3999 npm run build` (`tsc -b && vite build`): exit 0, 748 modules transformed, build 52.56s. Existing chunk-size/plugin timing advisories are nonfatal.
- Original frozen `e2e/issue507-smoke.mjs`: exit 0, 4 scenario groups across 2 timezone contexts.
- Private `production-probe.mjs`: exit 0, 6 scenario groups across 2 timezone contexts. Adds real PatientDetail host wiring, legacy leap dates, patient remount, invalid fallback, removal of therapy write capability.
- Private `cold-hydration-probe.mjs`: exit 1, **2 of 2 timezone cases FAIL** with exact incorrect date values; browser errors/unexpected traffic remain 0.

No tests were skipped. Native authenticated HTTP/database persistence E2E was not run and is not claimed. Form defaults do not persist until submission; no save was performed. Browser patient-switch probe follows production App's key-by-patient remount. Full App auth/navigation not mounted. Calendar and imported-date preservation have mapping/unit coverage, not a browser save flow. Existing product styling was unchanged; no new contrast claim is made.

## Security checklist

- Secrets/PHI: PASS. Diff, fixtures, private harness and logs use synthetic patient/operator names, dates and medicines; no tokens/connection strings/real clinical records introduced.
- Logging: PASS. No production logging added; only synthetic test outcomes captured.
- Input validation: PASS. No endpoint added/changed; helper accepts only valid calendar date or bounded ISO UTC timestamp, otherwise facility date fallback.
- AuthZ: PASS within scope. Existing capability gates retained; private actual-host browser confirms removing therapy create/update capability removes creation date fields/tab. No claim of independent backend ACL execution.
- Injection/XSS: PASS. No raw SQL/unsafe HTML or new unescaped rendering.
- Dependencies: PASS. No package/lock changes.
- Configuration: PASS. No source env/config/CORS changes. Test-only entry is not linked from production; synthetic session setup stays in private/test harness. Build uses explicit localhost VITE_API_URL. All browser traffic routed locally; known font styles fulfilled empty without external network. Unexpected traffic and relevant HTTP errors checked in enhanced private probes and remain zero.

## Evidence integrity and limits

`artifact-integrity.json` records successful decoding of all 16 PNGs, integrity of all 6 trace ZIPs, and ffprobe/full ffmpeg decoding of all 4 VP8 WebM videos. Representative chart failure and intake screenshots were visually opened and date values are readable. Videos are 800×600 and supplementary; the PNGs/traces/JSON provide the precise date evidence. Custom browser report: `playwright-report/index.html`; raw results: `test-results/results.json`. These are summaries of direct Playwright-library probes, not a claim that Playwright Test's HTML reporter ran.

All evidence stays private under this reserved QA directory as instructed. No GitHub attachment/state write, source/app/test fix, commit, merge, deployment, closure, live provider, clinical API or database operation was performed. All owned Vite servers close in finally blocks. No Claude approval is implied.
