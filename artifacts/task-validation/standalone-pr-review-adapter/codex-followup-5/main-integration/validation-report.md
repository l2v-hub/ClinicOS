# Integration author validation

Local Node v24.19.0 results:

- Focused GitHub/handoff suites:91 tests,91 passed,0 failed.
- Exact bug-pipeline workflow:771 tests,768 passed,0 failed,3 native-Windows skips.
- Imported495 automation plus configure prerequisite:142 tests,142 passed,0 failed.

Commands:

```sh
node --test agent-team/tests/bug-pipeline/github.test.mjs agent-team/tests/bug-pipeline/comment-review-handoff.test.mjs
node --test agent-team/tests/bug-pipeline/*.test.mjs scripts/quality-gate/claude-bug-review.test.mjs
node --test scripts/automation/configure-demo-source.test.mjs scripts/automation/inspect-demo-bearer-readiness.test.mjs scripts/automation/inspect-demo-source-topology.test.mjs
```

The focused invocation additionally selected the TAP reporter. Every test child used trusted createRunner from the separate review-handoff checkout, envMode verification, an owned private runtime and PATH-only parent input. Tests use synthetic GitHub/provider/automation fixtures. No live GitHub/provider/clinical/database/model/API operation, secret value or external approval was used. Raw output is private. Two static evidence-helper setup attempts failed before completing a check: a Python syntax typo, then an assumption that the prior tracked source freeze was materialized. The corrected helper read that exact prior freeze from its preserved Git blob without restoring sparse files. Both setup failures are recorded privately. No test failed in this integration phase.

All13,597 tracked paths outside the three resolution paths retained their initial disk bytes/presence, including7,743 prior disk absences. All26 original untracked QA proof files remain unchanged. All27 prior authored source hashes match exactly; earlier packet files were not edited. Git diff --check passed and no conflict markers remain in the three source files. Git still reports unmerged index entries until root stages the resolution; this author intentionally performed no Git/index/state writes.

Hosted Node22/native checks, a committed exact-main integration subject, fresh independent QA, actual Claude, final Codex and protected merge remain required. The prior R1-R6 behavior and empty fixed automatic infrastructure allowlist remain in force, as do8MiB serialized state/16MiB transport capacity and the496-first integration decision.
