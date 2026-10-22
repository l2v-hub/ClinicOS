# Bounded official Railway API host analysis

The fixed official CLI source proves a compatibility discrepancy: its default production GraphQL API is `https://backboard.railway.com/graphql/v2`; the three ClinicOS clients at main `c05ce82edcf6c3b7da5396b3bed3bf1c85396ca4` use `.app`. Recommend one coherent six-file change: the three existing constants and their three existing tests. No additional dependency requires a shared helper, production export, workflow edit or CLI change.

## Verified facts

- Official `src/config.rs` raw bytes independently hash to Git blob `b92c4187ff823d96ab602122f3fe773a33b9ed71`, matching the supplied official tree at `a12a2571c87027655e8aeeb6b7d4519766aaa2be`. `Configs::get_environment_id` (394–404) defaults to Production; `get_host` (407–412) selects `railway.com`; `get_backboard` (415–419) constructs the actual `.com/graphql/v2` API. This evidence concerns the API method, independently of the earlier UI `get_security_url` observation. Arbitrary backboard override is compiled out of release builds (169–188).
- `createReadOnlyAccess` in `scripts/maintenance/demo-storage-inspect.mjs` uses ENDPOINT at 286 and `redirect: error` at 208. Its CLI child environment (352–356) does not copy `RAILWAY_ENV` or `RAILWAY_BACKBOARD_URL`, so the pinned release CLI follows its production default.
- Exact production `.app` references within scripts, agent-team/src and .github are `scripts/maintenance/demo-storage-inspect.mjs:12`, `scripts/automation/configure-demo-source.mjs:13`, and `agent-team/src/bug-pipeline/demo-deployment.mjs:24`.
- `configure-demo-source`'s `createClient` (185–202) uses its constant for fetch and bounded response validation; it retains project-token header, finite timeout and redirect refusal. The helper also has source-trigger mutations: host correction must not activate them. `demo-deployment`'s `createRailwayClient` (325–364) uses its constant and retains existing dedicated header, transport/error classification and read retry budgets; its writer capability is likewise unchanged.
- Supplied actual receipt for run39843385618/job120050401543/attempt1 binds main c05ce82e… and records TOKEN_IDENTITY / READONLY_GRAPHQL_REJECTED, errorsShape nonempty-array, category unknown. Native1/GitHub1/CLI0; identity, target access and binding remain unverified; cleanup/deletion/redeploy are false. The receipt identifies official run archive digest d0c2990e… and 53,709 bytes. Archive recovery and preceding test/pinned-CLI-install PASS are reported by the supplied contract/root evidence; this analysis did not independently fetch or execute them.

## Scope and validation proposed for the next implementation

| Source | Exact edit | Existing test scope |
| --- | --- | --- |
| scripts/maintenance/demo-storage-inspect.mjs | ENDPOINT host `.app` to `.com`, unchanged HTTPS/path | scripts/maintenance/demo-storage-inspect.test.mjs: assert the literal official URL independently of imported ENDPOINT; exercise both existing auth modes with unchanged exact headers/query/variables, redirect refusal and finite failure behavior |
| scripts/automation/configure-demo-source.mjs | ENDPOINT host only | scripts/automation/configure-demo-source.test.mjs: strengthen fixed-endpoint test at411 with independent literal `.com`; retain exact inventory body/header/redirect/timeout checks and fail-closed errors |
| agent-team/src/bug-pipeline/demo-deployment.mjs | RAILWAY_API host only | agent-team/tests/bug-pipeline/demo-deployment.test.mjs: update six literal `.app` expectations/fixture guards at696,1387,1757,2160,2417,2655 to `.com`; retain fixed-origin, credential isolation and rejected-body checks |

For each client, a failed/redirected/GraphQL-rejected request must not trigger a request to the old `.app` origin or an alternate header/query. Inspector identity rejection must still end before private-target reads or CLI; retain the existing one native request and one GitHub-main request bound. Existing runtime read retry budgets may remain; no new endpoint retry is proposed. Keep query strings, variables, credential kinds/scopes, target IDs, body sanitization, error categories, strict allowlists and all state transition budgets unchanged. Do not change non-backboard `.up.railway.app` application domains.

Run the three corresponding Node test files after implementation; preserve the current inspector workflow/binding regression checks in the established QA scope. No workflow/source-trigger activation, installer, pure binding module, deploy policy, shared abstraction or auth change follows from this discrepancy. No tests were run in this analysis.

An inspect-only alternative changes its source and test (two files) and correctly aligns native inspection with its unchanged pinned CLI. It is valid for a deliberately narrower diagnostic step, but leaves two independent release/topology clients on `.app`. Because root intends consistent clients and subsequently needs the release path, the proposed three-source/three-test scope is coherent and bounded; no static dependency forces a larger patch. Changing all three constants does not invoke either writer.

## Inferences and unknowns

The official source justifies an API-host compatibility update. It does **not** establish that `.app` caused this run's rejection or that `.com` will succeed. The safe failure category is unknown; credential invalidity, expiry, wrong kind, missing scope or remote resolver behavior are not proven. Root's unauthenticated `.app`/`.com` probes were blocked by CONNECT403 before the provider and supply no endpoint comparison. Earlier redirect:error behavior precludes attributing the observed GraphQL response to automatic cross-host Authorization stripping.

The production workflow's separately observed CLI `Invalid RAILWAY_TOKEN` is a distinct unresolved prerequisite; replacing these native GraphQL constants cannot establish that it is fixed. New host behavior requires fresh real validation after the normal implementation/QA/review/protected merge sequence, under a separate bounded root reservation. No automatic live retry, credential extraction, header/query fallback, scope expansion or bypass is authorized by this report.

Preserve actual diagnostic3 failure and all older subjects/evidence byte-for-byte. The supplied history remains three implementations and three reviews; any followup is prospective implementation4, without budget reset. This report supplies static scope analysis only, not model review, approval, successful provider access, clinical resolution, cleanup, merge, deploy or issue closure proof.
