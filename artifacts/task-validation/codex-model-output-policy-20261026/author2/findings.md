# Author2 correction findings

Parent candidate `38b37e3322176bd9836d228d4c4ce63bf66fced2` and independent QA1 remain preserved and sealed as `FAILED VALIDATION`.

1. **P2 — tail capture retained a larger backing allocation than its visible bound.** The pre-correction source-extracted helper retained 32,768 visible bytes backed by 98,304 bytes after two 65,536-byte chunks. `process.mjs` now allocates an exact retained-length buffer and copies only the necessary suffix from the previous capture and incoming chunk. The source-extracted regression checks visible length, backing allocation, independent ownership from both inputs, zero/small limits, and multibyte byte semantics.

2. **P2 — two routing tests asserted raw diagnostics that are intentionally omitted.** The capacity test now checks `error.code === 'model-execution-failed'` and `error.modelCapacityFailure === true`; it still checks no automatic retry, delegate cooldown, senior fallback, and cooldown expiry. The incidental line-number test checks the same finite error code and `modelCapacityFailure === false`; it still verifies that a later call does not infer provider capacity pressure.

3. **Test contract correction — default capture assertion depended on child chunking.** The first broad run after the code correction showed the existing test could receive an empty capture when the first child write crossed the output ceiling as one chunk. The runner correctly failed with `output-limit` and retained a bounded prefix, which may be empty. The test now verifies the complete stream under the ceiling and verifies that over-limit output is a prefix of emitted bytes, no longer assuming chunk boundaries.

No production behavior outside the bounded-tail allocation changed. The first broad run is retained at `logs/full-relevant-correction-initial-flake.tap`; the final broad run passes at `logs/full-relevant-correction-final.tap`.
