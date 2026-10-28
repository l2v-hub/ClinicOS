# Independent QA2 — issue 507

Final Decision: READY FOR CODEX QA

Dedicated independent QA session; neither implementation nor coordination. Reserved nonce `cfb97ef5-c891-41d0-b096-2bcd649419bb`; reservation canonical commit `3abed593ff0180086f73a1e5c2c21a9962066de1`. Branch `codex/bug-batch-507`, native baseline/HEAD `715a4b9e47ff9bd0192b7f58f24271e48da4900d`; reviewed patch remains uncommitted. Frozen manifest SHA256 `41a40741b5e848a4b73a55c3fda1f8b1f67b69514484985f0d2253e12b6f21ef`. All ten source hashes match before and after; no source/test edits or commits were made by QA2.

Original QA1 verdict remains FAILED VALIDATION for F507-1 on its original round-one source. This report certifies only the separately frozen round-two patch. QA1 report, result, STOP, probe and evidence remain intact: 54-file original tree verified unchanged during this session (`evidence/logs/qa1-preservation-after.json`).

## Mandatory phases

| Phase | Result | Independent evidence |
|---|---|---|
| 0 Contract | PASS | Read CLAUDE.md, qa-gate, playwright-evidence and referenced evidence contract; current GitHub issue body/comments captured in evidence/logs/issue507-readonly.json; original task-contract.md plus round-two AC1b/AC3b amendment reviewed. Attachment image itself was not inspected. |
| 1 Diff review | PASS, no findings | Full tracked diff and four untracked frozen source/test files reviewed; evidence/logs/source-diff.patch; before/after manifest logs. |
| 2 Tests/build | PASS | 1572 frontend tests, 15 focused tests, corrected standalone tsc and production build; evidence/logs/frontend-*.log and focused-tests.log. |
| 3 Playwright | PASS | 26 frozen smoke groups, 2 exact unchanged original cold-probe cases, 8 private adversarial groups across Europe/Rome and America/Los_Angeles; zero console/page/HTTP errors or unexpected requests. |
| 4 Security | PASS | Checklist below and evidence/logs/security-scan.json. |
| 5 Verdict/report | PASS | This report; result.json; STOP.json. |

## Acceptance results

| Criterion | Result | Observations and evidence |
|---|---|---|
| AC1 / AC1b chart admission defaults and late arrival | PASS | Actual PatientDetail → TherapyEditor → TerapiaFarmacologicaTab chain. Original unmodified QA1 cold probe now asserts fallback `2026-10-25` → start and once `2026-09-15` in both zones. New/reopened forms, type switches, loaded context and patient-key remount pass. `evidence/test-results/original-cold-probe/results.json`, component-smoke/results.json. |
| AC2 / AC1b intake new rows and late arrival | PASS | Actual StepClinica → TherapyEditor → TherapyIntakeEditor; new rows use ingresso.dataPresa. Late admission hydrates untouched automatic fields independently. Pre-arrival start-only, once-only, same-fallback and blank inputs survive. Non-date route/time edits survive hydration; subsequent admission changes do not rewrite hydrated rows. |
| AC3 / AC3b explicit and existing dates | PASS within stated scope | Browser saved editor and operator dates survive admission arrival; externally replaced/persisted intake rows receive no lineage. Capability loss closes draft and restores a fresh default on next creation. Source clears tracking for saved/calendar editors and patient identity guards hydration; App.tsx:3929 keys PatientDetail by patient. Imported and calendar explicit values and submission precedence pass focused unit tests. |
| AC4 date validation and timezone | PASS | Missing/impossible/malformed dates use facility day; leap/DST dates and bounded UTC ISO serialization preserve calendar day. Same UI outcomes in Rome and Los Angeles. No timezone conversion or extra clinical policy introduced. |

Source review: therapyAdmissionDate.ts validates actual calendar days through existing isCalendarDate; automatic start/once ownership is independent. Native date input consumes ownership even for same fallback or blank; no date equality heuristic. Chart consumes lineage after first valid hydration and clears it on cancel/edit/calendar. Intake tracks only newly created row objects, migrates ownership across local edits, and ignores external replacements. IntakeWorkspace.updateSection preserves row identities during admission changes. Saved/imported payloads contain no lineage metadata. Existing capability checks remain.

## Independent execution

Node `/tmp/clinicos-node22-native12/node_modules/node/bin/node` v22.23.4; existing dependency symlink reused. No npm ci, package/lock/environment edits. Pure backend helper sources were read-only. Commands ran from the worktree, with explicit `VITE_API_URL=http://127.0.0.1:3999` and Node 22 first in PATH.

