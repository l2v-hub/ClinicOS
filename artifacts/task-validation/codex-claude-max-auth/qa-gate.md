# Independent QA — Claude Max subscription review

Date: 2026-10-16. Existing draft PR #471. Reviewed source commit `b99ff005b8fdb8d6bdd9df09cd4e93c90334c0df`; six source/test/documentation files bound by `qa-reviewed-files.sha256`. Dedicated QA did not author implementation or mutate GitHub, invoke inference, merge or deploy.

## Phase results

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS: AC1–AC5 require subscription-only review, credential-role isolation, safe CLI diagnostics, preserved verified administration and personal OAuth consent outside chat. | `task-contract.md`, `implementation-plan.md` |
| 1 Diff | PASS after the cached-auth finding below was fixed. Two workflows, child process environment/launch guard, diagnostic sanitizer, five new tests and matching documentation only. No application/schema/dependency changes. | `qa-reviewed-files.sha256` |
| 2 Tests/build | PASS: independent full scoped regressions86/86, including subscription tests5/5; shared sanitizer/process-runner unit suite6/6; both workflow YAML and all inline JavaScript syntax; five original sandbox assertions retained; `git diff --check`. Prior frontend TypeScript/build carried forward only because application/package files are unchanged. | `test-results/qa-regressions.txt`, `test-results/qa-sanitizer-process.txt`; `../codex-runner-activation/test-results/qa-frontend-build-carried-forward.txt` |
| 3 Browser | PASS: new1/1 Playwright run against an explicitly enabled localhost QA-only report of actual independent86/86 results. Asserts concrete totals, OAuth/API isolation and cached-auth prevention test names, reload persistence, no console/page errors and no HTTP errors. Screenshot visually inspected. | `qa-surface-server.mjs`, `qa-surface.spec.mjs`, `qa-playwright.config.mjs`, `result.png`, `trace.zip`, `playwright-report/index.html`, `test-results/qa-playwright.txt` |
| 4 Security | PASS for scoped changes; actual Max token configuration/authentication and complete live review remain separately verified. | Checklist below |

## Finding fixed before push

Initially subscription mode only removed the API key environment variable. With missing OAuth the reviewer executable could still launch against an existing runtime authentication cache, contradicting fail-closed billing selection. The implementation now returns `subscription-oauth-required` before directory creation or executable launch whenever review/subscription mode lacks the computed OAuth token. The new actual subprocess test seeds synthetic cached API credentials and verifies no launch marker is created. The complete independent suite passes with this fix.

No unresolved scoped correctness/security finding remains.

## Reviewed guarantees and independent evidence

- Subscription mode passes only `CLAUDE_CODE_OAUTH_TOKEN` to review children, even when an API key exists. OAuth is absent from controller, executor and verification child environments. Actual synthetic reviewer subprocess confirms OAuth=true, API=false and GitHub=false.
- A setup token under the previous secret name is accepted only with the known OAuth prefix; a separately billed API key under that name is excluded. A dedicated OAuth value takes precedence. No token or personal session is manufactured/copied by the change.
- Shared sanitization now removes OAuth assignment values and underscore-style GitHub token forms as well as prefixed OAuth credentials. Existing sanitizer/process-kill regressions independently pass6/6.
- The controller workflow explicitly selects subscription review. Installation precedes credential-bearing steps. The manual readiness probe requires the exact reviewed SHA and uses the pinned official CLI with the same review environment; it does not perform inference or publish CLI authentication output.
- OpenAI metadata remains a fixed-origin GET with timeout and redirect rejection. The former Anthropic API metadata probe is removed. CLI recognition of authentication is configuration evidence only, not remote token validation, quota availability or completed Claude review.
- Durable implementation/review budgets, exact-SHA final review, release gates, sandbox flags and controller permissions are unchanged. Existing86-test coverage includes four-attempt/four-review exhaustion and no reset.
- QA independently fetched official `anthropics/claude-code-action/main/docs/setup.md`; it explicitly documents Pro/Max `claude setup-token` and the `CLAUDE_CODE_OAUTH_TOKEN` secret for Actions.

