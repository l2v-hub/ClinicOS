# Cycle 35 task contract — lazy, role-scoped room data

## Objective

Remove facility-wide room and occupancy PHI from the ordinary operator login path, align room-management UI with backend authorization, and make the remaining administrator room reads lazy, abortable, retryable, and resistant to stale-session updates.

## Acceptance criteria

- An ordinary operator login performs no `/admin/rooms` request.
- Facility room, occupancy, and bed-availability reads require the administrator or manager role.
- Patient room-assignment reads enforce owner scope and preserve non-enumerating 404 behavior.
- Room data loads only in relevant administrator views and is guarded by abort, session-epoch, and request-sequence checks.
- Loading and failure states cannot be presented as zero occupancy or an empty facility.
- Room-assignment controls are hidden from operators who cannot use the corresponding backend mutation.
- Assignment synchronization reuses the guarded room snapshot instead of issuing a duplicate facility-wide read.
- Focused tests, frontend tests, builds, lint checks, and independent security and UX/performance review pass without a P0 or P1 finding.

## Safety envelope

- Preserve the existing backend as the authority for room availability and assignment conflicts.
- Do not broaden operator access to facility-wide room data.
- Do not modify unrelated user changes or local coordination files.
- Do not deploy without the target credentials, project binding, environment configuration, and migration/rollback evidence.
