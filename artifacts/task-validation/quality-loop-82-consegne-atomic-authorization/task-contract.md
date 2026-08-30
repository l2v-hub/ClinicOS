# Cycle 82 task contract — Atomic handover authorization

## Problem

`PUT /consegne/:id` and `DELETE /consegne/:id` authorize with a scoped pre-read but previously mutated by `id` alone. A concurrent reassignment or ownership change between those statements could let a stale request write outside its current authorization scope.

## Acceptance criteria

- Retain the pre-read needed for author/assignee field-level policy.
- Repeat the effective authorization predicate inside the database mutation.
- Content updates remain author-only for ordinary operators.
- Status-only updates remain available to the current author or current assignee.
- Admin and manager behavior remains unchanged.
- A zero-row atomic mutation returns the existing non-enumerating `404` response.
- Return the updated row from the same transaction as the conditional update.
- Delete uses a conditional `deleteMany`; ordinary operators must still be the current author.
- No schema, migration, API response-shape, or deployment-configuration changes.
- Focused authorization tests, TypeScript build, formatting, lint, and independent reviews pass.
