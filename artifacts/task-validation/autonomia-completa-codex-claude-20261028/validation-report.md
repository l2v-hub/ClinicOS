# Autonomia Codex–Claude: validation report

Date: 2026-10-28. Baseline: `d8e85d77536a4770d79f197ca75b3f7299895d40`.
Existing delivery PR: [#505](https://github.com/l2v-hub/ClinicOS/pull/505).
Source identity: `source-manifest.json` (112 frozen source files). Evidence and source publication are separate from live activation.

## Implementation

Integrated the existing PR505 adaptive work-item implementation through a normal merge with current main, preserving its ancestry and newer main ownership, diagnostics, cloud review, final-QA and checkpoint settlement. Retained the five reviewed PR518 skill corrections byte-for-byte (`skill-provenance.json`). No clinical frontend/backend/schema paths or canonical controller ledger were changed.

The host now keeps the durable issue collection window alive without inference during waits, and listens to authenticated same-repository CI/head/handoff events while checking out trusted default-branch code. New intake can use bounded dependency graphs and host-configured delegate/senior model profiles; existing frozen plans remain unchanged. Unsuccessful validated native checks enter typed waiting and retain current review proofs, while required checks still prevent release. Authorization binds child history. Bounded retained child source is exported even when a later senior attempt succeeds; unknown invocations stay spent and unreplayed.

## Acceptance results

| Criterion | Result | Evidence |
| --- | --- | --- |
| AC1 selective integration / main protections | PASS locally | Full independent diff review; original PR505 ancestry; frozen source manifest. |
| AC2 bounded adaptive graphs and routing | PASS locally | Full domain suite; actual Git worktree/caller tests; optional local Claude adapter tests. No live capacity, entitlement or cost claim. |
| AC3 automatic intake and event wakeups | PASS locally | Intake continuation and evaluated workflow-event tests; three workflow schemas validated. Native activation unobserved. |
| AC4 check waiting / same-head recovery | PASS locally | Standalone review regression suite, malformed/transport/identity negatives. |
| AC5 authentic review / final-QA contract | PASS locally | External request/claim/report/digest tests; exact-SHA, fresh independent final-QA and release negatives. No live provider invoked in this task. |
| AC6 child authorization / retained settled output | PASS locally | Canonical-history digest regressions; actual Git child retention; corrected CLI caller tests; unknown/scope/credential negatives. |
| AC7 composed lifecycle | PASS locally | Independent same-batch actual intake→graph→external worker findings→fresh correction→approval→Codex final→release→deployment record→closure composition, including three rejection cases and restart without replay. Synthetic service boundaries; see independent-qa/logs/composed-full-lifecycle.tap. |
| AC8 common instructions / preserved policy | PASS locally | Shared skills and cloud workflow docs; five PR518 corrections identical. Native independent human trust-root review remains required. |
| AC9 real activation / native canary | NOT VERIFIED | Git reads work. Authenticated REST workflow inventory is refused by the proxy although api.github.com is in the saved custom allowlist. No live enablement, CI result, model invocation, merge, deploy or closure is claimed. |

## Executed checks

- Independent final frozen Node22 suite: 1,749 tests; 1,746 passed; zero failed; three Windows-only native tests skipped on Linux. Log: `independent-qa/logs/final-frozen-full-suite.tap`.
- Additional native workflow review/security script suites: 52 passed, zero failed (`test-results/native-additional-scripts.tap`).
- Final retention correction: 22 passed (`test-results/caller-retention-correction.tap`).
- Independent same-batch lifecycle/caller probes: two passed. Safe Playwright report surface: one passed with value assertions/reload, screenshot and trace. See `independent-qa/`. The final recorded verdict is in `independent-final-qa/`.
- Workflow YAML/schema: all three pipeline/release/cloud-review files passed `@action-validator/core@0.6.0` (`test-results/workflow-schema.json`). `actionlint` was unavailable because the installed `go` command is not a Go compiler; no actionlint success is claimed.
- Contract validator PASS; source diff whitespace check PASS. Inherited historical PR505 failed logs preserve original whitespace and are not rewritten.

Initial Node24/sparse-fixture failures, the initial formatting-sensitive assertions, independent initial probe expectation error, and their corrections remain in the packet. They are historical failed runs, not reported as passes. Final suite uses the repository CI Node22 runtime and exact historical fixture files.

## Evidence boundary and release

The safe browser report demonstrates actual recorded synthetic-controller assertions and frozen-source hashes; it is not a clinical screenshot or a production deployment. UI/application builds were not required because application source is untouched. Native Windows and GitHub-hosted sandbox jobs remain required where configured.

This patch changes the controller trust root. `.claude/skills/clinicos/references/bug-delivery.md` requires a native approving review on the current SHA from an independent authorized person and ordinary protected manual merge. The policy is unchanged. Publishing the source branch cannot activate default-branch workflows or replace that approval. No administrative bypass, invented model/human approval, ledger mutation, budget reset or production-data operation occurred.

## Final Decision

PARTIAL

Source implementation is locally verified; full live autonomy remains unverified until protected integration, native CI/provider handoffs and an actual release canary are observed.
