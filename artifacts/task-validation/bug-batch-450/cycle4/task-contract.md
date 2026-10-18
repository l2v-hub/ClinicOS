# Task Contract

## Task
Claude PR481 review round2 corrections; final author attempt4/4. No fifth attempt.

## Impact Classification
Frontend/UI yes; Backend/API yes (existing derived-field payload only); Database/Persistence yes (existing draft JSON only); OCR/Import yes; Auth/Permissions no changes; Privacy/Security yes synthetic evidence; Config/Env test-only built preview; Voice/Agnos no.

## Current Behaviour
Six actual review findings bound to 111e672faf77b45280d8ef6ebb15268180b58376: unresolved review cannot close, manual responsive list overlays form, built PDF decoder unverified, patient warning unbounded, derived sex provenance not visible after handoff, historical manifest stale.

## Expected Behaviour
Operator can leave safely or save eligible review; manual missing steps stay collapsed; actual built nonroot PDF rendering proven; bounded incomplete identity filter; derived sex provenance remains explicit until operator confirmation/edit; immutable historical evidence with truthful receipt.

## Acceptance Criteria
- AC1: Existing ConfirmDialog has save (only eligible), close without save, continue; unresolved close creates zero drafts; resolved save creates exactly one persistent draft; continue preserves review.
- AC2: Manual intake at 820x1180 and 390x844 starts with collapsed missing-step list and zero overlap with first field/active section, screenshots recorded.
- AC3: Built production preview under nonroot base renders text+scanned/JPX multipage PDF, nonblank thumbnails+selected page, worker and OpenJPEG wasm HTTP200 application/wasm, no unexpected assets/console errors. Diagnose actual paths without unsupported production claims.
- AC4: 30 incomplete patients produce bounded summary and functional filter, zero incomplete hides summary; memoized pending identity list and existing row indicators retained.
- AC5: CF-derived sex has visible provenance in intake until edited/confirmed; explicit contradictory sex remains unchanged and warned; single derivation authority.
- AC6: Every pre-existing packet byte preserved; receipt proves 0eae11061..111e672fa source identity outside artifacts, new manifest verifies all new evidence hashes.

## Test Plan
Unit yes (dialog props/render, incomplete filter, derived sex); integration/API yes existing isolated real backend PostgreSQL; Playwright yes real import/manual/built preview; persistence yes draft count/reload; security yes no real patient/provider/credentials; independent QA root-owned after freeze.

## Evidence Plan
All new artifacts under cycle4/ only: logs, screenshots/evidence, video, trace, command results, source freeze and manifest. Preserve original packet paths. Reuse pinned font asset inputs read-only. Owned PostgreSQL55450 and loopback frontend5450/backend3450/runtime8795; global browser lock required. Never user Vite5304/5311 or live/dev5432.

## Scope Amendment
Authorized source: frontend/src/components/shared/DischargeImportModal.tsx; shared/ConfirmDialog.tsx; shared/intake/{IntakeIndex,IntakeWorkspace,StepAnagrafica}.tsx; shared/sections/ImportSectionsReview.tsx; components/operator/PatientList.tsx; backend/src/intake/draft-service.ts only if necessary to unify existing derivation; associated existing/new focused tests; scripts/e2e/issue-450-ingresso.mjs. PDF helper/config only after proven built defect and root acceptance. No Prisma/schema, production environment, provider, CSP weakening or deployment changes.

## Gate Status
READY FOR IMPLEMENTATION — root pre-reservation synced before source edits. Runtime/independent/external/deploy outcomes not yet verified; existing clinical release hold preserved.
