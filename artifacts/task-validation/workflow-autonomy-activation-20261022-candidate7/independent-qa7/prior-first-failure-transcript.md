# First exact QA6 replay failure transcript

This preserves the first failing result from the tool transcript. The original TAP file was accidentally overwritten by the helper's second invocation; the complete same-cause original-fixture recheck is retained separately in prior-exact-recheck.log. This is a transcript reconstruction, not a claim that the first original TAP file survived.

Command: fixed Node22 --test --test-reporter=tap --experimental-vm-modules external-cas-probe.mjs malformed-takeover-probe.mjs recovery-budget-probe.mjs recovery-route-probe.mjs residual-probes.mjs, cwd frozen qa-source7.

Actual Node exit: 1. Tests10, pass9, fail1, cancelled0, skipped0, todo0.

```text
# Subtest: both external review channel variants require current final proof but never invent proof.reviewedSha
not ok 9 - both external review channel variants require current final proof but never invent proof.reviewedSha
  ---
  duration_ms: 9.951093
  type: 'test'
  location: '/tmp/clinicos-autonomy-activation-20261022/independent-qa7/residual-probes.mjs:30:1'
  failureType: 'testCodeFailure'
  error: 'postmerge native MERGED receipt identity changed'
  code: 'ERR_TEST_FAILURE'
  name: 'ReleaseGateError'
  stack: |-
    fail (file:///tmp/clinicos-autonomy-activation-20261022/qa-source7/agent-team/src/bug-pipeline/release.mjs:158:9)
    verifyMergedReleaseProof (file:///tmp/clinicos-autonomy-activation-20261022/qa-source7/agent-team/src/bug-pipeline/release.mjs:434:5)
    async releaseBatch (file:///tmp/clinicos-autonomy-activation-20261022/qa-source7/agent-team/src/bug-pipeline/release.mjs:1134:3)
    async TestContext.<anonymous> (file:///tmp/clinicos-autonomy-activation-20261022/independent-qa7/residual-probes.mjs:32:797)
    async Test.run (node:internal/test_runner/test:1054:7)
    async Test.processPendingSubtests (node:internal/test_runner/test:744:7)
```

The original four QA5/6 probes, modern malformed-history matrix, nonce dedup/debit, pre-inference polling, handback isolation and final proof drift tests passed. The original successful-merge stub had ignored the new native callback and still returned OPEN after a synthetic successful merge. The working fixture now invokes that callback and returns MERGED with the same original mergeSha. Test assertions are unchanged; prior-release-fixture-exact.mjs preserves the original import-only copy.
