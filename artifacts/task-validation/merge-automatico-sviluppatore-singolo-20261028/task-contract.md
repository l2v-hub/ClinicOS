# Task Contract

## Task
- Title: Merge automatico sviluppatore singolo 20261028
- Type: config
- Date: 2026-10-28 (Europe/Rome)
- Baseline: d0c5fd82e358de60b4e31879e02f04929c7b0954
- Existing PR: #505; use the same source branch, preserve history.
- Explicit authorization: user works alone and asks “aggiorna il bug-delivery voglio automatizzare il tutto quindi leva la regola alla linea 252”. This supersedes the prior local mandatory second-human/controller trust-root policy. It does not authorize invented GitHub approvals or bypass of native branch protections.

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

The canonical playbook and linked skills require a second human and manual merge for controller infrastructure. The runtime also unconditionally returns human-protected-trust-root, rejects same GitHub account peer reports and filters all shipped infrastructure entries out of its merge allowlist. Editing the playbook alone would leave the requested workflow blocked.

## Expected Behaviour

Under the user's explicit single-developer authorization, reviewed infrastructure can merge automatically after genuine exact-SHA Claude approval, a separate verified Codex final, current checks, fresh ownership/feedback and a durable merge reservation. A shared GitHub account does not imply that two independently reserved model sessions are one reviewer. Native GitHub protections remain authoritative. Application/provider changes continue through deployment-verifying release; infrastructure merge never claims deployment or closes clinical issues.

## Acceptance Criteria

- AC1: Remove the categorical second-human/manual trust-root merge rule from bug-delivery and current linked instructions; document exact-SHA peer review and native protection requirements instead.
- AC2: Remove the equivalent mandatory human/native-account distinction in standalone merge, without generating approval records or changing native GitHub settings.
- AC3: Ship an explicit trusted infrastructure scope policy supporting instructions, workflows, controller code, quality-gate code and docs/tests. Caller allowlists/manifests/env cannot permit clinical/application/provider/runtime or unknown paths outside that boundary.
- AC4: Preserve clean Claude report, independent Codex final, passed implementation, current required checks, PR identity, ownership, no hold, exact-SHA merge reservation/deadline and pre-invocation guard. Wrong SHA, missing proof, required-check failure and native merge refusal still prevent success; unknown merges never replay.
- AC5: Meaningful same-account/trust-root merge positive tests and application/boundary/failed-proof negatives pass. Independent fresh QA verifies final frozen diff and tests; synthetic evidence is labelled.
- AC6: Publish the verified change to existing PR505 by ordinary fast-forward push. Distinguish this from protected main merge, workflow activation or actual deployment; API Forbidden remains an observed access restriction, not a missing human approval.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Infrastructure scope boundaries and review policy. |
| Integration | yes | Actual standalone merge guards/reservations and same-account peer proof. |
| API | yes | Synthetic native merge refusal/identity/protection tests; live access only if available. |
| Playwright | no | No application UI changes; safe QA result surface may document internal control evidence. |
| Persistence after refresh | yes | Durable reservation, receipt, ownership and history regressions. |
| Agnos action registry | no | No Agnos changes. |
| Voice simulation | no | No voice changes. |
| OCR/import test | no | No import changes. |
| Security/privacy scan | yes | No credentials, no bypass/admin flag, no PHI, bounded scope and exact-SHA checks. |

## Evidence Plan

Required evidence: source manifest, explicit authorization/decision, targeted/full domain TAP, independent QA report, safe internal QA screenshot/trace if required by qa-gate, publication receipt and truthful validation report. Preserve all historical reports and failures; the prior contract describes prior policy and is not rewritten.

## Risks

Self-hosted automation modifies its own infrastructure, so independent model reviews, immutable identity, native checks and exact-SHA normal merge remain mandatory. No new budget, ledger rewrite, privilege override or credentials copied. No application deployment/issue closure from infrastructure merge.

## Gate Status

READY FOR IMPLEMENTATION
