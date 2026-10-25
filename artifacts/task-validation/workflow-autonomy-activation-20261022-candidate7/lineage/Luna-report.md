# F5 draftReady private patch

Added `draftReady` to the existing guarded GitHub mutation methods. The external review handoff calls `gh.draftReady` after its last required-check read; the additional guarded method runs `freshOwnership()` before allowing that effect.

The regression uses exported `runPipeline` and its real guard Proxy. An injected `reviewFeedback` boundary simulates the pending external step by invoking `this.draftReady(...)`. When the boundary installs an active, valid handback protecting the current batch, the underlying draftReady effect stays at zero and the canonical owned batch remains unchanged. A matching unowned case reaches the effect once. The actual external callsite in `external-review.mjs:388` was inspected read-only; senior integration must verify it against the final combined source.

Causal pre-fix result: the focused safety assertion failed with `owned draft must not call the real draftReady effect`, expected 0, actual 1. The fixed focused test passed (1/1), and the complete `pipeline.test.mjs` suite passed (35/35 including nested TAP cases). Commands and logs are retained in this directory.

One abandoned test fixture attempted to drive the full external-review communication path but lacked complete synthetic GitHub responses and blocked before draftReady (`github-read-rejected`). It was replaced with the explicit Proxy seam above; no assertion was weakened.

Only the two contract-allowed shadow paths differ from frozen source6. No source6 or source7 file was edited. This patch awaits senior review and serial integration.
