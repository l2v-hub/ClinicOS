# Independent security QA — protected demo secret scope

**FAIL / NOT APPROVED for publication or operational execution.** Three findings are reproduced on the reserved source. No real secret, GitHub, provider, Git/index/ref, canonical, or clinical runtime mutation was performed. No source fix was made. Root owns the separately reserved follow-up and all publication/operations.

## Findings

### F1 — P2: actual workflow credential-free import always fails

Location: `scripts/automation/protect-demo-secret.mjs:354`; caller `.github/workflows/protect-demo-secret.yml:39`.

The workflow runs `node --input-type=module -e` to import `validateTrustedContext`. In that execution form `process.argv[1]` is undefined. The helper evaluates `pathToFileURL(process.argv[1])` unconditionally at module scope, before its CLI catch block, and throws `ERR_INVALID_ARG_TYPE`. The workflow stops before context validation and before its pure tests; both protected secret jobs are blocked by `needs`. This fails safely with respect to credentials, but makes the intended remediation workflow unusable.

Fresh exact execution-form reproduction (trusted stripped runner, no credentials):

```
node --input-type=module -e "import { validateTrustedContext } from './scripts/automation/protect-demo-secret.mjs'; console.log('import completed')"
```

Expected: import completes without executing CLI main. Actual: exit 1, empty stdout, TypeError at helper line 354. Receipt `workflow-preflight-import.json` preserves the actual failure. The fresh 30-test pure suite passes because `node --test` supplies a script argument; it does not exercise this workflow execution form. A source guard and regression using the actual `node -e` invocation are required in a separately reviewed follow-up.

### F2 — P1: a newly present environment copy can be overwritten during the awaited authority checks

Location: helper lines 237–248, especially the unconditional writer after line 245.

The second names inventory shows the environment secret absent. The helper then awaits environment metadata/policies, admin metadata, and main-ref reads. If another authorized process creates the environment copy during one of these awaits, the helper never rechecks names before calling unconditional `gh secret set`. The already-created environment copy is overwritten with the job's earlier bound repository value, violating the no-overwrite criterion.

Deterministic fake reproduction: start with repo copy present and environment copy absent; let `getMainRef()` add an environment copy while returning the correct unchanged main SHA; writer records whether a copy already exists. `ensureEnvironmentSecret` still invokes the writer with `overwritten === true` and returns `writes: 1`. Reproduction is the `SECURITY REPRO: environment appearing...` case in `adversarial.test.mjs` and `adversarial-final.json`.

This test demonstrates an avoidable stale-snapshot window, not a live overwrite. Rechecking names at the actual write boundary narrows it. GitHub secret writes offer no atomic create-if-absent precondition; a follow-up must also state/enforce exclusive operational ownership or otherwise avoid claiming unconditional protection against arbitrary external concurrent secret writers. The helper's concurrency group only serializes its own workflow runs.

### F3 — P1: deleting the repository copy can report success after the environment copy has disappeared

Location: helper lines 269–285, especially line 277 followed by fixed DELETE, then repo-only readback.

The second inventory verifies the environment name, but the helper performs several awaited authority reads before DELETE. If the environment secret disappears during those reads, the nonempty runtime binding remains the job-start value and cannot establish that the environment copy still exists. The helper deletes the repository copy, verifies only repository absence, and returns `deleted-and-absent` with no secret copy remaining.

Deterministic fake reproduction: start with both copies present; let `getMainRef()` remove the environment name while returning the expected unchanged SHA; fixed fake DELETE removes the repo name. `removeRepositorySecret` returns `deletes: 1`, with both `env === false` and `repo === false`. Reproduction is the `SECURITY REPRO: environment disappearing...` case in `adversarial.test.mjs` and `adversarial-final.json`.

A follow-up needs fresh names at the destructive boundary, environment-preservation readback, honest uncertain/partial outcomes, and a documented concurrency limitation/exclusive operational boundary. A post-delete failure cannot restore lost plaintext automatically, so readback alone is not a complete preservation guarantee. No automatic retry or compensating rewrite should be introduced.

## Identity and freeze

QA reservation nonce `8312166b-04c1-420a-98bc-d94a138eb1a0`, canonical reservation `162719730c20793545c2a5b802058b339d794a7f`. Worktree `/workspace/clinicos-demo-secret-scope`, base and directly read branch-ref SHA `fbaa78d8c7eacf8402db0c8fa2be276ae579a27c`.

