# Cycle 40 task contract — aggregate facility occupancy

## Objective

Replace the assistant and admin room-occupancy graph reads with one shared, exact aggregate query so facility counts do not materialize Room, Bed, assignment, or patient data in the Node.js process.

## Acceptance criteria

- The assistant facility gate remains before every occupancy database query.
- The assistant and `/admin/rooms/occupancy` use one shared read service and preserve the existing response shape.
- One parameterized PostgreSQL query calculates room, bed, occupied, free, and maintenance counts.
- Active assignment semantics remain `endDate IS NULL OR endDate >= today`.
- A bed is free only when it is neither occupied nor in maintenance; maintenance/assignment overlap cannot produce a negative or double-subtracted count.
- The query selects no patient identity, notes, assignment identifiers, or audit metadata.
- Aggregate `bigint`, number, and string values are converted only when they are non-negative safe integers.
- Focused tests, lint, build, and independent security/UX review pass without P0/P1.

## Safety envelope

- No schema, mutation, or authorization-policy change.
- Preserve the facility-level source reference and counts-only assistant response.
- Do not stage unrelated local changes.
