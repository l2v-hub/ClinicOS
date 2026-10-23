# Ownership transfer and integration plan

## Durable history and authorization

- The existing UX447 record is four attempts: rounds 1–3 failed and round 4 passed local independent QA on `e14ee2f22c18f1026c63e53b5ce0f5744fb0cfe1`. Preserve all reports, seals, manifests, hashes, and proof media byte-for-byte. Do not reset the count or rewrite old outcomes.
- The original #486 record is transferred into the same UX447 owner/group only through root's authorized atomic archive/transfer operation. Root reserves the spent continuation-5 slot before code. At this draft stage neither state mutation has been performed here.
- Route486 policy is already approved: use a route only from explicit drug/prescription data; preserve operator choice; otherwise require route selection; never infer route from pharmaceutical form. No user approval is pending for this implementation.
- Preserve #453: confirmable allergy warning with no automatic prohibition; use only reliable existing structured associations, otherwise ask for compatibility verification without asserting a proven match. Preserve #457: authorized operator explicitly decides therapy-round handling on PS exit; no automatic pause from opening/printing; persist/reload safely. Route486 may gate creation of a route-less new therapy, but must not cancel a transfer or silently change an existing therapy decision.

## Execution order and stop points

1. Root completes atomic archival of the complete old #486 record, attaches issue486 to the canonical UX447 plan/contract, and reserves continuation #5. No implementation starts before this registration.
2. Luna performs the bounded #486 implementation against the clean UX447 candidate `e14ee2f22c18f1026c63e53b5ce0f5744fb0cfe1`. Do not merge 481/483 yet. Limit new authored changes to the #486 file map: blank fresh route, preserve explicit route, no form inference, shared create-service required route, caller-compatible focused tests, and fresh continuation harness/report paths. Keep schema default and update/status semantics unchanged.
3. Wait for #483 to complete required QA round 6, fix the AppAgenda props/feed wiring finding, and reach a verified reviewed/published source SHA. The current reviewed source snapshot is 34c865233df53a3930f29c8b7befc02208588d64; this is not asserted as the published parent SHA. This plan deliberately does not guess that SHA or imply current approval.
4. 6.1-Sol performs serial parent integration using the exact reviewed/published #481/#483 commits. #481 source parent SHA is `6d2cc7919a86e3896426a7281f28f3406d8418e4`; #483 SHA is an explicit dependency. Full exact parent commits may be imported, but new authored hunks are limited to conflict resolution plus the route486 files already approved. Preserve parents' accepted source, tests, and evidence.
5. Preserve #483's `therapy-create.ts` one-off clock normalization while retaining route486's nonblank create validation and removal of the oral fallback. Preserve #483's `patient-therapies.ts` PUT clock normalization; keep route requirement create-only. Do not alter 483’s refusal correction, verification-group, clock, ACL, receipt, or type contracts while resolving conflicts.
6. 6.1-Sol STOPs after integration and writes a detailed handoff into the fresh continuation packet: actual parent SHAs, final integrated source SHA, exact intersecting files, resolved hunks, relevant checks, and remaining test inputs. No final QA until this handoff is complete and all authors stop.
7. A fresh independent 6.1-Sol QA session runs all eight issues on the final integrated source. Execute full frontend tests/typecheck/build, backend build/full suite, route/caller tests, all canonical UX E2E/browser assertions, persistence/role/responsive/print checks, and media/hash sanitation. Write all new artifacts under `artifacts/task-validation/bug-batch-447/codex-followup-1/`; old proof stays immutable. Then obtain an actual Claude exact-SHA review and final Codex review.

## 483/447 source collision register

Current 483 source handoff reports 41 changed paths at reviewed snapshot 34c865233df53a3930f29c8b7befc02208588d64; that snapshot is not the unknown final published SHA. The following currently overlap UX447's accepted scope or the route486 amendment and need explicit reconciliation after the final 483 SHA exists:

- Existing UX447 #457 / #447 / #454 overlap: `backend/src/therapies/administration-record.ts`, `backend/src/therapies/due-therapy-query.ts`, `backend/src/therapies/therapy-slots.ts`, `frontend/src/App.tsx`, `frontend/src/components/operator/OperatorAgenda.tsx`, `frontend/src/components/operator/TherapyRoundsPage.tsx`, `frontend/src/components/operator/cartella/PatientTherapyCalendar.tsx`, `frontend/src/components/operator/cartella/TherapyDrugDosePanel.tsx`, `frontend/src/types.ts`, `frontend/src/lib/therapyGiro.ts`, `frontend/src/lib/therapySlotPage.ts`, and `frontend/src/lib/__tests__/therapySlotPage.test.ts`.
- New route486 shared create integration: `backend/src/therapies/therapy-create.ts` and `backend/src/routes/patient-therapies.ts`. Preserve the 483 clock hunks and add only route-specific create behavior; do not make PUT/status operations require route.
- Other 483 changed paths remain parent-owned source and are imported intact; inspect exact final handoff/diff before integration. `therapy-authoritative-write.test.ts` is also changed in 483; use separate focused create tests unless an exact final integration conflict requires a narrowly documented test hunk.

The known #481 parent commit `6d2cc7919a86e3896426a7281f28f3406d8418e4` adds UX450 evidence/media only, with no shared application-source hunk. Preserve those artifacts and integrate the actual final #450/main changes before final UX QA as required by the original UX447 separation contract. Do not infer that this evidence-only commit makes all #450 lifecycle changes present on the final main tree.

## #486 explicit source and caller contract

Structured route sources available today: persisted `PatientTherapy.viaSomministrazione`; explicit `DischargeTherapyRow.viaSomministrazione` codes mapped by the existing explicit mapping; and operator-selected `viaSomministrazione`. Current `FarmacoTrovato` and Prisma `Farmaco` expose AIFA form/description/ingredients/documents but no dedicated route. Never parse form, package name, free-text description, or PDF into route.

The shared create callers are POST patient therapies, diary therapy creation, intake-confirm, and `therapy.create` tool capability. Require nonblank route at the create helper before write and remove its create fallback. Intake confirm already requires route; diary preparation validates through create input; direct POST/tool callers receive ordinary validation errors. Preserve explicit routes, route edit/hydration, status-only legacy operations, database default for legacy direct writes, and idempotent replay of previously persisted route-less requests as replay only.

## File ownership and fresh proof

The canonical combined plan JSON contains the exact union of old UX447 scope plus the route486 files, per-issue `fileMap`, the complete eight-issue acceptance map, and versioned evidence pointers. No `.github`, `agent-team` controller, skill, credential, old packet, old proof, or provider-state file enters implementation scope. The canonical UX447 harness has hardcoded historical outputs; create an adapted copy only at `artifacts/task-validation/bug-batch-447/codex-followup-1/qa-bug-batch-447.mjs` and direct outputs to the fresh continuation packet.

