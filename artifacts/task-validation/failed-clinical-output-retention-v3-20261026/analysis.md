# Analysis — current source3 and genuine peer corrections

CURRENT tested source 0dbe3066b41ff1f5a8462de2a4c6604b89b56e5b; previous published subject 6c25842fec463302d129edf653be060d1746dd6e; trusted base 13c71ce0e2cdf6e72b4c7eeeb036754fac7e4f73. This revision addresses the two substantive findings in genuine Claude1 report6426832233, request903f372b-799a-4987-a805-362c24b38495, claim242c843d-35cb-4684-8a9a-201f8e8b0d90, official run40396918783 SUCCESS. Its verdict CHANGES_REQUESTED is preserved, not converted into approval. Source1/QA1 BLOCKED3 and source2/QA2 VERIFIED0 are historical and apply only to their own SHAs. The previous plain six-CI proof6426511875 applies only to6c; a new exact-current-head proof will supersede that pending-current-CI phase before Claude2.

## Actual problem and unchanged clinical facts

Real run40307355899 completed both ordinary model executions with valid typed output/stdout110683B and83382B, then BOTH verify-before stages failed. Workflow success represented PARTIAL2blocked. Old failed command output/source bytes remain unavailable and exact causes UNKNOWN. Actual zero-provider40312718377 passed the same native sandbox/PG16/all59migrations/Node marker; it is not the original clinical cause. Clinical506/507 remain FAILED3/5 and4/5 on their old published heads. No source in this PR changes clinical UI, retries those old calls or claims issue closure.

## Peer1 medium: initial-flow mismatch resolved with exact guards

The exporter previously delegated only to knownFailedCorrection while CLI selected all failed verification stages. Source3 supports the initial implementation flow without widening native correction/recovery policy. Initial eligibility requires the actual persisted sourceSha:null, null batch SHA/noPR, latest FAILED round/no active implementation, exact plan/feedback digests, and checkpoint head equal to the accepted baseline. Physical capture must exactly match the full checkpoint, followed by unchanged source/path/symlink/hash/mode/secret/text/file-size/total-size guards. The manifest records the actual local baseline SHA, never an invented PR SHA.

Luna3 preliminary code26db561bc84e56bd760d97a405111ef8c75cba49 used an absent sourceSha in its fixture. The director preserved that code/report/seal as a Git ancestor, reproduced the actual native-null failure RED, then corrected the predicate and test. The collector actually used by CLI is tested for a created export and a second already-existing summary with no overwrite. Unsupported flows have an explicit ineligible status rather than looking like ambiguous guard failure.

## Peer1 low: actual read-only store context and disk behaviour

The state-store observe method already exists unchanged on trusted main. Pinned file agent-team/src/bug-pipeline/github.mjs: GitblobSHA1 6cd11de01988aa80d8112f51420140f0979c5e81; rawSHA256 7909a91bd172e067bd4e5d7afc963991dd89d9999c771c6873551834b965b26b. This is baseline context, not a new source change or mocked production method:

```js
    let observed;
    async function observe() {
      // No ensureBranch here: a supposedly read-only guard may never initialize it.
      const response = await api(
        `repos/${repo}/contents/${STATE_PATH}?ref=${encodeURIComponent(STATE_BRANCH)}`,
        { allowFailure: true, maxOutputBytes: STATE_OUTPUT_BYTES },
      );
      if (!response.ok) {
        if (notFound(response) && fileSHA === null) return null;
        throw githubOperationError(response.result, 'read');
      }
      const value = response.value;
      if (
        value?.type !== 'file' ||
        value.target !== undefined ||
        value.submodule_git_url !== undefined ||
        typeof value.sha !== 'string' ||
        !/^[a-f0-9]{40}$/i.test(value.sha) ||
        !Number.isSafeInteger(value.size) ||
        value.size <= 0 ||
        value.size > MAX_DURABLE_STATE_BYTES ||
        !['base64', 'none'].includes(value.encoding) ||
        (value.encoding === 'none' && value.content !== '')
      )
        throw new Error('Durable observation metadata is invalid');
      if (observed?.sha === value.sha && observed.size === value.size)
        return structuredClone(observed.state);
      const state = await decodeDurableState(value);
      observed = {
        sha: value.sha,
        size: value.size,
        state: structuredClone(state),
      };
      return state;
    }
    // Observations never alter the writer's remembered CAS SHA/base.
    return { load, save, observe };
  }
```