## Actual administration evidence

QA independently inspected `/workspace/.clinicos-cloud/admin-success-run.log` from [run38967368595](https://github.com/l2v-hub/ClinicOS/actions/runs/38967368595). The script returned `status:verified`, PR approval enabled, required check `bug-pipeline-tests`, ruleset25275509. Its existing verification checks preserved default workflow permissions and the effective exact-main rule. Root additionally confirmed main protection through a separate read. The previous bot403 blocker is resolved; it must not be repeated as current status.

## Security checklist

| Check | Result |
| --- | --- |
| Secrets | PASS: synthetic test credentials only; no real OAuth/API key in diff or report surface. Real credentials remain Actions secret inputs, not logged. |
| PHI | PASS: no patient data accessed or changed. |
| Logging | PASS: fixed configuration booleans and sanitized outcomes; token patterns/assignments redacted. Browser report renders escaped synthetic test names only. |
| Input validation | PASS: exact reviewed-SHA probe guard, fixed CLI argv, known-prefix legacy conversion; missing subscription token blocks before spawn. |
| Authorization | PASS: OAuth restricted to review; model/verification/controller scopes unchanged; existing main protections and human requirements preserved. |
| Injection/XSS | PASS: no SQL/application HTML changes; QA-only report escapes test names and uses a restrictive CSP. |
| Dependencies | PASS: existing pinned official Claude CLI; no application package/lockfile changes. |
| Configuration | PASS: subscription mode excludes API fallback and cached-auth launch when OAuth is missing. QA-only server requires explicit env flag, binds127.0.0.1 and is not imported by the app. |

## Verdict and limits

**BLOCKED** for complete live subscription-review activation: the actual hosted run confirms the personal Max OAuth credential is missing. Reviewed source has no unresolved QA finding; the exact-SHA native regression and sandbox checks passed. Remote review and the complete live cycle remain unexecuted. All source hashes match the reviewed commit.

Browser artifacts show a real saved synthetic regression report, not a real Claude inference or completed issue/PR/deploy cycle. Personal OAuth token generation/consent must use the official account flow and direct secret entry, never chat or tracked files. No paid inference, real Claude review, issue processing, merge or production deployment occurred in this QA session.

## Final actual native evidence inspected

QA independently read `/workspace/.clinicos-cloud/max-config-run.log` for [manual run38967955543](https://github.com/l2v-hub/ClinicOS/actions/runs/38967955543), reviewed commit `b99ff005b8fdb8d6bdd9df09cd4e93c90334c0df`:

| Actual check | Result | Interpretation |
| --- | --- | --- |
| Full native regressions | PASS86/86 | Matches independent local86/86. |
| Real isolated Codex sandbox | PASS | Exact output and marker assertions retained and passed. |
| OpenAI configured planner metadata | HTTP200, verifiedtrue | Metadata access only; no inference executed. |
| Dedicated Max OAuth secret availability | false | No configured personal subscription token. |
| Computed Max reviewer configuration | credentialConfigured=false, apiKeyExcluded=true, cliRecognizesAuthentication=false, inferenceExecuted=false | Existing legacy secret was present but was not recognized as OAuth. The probe excluded API authentication and did not launch auth/inference without OAuth. |

The observed block is expected fail-closed behavior, not an API fallback. A personally generated official `claude setup-token` value must be entered directly into Actions secret `CLAUDE_CODE_OAUTH_TOKEN` before another exact-SHA configuration probe and eventual real review. This QA gate never solicits the value in chat, manufactures it or copies another account session. GitHub administration and sandbox blockers are resolved; the remaining subscription prerequisite is personal OAuth consent/token entry. No complete Claude review/issue/deploy cycle is claimed.
