# Independent QA — bounded setup PR review

Date: 2026-10-16. Existing draft PR #471. Ten reviewed workflow/helper/test/documentation files, including local-service readiness and its CI installer, are bound by `qa-reviewed-files.sha256`. Dedicated QA did not author implementation, invoke a model, mutate GitHub, merge or deploy.

## Phase results

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS: AC1–AC7 require exact-SHA/admin/same-repository preflights, subscription-only read-only review, remote reservation before inference, four durable attempts, authentic published evidence, isolated local-service readiness and no release bypass. | `task-contract.md`, `implementation-plan.md` |
| 1 Diff | PASS after two findings below were fixed. One workflow adds a manual bootstrap review job; the fixed-PR helper reuses existing reviewer/state APIs; seven synthetic real-Git tests verify recovery and bounds. | `qa-reviewed-files.sha256` |
| 2 Tests/build | PASS for independent complete scoped regressions93/93, including bootstrap7/7; repeated93/93 after the local-service follow-up; new helper syntax, both workflow YAML/all inline JavaScript, retained five basic sandbox assertions and unchanged permission/concurrency controls checked. Actual new native service positive/negative checks remain pending. Existing application TypeScript/build evidence carried forward for unchanged application/package files. | `test-results/qa-regressions.txt`, `test-results/qa-local-services-regressions.txt`; `../codex-runner-activation/test-results/qa-frontend-build-carried-forward.txt` |
| 3 Browser | Prior independent Max report Playwright1/1 and result artifacts carried forward explicitly: bootstrap changes metadata/state/publication only; application and safe report-surface UI remain unchanged. Screenshot/report prove the prior synthetic86-regression result, not this new93-test run or an actual Claude review. | `../codex-claude-max-auth/result.png`, `../codex-claude-max-auth/trace.zip`, `../codex-claude-max-auth/playwright-report/index.html`, `../codex-claude-max-auth/test-results/qa-playwright.txt` |
| 4 Security | PASS for scoped source; real review/default-branch integration remain separately gated. | Checklist below |

## Findings fixed before actual inference

1. An approval persisted before a failed GitHub review POST could be reused without ever publishing the required PR review. Fixed: the helper reads the restored hashed report even for reused approval, checks paginated existing reviews for exact body/SHA and posts only when absent. A failed-publication/retry regression proves one model call, eventual publication and no duplicate on a later run.
2. Restoring the ledger before the existing review helper's symlink checks could overwrite a redirected file. Fixed: canonical packet path validation precedes writes; ledger/report/diff creation uses exclusive `wx`. A real symlink regression proves the external target remains unchanged and no additional model call occurs.

No unresolved scoped correctness/security finding remains.

## Reviewed controls

- The manual job is restricted to the fixed repository and requires the native regression job. It shares the ordinary controller's repository concurrency group with cancellation disabled.
- Before model work the helper checks exact40-character reviewed SHA, dispatch SHA, administrator actor, same-repository open PR471/current head, checked-out HEAD and valid existing batch state. It checks current PR head again before publishing.
- Running review state is compare-and-swap saved remotely before `claude --print`; CAS failure prevents inference. An interrupted remote running attempt blocks automatic recovery and cannot reset the budget. Existing batch records are preserved in the same state object.
- Prior reports/ledger are restored to the same fixed packet. Existing helper validates approval report hashes, exact subject SHA and the four-round ledger, and enforces Read/Glob/Grep-only tools, empty MCP configuration, no project settings or commands. Approval reuse is allowed only for identical SHA and untampered evidence.
- Independent tests prove reservation-before-inference, CAS/admin/stale/interrupted rejection, a head change during review preserving its spent attempt without publishing, a total four-call cap across source commits, tampered evidence rejection and publication recovery without a new call.
- The model process receives the review role through the existing credential-isolating runner: subscription OAuth only, API fallback excluded, no GitHub/deployment credentials. CLI errors print fixed classifications and exit code rather than provider messages or credentials.
- The helper posts a SHA-bound `COMMENT` review containing the actual validated structured report (or durable/artifact reference for a large report). It does not impersonate a GitHub approval or bypass human review rules.
- No merge/deploy/issue-close operation is present. The full runtime diff excludes generated artifact content from its text but the plan explicitly requires reviewing current saved QA/evidence through read-only file tools. No new review packet or ledger reset is created to bypass limits.

## Security checklist

| Check | Result |
| --- | --- |
| Secrets | PASS: synthetic mock model inputs only in tests; actual OAuth stays in Actions and only the review child. No raw provider response/error is logged. |
| PHI | PASS: no clinical or production data accessed. |
| Logging | PASS: fixed classifications/outcomes and validated structured reports; existing sanitizer/review validation remains active. |
| Input validation | PASS: fixed repository/PR/packet, strict actor/SHA, bounded report names/sizes and pagination, canonical path/exclusive creation. |
| Authorization | PASS: administrator and exact-head checks precede inference; native gate dependency and serialized remote CAS; model role has no GitHub/deploy credentials. |
| Injection/XSS | PASS: no SQL/application HTML changes; argv-only Git/GitHub operations and structured JSON request body, no shell interpolation. |
| Dependencies | PASS: existing pinned official CLI/action revisions; no application dependency changes. |
| Configuration | PASS: default workflow permission remains read-only; controller token scoped to explicit step; four-attempt subscription review enforcement and existing protections remain intact. |

