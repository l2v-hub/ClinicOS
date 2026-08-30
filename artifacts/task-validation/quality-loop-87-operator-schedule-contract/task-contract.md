# Cycle 87 task contract — Bounded operator schedules

## Problem

The admin schedule route accepts any array and stores arbitrary JSON and unbounded notes. Both schedule reads return every stored JSON blob, allowing malformed or oversized data to amplify database, response, and browser work and to break the frontend's `TurnoOperatore` assumptions.

## Acceptance criteria

- Accept exactly seven unique canonical weekdays with valid `HH:MM` times and boolean availability.
- Reject unknown fields, malformed IDs, duplicate/invalid days, invalid times, non-boolean availability, and notes over 2,000 characters with `400` before Prisma writes.
- Canonicalize shift order and trim notes before persistence.
- Fetch at most 501 minimally projected schedule rows; return explicit `409` above the 500-record compatibility limit rather than silently truncating.
- Omit malformed legacy rows and private notes from the directory compatibility response.
- Expose the 2,000-character note limit and live character count in the admin editor.
- Preserve admin/manager RBAC, valid response shapes, no-store behavior, and existing lazy loading.
- Add no schema migration, Entra dependency, or deployment change.
- Focused backend/frontend tests, builds, lint, and independent reviews pass.
