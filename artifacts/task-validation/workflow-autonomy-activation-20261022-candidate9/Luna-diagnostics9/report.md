# Luna diagnostics 9 implementation report

Status: `implemented-awaiting-parent-integration`.

Implemented only F4 and F5 from the reserved contract. F4 now propagates `githubOperationError(result, 'read')` through state branch reads, durable state loads, and dashboard state reads. The wrapper contains finite code/diagnostic/httpStatus and does not include stderr. Existing not-found handling remains in place, including null for missing durable state and dashboards. F5 restores the mapper's original lowercase executor and simplifier blocked messages so real blocked stage results map to `implementation-blocked`.

Causal baseline run, before production changes: the two added regression tests both failed. F4 received `error.code === undefined` where `github-read-failed` was expected. F5 mapped an executor-blocked stage to `controller-execution-failed` rather than `implementation-blocked`. See `baseline-first-failure.log`.

The final focused GitHub and workspace suite run passed 233 tests (0 failed, 0 skipped); its full output is preserved in `focused-tests.log`. Re-running these suites produced the same 233 passing assertions; the distinct-test count is 233, not the sum of repeated runs. Both changed production modules passed Node 22 syntax checks (`syntax-check.log`).

The read regressions cover load output-limit metadata and stderr sanitization, branch initialization HTTP 503, dashboard HTTP 403 metadata, and unchanged dashboard 404 behavior. The existing GitHub suite also verifies that missing-state 404 loads as null and that a missing branch is initialized from main. The workspace regression drives execute-blocked and simplify-blocked through `runImplementationStages` and the actual `controllerFailureCode` mapper.

Exact patch: `patch.diff`. The before and after manifests contain 139 source bindings each. `manifest-check.json` confirms that exactly the four allowlisted files changed. Their before/after SHA-256 digests and byte lengths are in `results.json`.

Read receipts: the reservation nonce was `4312f0da-1a52-4f36-b78f-f99f4a096165`; `task-contract.md`, `allowlist.json`, `reservation.json`, and `actual-new-static-report8.json` were read before implementation. No source outside the four allowlisted paths was changed.

Limits: this is the bounded implementation agent's patch and focused test evidence. It is not independent QA, native CI, peer approval, merge, or deployment evidence. Parent integration and review remain pending.