Actual CLI now calls the tested read-only retention collector and actual blocked-diagnostic writer. A fixture persists a failed batch and throws the original pipeline error; observed state drives the REAL guarded export, actual diagnostic.json is written/read back, and source bytes are asserted. Missing and throwing observe both produce explicit retention-failed markers in the actual file without private error text. Original error identity/exit behaviour and all verification caps/timeouts remain unchanged. Local export alone never claims remote artifact durability.

## Independent current-source evidence

NEW QA3 VERIFIED, findings0; code 0dbe3066b41ff1f5a8462de2a4c6604b89b56e5b; seal rawSHA256 d0e4b0c82d07cdb0fbe7aca72566809de001f1644dc432578e987404a017f3ca. It independently exercises real native-null initial and guarded negatives, collector statuses and blocked diagnostic disk output. Targeted30/30PASS; required domain1703total1700PASS0FAIL3WindowsSkip; actionlint/diffPASS. Exact seven tested/published source pairs MUST match:

| File | Git blob SHA1 | Raw SHA256 |
|---|---|---|
| .github/workflows/codex-bug-pipeline.yml | 8c788d7dbab5f83bd6e03bed5204cd134d8ce2fe | 9a041cf6f4ebfd505fd588983743213587840656c9ae6ca576582c8ab34ea27f |
| agent-team/src/bug-pipeline/cli.mjs | d239c6db29627683ae3999f5612a7280a17bb6ac | 0ff7954ade6fa9ec95c9043865b3ba08b780acc8bd415d15936c8e976495b72d |
| agent-team/src/bug-pipeline/comment-review-handoff.mjs | ea6cec8a0cace0dbb3876dce48e3efe8daf796be | 086ee18c81a07353d8dbc1d835b39e2338d4b7c1bed1a38e65ab6570dceea435 |
| agent-team/src/bug-pipeline/failed-output-export.mjs | ef9ad03732c9102dc2e03b465fc78e1e00f32b2a | e93056bae7fb1367b7fb6adb0e8a58bf847c1dd9c5e0a72258f4f24bf9b69f15 |
| agent-team/src/bug-pipeline/operator-authorization.mjs | f40ca1a1b58e168e7c9bb9dbb76e582367a96fbf | 3eda3d4607725db16ee4749318f12a0ee907f3d6381df19f0f729e2aee9e316a |
| agent-team/src/bug-pipeline/workspace.mjs | 248d04d93959696bbf3d4095d6828e33c70983cc | 42ab2d9fce6dadd30749acc15d11903343fdb6eccf7b474712ba46307a8499f3 |
| agent-team/tests/bug-pipeline/failed-output-retention.test.mjs | 0d57e2e4070f46e02a05b88e99de9f233bf7761c | 3c58dadf0fd5c143aa9390604e441c4190c506e9e056d80f007e303bc4e3b757 |

The old packet is preserved immutable and copied historical QA evidence keeps its original hashes. Every changed evidence inventory entry, including the old packet, is counted by the unchanged reader. No source/context bound is raised and no text omission is used to fit. The finite diagnostic and native unavailable-output action from source2 retain all secret/scope/history/counter/authorization guards; partial CODE retention is not full checkpoint reconstruction. The new same-runner post-review retry gap remains separately identified and is not silently implemented here.

## Sequential gates

After metadata publication require all six actual current-head app15368 checks, immutable native adoption/verification and actual live reader acceptance. Post PLAIN authenticated actual7Git/raw and6check mappings BEFORE requesting normal Claude2, so that proof is in its input. Current Claude2/future final/merge are intentionally sequential pending, not circular requirements or fabricated completions. Actual peer approval must precede a NEW independent final Codex and ordinary protected merge. Automatic source trust-root/human release holds remain unchanged; user-directed ordinary protected bootstrap does not fabricate a human approval or use admin bypass.

Issue516 is now confirmed online as two distinct import draft records/two jobs with identical stored strong identity, and both source jobs expired. Exact source document equality is unknown and no clinical rows were mutated. Its proposed broad plan is held while a separate narrow TTL-source-preservation subtask is authored; frozen506 remains unchanged. PR505/Matt/adaptive setup, PDF475 and maintenance470 remain unfinished. This source packet claims no full end-to-end setup/deploy/clinical resolution.
