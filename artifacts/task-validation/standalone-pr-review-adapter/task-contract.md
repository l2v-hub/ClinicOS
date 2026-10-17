# Task Contract

## Task
Standalone PR review adapter. Baseline d1324cb3, codex/standalone-pr-review.

## Impact Classification
Frontend/UI, Backend/API, DB, clinical AI, Voice, OCR: no. Auth/Permissions and Security: yes (trusted orchestration). Config: yes (CLI wiring only).

## Current Behaviour
Trusted handoff discovers only guarded normal bug batches; actual feature and infrastructure PRs cannot participate without misrepresenting issues or weakening guards.

## Expected Behaviour
Explicit maintained standalone review subjects preserve their real PR identity, packet, source manifest and imported implementation history. Reuse comment handoff authentication and durable reservation, and expose a safe independent QA and merge boundary.

## Acceptance Criteria
- AC1: Normal plan/state/editable guards remain unchanged; no fake issues, competing batches or budget reset.
- AC2: Explicit adoption validates immutable native PR identity, packet/source manifests, real optional issue IDs and existing attempt history (maximum four).
- AC3: Authenticated CAS claim reserves review before inference; submissions/import bind owner, nonce, request, round, SHA and full tracked tree.
- AC4: Exclusive PR handoff labels and independent read-only Codex QA; findings stop at orchestrator-owned correction handoff. Required checks, exact SHA, review proof and release hold gate merge.
- AC5: Source review executes no PR code and performs no source autodeploy, provider calls or DB operations.

## Test Plan
Unit/security tests required for invalid identities, manifests, budget limits, concurrent claim/import provenance, stale subjects, label exclusivity, QA interruption and merge guard. Existing normal pipeline suite required for regression. No UI behavior changed; browser app tests and runtime DB not applicable.

## Evidence Plan
Sanitized Node test outputs, explicit source diff, immutable local attempt reservation; parent performs fresh independent QA after source stop. No actual Claude approval or deployment claimed.

## Risks
Privilege boundary and replay risks require bounded separate schema and exact identity checks. No automated model correction on standalone subjects. Infrastructure itself requires genuine Claude review bootstrap before merge.

## Gate Status
READY FOR IMPLEMENTATION
