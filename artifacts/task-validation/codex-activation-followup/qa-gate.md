# Independent QA — activation follow-up

Date: 2026-10-16. Existing draft PR: #471. Baseline: `ff6d24a3`; latest review includes the synchronous readiness probe and explicitly authorized repository administration follow-up.
Dedicated QA reviewed all four changed source/test files without authoring implementation, contacting model providers, mutating GitHub, merging or deploying. Root records actual native results separately.

## Phase results

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS: current AC1–AC6 cover safe diagnostics, enforced native readiness, exact-SHA/admin-authorized additive configuration and independent review. The latest user request and packet contract are authoritative. | `task-contract.md` |
| 1 Diff review | PASS for the reviewed follow-up; no unresolved source correctness/security finding. Every PR emits the newly required check after the path-filter correction below. | `qa-reviewed-files.sha256` |
| 2 Build/tests | PASS: independently executed full scoped regressions81/81, including new configuration tests5/5; YAML parsing, extracted inline JavaScript syntax, CLI/admin script syntax, unchanged-assertion comparison and `git diff --check`. Prior frontend build carried forward for unchanged application files. Actual native readiness PASS: the root-provided manual run38964221458 log independently inspected by QA shows81/81 and exact expected output from both runner/direct CLI plus marker assertions. | `test-results/qa-complete-regressions.txt`, `test-results/qa-settings-tests.txt`, `test-results/qa-diagnostic-checks.txt`; `../codex-runner-activation/test-results/qa-frontend-build-carried-forward.txt` |
| 3 Browser | Prior independent QA-only report Playwright1/1, screenshot and trace carried forward: no application UI/report-surface source changed. These demonstrate the saved synthetic regression report, not live activation. | `../codex-runner-activation/result.png`, `../codex-runner-activation/trace.zip`, `../codex-runner-activation/playwright-report/index.html`, `../codex-runner-activation/test-results/qa-playwright.txt` |
| 4 Security | PASS for reviewed source; live authorization/provider/release outcomes require separately recorded actual results. | Checklist below |

## Findings and reviewed behavior

1. A globally required check combined with `pull_request.paths` filtering would block unrelated PRs indefinitely. Fixed before administration dispatch: PR path filtering is removed; push path filtering remains. Independently verified every PR emits the required regression job.
2. Failure diagnostics now include direct-only CLI exit/output failures, preserving original runner checks. The source newline delimiter is a correct single JavaScript newline escape; the initial concern was nested JSON output rendering and was withdrawn after character-code verification.
3. Native prior diagnostics proved the marker executed and explicit failure propagated, while Node asynchronous stdout was missing. The follow-up uses `fs.writeSync` for the exact same synthetic readiness message in workflow and doctor. All five original workflow success/exit/output/marker assertions remain unchanged. This is not a sandbox bypass and actual success is not inferred before the next native run.
4. Marker, absolute echo, fixed `exit 7` and optional process tracing use the existing credential-filtered verification environment. Every probe retains `codex sandbox --permission-profile :workspace`; no host capability, sysctl, auth or production policy is weakened. Missing strace records an optional diagnostic error and cannot clear failed readiness.
5. Repository administration is manual-only on the fixed repository. Before mutation the script requires an exact40-character SHA match and confirms the dispatch actor is an administrator; settings/main/ruleset read preflights must succeed. Failed authorization/revision/read checks make no writes in independent tests.
6. The administrator script enables only Actions PR approval/creation, preserving default workflow token permissions. It adds an active exact-main ruleset with the GitHub Actions-owned `bug-pipeline-tests` check, no bypass actors and no replacement of classic/inherited/human protections. When its own ruleset exists it preserves all prior rules/strictness and refuses ambiguous targets or differently bound checks. Tests cover preservation, denial and idempotency.
7. Final reads verify approval is enabled, the default token permission remains identical, and the managed check is effective on main before returning `verified`. An unsupported API/token/plan fails explicitly; partial authorized changes are not misreported as a completed configuration.
8. The bot credential exists only in the manual Actions step environment; API requests use fixed GitHub origin/routes, reject redirects, set a timeout and log sanitized method/route/status failures rather than response bodies or tokens. No provider/model call is introduced.

## Security checklist

| Check | Result |
| --- | --- |
| Secrets | PASS: no real values added to source/evidence. Availability reporting receives booleans only; bot credential remains inside Actions. |
| PHI | PASS: synthetic marker/output/exit fixtures only; no patient data access. |
| Logging | PASS: fixed synthetic process diagnostics and configuration result metadata; no clinical/provider prompts, environment dumps or tokens. |
| Input validation | PASS: fixed repository/routes/argument arrays, strict SHA and actor syntax, exact revision/admin checks before mutation. |
| Authorization | PASS: manual-only configuration job; read-only default workflow token; checkout credentials not persisted; existing human rules remain effective. |
| Injection/XSS | PASS: no application SQL/HTML changes; fixed diagnostic shell payload only `exit 7`; API routes are fixed except validated actor/numeric IDs. |
| Dependencies | PASS: no application dependencies or lockfile changes; same pinned CLI and official action revisions. |
| Configuration | PASS: additive exact-main check, preserved workflow permission level and human protections, no sandbox/release-budget weakening. |

