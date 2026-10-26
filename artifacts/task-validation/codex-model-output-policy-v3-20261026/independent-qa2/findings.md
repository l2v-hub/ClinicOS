# Independent QA2 findings

No actionable correctness or security finding established for candidate `3f1311dbdf2bc17d2ae5a1ec42e8adb4ea9ba94b` within the approved source scope.

QA1 findings remain preserved against `38b37e3322176bd9836d228d4c4ce63bf66fced2`. They are independently resolved in this candidate:

1. `agent-team/src/bug-pipeline/process.mjs:18` uses an independently owned `Buffer.alloc(retainedLength)` and byte copies. Exact extracted helper: 32,768 visible / 32,768 backing bytes. Extra matrix: 54 transitions covering zero, one-byte and large chunks; no aliases to incoming or previous backing; discarded synthetic private marker absent from all retained backing bytes. The actual runner final conversion observes two independently owned 32,768-byte backing allocations at offset zero (65,536 total captured bytes). The real-runner two-stream instrumentation allows a 2 MiB stdout plus 32 KiB stderr under an explicitly larger probe total cap; the approved model cap remains 2 MiB and is independently boundary-tested.
2. `agent-team/tests/bug-pipeline/routing.test.mjs:141` and `:188` assert finite error code plus capacity boolean. Existing no-retry, actual fallback, cooldown expiry and incidental line-number next-selection assertions remain. All routing regressions pass independently. Four additional adversarial raw/source/tool stdout cases ignore provider words and preserve actual delegate selection on the subsequent requested attempt.

The author2 initial chunk-sensitive test failure is historical author evidence; it was not erased or recast here. The revised default-prefix regression asserts the actual chunk-dependent prefix contract and full under-limit capture. Independent QA2 has no failed validation runs. No application source was corrected by QA.
