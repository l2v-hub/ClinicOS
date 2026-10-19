# Task Contract

## Task
PR492: Resolve all nine actual Claude findings on the same existing manual subject, including trust-root merge policy, historical ownership, authenticated recovery, transport/projection error classification, subscription-only Codex auth, immutable verification caching and isolation, optional checks and injected clock. Implement the user-authorized audited continuation beyond four without resetting history.

## Impact Classification
Reviewed infrastructure/controller correction, explicit owner scope. Same entity and logical history; no new fake batch. Base fcabd40713ad355c944d7aff3fcfa7852dce01e9. Claude raw negative feedback is finding data, not a structured approval.

## Current Behaviour
The real Claude report on the base SHA requests changes. Existing source and proofs are frozen. User explicitly authorized continued implementation/review beyond four while preserving all history; old max4 text is superseded for authorized extensions. Root owns remote state, claims, publication and release.

## Expected Behaviour
Resolve all nine actual Claude findings on the same existing manual subject, including trust-root merge policy, historical ownership, authenticated recovery, transport/projection error classification, subscription-only Codex auth, immutable verification caching and isolation, optional checks and injected clock. Implement the user-authorized audited continuation beyond four without resetting history.

## Acceptance Criteria
All F1-F9 from analysis-and-plan.md need independent AC→test evidence. Trust-root/auth/workflow changes never automatically merge; same-account arbitrary approval never grants auto merge; native protections and actual human approvals required by policy stay enforced. Cross-collection overlaps and shortened history reject, including existing actual PR492 manual owner. Explicit maintainer-only recovery retains spent rounds and invalidates stale nonces. Durable write vs projection failure distinguished; only409 is CAS; uncertain writes reconciled. No app-provider API key alias; conflicting auth fails before inference. Pinned blob cache cannot cache mutable identity and isolated failed writes cannot leak dirty approvals into normal batch saves. Optional Vercel handling explicit and required checks never weakened. Injected clock drives reservations. Default4 remains; only audited durable operator extensions authorize more and preserve every historical ledger/report/attempt byte.

## Scope
Allowed controller sources: agent-team/src/bug-pipeline/{standalone-review,github,comment-review-handoff,review-handoff-cli,cli,pipeline,contracts,process,issue-review-communication}.mjs; small attempt-budget.mjs/review-policy.mjs modules only if they remove duplication. Relevant agent-team/tests/bug-pipeline tests and CLI regression tests. Docs docs/standalone-pr-review.md, docs/claude-local-review-prompt.md, and targeted budget statements in docs/codex-bug-workflow.md plus clinicos/bug-triage/final-review skills only if required to state actual user-authorized continuation (preserve historical reports/contracts). No application/frontend/backend/schema/provider/dependency/workflow changes. Every new trust-policy module itself remains protected. One source owner; no paid API fallback or production calls.

## Implementation Plan
Follow the read-only findings matrix prepared before code in /workspace/.clinicos-cloud/pr492-codex-followup-20261018/analysis/. Reserve continuation durably first. Implement surgical fixes and meaningful negative/positive tests. Simplify, format only changed source, then STOP for a NEW independent QA session. No author commit/push/GitHub/state/provider operations.

## Test Plan
Credential-free focused regression suites followed by full relevant existing infrastructure/controller suites. Preserve original tests except real changed contracts. A fresh independent QA reviews full diff, runs targeted suites and verifies a safe local HTML receipt/recovery surface through Playwright with screenshots, trace/video and actual result values/refresh. No app code or paid provider execution. Inherit unrelated builds only after source/config identity verification, explicitly marked.

## Evidence Plan
All fresh packet metadata and media under this codex-followup-1 directory or new owned external QA root. Snapshot old tracked proof hashes before editing and compare after. Each public artifact must be <=25MiB, decoded/CRC-checked and secret/PHI-scanned including all ZIP members. Synthetic only. No copies of private controller states or credentials. QA verdict READY FOR CODEX QA/BLOCKED/FAILED VALIDATION; not release/closure.

## Gate Status
READY FOR IMPLEMENTATION
