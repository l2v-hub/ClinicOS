# Independent QA validation report

Verdict: **READY FOR CODEX QA**.

Fresh dedicated QA session reserved before review in `../qa-reservation.json`. The QA agent authored no feature code, test, configuration, or documentation changes. Reviewed base: `26a4137814f47c78d590f1b4dfe928d480e92909`. Original scope: 103 files from `../source-freeze.json`; final binding: `../source-freeze-final.json`. All final file hashes match. The only intervening author edit is the independently rechecked documentation correction described below.

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS | Existing `artifacts/task-validation/adaptive-work-item-orchestration/task-contract.md`, accepted `../root-plan-accepted.json`, scope/workflow amendments. AC1–AC6 mapped below. This is a new local authorized feature task; no live GitHub/canonical issue mutation or invented issue number. |
| 1 Full diff review | PASS | All tracked diff plus new source/tests and 79 pinned upstream skill files, shared config/docs, `CLAUDE.md`, and workflow reviewed. One AC6 documentation finding corrected by author and rechecked; no remaining actionable findings. |
| 2 Build and tests | PASS | Independent Node 22 suite: 1,564 tests, 1,561 pass, zero fail/cancelled, three platform skips; 16/16 syntax checks; novel real-caller faults 3/3; diff whitespace and YAML parse PASS. |
| 3 Playwright evidence | PASS | `result.png`, `trace.zip`, `actual-caller-report.html`, `playwright-report/index.html`, `test-results/browser-results.json`. 48 visible-element/concrete-value assertions including reload; zero console/page/HTTP errors or external requests. |
| 4 Security | PASS | Explicit checklist below; actual environment-spawn regression test, restricted adapter assertions, scope/link/ownership tests and credential-pattern scan pass. |
| 5 Verdict | PASS | This report and `results.json`; retained source hashes, logs, caller events, executable QA harness and browser artifacts. |

## Contract and scope

AC1: Closed adaptive planning wrapper validates graph limits, exact task/criterion/file coverage, dependencies/cycles, scope ownership, file/resource conflicts and conservative risk routing. Legacy plan schema remains unchanged.

AC2: Actual `runPipeline` intake/effects tests and actual `createWorkspace`/`runImplementationStages` integration tests exercise durable pre-inference reservation, a serialized poisoned save queue, bounded concurrency, owned child worktrees, exact packet/source checks, controller commits, serialized cherry-picks and ordinary later group verification/QA/publishing stages. Existing caller tests assert C starts after A integrates while B remains active; the observed peak is two.

AC3: Shared bounded packets reach configured Codex or optional local Claude adapters. Binding tests reject mismatched profile/provider/model/nonce before inference. Preflight explicitly means CLI/auth capability, not successful inference, entitlement or global capacity. Native Max implementation is forbidden in hosted Actions; service/API/OAuth/GitHub credentials are stripped from its child environment. File-only tools, empty strict MCP, settings/customization suppression, no nested agent/shell/web tools, independent wall timeout and bounded output are asserted. Existing independent review remains separate.

AC4: Definite blocked work retains its recorded attempt and can reach a later authorized senior parent attempt. Unknown provider/save/commit/integration outcomes retain tombstones and do not replay. The QA-authored real-caller post-commit save fault proves an actual child commit can exist while the last durable journal still holds the commit reservation, with no second model call or integration. Retained child tamper is rejected without replay. No-ready-profile routing stops finitely with zero inference.

AC5: Existing regression suite and new real-Git/caller/fault tests pass independently. Frontend, backend, API routes, dependency manifests and schema are untouched. Production exact-SHA review, peer-review and release-policy files are unchanged; their regressions remain in the full passing suite. No old canonical subject, PR504 request, live GitHub state, external provider or patient system was accessed.

AC6: All 79 upstream files match their pinned SHA-256/byte metadata and MIT license; 27 skill frontmatter records exist. Shared provider-neutral configuration preserves ClinicOS gates and deferred label integration. Documentation distinguishes CLI local opt-in from the reviewed workflow's new-intake adaptive default and makes no inference/deployment claims.

The feature is Node orchestration, not application UI or application build code. The app TypeScript/Vite build cannot validate these changed `.mjs` paths, and no app dependency installation/build was performed. Appropriate independent checks are the full affected Node suite, new fault assertions, Node syntax checks and workflow YAML parsing. The three skipped tests require native Windows PowerShell/ACL/bootstrap behavior on this Linux runner; existing cross-platform logic tests still ran.

## Resolved finding

