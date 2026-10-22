# Independent targeted follow-up security QA

**PASS for the amended local source contract, under its explicit exclusive operational ownership condition.** The original F1/F2/F3 findings are resolved at the reproduced boundaries. No new blocking finding was observed. This is source approval for root's subsequent review/publication process, not evidence of a successful secret migration or authorization to bypass protected-main/native/model approval and pending Secrets Read/write permission.

## Reviewed identity

QA nonce `12a231e5-9564-4ef4-9668-c349a12786b8`, canonical reservation `866e8a76cf22991cdadc09d9f1a5b484f2ce7d0c`. Worktree `/workspace/clinicos-demo-secret-scope`, reserved base `fbaa78d8c7eacf8402db0c8fa2be276ae579a27c`. The reviewed scope remains the same three helper, helper-test, and workflow paths. The follow-up changes helper and tests; workflow bytes remain identical to the original reserved workflow.

Follow-up contract SHA256 `92a4fcf57c7f3b76c4abb9e86d271cdc949bb543bf968fbfb56e42bd47c0a2ae`; source manifest SHA256 `32f80166373409e92a1f2bf9e9b42bb660e4757eb1541cd460c339e7a765e17f`; author-followup2 seal SHA256 `3b2a224da52f91d1c7ff2dced928894a86f93168fb4843883bdbc8f8c858469c`. STOP SHA256 `3916ecfe6562204f3e08e7eb8cb67cc339f6289a6f634ef4bcd386f58b92afe1`. Every sealed source/evidence digest and source byte count was independently checked before and after validation. `reviewed-followup.diff` records the exact comparison with the preserved original three files.

## Fresh executions

All commands used trusted `/workspace/clinicos-review-handoff/agent-team/src/bug-pipeline/process.mjs` `createRunner`, constructed PATH-only environment, `envMode: verification`, and private isolated runtime HOME. Only fake API/fetch and reviewer-authored local fake-gh subprocesses were used. No real credentials, API, GitHub, provider, database, browser, install, or clinical runtime was used. Parent/child credentials were not inherited. The full source helper suite is the affected suite here; expanding to unrelated bug-pipeline tests was unnecessary.

| Receipt | Fresh outcome |
| --- | --- |
| `source-pure.json` | Entire source helper suite: 34 passed, 0 failed, 0 skipped, exit 0 |
| `workflow-preflight-import.json` | Exact original failing import invocation: exit 0, `import completed`, empty stderr |
| `adversarial-safe.json` | First adapted private run: 16 passed, 1 reviewer assertion failed; preserved |
| `adversarial-safe-final.json` | Final private suite: 17 passed, 0 failed, 0 skipped, exit 0 |
| `actual-workflow-preflight-receipt.json` | Actual current workflow Node `-e` code extracted from YAML, complete valid fixed public context, no secret bindings: exit 0, empty stdout/stderr |

The retained first private failure expected pagination calls `[1,2]`; the new intended final reinventory yields `[1,2,1,2]`. I corrected only that private expected call sequence to require both complete reads. The first script is preserved as `adversarial-safe-first-attempt.test.mjs`; its failing receipt remains unchanged. No source assertions or implementation were changed. Final adapted cases assert safe behavior; they do not count the former unsafe-behavior reproduction assertions as approval.

Current local runtime is Node24.19.0. Hosted Node22 and actual GitHub jobs were not executed. The actual workflow invocation form was exercised locally, including the previously missing `process.argv[1]` case.

## Resolution of prior findings

**F1 resolved.** Module entry checks that `process.argv[1]` is a string before converting it to a URL. Import using `node --input-type=module -e` no longer executes/throws in the CLI entry condition. The exact original failing command now passes. Separately, the workflow's actual extracted context-check JavaScript passes with only PATH and valid public fixed context; no token or secret is present and CLI main is not invoked. The source's new actual-child regression also passed.

**F2 resolved at the reproduced boundary.** Complete final secret-name inventories now run after the awaited environment/policy/admin/main authority checks, directly before the environment write decision. My original fake `getMainRef()` injection creates the environment name while returning the correct SHA. The helper observes that new name, returns `appeared-before-write`, performs zero writes, and preserves both existing copies. Existing environment-copy paths also recheck presence after authority awaits; disappearance fails with `ENVIRONMENT_SECRET_DRIFT` rather than falsely reporting presence.