The three source paths match the reserved author manifest SHA256 `eb2ec6123893c07066dfd2c5f87a8551928fba491833fe191094e0c510590be5`. Author seal SHA256 `6a669cb47b2d84703cc7cf245f26a9178d75833ee90f41f571349a92cff4ab8a` and every listed source/evidence digest were verified before and after. Contract SHA256 is `63c81b926c3e89f62370032645ccb903f3f75efb7b6252bce1292617ec11389f`.

`before.json`, `after.json`, and `freeze-comparison.json` show zero changes across all 294 checkout files, seven worktree Git metadata files including the index, eight author artifacts, and four contract/reservation/ref/trusted-runner records. QA's index freeze is byte-identical before/after. No Git status/diff/index operation was run by QA. Only private `independent-qa` files were created.

## Fresh checks and preserved attempts

All commands ran through trusted `/workspace/clinicos-review-handoff/agent-team/src/bug-pipeline/process.mjs` `createRunner`, with `envMode: verification`, constructed PATH-only parent environment, and private isolated runtime HOME. Fake API/CLI dependencies were used throughout. No provider/model/controller credentials were forwarded. The fake `gh` executable was reviewer-authored in this private directory, executed locally, then removed; it made no external requests.

| Receipt | Fresh result |
| --- | --- |
| `author-pure.json` | Actual source pure suite: 30 passed, 0 failed, 0 skipped, exit 0 |
| `workflow-preflight-import.json` | Actual workflow import execution form: exit 1, reproduced F1 |
| `adversarial.json` | First private 11-case probe run completed; retained unchanged |
| `adversarial-final.json` | Final private probes: 11 passed, 0 failed, 0 skipped; includes two successful unsafe-behavior reproductions for F2/F3 |

A passing reproduction test asserts that the unsafe behavior occurred; it is evidence of a finding, not safety approval. The first private run's malformed-response fixture returned HTTP500 rather than malformed JSON; that receipt remains preserved. The final private run corrects only this private fixture to return HTTP200 malformed JSON and rechecks the intended parser boundary. No source assertions were altered.

Final private cases cover real API adapter 403/404 failure, redirects, malformed JSON, oversized response rejection without reflection, fixed routes/redirect denial, actual CLI fixed error output on invalid context, invalid operation before credential access, actual fake-gh stdout/stderr suppression and provider/model environment exclusion, complete 100-name pagination, duplicate-page denial, and F2/F3. No unrelated suite expansion was needed for three new isolated automation files. Current runtime is Node24.19.0; hosted Node22 was not executed. The undefined `process.argv[1]` invocation behavior is intrinsic to the selected `node -e` form.

## Reviewed properties and remaining boundaries

The helper fixes repo, environment ID/name, branch and secret name; its workflow is manual-only, main/ref/workflow/SHA gated, and uses pinned checkout/setup actions. Actor and triggering actor must both be the actual fixed login `l2v-hub` (not a literal account-type string). Admin metadata requires permission `admin` and matching login. Complete fixed single-main branch policy and fresh main are checked before writes. No environment-policy/settings mutation route exists. Names inventories have bounded complete-count pagination and reject unreadable/truncated/duplicate/drifting results. Existing environment names skip the writer in non-racing paths. Repository absence is idempotent. Each write is attempted once; transport uncertainty has fixed diagnostics and does not automatically retry. These properties passed the existing pure suite and targeted independent probes where stated, but do not remove F2/F3.

`gh secret set` uses fixed argv and stdin-only value; the fake subprocess proved raw stdout/stderr are discarded and unrelated provider/model tokens are excluded. No secret value or fingerprint is placed in receipts/args. API uses fixed HTTPS api.github.com routes, rejected redirects, bounded response bodies and fixed diagnostic codes. Actual bot Secrets Read/write capability remains unverified and user-pending; credentials were not searched or tested.

The first secret job and subsequent separate removal job both bind the protected demo environment, which addresses job-start environment secret loading. A negative non-environment probe must still be a NEW workflow run after deletion; repository/org secret bindings from a run queued before deletion cannot prove absence. No such probe was executed by QA. The earlier ambient-secret metadata proof supplied by root is prior operational evidence, not freshly verified by this session.

The setup skill was already read for this review session. Existing runtime/dependencies sufficed, so no installation, browser, DB, service startup, network operation, or environment configuration draft was needed. Author's 30-test receipt is prior evidence, preserved under its seal; `author-pure.json` is this reviewer's fresh execution. Actual secret migration, protected-main merge, hosted workflow, user permission grant, negative probe, provider actions, publication and closure are unrun. Current source is not approved; follow-up must preserve this failed packet and obtain fresh independent review.
