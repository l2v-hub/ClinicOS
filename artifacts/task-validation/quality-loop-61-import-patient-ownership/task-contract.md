# Cycle 61 task contract — imported patient ownership

## Objective

Ensure every patient created after reviewed AI/import confirmation has a valid operator owner and remains visible in the intended clinical scope. Preserve a valid original draft/job owner; fall back to the authenticated actor for ownerless or stale legacy records.

## Acceptance criteria

- Draft confirmation persists `Patient.registeredById` from the valid original owner, or from the authenticated actor when the legacy owner is null/stale.
- Direct import-job confirmation receives the authenticated actor from the route and applies the same ownership resolution.
- Both flows use the shared transactional materialization path; no patient can be committed before ownership is written.
- Idempotent replay repairs only legacy patients whose owner is null and never overwrites an existing owner.
- Existing duplicate, idempotency, narrative, document and therapy behavior remains unchanged.
- Database-backed tests cover draft replay repair, stale draft ownership and an ownerless job; a contract test covers both call paths.
- Focused tests, backend build/lint and independent reviews pass without new P0/P1 findings.

## Safety envelope

- No schema migration, role policy, patient-scope, payload or response-shape changes.
- Do not stage unrelated local changes.
