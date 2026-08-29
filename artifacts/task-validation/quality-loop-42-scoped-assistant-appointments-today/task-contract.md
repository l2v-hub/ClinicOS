# Cycle 42 task contract — scoped assistant appointments today

## Objective

Move the assistant's patient scope into the appointments-today database query, bound the returned window to the assistant result budget, and stop treating a limited list as the facility snapshot's exact appointment count.

## Acceptance criteria

- A restricted patient allow-list is applied in Prisma before ordering and limiting.
- An empty allow-list returns zero rows/count without a database operation.
- The list query selects only ID, patient ID, schedule, duration, reason, and status; operator, creator, notes, completion/cancellation, and audit fields are not materialized.
- Ordering is stable by `scheduledAt, id`.
- One-row look-ahead uses the configured assistant result budget with a hard cap of 200; overflow sets `truncated=true` and source references match returned rows.
- The post-query JavaScript ACL filter is removed.
- Facility snapshot uses a separate exact, scoped database count instead of the limited list length.
- Focused tests, lint, build, and independent security/UX review pass without P0/P1.

## Safety envelope

- No schema, mutation, identity, or authorization-policy change.
- Preserve the existing appointment result fields required by assistant composition and facility source semantics.
- Do not stage unrelated local changes.
