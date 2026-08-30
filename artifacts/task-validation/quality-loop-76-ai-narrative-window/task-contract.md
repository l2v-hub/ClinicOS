# Quality loop 76 — AI narrative window

## Objective

Minimise PHI, memory and response size for the AI patient-narrative getter without changing the
full clinical-editor narrative contract.

## Acceptance criteria

1. Patient and tenant checks run before the narrative query.
2. PostgreSQL selects one bounded display text per present canonical section.
3. Full `originalText`, `reviewedText`, annotations and stored source metadata are not projected to
   Node by the AI getter.
4. Data and source references contain the identical bounded display text.
5. Per-section and aggregate truncation are explicit.
6. The full `getNarrativeSections` clinical UI path remains unchanged.
7. Focused tests, backend build, lint and independent security/performance reviews pass.

## Safety envelope

- No schema migration or write path.
- No ACL or tenant expansion.
- No change to the clinical editor API.
- No deployment until the coordinated frontend/backend release gate is available.