**F3 resolved at the reproduced boundary.** My original fake `getMainRef()` injection removes the environment name before the fixed repository deletion boundary. The final inventory now detects it and raises `ENVIRONMENT_SECRET_REQUIRED`; there is no DELETE and the repository copy remains. The successful delete path reads both complete inventories afterward. If the environment disappears during DELETE, the helper reports `ENVIRONMENT_PRESERVATION_READBACK_FAILED`, never success. If a repository name reappears, it reports `REPOSITORY_DELETE_READBACK_FAILED`. If the environment inventory is unreadable after deletion, it remains unknown and fails. Each test observed at most the single intended DELETE, with no compensating write or retry. Repo-already-absent recovery also rechecks names after authority awaits and rejects a reappeared repository secret.

The post-delete failure code represents a possibly partial destructive operation. It does not restore lost plaintext, claim successful preservation, or justify an automatic rerun. Root must review fresh metadata before any later explicit recovery.

## Semantics and security boundaries

The follow-up diff leaves fixed targets, manual-main/context/SHA/actor gates, complete policy verification, admin identity checks, bounded API/secret inventories, stdout/error handling, stdin-only fixed-argv gh transport, stripped child environment, pinned actions, two fresh protected-environment jobs, and noncanceling distinct workflow concurrency unchanged. No extra mutation route, broader permission, secret backup, token fallback, automatic retry, or provider operation was added. The helper now adds final names checks and both delete postconditions; source tests retain the prior regressions and add the needed findings regressions.

Independent private checks re-exercised real adapter failures on 403/404, redirect rejection, malformed JSON and oversized responses without reflected fake private text, fixed routes, actual CLI fixed diagnostics, invalid operation before credential access, actual fake-gh stdout/stderr suppression with provider/model environment exclusion, complete pagination and duplicate-page denial. These checks passed on final source.

**No atomic secret preservation is claimed.** GitHub has no secret create-if-absent or conditional delete/CAS. Authority checks precede the final inventory; final inventory checks precede the write decision, and observed post-mutation drift fails. A concurrent writer can still race after any final read. The accepted contract therefore requires root's exclusive operational ownership of this fixed secret, cooperation from external administrators, and the fixed workflow serialization during the controlled run. This condition is documented in helper comments and follow-up contract/report/STOP. It is an operational prerequisite, not proven by these fake tests. The helper cannot enforce global exclusion against an uncooperative administrator. No new backup secret, broader permission, or provider fallback is warranted.

The two protected-environment jobs preserve the fresh environment binding design. A nonempty binding is a job-start observation; final names/readback provide the additional metadata checks. Repository secret absence still requires a NEW non-environment workflow run after deletion, because a queued run may retain its earlier repository/org binding. No negative live probe was run here.

## Preservation and ownership

`before.json`, `after.json`, `freeze-comparison.json` show no changes to 294 checkout files, seven worktree Git metadata files including index, eight original author artifacts, 15 original failed-QA files, 15 follow-up author files including all three exact preserved original source copies, and four original contract/current reservation/ref/trusted-runner records. Hashes, sizes, file modes, and inodes were captured and compared. The original author seal `6a669cb47b2d84703cc7cf245f26a9178d75833ee90f41f571349a92cff4ab8a`, original FAIL QA seal `01d7fe044a7e2e068d76cb0d3a369f99512bf083e390d128a021f6f9f5489db5`, their listed artifacts, and original preserved-source hashes were verified before and after. Original failed history remains authoritative for the earlier source, and was not replaced by this PASS.

Only new private `independent-qa-followup2` outputs were created. QA did not edit implementation/tests/workflow, run Git status/diff, write index/refs/canonical state, search/read auth files, call live APIs, or perform any actual secret operation. Root remains sole publisher/operator. The setup skill had already been read in this session; existing runtime/dependencies required no setup or saved configuration change.

## Prior and unrun evidence

Follow-up author's 34-test receipt is prior sealed evidence; `source-pure.json` is this reviewer's separate fresh execution. The old author and independent FAIL tests are prior history, not fresh executions or current safety assertions. Current local PASS applies only to the exact manifest and bounded amended contract reviewed here.

Actual user Secrets Read/write grant remains pending/unverified. Protected-main merge, native/model operational approvals, actual hosted workflow/environment approval, token migration, authenticated names inventories, post-delete NEW negative workflow probe, provider actions, deployment, publication, and closure remain unrun by QA. Those later gates and exclusive ownership remain root responsibilities; no deployment/closure/secret-migration success is claimed.
