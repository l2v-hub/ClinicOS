# Independent technical QA — PR474 Windows verification

Verdict: READY FOR CODEX QA for the two native-test fixture corrections only. This is not a Claude Max review, full PR approval, merge/deployment authorization, or installed-state certification.

## Source binding

- Base HEAD: `d2019b6f308187d513b742a6779d2764f350b8a9`.
- Candidate: that HEAD plus the frozen change to `agent-team/tests/bug-pipeline/windows-review.test.mjs`; no other tracked source changes during this review.
- Exact raw-source manifest digest: `b36cdc2fcc942ac3151f037df30034e5d2c2853da4cccf90f2c5285d3aa6ae1a`.
- Independent manifest before/after: byte-identical arrays, stored in `native-1792193794909/source-before.json` and `source-after.json`.
- Raw log SHA256: `f03202dd928b9c1f10f5e6a1387239de383d423fd60d2b769ffb3394b8754c03`.

## Original failures and diagnosis

1. `native Windows ACL creation is private and rejects a later public access rule`: the deliberate negative-test mutation failed at the assertion that the mutation succeeded. `Set-Acl` raised `PrivilegeNotHeldException`, stating that the process lacked `SeSecurityPrivilege`. Creation, file hardening and the preceding privacy check had already passed. This was a fixture problem, not proof that the application accepted a public ACL.
2. `native Windows bootstrap preserves dirty, foreign, wrong-branch and diverged work and fast-forwards only its dedicated checkout`: the first `nonrepo` scenario received an execution-policy error instead of the expected Git/dedicated-checkout refusal. Windows PowerShell blocked loading the local bootstrap `.ps1` under Restricted policy before its scenario logic executed. The original failed run did not validate the remaining scenarios.

The original logs under the separate setup packet were read but not overwritten.

## Diff review

PASS. The mutation now loads and persists only the DACL using `File.GetAccessControl(..., AccessControlSections.Access)` and `File.SetAccessControl`. It actually introduces the synthetic Everyone Read rule, requires the mutation to succeed, asserts owner and inheritance protection are unchanged, and still requires the real privacy check to reject the result. No privacy or hardlink assertion was removed.

PASS. Only the synthetic bootstrap child receives `-ExecutionPolicy RemoteSigned`. No `Set-ExecutionPolicy`, persistent policy change, elevation, Bypass policy or production launcher change was introduced. The test snapshots MachinePolicy, UserPolicy, LocalMachine and CurrentUser policies and requires exact before/after equality. Existing assertions for nonrepo, dirty, wrong-branch, foreign origin, diverged, local-only and clean fast-forward remain intact, including preserved HEAD/local-file checks and absence/presence of the synthetic installer marker.

PASS. `git diff --check` reports no whitespace errors. No application, dependency, credential, database or clinical-data paths were modified by the reviewed source change.

## Independent runtime execution

Executed natively on Windows using the installed Node runtime:

`node --test --test-concurrency=1 agent-team/tests/bug-pipeline/windows-review.test.mjs`

Result: 10 tests PASS, 0 FAIL, 0 SKIP, 0 cancelled, exit 0. Both formerly failing tests executed and passed, as did credential-isolation, scheduler-schema, concurrency, log/lock, malformed-task, foreign-state and hardlink regressions. Evidence: `native-1792193794909/test.log` and `receipt.json`.

The harness uses a distinct canonical synthetic TEMP/TMP directory outside the MSIX alias namespace, removes provider-token/secret environment entries, and never invokes a real model, GitHub API, database, installed scheduler action or production task. Synthetic Git fixtures and generated task objects are used. This QA session made no changes to the review budget or Claude login.

## Security findings and limitations

No new security finding in the two-fixture diff. No assertions were disabled or converted to skips. The reviewed changes retain fail-closed privacy/path/task ownership controls.

The MSIX logical-versus-physical checkout alias remains a known setup limitation, not fixed by this patch. In this host Node realpath can retain the logical alias while Git reports the physical package-backed path. The installed explicit physical checkout and process-local state base are the supported verified route for this run. Do not weaken equality/reparse checks or claim generic alias support.

The root agent must still certify installed SHA/task schedule/latest and next execution, run adjacent regressions, perform the actual SHA-bound Claude Max review with existing cumulative counters (maximum four), and publish only sanitized results. This report does not substitute for those user requirements or for final PR gate evidence.
