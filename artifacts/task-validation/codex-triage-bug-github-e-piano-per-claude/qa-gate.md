# Independent QA gate

Date: 2026-10-16. Branch: `codex/claude-github-labels`.
Reviewed checkout baseline: `fcae8c6bfb255f5cc88940921057a590fc2ae863` (`HEAD` and `origin/main` when inspected).
The implementation is currently an uncommitted working-tree delivery; this report does not certify a later commit or claim a live Claude review.

## Verdict

**READY FOR CODEX QA** for the scoped skills, issue form, documentation and review runner.
All required checks for the changed behavior passed independently after one security finding was fixed and retested. This is not certification of a live automatic GitHub trigger or a real Claude model invocation.

The optional broad legacy Agent Team sweep is not green: 105/108 passed, with three failures in unchanged baseline files. These remain explicit repository risks and must not be reported as a successful full-suite run.

## Gate phases

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS | `task-contract.md`, AC1–AC6; current chat defines the task, with no selected live issue to mutate |
| 1 Diff review | PASS after remediation | Reviewed both tracked README delta and all new implementation files; application/backend/Prisma/production configuration untouched |
| 2 Required build and tests | PASS | `test-results/qa-review-loop.txt`: 12/12; `qa-independent-probes.txt`: 3/3; `qa-relevant-agent-team.txt`: 18/18; `qa-frontend-build.txt`: TypeScript and frontend build successful with local `VITE_API_URL` |
| 3 Browser evidence | PASS | `result.png`, `trace.zip`, `playwright-report/index.html`, `test-results/qa-playwright.txt`: 1/1 |
| 4 Security | PASS after remediation | Checklist below; synthetic fixtures only; no live mutation or real model invocation |

## Finding resolved during this gate

The initial runner verified the packet directory but followed a tracked `implementation-plan.md` symlink outside the checkout. An independent temporary Git fixture demonstrated acceptance and one mock reviewer call. This could detach review instructions from the reviewed repository and expose unrelated local contents.

The implementer added regular-file, symlink and real-path containment validation for both required packet files in `scripts/quality-gate/claude-bug-review.mjs` (the prerequisite loop near lines 113–125). The new regression and the independent probe both now reject the external plan before any reviewer invocation. No unresolved scoped correctness/security finding remains from this gate.

## What was independently exercised

- Four rejected rounds block a fifth invocation; four provider execution failures also reserve all four attempts and prevent a fifth invocation.
- The same rejected SHA cannot spend another round. A same-SHA approval is reused only with intact evidence; committed changes need another available round.
- Concurrent callers cannot acquire the same review packet lock.
- Dirty files, an outside packet, an external prerequisite symlink, malformed structured output, stale SHA and changes made during review fail closed.
- Real Git commits changed during a mock review never yield approval.
- Missing authentication reserves no attempt before invocation.
- The actual reviewer argv exposes Read/Glob/Grep, restricted/plan mode, empty setting sources, strict empty MCP configuration, and no permission bypass. CLI help confirms supported read-only options; authentication was checked without calling a model.
- The GitHub queue was queried read-only using the exact repository and label filters (`test-results/qa-github-readonly.json`). No source issue was processed, commented on or relabeled by QA.

## Browser evidence limits

The QA-only server renders the real saved test outcomes. Playwright asserts the exact pass/fail counts, cap/auth/tool-boundary test results, and explicit inactive-automation statement. It reloads the report and reasserts the counts, checks console/page errors and HTTP failures, then captures the final result. It does not prove that GitHub launched a cloud task or that a real reviewer analyzed code.

The server binds only `127.0.0.1:4391`, requires `CLINICOS_QA_SURFACE=1`, exposes one static result route, uses a restrictive CSP and escapes rendered text. It changes no application UI and is not deployed. Video is not required for this internal capability; the optional first video attempt lacked the environment's Playwright ffmpeg binary, so the final required screenshot/trace run used no video and passed.

## Security checklist

| Check | Result |
| --- | --- |
| Secrets | PASS: no credential values introduced; CLI auth evidence records only version/status; no raw environment dump |
| PHI | PASS: temporary repositories and fixtures are synthetic; no patient data or database access |
| Logging | PASS: reports contain review/test outcomes, paths and SHA metadata; no clinical payloads |
| Input validation | PASS: structured schema, bounded finding count/size, tracked paths, positive line numbers and exact reviewed SHA |
| Authorization | PASS: no app authentication changes; explicit read-only CLI tool list; missing reviewer auth blocks invocation |
| Injection/XSS | PASS: argument-array subprocesses; no shell evaluation of issue data; QA HTML escapes values; no SQL changes |
| Dependencies | PASS: no dependency or lockfile changes |
| Configuration | PASS: no production flags/CORS/API endpoint changes; local QA surface is opt-in and loopback-only |

The ledger is local operational state and must be preserved; instructions explicitly forbid deleting/resetting it or creating replacement packets to evade the four-round limit. A force-killed process can leave a lock requiring deliberate operator recovery; no automatic unsafe lock reclamation is introduced.

## Broader baseline failures

The broader command `node --test agent-team/tests/unit/*.test.mjs agent-team/tests/integration/*.test.mjs` returned **105 PASS / 3 FAIL**, recorded in `test-results/qa-agent-team.txt`:

1. `agent-team/tests/unit/ci-browser-e2e-config.test.mjs:34`: a source-text regex expects `import.meta.env.PROD`, while the existing config uses `env?.PROD`.
2. `agent-team/tests/unit/e2e-import-journey.test.mjs:45`: an existing source-text assertion still expects the removed `accept-demographics` toggle.
3. `agent-team/tests/integration/process-exit-ownership.test.mjs:14`: process-exit ownership check reports a surviving PID; inspected PID was a zombie under PID 1 on this host.

All implicated tests, source configuration, browser journey and process runner are identical to `origin/main`; no implementation change in this task touched them. The required relevant regression subset independently passed 18/18. The broader failures were not fixed outside this task's scope.

## Remaining operational prerequisites

- Installed Claude Code 2.1.301 reports `loggedIn=false`; no real Claude review can yet be claimed (`test-results/qa-cli-status.json`).
- An automatic GitHub-label activation mechanism is still awaiting the user's choice; the skill and issue template do not themselves start a cloud session.
- No PR/issue mutation, merge, deploy, production access or cleanup occurred. The unrelated `scripts/maintenance/demo-patient-cleanup.sql` artifact was excluded and untouched.
- Evidence remains local pending the lead's final QA decision and any authorized publication; it was not attached to a live issue by this gate.

**Codex must now re-run the QA Gate.**