QA-1, AC6 documentation mismatch, `docs/adaptive-work-items.md:15`: claimed native controller `--max-turns` support on advertised CLI capability alone. `agent-team/src/bug-pipeline/cli.mjs:38` does not supply `maxTurns`, while `claude-executor.mjs:219` requires an explicitly supplied integer as well as advertised support. Author corrected only the paragraph: native controller uses wall-time/output bounds; optional adapter turn bounds require explicit caller configuration and advertised support. Independent reread confirms accurate behavior. `../source-amendment-qa1.json` records old/new hashes. Original documentation hash `ca05f5d679ff82c697920a011ad02d312154fea3c874d1c7d9d45fd09d75c955`; final `c6abec05dfb310807d90bb0b9b03c5d9dbc1d5d5d0cc39294e6305cc43fa18c8`. No code changed, so repeating the full passing suite was unnecessary.

No remaining correctness or security findings.

## Security checklist

| Check | Result and evidence |
| --- | --- |
| Secrets | PASS: frozen source credential-pattern scan has zero hits; adapter logs/errors suppress provider diagnostics; actual spawned synthetic child sees only its configured profile and no supplied API/OAuth/GitHub/Codex secrets. |
| PHI | PASS: synthetic text fixtures and temporary local repositories only; screenshot states synthetic boundary. |
| Logging | PASS: controller journals bounded IDs/model/outcome/summary and hashes; new artifacts contain synthetic test text, Git revisions and outcomes, no clinical payloads or personal auth data. |
| Input validation | PASS: closed graph schemas, bounded graph/text/context/profile/session limits, path/nonce/identity validation, exact source/policy/plan binding and structured output validation. No endpoint added. |
| AuthZ/ownership | PASS: trusted fresh ownership checks guard controller actions; host effects poison after uncertain save; operator takeover blocks commit/integration. No role or route bypass introduced. |
| Injection/XSS | PASS: no raw SQL or product HTML sink. Git gets argument arrays; controller hooks/signing disabled for child Git actions. QA report escapes values and has restrictive CSP. |
| Dependencies | PASS: no new runtime packages/lockfiles; pinned skills and MIT attribution verified; no download/install performed during QA. |
| Config | PASS: existing review auth flow unchanged; local Max executable/profile/hosted checks and stripped environment enforced; new mode is explicit locally and workflow new-intake behavior is documented with off rollback. QA surface exists only as a temporary artifact server bound to localhost and was shut down. |
| Isolation/scope | PASS: exact owned registration/common Git directory/branch/HEAD, frozen packet hashes, scoped output manifest, symlink/hardlink/ignored-file/scope rejection, retained conflict evidence, no cleanup/reset or blind replay. |

## Evidence and reproducibility

- `logs/independent-node22-suite.log`: independent full affected suite, exit zero, 32.5 seconds.
- `logs/novel-caller-faults-final.log`: three new QA-authored fault assertions, 3/3 pass; harness `novel-caller-faults.test.mjs` derives only fixture plumbing from unchanged production-caller tests and imports actual source via absolute paths.
- `static-review.json`: all 16 `.mjs` syntax checks, pinned skill files/license/frontmatter checks, credential scan and YAML parse.
- `caller-events.json`: copied actual unchanged production-caller run evidence supplied by the caller agent; SHA-256 `88975a052e55123a1c1204385a029bbcc144fe024931b6f6925a6d07a3b1dbd6`. Source fixture hash matches the reviewed frozen test. Integration chain A,C,B and C's source includes A's integrated commit; parent final checkpoint/local origin agree. Model provider/sandbox dispatch are synthetic; actual native Node verification, Git worktrees/commits/cherry-picks/local push are real.
- `browser-evidence.cjs`, `logs/playwright-final.log`, `test-results/browser-results.json`: independent browser assertions use that actual event evidence, concrete values and exact hashes, then repeat after reload. Screenshot was visually inspected; trace ZIP integrity passes (nine entries).
- `source-before.json`, `source-after.json`: exact source boundary; only the documented author correction differs.
- `commands.md`: exact commands and retained initial QA harness/browser attempts. Initial QA assertion mistakes were corrected in `/tmp` only; initial optional video failed because Playwright ffmpeg is absent. No video is required for this internal orchestration feature with no UI/chat/voice change. Screenshot/trace/HTML/raw results all exist and pass; no download was made.

Limitations: synthetic tests prove controller behavior, not live model inference, subscription entitlement, global provider capacity, cost savings, skill-catalog reload, a deployed application, or a clinical outcome. No merge, release, label change or issue attachment was performed in this read-only QA scope. The root can copy this completed bundle into the versioned task packet for the authorized handoff; live GitHub attachment remains a separate explicit action.

**READY FOR CODEX QA**.

Codex must now re-run the QA Gate.
