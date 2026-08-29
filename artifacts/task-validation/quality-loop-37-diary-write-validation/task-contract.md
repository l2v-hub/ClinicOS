# Cycle 37 task contract — bounded, canonical diary writes

## Objective

Prevent authenticated storage amplification and malformed clinical timeline data by applying one strict diary-write contract to both the patient API and assistant actions.

## Acceptance criteria

- Diary content is required, trimmed, and limited to 16 KiB measured as UTF-8 bytes.
- Titles are limited to 200 characters and categories to 80 characters.
- Priority accepts only `normale`, `importante`, or `urgente`.
- Status accepts only `aperta`, `completata`, or `da_rivedere`.
- Local `datetime-local` values and full ISO timestamps used by assistant actions are accepted, then canonicalized to sortable `Europe/Rome` facility-local minutes; impossible or non-ISO dates are rejected.
- The diary form default is generated in the same explicit facility timezone, including DST changes, rather than slicing a UTC timestamp.
- Create and partial update validate before the author lookup or diary lookup/write in their handlers.
- Client authorship remains ignored and server-authoritative.
- Unknown fields, non-object bodies, empty updates, and spoof-only updates fail with 400.
- The assistant diary writer uses the same validator as the HTTP API.
- Focused validation and route-contract tests, lint, build, and independent security/UX review pass without a P0/P1 regression.

## Safety envelope

- No schema migration or existing-row rewrite.
- Preserve current frontend status, priority, null-title, and local timestamp values.
- Preserve patient ownership checks and author derivation.
- Do not stage unrelated local files.
