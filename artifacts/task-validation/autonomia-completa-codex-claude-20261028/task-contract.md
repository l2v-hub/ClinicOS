# Task Contract

## Task
- Title: Autonomia completa Codex Claude 20261028
- Slug: autonomia-completa-codex-claude-20261028
- Type: config
- Date: 2026-10-28
- Baseline: d8e85d77536a4770d79f197ca75b3f7299895d40
- Existing work: PR505 adaptive runtime; PR518 reviewed shared skills. Integrate existing work, preserve its history and current main protections; do not create a duplicate implementation PR.
- Worktree: /workspace/clinicos-autonomy-complete-20261028
- Authorization: User explicitly prioritizes full autonomy before revisiting outstanding clinical work. Prior authorization for worktrees, selective delegation and automatic ordinary release persists.

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | yes |
| Privacy / Security | yes |
| Config / Env | yes |

## Current Behaviour

Main has grouped intake, direct adaptive model selection, Claude cloud review, independent Codex final and protected release, but no work-item graph integration. PR505 already contains the graph runtime and optional local Claude adapter. Replacing main files wholesale would regress later recovery, cloud-review and retained-output protections. Successful CI/head changes rely on a later unrelated event or fifteen-minute cron. Optional cancelled checks can throw an untyped assertion and leave standalone reconciliation blocked without a matching recovery. Git transport currently works; direct REST/GitHub CLI access is rejected by this cloud proxy, so local tests and Git reads are distinct from live activation evidence.

## Expected Behaviour

An authorized issue label starts durable aggregation/planning and bounded task delegation; each stage advances from authenticated events or scheduled reconciliation without chat supervision. Tests, simplification, independent QA, exact-SHA Claude review, independent Codex final, protected ordinary merge, verified deployment and issue closure retain their existing owners and evidence gates. Transient observations preserve completed work and resume without duplicate model sessions. Manual-owned legacy subjects remain untouched. Trust-root review protections are retained.

## Acceptance Criteria

- AC1: Integrate PR505 selectively with current main, preserving current ownership, failed-output retention, terminal diagnostics, final-QA and checkpoint failure settlement. No clinical/application/schema changes.
- AC2: New eligible work can receive a bounded dependency graph and model routing by declared risk, observed capacity and load. Existing frozen plans, protected subjects, attempts and history remain unchanged; unknown outcomes never become automatic retries.
- AC3: Issue collection and required CI/head completion have bounded automatic wakeups. Event handlers execute trusted default-branch code, filter irrelevant/self events and serialize ownership. No provider is called solely to wait or poll.
- AC4: Typed check observations wait and recover on the same SHA without deleting valid Claude/Codex proofs or resetting budgets. Required failed/cancelled checks still prevent release. Optional unsuccessful checks are not fabricated as successful.
- AC5: Claude cloud report/label handoff remains authentic and exact-SHA bound; a fresh independent Codex final precedes ordinary release and deploy-confirmed closure. No Anthropic API fallback or copied credentials.
- AC6: Recovery authorization includes child graph reservations/results. Definitely failed, scope/identity-verified child output is retained within existing bounds; unknown child outcomes retain their spent tombstones.
- AC7: Meaningful synthetic control-flow integration proves a lone authorized event advances through graph work, tests, review changes, fresh head, approval, final QA, deployment and closure, including interruption/negative cases, without hidden calls.
- AC8: Shared skill instructions and docs describe actual cloud behavior and implementation limits consistently. Native protected review/merge rules for this trust-root change remain intact; model reports never impersonate human approval.
- AC9: Distinguish local suite success, published CI, enabled workflows, real model invocation and full end-to-end autonomy. Real activation/canary is performed only through reviewed code and existing authenticated bindings; no fabricated closure or standalone parallel controller.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Model routing, graphs, exact-bound authorization, check outcomes, events and retention. |
| Integration | yes | Actual controller/adapters with owned synthetic repositories and durable state; lifecycle and no duplicate calls. |
| API | yes | Mocked authenticated GitHub contracts and negative cases; separate live authenticated configuration check where access permits. |
| Playwright | no | No clinical UI change; existing safe operational dashboard only if presentation is changed. |
| Persistence after refresh | yes | Durable replay/restart and unchanged historical attempts. |
| Agnos action registry | no | No Agnos changes. |
| Voice simulation | no | No voice changes. |
| OCR/import test | no | No clinical import changes. |
| Security/privacy scan | yes | Secret isolation, trusted checkout, unauthorized actor and ownership negatives, scope and bounded artifacts. |

## Evidence Plan

Required evidence:
- validation-report.md with exact local/native/provider distinctions and AC results.
- Sanitized unit/integration TAP output and workflow/action syntax checks.
- Source/provenance manifest and complete diff review against main and PR505/518.
- Independent QA from a separate session before PR readiness.
- Native CI and actual event/model/release receipts only when really executed; retain all failures.

## Risks

Preserve current main fixes during integration; guard all model starts with durable ownership and reservation. Do not touch the canonical ledger or protected legacy subjects during source development. Never use production data for tests. Do not weaken required checks, human trust-root review, merge protections, or replace unknown paid outcomes with retries. Existing API transport restriction may prevent live activation; complete concrete code/verification/publication first and report only the exact remaining access or review requirement.

## Gate Status

READY FOR IMPLEMENTATION
