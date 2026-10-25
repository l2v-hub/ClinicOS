# Independent targeted safety diagnostic

Verdict: **FAILED VALIDATION**. Both hypotheses are **CONFIRMED** against exact immutable source `93b0c72877bd58c2dd3769d0942d737ef9f96ac0`. No implementation source was edited.

Reservation `b7f5a08f-fb07-44f5-8052-37fcde7c9555` at `ac51898ec6000814c265aea608427a7ffe499e3c` preceded the diagnostic. Original QA3 remains immutable and honestly scoped:588 focused tests and23 probes passed, but the two new automatic paths below were not exercised by that earlier evidence. Do not activate or treat native CI alone as resolution of these findings.

| Hypothesis | Actual function chain | Observation | Result |
| --- | --- | --- | --- |
| S1 | runPipeline → finalizeStandaloneSubject → native controller.publishState → current → handoff.load | Initial pipeline sees unowned subject. Native controller subsequently loads active global takeover twice, subject bytes unchanged, yet adds `claude-review-ready`; pipeline completes without error/model | CONFIRMED |
| R1 | Original main workflow_run → selectAutoReleaseBatch → releaseBatch → freshReleaseGuard → merge callback | First state read is unowned. Reads2–10 expose takeover. The exact automatic main still invokes one synthetic merge for approved SHA and returns0; the synthetic merge also invokes the actual supplied native guard | CONFIRMED |

S1 locations: `standalone-review.mjs:619`, `:732`, `:741`, `:852`; initial automatic caller `pipeline.mjs:109`/`:120`. The selector correctly checks its initial snapshot, but native standalone current/load guards compare subject identity and native PR state without considering new global ownership outside that subject. This is an observed fresh-read violation, not an atomic cross-resource requirement.

R1 locations: `release.mjs:1304` automatic selection, `:1354` native release call, `:609` initial native load, `:380` freshReleaseGuard and `:814` merge. Automatic ownership context is not carried to the later release entry/guards. The reproduction executes actual automatic workflow_run main, rather than calling explicit releaseBatch and inferring behavior from that API. A fix must preserve the separate explicitly authorized maintainer release path.

## Test method and retained output

Two focused original-function safety assertions were run: **0PASS/2FAIL**, zero harness failures. The first proof is preserved under `first-*`. A justified bounded retest strengthened native read instrumentation and invoked the release callback guard at the synthetic merge boundary, as the real adapter does. Both unchanged expected-safety assertions again failed: **0PASS/2FAIL**, zero harness failures. This is not four different defects or a full-suite rerun.

`probes.mjs` imports actual standalone/pipeline functions unchanged. The copied fixture contains only synthetic fixture definitions and injected GitHub transport, not product implementation. Actual release main has no dependency-injection argument, so Node's SourceTextModule evaluates its exact original source bytes with only GitHub transport factory, process-runner factory and filesystem imports replaced at the side-effect boundary. Pure policy/review/ownership imports are actual modules. No release logic, branch condition, source predicate, approval or guard was rewritten. VM's process/env are synthetic and no subprocess is permitted. See command.json, observations.json and probes.log.

The source tree's138 file hashes and original QA3's29 sealed artifacts were verified before and after. HOME/home/CODEX_HOME were not modified. No actual GitHub/network/provider/model/Git/canonical/DB/browser/scheduler operation occurred. No raw canonical state, credential or clinical payload was printed. All status/merge effects here are offline synthetic observations only; no real deployment, cleanup, clinical resolution or issue closure is claimed.

Root owns the next reserved corrective scope, later independent gate, native/genuine review, protected merge and activation. The previous6 native PASS results remain their actual history, not evidence these newly reproduced races are absent.
