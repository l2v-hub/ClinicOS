# Failed verification output retention author report

Generated 2026-10-26T11:52:07.049Z UTC. Source is an uncommitted proposal on detached HEAD 13c71ce0e2cdf6e72b4c7eeeb036754fac7e4f73 in /tmp/clinicos-failed-output-retention-source1. Reservation cace566b-942f-4735-a50f-6cf30d7e1188 was COMMITTED before authoring. No clinical/provider invocation, canonical state edit, source commit, push, PR operation, or release action occurred.

## Change

The verification command boundary now records command/index, exit and runner error, sanitized captured byte counts and hashes, and bounded sanitized failure excerpts. It leaves command results and limits intact. The CLI writes an immutable verification diagnostic on partial success and throw; the workflow always uploads the diagnostic and any guarded failed code artifact. The exporter checks the exact owned checkpoint, accepted plan paths, source hashes/sizes/modes, safe text, and bounded total size before writing a partial source manifest, copies and patch under an immutable round/checkpoint key. It never describes this as the recovered original worktree. A separate explicit native authorization action archives an unavailable FAILED verification checkpoint based on canonical progress/checkpoint digests plus a trusted external terminal artifact observer and consumed authorization nonce. It preserves the failed status, failure code, failed step, attempts, reviews and budgets, and keeps the full previous progress/checkpoint in recoveryHistory.

## Source projection

- .github/workflows/codex-bug-pipeline.yml: 4162 bytes; SHA-256 9a041cf6f4ebfd505fd588983743213587840656c9ae6ca576582c8ab34ea27f
- agent-team/src/bug-pipeline/cli.mjs: 9454 bytes; SHA-256 a19585fd5b9ffc318d6d7810013253373e1eaaf44eef4693970ec6db1f83b8b4
- agent-team/src/bug-pipeline/comment-review-handoff.mjs: 48980 bytes; SHA-256 086ee18c81a07353d8dbc1d835b39e2338d4b7c1bed1a38e65ab6570dceea435
- agent-team/src/bug-pipeline/operator-authorization.mjs: 20136 bytes; SHA-256 f8482ea808f443d31487932927e820bbb74f0c60418b9b51c423c8090d68f661
- agent-team/src/bug-pipeline/workspace.mjs: 35347 bytes; SHA-256 958d9eeb5939e728a828bc8b93fc853450c2138dd42d7a9d4ab50a6e60bb2cf3
- agent-team/src/bug-pipeline/failed-output-export.mjs: 9657 bytes; SHA-256 f0189b0e2a7793b4b0c739f7e125b1ac57d8c70c17195ebef1547047043557ed
- agent-team/tests/bug-pipeline/failed-output-retention.test.mjs: 14342 bytes; SHA-256 53e11f491e96f2218d4a4ca193b1c386397093e84e8cac02abac10c48d56164f

Status/diff list is in source-projection.json.

## Validation

- Exact main13c CI domain command: `node --test --test-concurrency=1 agent-team/tests/bug-pipeline/*.test.mjs scripts/quality-gate/claude-bug-review.test.mjs scripts/automation/protect-demo-secret.test.mjs`: 1,696 tests, 1,693 passed, 0 failed, 3 Windows skips. Log: failed-output-domain-final.log.
- Final focused retention tests: 7 passed, 0 failed. Log: failed-output-focused-final.log.
- actionlint on codex-bug-pipeline.yml, git diff --check and Node syntax checks: passed.
- Broader agent-team test run: 1,752 total, 1,746 passed, 3 failed, 3 Windows skips. Log: failed-output-full-native-final.log. The three failures are pre-existing: process-exit-ownership.test.mjs sees a PID 1 zombie as alive (reproduced on unmodified HEAD13c archive; process-test-baseline.log), and two static QA-263 tests expect old frontend/src/config.ts and e2e/import-happy-path.mjs text that is unchanged from HEAD13c.

## Limits and handoff

Old run 40307355899 command stdout/stderr remain unavailable; this work does not infer its failed command cause or recover its removed ephemeral worktree. The new archive action has no default self-authorizer: a trusted host must verify the exact run, terminal state, sole diagnostic artifact and user authorization before invoking it. A local export is not remotely durable until a genuine Actions artifact upload succeeds. Independent source QA, external review, remote CI and protected merge remain parent-owned gates.

Log SHA-256: {"failed-output-focused-final.log":"ad4a48f0fdb88d080972fa784f4c4a59cce59826c08a7f79a4449996c5f54dea","failed-output-domain-final.log":"16bb0f04b3614d24db45fe864d559a9610af6e049ec60bedd368678debee63e8","failed-output-full-native-final.log":"a4d2f6d19ec35dd7a9b0a6dfe7a9b7c68646ad3ac270c03df89bc15d24af5bc0","process-test-baseline.log":"b292d655a7a9afd86817a4a2c3687637d34bef33ba39a4b75a66e5314ef9eb48"}
