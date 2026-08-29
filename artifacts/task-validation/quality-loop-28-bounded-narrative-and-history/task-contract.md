# Quality loop 28 — bounded narrative and medication history

## Objective

Prevent AI/import metadata amplification and remove false-empty or incomplete clinical states from the patient therapy experience.

## Acceptance criteria

- Section extraction rejects bounded-resource violations before AJV, duplicate merging, job persistence, or browser rendering.
- Duplicate sections cannot exceed aggregate text, annotation, or source-range limits.
- Narrative annotations and provenance are projected to known fields and validated before JSONB persistence.
- Intake autosave cannot replace extraction-owned `_narrative` or `_sections` data.
- Therapy, daily-administration, and history failures are distinct from successful empty results and expose an accessible retry.
- Rapid daily-date changes cannot apply a stale response.
- Medication-administration history uses stable patient-scoped keyset pagination; the legacy endpoint fails explicitly rather than truncating.
- Changed tests, lint, builds, Prisma validation, and independent P0/P1 reviews pass.

## Safety envelope

- Keep the original worktree and unrelated files untouched.
- One writer only; reviewers are read-only.
- Do not deploy without target credentials, Entra configuration, PostgreSQL access, migration verification, and rollback evidence.
- Do not claim query-plan validation without a target-like database.
