# Independent QA — CLI runner activation prerequisites

Date: 2026-10-16. PR #471. Reviewed baseline `255d9917` to final working tree after reverting candidate `a9f06c0f` to the production0.159.2 pin (runner initialization, explicit native-host selection and bounded diagnostics). This dedicated QA session did not author the production change and did not interact with GitHub, credentials, production data, model providers or deployment systems.

## Phase results

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS: AC1–AC4 require clean-host private CLI directories, actual sandbox readiness, honest credential/admin diagnostics and independent regression coverage. The latest user request and packet contract are authoritative. | `task-contract.md` |
| 1 Diff review | PASS: exactly four scoped files: runner initialization, real subprocess regression, native CI smoke and matching controller runner selection. No unresolved correctness/security findings. | `qa-reviewed-files.sha256` |
| 2 Tests/build | PASS for independently executed scoped suite76/76 and additional actual subprocess probes2/2; FAILED VALIDATION for actual native sandbox integration. Prior independent TypeScript/frontend production build evidence carried forward because application sources and packages are unchanged. | `test-results/qa-node-suite.txt`, `qa-runtime-probes.mjs`, `test-results/qa-runtime-probes.txt`, `test-results/qa-frontend-build-carried-forward.txt` |
| 3 Browser | PASS:1/1 Playwright assertion run on explicitly enabled localhost QA-only report surface. Checks actual76passed/0failed, new private-directory regression, role isolation and process-failure regressions, reload consistency, zero console/page errors and zero HTTP errors. | `qa-surface.spec.mjs`, `qa-surface-server.mjs`, `qa-playwright.config.mjs`, `result.png`, `trace.zip`, `playwright-report/index.html`, `test-results/qa-playwright.txt` |
| 4 Security | PASS for the reviewed code; live activation remains blocked by external access prerequisites. | Checklist below and root operational-readiness evidence |

## Review and additional runtime probes

- `process.mjs` creates HOME, CODEX_HOME and CLAUDE_CONFIG_DIR before launch, with0700 permissions on fresh directories. Recursive creation is idempotent and does not overwrite files. The task does not claim to repair permissions on externally preexisting directories.
- Existing credential allowlists and per-role authentication boundaries remain intact. Independent subprocess probes verified actual child environment/config-directory modes for verification/model/review and confirmed that GitHub controller credentials are absent from all three.
- Configuration is initialized even before a missing executable fails; a subsequent successful call preserves a synthetic config file and its0600 permissions.
- CI installs the pinned actual Codex CLI, runs its sandbox through the same production runner, asserts successful exit and the exact expected command output. It neither invokes a paid model nor supplies provider credentials. A sandbox failure fails the job rather than falling back to unrestricted execution.
- Source hashes bind this report to the four reviewed files. The native runner's actual result is recorded separately by the root in `validation-report.md`; this QA session does not substitute mock results for that integration check.

## Native-host follow-up review

The actual ubuntu-latest sandbox smoke failed before executing the payload: bubblewrap loopback setup returned `Failed RTM_NEWADDR: Operation not permitted`. The follow-up changes only `runs-on` to `ubuntu-22.04` in the regression and processing workflows. Both now exercise the same explicit host family. Sandbox arguments, isolation, capabilities, sysctls, credentials and success assertions remain unchanged. This is a compatibility comparison, not evidence of successful native execution. Root retains the failed run and records the new native result separately. The unchanged Node/runtime/browser tests were not repeated for this two-line host-selection change.

## Native diagnostic and configuration follow-up

The ubuntu-22.04 native run returned exit0 but empty stdout; the exact-output assertion correctly rejected it. Follow-up `ce2d2fc8` adds a direct CLI comparison using the identical isolated verification environment, a synthetic workspace marker and explicit exit/output/file-content assertions. The diagnostic prints no model input or credential-bearing environment. Both invocations remain sandboxed, with the same fixed script and bounded timeout. The new run is authoritative; this report does not treat exit0 alone as successful sandbox execution.

The workflow additionally reports seven explicitly enumerated boolean configuration expressions, guarded to same-repository pull requests or non-PR events. Secret values are never passed into this reporting subprocess, logged, decoded or extracted. Job permissions and checkout credential handling remain unchanged. Boolean availability alone does not establish a key's validity, billing, model access, token scopes or deployment permission. Native probe and availability results are recorded by the root after the run; no unchanged Node/app/browser tests were repeated for this workflow-only diagnostic edit.

## Final native compatibility results

The diagnostic run confirmed that both the production runner and direct CLI invocation of0.159.2 returned exit0 with empty stdout on ubuntu-22.04. Available configuration booleans reported OPENAI_API_KEY, ANTHROPIC_API_KEY and CLINICOS_BOT_TOKEN absent; VERCEL_TOKEN and RAILWAY_TOKEN present; Vercel project identifiers absent and automatic release disabled. Presence of deployment tokens establishes neither their validity nor authorized deployment readiness.

The isolated0.163.0 comparison in `a9f06c0f` reproduced the same empty-output failure through both invocation paths. It did not fix readiness and was reverted. Final regression and production workflows both pin0.159.2 on ubuntu-22.04; no test-only version mismatch remains. Actual sandbox readiness is **FAILED VALIDATION**, not inferred from successful installation, execflag support, exit0 or unit tests. The failing gate and exact-output assertions remain intact. The root cause of the empty-output behavior remains unresolved. Actual runs and failure logs are recorded in `validation-report.md` and `operational-readiness.json`.

Review of the final pin reversion found no additional correctness/security issue. Unchanged Node/runtime/app/browser suites were not repeated for these diagnostic/version-only changes. No authenticated model call, sandbox bypass or production action was introduced.

## Security checklist

| Check | Result |
| --- | --- |
| Secrets | PASS: no real credentials or connection details added; independent role-isolation fixtures are explicitly synthetic. |
| PHI | PASS: no patient data accessed or included. |
| Logging | PASS: initialization adds no clinical/configuration logging. QA evidence includes sanitized test names/counts only. |
| Input validation | PASS: no new external input or endpoints; existing argv-only process invocation retained. |
| Authorization | PASS: existing model/review/controller role filtering retained; workflow contents permission remains read-only and checkout does not persist credentials. |
| Injection/XSS | PASS: no SQL/application HTML changes; local QA page escapes test names and uses restrictive CSP. |
| Dependencies | PASS: no application dependency changes; CI smoke pins the existing CLI version explicitly. |
| Configuration | PASS: no authentication bypass, sandbox bypass or weakened production flags; report surface binds127.0.0.1 behind an explicit QA flag and is not imported by the application. |

## Verdict and operational limits

**BLOCKED** for the requested complete live workflow activation. The scoped initialization and diagnostic source has no unresolved review findings and is bound to `qa-reviewed-files.sha256`, but AC2's actual native sandbox integration failed on all tested hosts/versions. Actions confirms required model/bot credentials unavailable; current integration cannot administer that configuration. Local Claude authentication is missing and trusted-main integration remains pending.

No authenticated Claude review, GitHub-triggered live bug execution, merge or deployment was performed or certified by this QA gate. Local cloud sandbox host support and native GitHub sandbox execution are separate failed integration results documented by the root. The screenshot demonstrates a real saved synthetic regression report, not the requested live workflow. Unit/probe/browser success does not override these activation blockers.
