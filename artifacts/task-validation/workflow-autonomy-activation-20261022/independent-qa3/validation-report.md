# Independent QA3

Verdict: **READY FOR CODEX QA**. Source validation **verified** for `93b0c72877bd58c2dd3769d0942d737ef9f96ac0` only. This is a source/harness/proof stop, not activation or release approval.

The reservation `1eeadf43-476a-4dc3-bf9c-50ecf62aed94` at canonical commit `a9772578589b4f44e0cb5ca60b5604967ba89dc5` preceded this independent session. Implementation and all earlier attempts remain immutable. No actionable findings remain in the bounded candidate.

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract and identity | PASS: exact source SHA, 138 snapshot files, 16 Git blob bindings, author/docs seals and immutable failed QA2 verified | task-contract.md, reservation.json, source-before.json |
| 1 Diff review | PASS: 14 cumulative code/test paths and 2 docs; new 8-file delta plus retained ownership/review controls checked | independent-source.diff, candidate3-delta.diff, findings.json |
| 2 Independent tests | PASS **588/588**, zero failure/skip, seven requested suites, run once | focused.log, focused-command.json, execution-policy.json |
| 2 Original reproductions | PASS **15/15**, identical QA2 assertions; only private source import path changed | probes.mjs, probes.log, probe-results.json, probes-command.json |
| 2 Additional offline probes | PASS **8/8** | additional-probes.mjs, additional-probes.log, additional-command.json |
| 2 Static syntax/integrity | PASS **14/14** Node syntax checks; 822 immutable file verifications; all 22 actual historical subject hashes match supplied projection | syntax.json, source-after.json, actual-shape-integrity.json |
| 3 Visual/clinical | N/A per explicit control-plane-only contract; no browser allowed; unchanged clinical E2E evidence inherited and not rerun | task-contract.md |
| 4 Security | PASS within scope: fresh automatic ownership, authenticated exact-SHA explicit compatibility, safe logs and retained budgets/history | results.json, test/probe evidence |

## F1 and F2 retest

F1 is corrected by checking current claimed/paused state after observed CAS reconciliation and before claim/status/model boundaries. The unchanged reproducer now records zero issue-status writes and zero model calls when successful CAS introduces a manual owner. Both queue and claiming boundaries are covered by the fresh suite.

F2 is corrected by explicit automatic-mode options at sync/external entrypoints and current ownership checks inside communication state reloads and the final write guard. The unchanged actual communication reproducer now skips without labels/comments after takeover is observed. Ownership errors propagate as a skip and are not swallowed into correction or generic block publication.

Additional independent probes exercise a prebuilt communicator, protected subject handback, takeover during final authorization, takeover after one earlier allowed write (subsequent writes stop without resetting history), actual external-controller integration with no block/save/model, unowned sync continuation, and explicit handoff compatibility. The explicit path still rejects stale SHA and lost authorization; automatic mode does not leak between calls. Cross-resource GitHub and canonical reads are not an atomic transaction, and the code/docs do not claim otherwise.

The original probes also cover actual22 global pause and new-unclaimed-only handback, scope/claims and queue normalization exclusions, unowned coexistence, release selection, default cron final QA reservation and reuse, pending checks, current SHA changing during QA, interrupted running QA, failed/exhausted budget and stale feedback fingerprints. Historical objects—including typed budget/history—match their supplied root hashes exactly. No continuation counters were reset.

## Documentation and inherited proof

The two docs describe observed ownership, explicit read-only handoff, independent final Codex QA after external review, typed limits, native/human gates and activation ordering. They do not present simulated tests as native execution, Max as an Actions session, or an optional Claude implementation adapter as configured. Source1/2/3 and both documentation author/correction histories were preserved.

Author1's 517 tests, author2's 11 tests, and author3's 123 impacted tests/2 original reproductions/8 syntax checks are inherited provenance, not these independent results. Failed QA2 remains **FAILED VALIDATION** with its original two findings and four initial actual-state harness errors; this PASS does not rewrite that history. Its complete 29-file seal was reverified.

The first QA3 input-verifier attempt failed locally because the docs child uses a list of before/after source bindings while other proof seals use a file object. Only the QA verifier was corrected to validate that format; no source/test assertions changed. See harness-failure-history.json. There were no test failures in the independent seven suites, original15 or additional8 probes.

## Limits and next gates

No source edit, network, credentials, real provider/model, GitHub/canonical write, database, browser, deploy, scheduler or issue closure occurred. Existing suite Git commands were confined to disposable synthetic mkdtemp fixtures, with global/system Git configuration and hooks disabled and external protocols denied. HOME/home/CODEX_HOME were not repurposed. The process environment was whitelisted.

Actual native six required checks on the complete published repository, genuine Claude review, fresh final Codex QA, applicable human protected merge, real automation activation/event test and personal-worker readiness remain root responsibilities. Deployment and issue closure remain subsequent distinct gates. The previous live sync was cancelled after ten minutes despite its synced summary; its forwarding, label change/restoration and unknown stall are retained actual history, not a successful activation claim.