## Verdict and operational limits

**BLOCKED** for complete live activation: actual native readiness now passes, but the authorized settings mutation was denied403 and trusted workflow/provider/release prerequisites remain to be established. The reviewed source is approved for an exact-reviewed-SHA diagnostic/configuration dispatch; hashes bind this report to those four files. A source change requires re-review.

The user supplied the bot credential. Actual manual dispatch38964221458 passed its administrator/read preflights but its first authorized PUT to Actions workflow permissions returned403; no settings mutation was successful. This is an actual bot-token write failure, separately established from the prior platform integration403. A null default branch-protection field with denied rule listing never justified overwriting unknown protections; this implementation uses a cumulative new rule instead.

No authenticated Claude review, model request, real issue processing, merge or deployment was performed/certified by this QA session. Prior unit/build/browser evidence is explicitly carried forward for unchanged source and does not substitute for actual workflow execution. Root records the authoritative native/admin outcomes in `validation-report.md` and logs.

Post-push verification: reviewed source commit `2f832ee11d99497bbd7789f7b655d512dc47d822`; all four source hashes still match. Independent complete scoped suite subsequently passed81/81 in3.36s. Native/admin dispatch38964221458 and PR run38964221659 remain separately recorded by the root.

## Actual native/admin execution inspected

QA independently read `/workspace/.clinicos-cloud/activation-bot-run.log` from manual dispatch [38964221458](https://github.com/l2v-hub/ClinicOS/actions/runs/38964221458). The log records81tests/81pass/0fail, production isolated runner `ok:true,code:0,stdout:sandbox-ready`, direct CLI `code:0,stdout:sandbox-ready`, and `Real isolated Codex sandbox: PASS` after exact marker assertion. This clears the previous native sandbox readiness blocker for the reviewed Ubuntu22.04/CLI0.159.2 configuration.

The same run records `GitHub PUT /repos/l2v-hub/ClinicOS/actions/permissions/workflow: HTTP403` after authorization/read preflights, before any successful write. The additive ruleset was therefore not created. Repository settings remain unconfigured by this attempt; actual provider inference, Claude review and release were not run. PR regression run38964221659 is separately reported successful by the root.

## Read-only provider and permission-diagnosis follow-up

Reviewed the subsequent optional `verify_provider_access` job and fixed error-category mapping. The provider job is manual-only on the fixed repository and requires the dispatched exact reviewed SHA before requesting metadata. Its explicit step secrets are provider keys only, with no bot/deployment key. OpenAI model lookup encodes the configured planner ID; Anthropic model list uses limit1. Both use fixed official HTTPS origins, default GET, rejected redirects and30second aborts. Only a fixed probe name, status and boolean (or fixed request-failed category) are logged. No inference, model list/body, header or credential is printed. Metadata success cannot establish available credits, inference entitlement, complete Claude review or deployment. All three workflow inline JavaScript blocks pass independent syntax checking.

GitHub errors now parse the response privately and map only four known messages to fixed reason identifiers; unrecognized text maps to `github-request-denied`. No arbitrary message/body/header is emitted. Existing authorization/mutation logic is unchanged; the previously independently passed81test result is retained without an unnecessary repeat for this logging-only change. The final native provider/admin outcomes are independently inspected below and recorded separately by the root. Updated manifest binds this review to the four current sources.

## Final inspected outcomes — current reviewed source

Final reviewed source: `cf6be8198946230821685a2309554fff07894b59`. All four manifest hashes match after commit hooks/push. QA independently inspected `/workspace/.clinicos-cloud/activation-access-run.log` for [manual dispatch38964563242](https://github.com/l2v-hub/ClinicOS/actions/runs/38964563242):

| Actual check | Result | Interpretation |
| --- | --- | --- |
| Full native regressions | PASS81/81 | Matches the independent local81/81 result. |
| Real isolated sandbox | PASS again | Exact stdout and marker assertions passed; no sandbox weakening. |
| OpenAI configured planner metadata | HTTP200, verifiedtrue | Key/model metadata access established; inference/credit/complete bug processing not tested. |
| Anthropic metadata | HTTP401, verifiedfalse | Configured credential was rejected by official API authentication; Claude review remains blocked. |
| Bot settings mutation | HTTP403, `bot-token-permission-denied` | Token cannot perform the requested Actions-settings write; repository administration authorization must be corrected. No successful mutation, effective ruleset or changed protection is claimed. |

The settings request failed at the first write after read/admin-actor preflights, so no additive ruleset was created. Native failures no longer explain the blocked activation. The remaining current blockers are actual Anthropic authentication and GitHub bot write authorization; dependent trusted-main activation, authenticated Claude review, processing and release cannot be certified while those fail. Deployment credentials were not exercised; no paid inference, real issue processing, merge or deployment occurred.

**BLOCKED** remains the final activation verdict because of those two external access failures. The exact reviewed source has no unresolved scoped QA findings. No screenshot/unit/metadata success is substituted for the requested complete live cycle.