- Full frontend `node ../scripts/run-node-tests.mjs`: **1572 pass, 0 fail/skip/cancel/todo**, 74065 ms.
- Focused `TSX_TSCONFIG_PATH=tsconfig.app.json node --import tsx --import ../scripts/stub-css-loader.mjs --test src/components/operator/cartella/__tests__/therapyAdmissionDefaults.test.ts src/lib/__tests__/therapyCalendarCreate.test.ts`: **15 pass, 0 fail/skip** (included in full suite).
- Standalone `node ../node_modules/typescript/bin/tsc --noEmit`: exit 0. Initial command mistakenly targeted frontend/node_modules/typescript, which is absent under the existing hoisted layout; MODULE_NOT_FOUND retained in frontend-typecheck.log. Correct path run passed in frontend-typecheck-corrected.log. This was a command-path error, not an application type error.
- Frontend `npm run build` (`tsc -b && vite build`): exit 0, 748 modules, 42.14s; existing chunk/plugin advisory only.
- Frozen `node e2e/issue507-smoke.mjs`: exit 0, **26/26 groups** across two zones.
- Unchanged `/workspace/.clinicos-cloud/issues-506-507-20261024/qa-507/cold-hydration-probe.mjs`, using round-two QA_OUTPUT_DIR: exit 0, **2/2 cases**. Original code and output were not overwritten.
- Private `evidence/logs/adversarial-probe.mjs`: exit 0, **8/8 groups**: capability loss/restore, intake non-date edits plus consumed lineage, deliberate blank start, external persisted-row replacement. Private entry and probe are evidence-only, outside frozen app/tests.
- `git diff --check`: exit 0; source status unchanged; owned port 5178 closed after probes (curl exit 7). Port 5196 untouched.

Browser servers were serialized on private 5178, use envDir:false, synthetic exact localhost GET responses, and reject unexpected hosts/contracts. Known Google font CSS was locally fulfilled empty with no external network. Browser request errors, responses >=400, console errors and page errors were asserted absent. No save or backend write occurred; persistence-after-reload does not apply to unsaved defaults. Payload preservation was checked by unit tests; no authenticated persistence claim.

## Security review

| Check | Result |
|---|---|
| Secrets / PHI | PASS: synthetic fixture names/dates/medicines only; no tokens, credentials or connection strings introduced. Scan's sole match is synthetic smoke outcome console.log, test-only. |
| Logging | PASS: no new production logging or clinical payload logging. |
| Input validation | PASS: valid bounded calendar day / UTC ISO shape only; invalid values fall back. No endpoint additions or changes. |
| AuthZ | PASS in frontend scope: existing capability gates retained; independent runtime capability loss/restore checked. No backend ACL claim. |
| Injection / XSS | PASS: no raw SQL, unsafe HTML or new unescaped user rendering. |
| Dependencies | PASS: no added packages or lockfile changes. |
| Configuration | PASS: source API/env/CORS/auth flags unchanged; e2e entry is not linked from production. Production build uses explicit localhost API origin. |

## Evidence and limits

Final media are in `evidence/screenshots/` (20 PNG), `evidence/trace/` (6 ZIP), `evidence/video/` (4 WebM); raw results `evidence/test-results/results.json`; custom direct-Playwright HTML report `evidence/playwright-report/index.html`. Media names are prefixed by run. Report is custom HTML, not a claim that Playwright Test reporter ran.

Viewed readable screenshots: component-smoke-Europe-Rome-cold-untouched.png (both 09/15/2026), cold-start.png (10/01 vs 09/15), cold-once.png (09/15 vs 10/02), cold-same-fallback.png (10/25 vs 09/15), intake-admission.png, and adversarial-Europe-Rome-intake-late-fields.png (both 09/12/2026, retained 09:30 and orale). Video frame contact sheet visually inspected. All 20 PNGs fully decoded with Pillow, all 6 traces passed every ZIP CRC, all 4 VP8 WebM videos fully decoded with ffmpeg; evidence/logs/artifact-integrity.json contains dimensions/durations. Date values and assertion output are the primary proof; video is supplementary.

Evidence digest manifest: `evidence/logs/evidence-manifest.json`, SHA256 `ca7646204a0d1ac7046b50c274f71697f65dd0722dc63d48a7a9db8777c5969a`. Source hashes: evidence/logs/hashes-before.json and hashes-after.json.

Scope is synthetic actual-component/actual-PatientDetail-host runtime, not full App auth/backend orchestration or real clinical persistence. Calendar and imported-document explicit date preservation have unit/source coverage; browser calendar-slot creation/import review/save were not exercised. No contrast redesign claim; no styles changed. No GitHub/canonical writes, approval claims, merge, deploy, closure, live provider/API/database operations or real patient data. GitHub publication is coordinator-owned under the explicit assignment, so QA evidence remains in this private tree.
