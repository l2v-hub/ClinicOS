# Cycle 41 task contract — bounded assistant staff roster

## Objective

Bound and minimize the assistant staff-roster read so a facility query cannot load an unlimited number of complete User records, including credentials and personal fields that the response never uses.

## Acceptance criteria

- The facility feature gate remains before the staff database query.
- Prisma selects only role, qualification, department, full name, and active state.
- Password hash, email, Entra identifier, phone, licence, timestamps, and complete User/Operator records are not materialized.
- Results use stable `createdAt, id` ordering and one-row look-ahead (`101`) to return at most 100 operators.
- Exact-size windows remain complete; overflow sets `truncated=true`.
- The five-field public row shape remains unchanged.
- A partial source reference explicitly says that the roster is partial, and the shared assistant response propagates `truncated` to UI/TTS disclosure.
- Focused tests, lint, build, and independent security/UX review pass without P0/P1.

## Safety envelope

- No schema, mutation, identity, or authorization-policy change.
- Preserve the facility-level STAFF source and deterministic intent routing.
- Do not stage unrelated local changes.