## Verdict and limits

**BLOCKED** for completed default-branch activation until actual native local-service positive/negative checks, Claude review and required exact-head gates pass. The current source is approved for native readiness probing only. Actual inference requires those native service gates first; source changes require re-review and remain within the same durable four-round budget.

Prior native38969585616 recognized Max OAuth and passed86 regressions/sandbox without inference; this is a prerequisite, not the requested real review. The new93/93 synthetic regression result does not prove real provider execution, PR approval, integration or deployment. No model inference, new issue processing, merge or deployment was performed by this QA session.

## Local-service follow-up before inference

Independent source investigation found the original `:workspace` verification network cannot reach host PostgreSQL or bind local HTTP: pinned Codex0.159.2 restricted seccomp denies connect/bind/listen/IP sockets and bubblewrap unshares networking. `workspace.prepare` already generates Prisma, so that was not reported as missing. The root canceled the first review while still checking out; no model reservation/inference occurred according to its inspected state/run evidence.

Reviewed correction:

- A controller-owned static named profile inherits `:workspace` filesystem restrictions and enables the supported managed proxy, with every proxy domain denied, local binding only and SOCKS/UDP proxy disabled. It does not select unrestricted access, legacy Landlock or global policy changes. CLI overrides and the executed harness come from trusted controller source outside model worktrees.
- Each verification command gets a fresh synthetic PostgreSQL16 cluster, migrations and command lifecycle in the same sandbox network namespace, followed by cleanup. PostgreSQL uses TCP127.0.0.1 only; Unix sockets are disabled to preserve the managed proxy's AF_UNIX restriction. The planner is told that HTTP/API/frontend/mock services must start/test/stop within that same invocation.
- The required native job now installs trusted dependencies/Prisma and PostgreSQL, then uses the identical profile/harness factory. It retains all five original basic assertions and adds actual local HTTP/SQL checks, explicit external TCP/UDP denial, proxy GET/CONNECT403 and denied writes to a controller-owned external file. Actual pass is not inferred from mocked tests or schema support.
- QA required removing `ECONNREFUSED` from accepted external-denial outcomes: a remote refusal does not establish containment. Both negative tests now accept only `ENETUNREACH`, `EACCES` or `EPERM`; timeout also fails validation. QA also identified the Unix-socket conflict; the fixed harness disables those sockets.
- Bootstrap checkout now uses shallow history. The helper validates the exact base SHA and GitHub comparison ancestry, fetches only that base when absent, computes direct-tree diff and rechecks unchanged main base/head after review. This avoids the large full-history fetch without skipping diff verification.

Independent local follow-up suite passed93/93 in3.45seconds. Both workflow YAML/all inline JavaScript, new helper/probe syntax, exact original sandbox assertions and `git diff --check` passed. The expanded nine-file manifest must match the actual native-tested source; native results are recorded by the root before any model dispatch. The new local-service capability remains unverified until that actual run completes.

## Native dependency installation follow-up

Actual run38972121631 stopped before the new profile/harness executed because stock Ubuntu22.04 APT could not locate `postgresql-16`. This is a dependency-preparation failure, not an observed profile success or failure. No model attempt was reserved.

Reviewed correction adds a shared installer used by both required regression and processing workflows before provider credentials enter any step. It is restricted to ephemeral Actions execution, downloads the official PGDG public key over verified HTTPS, requires exactly one primary key and the full pinned40-hex fingerprint, installs that key for a single `signed-by` HTTPS Jammy PGDG repository, and installs PostgreSQL16. It stops only the default16main cluster after installing missing binaries; it does not stop arbitrary existing PostgreSQL versions or alter production hosts. Key mismatch/bundle ambiguity fails before repository trust is added; no TLS bypass was introduced.

Independent checks pass: `bash -n`, actual non-CI guard execution returns1 before privileged work, both workflow YAML/shared callsites, updated native probe JavaScript syntax and `git diff --check`. Existing93/93 suite is carried forward without an unnecessary rerun for this installer/probe-only change. The SQL positive proof now checks the actual Patient table and nonempty Prisma migration history, not only a successful connection. Evidence: `test-results/qa-installer-checks.txt`.

The manifest is expanded to ten reviewed source files. Approval remains **native-readiness-only**: dependency installation and every positive/negative service assertion must pass on the actual runner before a model review. The local environment's blocked public-key download was not bypassed, and no native key verification success is fabricated.
