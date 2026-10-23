# Independent native CI wiring review

**PASS.** The fourth authorized source change is exactly the addition of `scripts/automation/protect-demo-secret.test.mjs` to the existing credential-free Node test command. The final combined command passed locally: **806 total, 803 passed, 0 failed, 3 existing Windows-only skips**. No code finding remains for this narrow wiring change.

QA reservation `533987ee-0014-4d70-879f-9d64360b315f`, canonical `48319b208652c5e422efdb71441b92bfc52fc53b`. Source worktree `/workspace/clinicos-demo-secret-scope`, reserved base `fbaa78d8c7eacf8402db0c8fa2be276ae579a27c`. Contract SHA256 `2a4afdd98829e08eda2459db39a3352d3ecc9e72b5e5bed98f52cf9b868ffb54`. Fourth-path final SHA256 `1d7a3a075e665dc85d12f7aad1ee31ff3652dd75e703e3df1a2a49b55858f45e`.

`reviewed.diff` and byte-for-byte substitution checks establish that the preserved original CI workflow differs only by that appended test argument. Triggers, permissions, job guards, token/secret references, pinned actions, Node22 selection, and all other workflow bytes are unchanged. The existing PR gate therefore schedules the helper's pure tests before merge; the separate secret-operation workflow remains manual-main-only. I did not execute other CI steps such as installs, actual sandbox/services, optional provider probes, or repository configuration.

The helper, its 34-test source suite, and its manual workflow match the sealed follow-up2 manifest exactly. All original author, original independent FAIL, follow-up author, and follow-up independent PASS seals and listed artifact digests were independently verified before and after. This wiring review preserves the helper's exclusive cooperative operational ownership requirement and absence of an atomic GitHub secret CAS guarantee. It does not expand the earlier source approval into actual secret-operation approval.

## Fresh execution and setup failure

The literal workflow command is:

```
node --test agent-team/tests/bug-pipeline/*.test.mjs scripts/quality-gate/claude-bug-review.test.mjs scripts/automation/protect-demo-secret.test.mjs
```

I expanded its glob to the same sorted 24 test files a shell would select and executed Node directly using the trusted `/workspace/clinicos-review-handoff/agent-team/src/bug-pipeline/process.mjs` `createRunner`, PATH-only parent environment, `envMode: verification`, isolated private HOME, and bounded output. No controller/provider credentials were forwarded. Existing tests used local disposable repositories/processes and mock transports. No real provider, GitHub, secret, DB, browser, installation or clinical runtime operation was performed. Local Node24.19.0 was used; actual hosted Node22 and native Windows execution remain unrun.

The initial run is preserved as `combined-ci-first-attempt.json`: 806 total, 799 passed, 4 failed, 3 existing skips. All four failures were existing workspace tests attempting to open the original regression `trace.zip`, absent from this sparse checkout. The helper tests passed in that run. `first-attempt-before.json`, `first-attempt-after.json`, and `first-attempt-freeze-comparison.json` prove no source/index/evidence changes during that attempt.

After I released that freeze, root materialized exactly the two original tracked regression fixtures from reserved base `fbaa78d8c7eacf8402db0c8fa2be276ae579a27c`, without changing index or protected source bytes. Root receipt: `../root-materialized-original-test-fixtures.json`. I independently verified the restored bytes and hashes: screenshot 131348 bytes, SHA256 `b22057bfb3c8af76226d1bd4b4c2f14e27b6ecaa632852f9f90710b3ec1b6ebb`; trace 175354 bytes, SHA256 `008d36bda06472a22c86244c8e06bdad0bde622bce35f637058c13cd977545eb`. `root-fixture-setup-transition.json` shows only those two additions between attempts; Git metadata and all old evidence remained unchanged.

I captured a new baseline and reran the exact unchanged command once. Final `combined-ci.json`: 806 total, 803 passed, 0 failed, 3 skipped, exit 0. All helper tests, including the real Node `-e` regression, executed. The three skips are unchanged native Windows scheduler-definition, ACL, and bootstrap checks. No assertions were disabled and no source files were edited by QA. The rerun followed an identified and corrected setup prerequisite; the failed attempt remains part of the record.

## Freeze and boundaries

Final `before.json`, `after.json`, and `freeze-comparison.json` show zero changes across 296 checkout files (including all four reviewed paths and the two root-restored original fixtures), seven worktree Git metadata files including index, all 56 old author/QA artifact files, and nine contract/reservation/root-receipt/ref/trusted-runner records. Hashes, sizes, inodes and file modes match. The initial pre-restoration freeze covered 294 checkout files and remains preserved separately.

Only this new private `native-test-wiring/qa` output was written by QA. No source, Git/index/refs, canonical state, old evidence, credential file, provider, GitHub, actual secret, or runtime mutation was performed by QA. Root's metadata-CAS recovery record was read and frozen; QA did not touch canonical subjects or the concurrent actual Claude497 request. Root remains sole publisher.

Earlier 34-test and 17-safe-probe receipts are sealed prior evidence, not executions claimed by this review; this review freshly executed the exact combined command. The setup skill was already read during this session and no environment configuration changes were needed beyond root's original fixture restoration. Actual hosted native gates, actual Claude review of a new helper PR, protected-main merge, Secrets Read/write grant, exclusive-operation setup, actual migration, NEW post-delete negative workflow probe, live API/provider actions, deployment and closure remain unrun by QA.
