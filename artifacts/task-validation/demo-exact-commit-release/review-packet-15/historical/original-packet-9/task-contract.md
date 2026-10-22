# Task Contract

## Impact Classification
Test-only synchronization of the existing mandatory native backend gate. No product, audit writer, policy, authorization, route, provider, deployment or UI changes.

## Current Behaviour
Actual native run39649206485 on5940f563 failed proactive-e2e testU: expectedpreso_visione/actualnuovo. Source inspection: waitForAudit({operatorId:SIM-OSS-1,outcome:denied}) can immediately return an earlier denied event while the just-triggered audit is fire-and-forget. A new denial may then legitimately arrive between s1/ack and s2, changing the revision. Tool HTTP returns registry ToolResult.requestId, and audit uses that same requestId. The current fixture waits for any denial instead of its own request. This is an independently observed native failure plus source-level race diagnosis, not a new realDB reproduction. Preserve old failure and all QA8 history. Demo main-only policy was actually applied by39654495449 and separately readback; do not repeat that mutation.

## Expected Behaviour
The fixture waits until the exact denial it just caused is durably audited before observing and acknowledging the summary. The stable-ack assertion still fails on an actual product regression and cannot pass because an older matching record satisfied the setup wait.

## Acceptance Criteria
- Only existing testU in backend/src/proactive/__tests__/proactive-e2e.test.ts plus NEWsafe packet; no helper/product/audit/HTTP/API/env/schedule/timeouts or testselection changes. If sparse source is absent, materialize exact Git HEAD bytes into this scoped file before editing, no Git/index operation by author.
- Capture the actual response from the existing forbidden therapy.create tool call; validate genuine denial/returned nonempty requestId rather than inventing a correlation. Bind waitForAudit to that exact requestId plus existing operator/outcome, and assert matching persisted row exists before taking s1. Retain all current summaryID/ack/status/1100ms stability assertions; no extra sleep, retry loop, catchignore or weaker expectedstatus. No unconditional database deletion or manufactured event to clear race.
- Do not fix hypothetical other product behavior or add mirrored source-text tests. Existing samefile HTTP/PG execution is meaningful acceptance; author noDBphase may run syntax/transpile/static checks and record runtimeUNRUN. Independently execute actual proactive-e2e file on owned isolated PG after parentQA9 handback (or native exactSHA as extra proof), with stale existing audit history present. No broad unchanged full backend/frontend/1060 rerun locally.
- Maintain request/response/identity/audit semantics; no clinical fixture data in public reports. Freeze source/proofs before edit; all packets1..8, actual policyproof and historicalfailednative log immutable, including QA8 sealed reports. Root soleGit/index/ref/GH/state/providerwriter. No actual credentials/network/settings/clinicalruntime from author.
- After dedicated independent QA, publish new exactSHA and six native app15368 checks before one actual Claude review, then finalCodex/protectedmerge. Main-only policy operational proof remains bound to unchanged helper/workflow bytes; no rerun of already successful admin change.

## Scope
- backend/src/proactive/__tests__/proactive-e2e.test.ts

## Test Plan
Author credential-stripped syntax/transpile/static diff checks only; do not start sharedPG. Dedicated QA actual one relevant HTTP/PG file after root grant; verify exactrequestaudit synchronization and existing status assertion. Current native failure log and old test source retained. No fresh broad suite without new reason.

## Evidence Plan
Private /workspace/.clinicos-cloud/498-audit-fixture-author9-20261021, NEW artifacts/task-validation/demo-exact-commit-release/codex-followup-7. Save frozen original source and actualcommands/stdoutstderr/exitreceipts; authorreport explicitly says realDBUNRUN. No forceignoredlogs/realpatientdata/tokens or rewritten old evidence.

## Gate Status
READY FOR IMPLEMENTATION after authenticated8→9 extension/reservation/readback. User authorizes all necessary workflow fixes and iterations retaining history. QA483 owns runtime; no services or queued DB jobs. Actual administrator bootstrap already VERIFIED, do not undo it or claim this testchange redeployed clinical fixes.
