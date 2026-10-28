# Independent final QA report

Date: 2026-10-28  
Baseline/HEAD: `d8e85d77536a4770d79f197ca75b3f7299895d40`  
Contract: `../task-contract.md`  
Scope: frozen local code and recorded synthetic evidence. No source edits, Git writes, credential use, or provider calls.

## Verdict

**READY FOR CODEX QA** for the locally verified code packet. This does not certify live autonomy or authorize release. The change affects the controller trust root; native independent human approval on the current SHA and ordinary protected merge remain required.

## Acceptance criteria

| AC | Result | Evidence and limit |
|---|---|---|
| AC1 Selective PR505 integration; preserve current protections | PASS locally | Reviewed controller, workspace, workflow and docs diff; unchanged release/review/ownership/final-QA/state-store sources recorded in `../independent-qa/static-checks.json`; base PR505 ancestry is preserved. |
| AC2 Bounded graphs, routing, frozen history, no unknown retries | PASS locally | Unit/domain suite and actual Git worktree/caller tests in prior independent packet; composed probe confirms one graph run and zero replay after restart. No live capacity or model-success claim. |
| AC3 Bounded wakeups and trusted serialized events | PASS locally | Workflow filter/concurrency/trusted-default-branch review; saved workflow schema validation and intake/event tests. Native workflow activation unobserved. |
| AC4 Typed wait and same-SHA recovery | PASS locally | Prior standalone-review regression tests and saved negative cases; failed required checks remain release-blocking. |
| AC5 Authentic exact-SHA review and fresh Codex QA | PASS locally | Prior external handoff and release guard tests plus composed probe: changed head, approval, one fresh final QA, release. No live provider call. |
| AC6 Child-bound recovery and retained output | PASS locally | Prior canonical digest/retention tests; independent retention caller test passed in this run. Unknown child outcomes remain spent. |
| AC7 Composed event-to-closure lifecycle | PASS synthetic | Independently reran composed-controller tests: 2/2 passed. Probe composes lone event, graph work, external review changes, fresh head, approval, final QA, release, deployment record and closure; negative guards included. All GitHub/model/deployment boundaries are synthetic. |
| AC8 Consistent docs and retained human trust root | PASS locally | Reviewed docs/workflow and recorded PR518 provenance; native independent human approval policy remains explicit and unchanged. |
| AC9 Activation and real canary distinction | NOT VERIFIED | Saved activation probe records Git reads working and REST workflow inventory denied (`Forbidden`); no workflow-enabled state, live model run, deploy, or closure is claimed. |

## Checks and artifacts

- Frozen source manifest: **112 files, 0 mismatches**; every SHA-256 matched `../source-manifest.json`. `HEAD` equals the contract baseline.
- Independent composed-controller command: `env -u GH_TOKEN PATH=/tmp/clinicos-autonomy-node22/node_modules/node/bin:$PATH node --test artifacts/task-validation/autonomia-completa-codex-claude-20261028/independent-qa/composed-controller.test.mjs` — **2 passed, 0 failed, 0 skipped**.
- Full Node 22 suite recorded in `../test-results/final-frozen-node22-suite.tap` — **1,749 total; 1,746 passed; 0 failed; 3 Windows-only skips**.
- Additional saved evidence: caller retention correction **22 passed**; native additional-script suites **52 passed**; workflow schema validation passed for all three workflows. Syntax checks passed for changed controller/test modules; secret-pattern added-line counts are zero. Details: `../independent-qa/static-checks.json` and `../test-results/`.
- Safe Playwright operational evidence: **1 passed**, with result-value and reload assertions; screenshot and trace are under `../independent-qa/`. No clinical UI changed.
- Diff review found no unresolved correctness or security finding. Existing prior independent code/security review found and verified a caller-retention correction; this final pass reran the corrected caller probe. Application, clinical, database, package dependency, release-policy and trust-root protection files are unchanged per the static checks.
- The complete baseline `git diff --check` reports whitespace only in inherited historical QA log artifacts; the saved source-only whitespace check passes. Historical logs were preserved.

## Security and evidence limits

No credentials were used. Synthetic fixtures only; no real patient data. No new package dependency or secret-bearing diff line was found. The workflow uses pinned actions, filters events before concurrency, and checks out the trusted default branch. Native CI, GitHub workflow activation, successful real model invocation, protected merge, deployment and issue closure remain unobserved. Local suite success and synthetic closure are not live autonomy evidence.
