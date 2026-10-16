# Independent QA — adaptive implementation execution

Date: 2026-10-16. Repository: l2v-hub/ClinicOS. Existing PR: #471. Baseline: `7c6a482a`.
Dedicated QA session reviewed the new user correction and current uncommitted scoped diff; no production source changes were authored by this reviewer.

## Phase results

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS: AC1–AC4 cover optional delegation, difficulty/load assessment, senior-only execution, durable compatibility and independent QA. Read PR body/comments; the latest user correction and this packet are the authoritative task request. | `task-contract.md` |
| 1 Diff | PASS: 14 scoped files; routing, schemas, model adapter, recorder, CLI/workflow configuration, fixtures, tests, skill and guide only. Application/schema/dependencies unchanged. | `qa-reviewed-files.sha256` |
| 2 Tests/build | PASS: final relevant Node suite **75/75**; independent adversarial/integration probes **6/6**; TypeScript and frontend production build pass. Three workflows retain security/release semantics; auto/default-delegate environment values verified. | `test-results/qa-final-scoped.txt`, `qa-independent-probes.mjs`, `test-results/qa-independent-probes.txt`, `test-results/qa-frontend-build.txt`, `test-results/qa-workflow-semantic.txt` |
| 3 Browser | PASS: **1/1** Playwright test against local, explicitly enabled QA-only surface serving actual saved test results. Assertions verify75 passed/0failed, senior override/concurrency/false-capacity regressions, reload persistence, no console/page errors and no HTTP errors. | `qa-surface.spec.mjs`, `qa-surface-server.mjs`, `qa-playwright.config.mjs`, `result.png`, `trace.zip`, `playwright-report/index.html`, `test-results/qa-playwright.txt` |
| 4 Security | PASS for scoped changes; checklist below. | Diff review and independent probes |

## Findings resolved during this gate

1. Legacy fallback originally treated explicit malformed assessments as missing. The implementation now only supplies compatibility defaults for `execution === undefined`; `null`, false, numbers, strings, empty objects and blank rationale are rejected. Validation does not mutate serialized state or counters. Relevant locations: `contracts.mjs:83`, `routing.mjs:18`. Independent probe verifies strict rejection and byte preservation.
2. Capacity detection originally accepted incidental numbers429/503 anywhere in diagnostics. It now requires a recognized provider capacity code or explicit HTTP/status context. A normal diagnostic containing fixture line503 does not set provider cooldown. Relevant location: `models.mjs:223`; regression and independent negative probe pass.

No unresolved scoped correctness/security findings remain.

## Additional independent evidence

- A thrown CLI launch failure releases the actual in-flight counter; the next bounded session can delegate. One failed request results in exactly one provider adapter invocation.
- Senior implementation and senior QA share the model ID while using separate ephemeral invocations, unique output files and different workspace-write/read-only sandbox roles.
- Real `createModels` choices flow through `createWorkspace.execute` and `simplify`; the JSON packet history equals durable batch history. Success, simplification and failed escalated execution are recorded; existing attempt/review arrays are unchanged by recording.
- Legacy state with nonzero implementation/review counters retains its exact serialization. An unrelated invalid counter sequence is refused without rewriting state.
- Existing coverage confirms actual overlapping held sessions route additional bounded work to senior, fixed6.1-Sol implementation/simplification, capacity cooldown expiry and no hidden retry, and persistence of the four-attempt/four-review limits.

## Initial failed run retained

`test-results/qa-node-suite.txt` records **73/74** with one failure in the unchanged process-timeout fixture: no descendant PID was observed before the short timeout while the frontend build was also running. This was not suppressed. After the build completed, the final full suite includes the added regression and passes **75/75**, including that timeout test. This is consistent with constrained-host startup timing; the process runner and its test timeout were not modified by this task.

## Security checklist

| Check | Result |
| --- | --- |
| Secrets | PASS: no real credentials added to scoped code/evidence; workflow references existing secret names only, with no added model credentials. |
| PHI | PASS: synthetic identifiers/task descriptions only; no patient data accessed. |
| Logging | PASS: execution history contains model, selection rationale/category, phase, round and local active count; no model input/clinical payload. |
| Input validation | PASS: strict plan execution schema, nonblank rationale, explicit malformed legacy assessments refused; model IDs passed as argv, no shell interpolation. |
| Authorization | PASS: no new endpoints or altered issue permissions, credential boundaries, merge/release checks or reviewer role. |
| Injection/XSS | PASS: no SQL or application HTML changes; QA-only page escapes rendered test names and uses a restrictive CSP. |
| Dependencies | PASS: no package/lockfile changes. |
| Configuration | PASS: automatic routing and optional delegate configuration only; no CORS/auth/production flags weakened. QA-only server bound to127.0.0.1 behind explicit env flag. |

## Limits and verdict

The screenshot/trace demonstrate the saved synthetic test report and its assertions, not an authenticated model call, a live GitHub-triggered bug run, or a deployment. Global provider load is not measured or claimed; routing uses local sessions and explicit capacity diagnostics. Existing live activation prerequisites remain outside this correction: workflow integration on main, usable runner credentials/authentication and sandbox/deployment prerequisites. No paid model calls, real issue processing, merge or production deploy occurred in this QA session.

**READY FOR CODEX QA** for the adaptive-routing correction. Bind the delivery to `qa-reviewed-files.sha256`; any subsequent source change requires review of that change. End-to-end live activation remains PARTIAL and is not certified by this gate.
