# Task Contract

## Task
- Title: demo expiry 2029 r5 20261103
- Slug: demo-expiry-2029-r5-20261103
- Type: config
- Date: 2026-11-03

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | yes: dedicated demo availability only; signed sessions/RBAC unchanged |
| Privacy / Security | yes: scoped authorization, target and secret boundaries |
| Config / Env | yes: one fixed demo expiry variable plus build-context exclusion |

## Current Behaviour

The actual user now requests expiry in2029, superseding indefinite availability.
Choose2029-12-31T23:59:59Z (last day of that year, UTC), as announced before source work.
The active service reports disabled/simulatorfalse with the old October31 cutoff.
Authenticated canonical inspection preserves parent523 operation733f6410-99bf-4892-90a3-486ad5a45eab:
the November9 expiry was STAGED in run41524928481 but the exact later source deployment
failed. Never claim that stage did not occur or rewrite its acknowledgment.
The normal renewal helper deliberately limits renewals to seven days and blocks a
parallel staged cutoff. An initial exploratory specification on the ordinary route
was genuinely RED at26ba86a9 and is retained, not an implementation approval.
Unpublished permanent candidate31b95b0e and all prior tests/reviews remain intact.

## Expected Behaviour

A distinct fixed-date action can supersede the exact acknowledged-but-unapplied
finite stage only with a fresh actual user-session capability and matching terminal
failed-deployment evidence. Ordinary seven-day renewal behavior stays unchanged.
Only DEMO_AUTH_EXPIRES_AT=2029-12-31T23:59:59Z may be staged on the fixed synthetic
demo project/environment/service, skipDeploys=true; deployment remains separately
gated. Do not enable permanent mode, change backend/frontend/RBAC, read secrets,
mutate production, perform SQL cleanup, or test-write clinical records.

## Acceptance Criteria

- AC1: Dedicated2029 route has one fixed key/value/action; no caller date/key/target/allowLong input.
  The existing seven-day renewal module remains byte-identical to D2, still rejecting2029.
- AC2: Only a new actual user-session capability bound to exact source/owner/history/request,
  parent finite-stage request/auth/execution digests and failed deployment can authorize staging.
  Old finite/permanent actions, maintainer-comment-only provenance, copied capabilities,
  stale source, changed history, wrong owner and nonce replay produce no provider mutation.
- AC3: Preserve old stagedNov9 receipt. Verify its exact oldprevious cutoff, matching failed
  Railway deployment ID/source and authenticated terminal FAILED exact GitHub deploy run.
  The active deployment/source and public old expiry must remain exact, synthetic and demo.
  Missing/wrong/uncertain/in-flight/parallel operations or active rollout fail closed.
- AC4: Retain reviewed merged source, authentic Max review, independent finalQA, current-main,
  maintainer/revocation/CAS and final-await ownership gates. One durable claim/write-intent,
  one fixed-key upsert with skipDeploys=true, no retry of uncertain writes, append-only receipt.
- AC5: Exclude QA/generated archives from Railpack copy without deleting them or excluding
  backend source, Prisma migrations, workspace manifests/locks, build scripts or PDF fonts.
  .railwayignore/railway.json, backend/frontend and production workflow remain unchanged.
- AC6: Source-bound tests, regressions, independent security QA, exact-head CI and genuine
  Claude Max round3 on the existing route are mandatory; no API fallback or proof trimming.
  Same unpublished fifth implementation only: four historical implementations, limit5,
  two spent reviews, limit4; no new allowance/reset or imported approval transfer.
- AC7: Existing five server-owned roles and their authorization gates remain unchanged.
  Pure policy regression proves future finite expiry permits valid demo flags and refuses
  production/missing opt-ins/wrong dataset/expired time. No session TTL or permission change.
- AC8: Before any resolution claim, verify the dedicated demo deployment online: ready/current
  source, mode=demo, temporaryDemo=true, simulator=true, syntheticOnly=true and exact2029 expiry
  (.000Z equivalent allowed). Five synthetic profile metadata entries/picker visible after reload;
  sanitized desktop/mobile browser evidence, no patient values, no actual clinical writes.
- AC9: Publish only actual source-bound outcomes and sanitized evidence. Production remains
  unchanged. Keep issue open and label the result unverified until online criteria truly pass.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | fixed2029, unchanged seven-day negatives, authorization/alias/replay/uncertainty |
| Integration | yes | exact old-stage reconciliation, failed-run/source/target drift and build context |
| API | yes | bounded synthetic fixtures plus later public auth/status, ready and identities only |
| Playwright | yes | existing UI on synthetic interception plus final sanitized online picker verification |
| Persistence after refresh | yes | browser role availability after reload; provider status after actual deployment |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | yes | no credentials/PHI, no production/provider-key/SQL mutation, reviewed source gates |

## Evidence Plan

Required evidence:

- Immutable code commits, full before/after source and prior implementation/review history.
- Actual RED/GREEN outputs and source manifests; preserve the initial ordinary-route RED and
  later architectural correction rather than removing a failure from history.
- Independent QA reports, exact CI attempts, real Max report/SHA, final Codex receipt.
- Sanitized provider metadata and stage/deploy receipts with all uncertainty preserved.
- Bounded public status/identity metadata and synthetic browser screenshot/trace; no PHI,
  credentials, authentication tokens or raw provider/CLI logs in published material.

## Risks

The already-staged November9 value is NOT the active October31 runtime value; do
not falsify either. Stage acknowledgment is not deployment. A new explicit2029
operation must bind supersession and verify the original failure and old active
source. Provider errors after a write intent are uncertain and never retried blindly.
Only the root writes operational state. Source authors use isolated exact paths.
The source31 permanent candidate and PR527 context-profile work are preserved and
must not be merged or activated merely to satisfy this narrower finite-date request.
No final success is implied by this contract or by a synthetic test.

## Gate Status

READY FOR IMPLEMENTATION
