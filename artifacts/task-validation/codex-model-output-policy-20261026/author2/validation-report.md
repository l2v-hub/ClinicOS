# Author2 correction validation report

## Scope and status

This local correction addresses the two actionable QA1 findings and a chunk-boundary-sensitive assertion exposed by the first broad run. The task contract validated before source changes. The edit is limited to `agent-team/src/bug-pipeline/process.mjs`, `agent-team/tests/bug-pipeline/process-output.test.mjs`, and `agent-team/tests/bug-pipeline/routing.test.mjs` in the isolated author2 workspace. No commit or remote history change was made.

**Final Decision: IMPLEMENTED — NOT VERIFIED.** Fresh independent QA against these exact corrected file hashes is still required. QA1 remains unchanged and `FAILED VALIDATION` for candidate `38b37e3`; this correction does not revise its result.

## Changes

Tail capture now allocates a buffer exactly as large as the retained tail and copies only retained bytes, so discarded process progress is not kept alive by a `subarray` view. Routing tests assert the finite error code and capacity metadata while preserving cooldown and no-false-capacity expectations. The default-capture test verifies complete under-limit output and bounded prefix behavior on overflow without relying on operating-system chunk boundaries.

## Validation

| Check | Result | Evidence |
|---|---|---|
| Task contract validation | PASS | `logs/task-contract-validation.log` |
| Regression red before allocation fix | PASS (expected failure) | New source-extracted test observed 32,768 visible bytes backed by 98,304 bytes before implementation. QA1 also recorded a 77,120-byte real-runner backing allocation after 2 MiB progress. |
| Focused model/process/routing suite | PASS, 26/26 | `logs/targeted-correction-final.tap` |
| Full relevant sequential suite | PASS, 1,663 pass / 0 fail / 3 platform skips, 1,666 total | `logs/full-relevant-correction-final.tap`; Node v22.23.4 |
| First full-suite run | 1,662 pass / 1 fail / 3 platform skips | Preserved at `logs/full-relevant-correction-initial-flake.tap`; failure was the chunk-boundary-sensitive prefix assertion, corrected in the test without changing runner behavior. |

The broad suite ran in a disposable copy of the frozen QA1 snapshot with the three corrected files overlaid; QA1 evidence and snapshot remain unchanged. No model CLI, provider inference, API request, Git mutation, publication, clinical replay, native Windows test, or application build was run as part of this correction.

## Remaining gate

Obtain a fresh independent QA reservation and validation bound to the hashes in `source-hashes.json`. This report does not certify independent QA, real Claude review, native CI, publication, or imported Git history. The observed GitHub-managed credential HTTP 401 is an external coordination block and is not provider or application failure.
