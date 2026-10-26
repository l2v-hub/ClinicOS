# Analysis — failed verification evidence with exact history

Trusted main/base 13c71ce0e2cdf6e72b4c7eeeb036754fac7e4f73; tested immutable source 24f669b706193eef9ac08bd7a02ab440be692189; prior source1 09be584076e3bb4f7131be94608f063d9b20a98b is retained as its Git ancestor and has independent QA1 BLOCKED3. This is a separate follow-up to already merged PR514, not a reset of any clinical or source514 attempt.

## Actual observations

Main13c/PR514 already demonstrated genuine normal Codex execution in run40307355899: both model steps exited0 with typed output, stdout110683B and83382B, stderr0, retained32768B each. Both subsequent plan verify-before stages failed with workspace-verification-failed. Controller PARTIAL2blocked and a successful workflow do not mean successful clinical verification. The original command stdout/stderr and failed ephemeral worktree source bytes were not retained. Their exact failure causes remain UNKNOWN. Published source heads5737fc3ae01dc5b8b5b01124daeac1e805fc288f andfc42859d7c73f9c90d9d49d8cdafe2d752893de7 are unchanged. Current clinical implementation3/5 and4/5 remain FAILED; no source from those lost attempts is invented or replayed.

Real zero-provider qualification40312718377 used trusted13c, officialCodexCLI0.159.2 and the actual verification wrapper: exit0, Node markertrue, PostgreSQL16/all59 migrations applied, every finite failure classifierfalse, providerInvocations0. It qualifies the isolated common path and does not identify the prior clinical command cause. Metadata model access and doctor alone are not inference evidence.

## Resulting behavior

Verification records actual command/index, exit status and runnererror, sanitized CAPTURED output counts/hashes and bounded sanitized useful excerpts. It preserves the original returned result/error, verification1MiB bound, timeout, sandbox and model output policy. Known credential identifiers are handled with assignment spacing, quoted/object forms and case policy covered by native fixtures. Failed source export verifies the exact captured checkpoint, current owned regular-file hashes/sizes/modes, accepted plan scope, path/symlink restrictions, text/secret guards and bounded files/patch/manifest. Guard rejection prevents source/patch output but leaves sanitized command diagnostics available. Immutable per-round/checkpoint paths preserve preceding exports. The workflow always schedules upload on partial exit0 and throws; no local export is described as remotely durable until genuine artifact upload proof.

The new native action only archives a known FAILED verification checkpoint. It requires valid canonical metadata, exact progress/checkpoint digests, a mandatory independently supplied terminal/unavailable-output observer and a genuinely consumed externally bound user-session capability. It appends full previous progress/checkpoint to recoveryHistory and deletes ONLY the current checkpoint; FAILED status, failedStep/failureCode, counts, source, reviews, budgets and existing history remain unchanged. There is no default CLI/GHA self-authorizer and no old physical worktree requirement. Existing knownFailedCorrection/no-checkpoint clean published baseline/native resume behavior and unknown-publish refusals remain unchanged. Later clinical restoration will be explicitly a NEW clean published baseline, never the original lost output.

## Preserved failed candidate and actual independent correction

QA1 found three concrete defects despite68focusedPASS: spaced credential text in emitted diagnostic, the same unsafe assignment in exported source/patch, and null output inventory accepted by archive. Source1 and its report/seal remain frozen; implementation1 is FAILED in this packet. The bounded author2 correction covers those three findings, including the same credential assignment with ':' and quoted keys; its preliminary freeze is retained locally under author2/amendment-0 and final reports identify the supersession. NEW independent QA2 status VERIFIED, findings0, source 24f669b706193eef9ac08bd7a02ab440be692189, seal rawSHA256 d7ea5bd5f765930305848954dd4d383fe8f85a220fe776041ed94be8cb732018; its full report/seal are frozen here. Historical reports describe their own time and are superseded only by factual later receipts, never edited to claim future approval.

## Exact independent-source identity

These actual Git blob SHA1 and raw-byte SHA256 pairs bind tested 24f669b706193eef9ac08bd7a02ab440be692189. The later packet-only published head must retain every pair; a plain authenticated proof comment will provide the actual head plus all six current-head check IDs BEFORE requesting genuine Claude review.

| File | Git blob SHA1 | Raw SHA256 |
|---|---|---|
| .github/workflows/codex-bug-pipeline.yml | 8c788d7dbab5f83bd6e03bed5204cd134d8ce2fe | 9a041cf6f4ebfd505fd588983743213587840656c9ae6ca576582c8ab34ea27f |
| agent-team/src/bug-pipeline/cli.mjs | 5dd3688e4b48d34115b6c194be4e9fe398f2f419 | a19585fd5b9ffc318d6d7810013253373e1eaaf44eef4693970ec6db1f83b8b4 |
| agent-team/src/bug-pipeline/comment-review-handoff.mjs | ea6cec8a0cace0dbb3876dce48e3efe8daf796be | 086ee18c81a07353d8dbc1d835b39e2338d4b7c1bed1a38e65ab6570dceea435 |
| agent-team/src/bug-pipeline/failed-output-export.mjs | c288d593820c593ea007bdaf70175be60144bc23 | 6ad6b78372763bff5ad8a2d009a6dbe4f752e79a8ad0b500f922052842f49497 |
| agent-team/src/bug-pipeline/operator-authorization.mjs | f40ca1a1b58e168e7c9bb9dbb76e582367a96fbf | 3eda3d4607725db16ee4749318f12a0ee907f3d6381df19f0f729e2aee9e316a |
| agent-team/src/bug-pipeline/workspace.mjs | 248d04d93959696bbf3d4095d6828e33c70983cc | 42ab2d9fce6dadd30749acc15d11903343fdb6eccf7b474712ba46307a8499f3 |
| agent-team/tests/bug-pipeline/failed-output-retention.test.mjs | ff539d02f357a211603ad52e4e9dda36ec9be623 | 55f30802dd0db15cc3ed896e010b21a5bdc1e50d8fb5d7c629a59d4f13ff44d9 |

## Sequential release gates

This immutable packet precedes its own CI and peer. After publication: native constructor verifies actual PR/merge-base/full source projection/packet bytes/history; unchanged trusted source reader and qualified capacity must accept the complete packet; all six actual app15368 checks must succeed on the exact head. Publish actual check/source mappings before genuine Claude. After genuine approval, obtain a NEW independent final Codex review and ordinary protected merge. Current Claude/final/merge statuses are intentionally pending, not circular prerequisites for starting this review and not fabricated approvals. Automatic source trust-root release holds remain unchanged; the authorized ordinary protected manual bootstrap path does not invent a human review or use admin bypass.

Clinical506/507 remain blocked until this source is accepted and a separately qualified exclusive runner performs genuinely authorized unavailable-output attestation and a new clean-baseline attempt with durable guarded artifacts. PR505/Matt skills/adaptive routing, original PDF475 acceptance and DEMO470 maintenance remain separate unfinished work. No issue is closed and no full autonomous end-to-end/deploy completion is claimed by this infrastructure source packet.
