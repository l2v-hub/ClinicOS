# Bounded failed-output retention correction

Corrected both peer findings in the frozen source worktree at `/tmp/clinicos-failed-output-retention-source1`.

The failed-code exporter now accepts a first `implementation` flow that fails at `verify-before` or `verify-after` with the exact `workspace-verification-failed` code. It requires a null batch SHA (no PR identity yet), a valid checkpoint head used as the source SHA, a valid checkpoint/base matching the batch base, the exact plan digest, the physical checkpoint capture, and all existing file identity, scope, content, credential, path, size, and immutable destination guards. It leaves `knownFailedCorrection` and native archive authorization unchanged. Repeated exports are surfaced as `local-export-already-exists`; ineligible flow is surfaced as `flow-not-eligible`.

The controller exception path now uses the existing read-only state-store `observe()` and writes an explicit `failedOutputExports` marker when observation or retention fails. The real state store already implemented `observe()` and returns cloned state, so no GitHub store source change was needed. Added behavioral coverage for an observed persisted failed state, missing/throwing observation, and initial implementation retention.

Validation on Node 22:

- Focused `failed-output-retention.test.mjs`: 12 passed, 0 failed.
- Required domain command (`node --test --test-concurrency=1 agent-team/tests/bug-pipeline/*.test.mjs scripts/quality-gate/claude-bug-review.test.mjs scripts/automation/protect-demo-secret.test.mjs`): 1701 tests, 1698 passed, 3 skipped, 0 failed.
- `actionlint -shellcheck= -pyflakes= .github/workflows/codex-bug-pipeline.yml`: passed.
- `git diff --check`: passed.
