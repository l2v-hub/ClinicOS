# Task Contract

## Task
PR393: Resolve seven Claude findings in default-off voice feature, including backend transport policy, fail-closed resource/session limits, live microphone indicator, correct audit action, truthful provider capability certification, bounded status cache and fresh proof hygiene.

## Impact Classification
Explicit owner-authorized review corrections on existing entity, base d6bb325b1e767c9554e64da433c3f91b0217ee8a. Backend/API and frontend scope is explicitly authorized where listed below. User approved continuation beyond four preserving all previous attempts and reports. No fake new batch or reset.

## Current Behaviour
Claude requested changes on the pinned base. Prior implementations and evidence remain historical. Root has sole controller/GitHub ownership; automatic competing writers remain paused. Source edits begin only after a durable continuation reservation has been verified.

## Expected Behaviour
Resolve seven Claude findings in default-off voice feature, including backend transport policy, fail-closed resource/session limits, live microphone indicator, correct audit action, truthful provider capability certification, bounded status cache and fresh proof hygiene.

## Acceptance Criteria
AC1 server transport rejects realtime session with409/audit voice:session and no negotiation. AC2 strict existing hard budget policy and one active operator admission enforced; no claim that token TTL ends established media. If provider-side forced termination cannot be proven, activation stays fail-closed and capability unverified; no invented field/endpoint. AC3 micActive actually drives visible indicator including pending negotiation and cancellation tracks end. AC4 audits use correct action. AC5 provider matrix honestly unverified/default off until actual supported smoke. AC6 bounded TTL cache partitioned by normalized runtime origin and credential identity, local kill switch fresh, fake clock tests. AC7 no paid provider/real patient data; old proofs unchanged; fresh local browser result values, screenshots/video/trace, meaningful runtime tests.

## Scope
backend/src/skills/http.ts ONLY voice/session/gate block, backend/src/voice/stt.ts and focused voice tests; clinicos-ai-runtime voice runtime/cost/provider registry sources and focused tests; frontend voice capture/channel hook and VoicePanel.tsx plus relevant tests; generated capability matrix from true source and targeted voice runbook. New followup harness/proof only; retain all old media/contracts/reports byte identical. No therapy source, deps/schema, paid provider calls or activation of voice on demo/production. Coordinate any unlisted source with root before editing.

## Implementation Plan
Use the detailed read-only analysis in /workspace/.clinicos-cloud/pr393-codex-followup-20261018/analysis. Preserve originals; write a complete analysis/plan in this new followup before code. Implement coherent producer/consumer and security changes, focused regressions, simplify changed source and STOP for a NEW independent QA session. Root owns commits/publication/release. Author cannot self-certify. No remote GH/controller/provider/production operations.

## Test Plan
Run relevant credential-free focused tests and compile/build checks; full relevant suites once when source stable. Browser/runtime/DB only in an isolated owned stack under /tmp/clinicos-browser-qa.lock covering full lifecycle. Preserve unrelated services, refuse occupied ports/container identity mismatches. Redirect all nested harness output into fresh run directories. Actual results and SQL persistence/denial evidence required for clinical writes; voice remains local synthetic provider fixtures with capability limitations explicit. Any runtime resource uncertainty is checked before launch. Independent QA reruns relevant tests and inspects complete diff.

## Evidence Plan
Only synthetic records and fresh proof paths under this followup or new owned external QA root. Each public artifact <=25MiB, images/video decoded and all ZIP members CRC-checked and scanned for secrets/PHI. Hash all prior tracked proof before/after; no deletions, rewrites or reassignment of old evidence to new source. Source-bound evidence report and manifests, AC-to-test matrix and each issue-specific result required. Verdict READY FOR CODEX QA/BLOCKED/FAILED VALIDATION, never automatic closure/deploy.

## Gate Status
READY FOR IMPLEMENTATION
