# Cycle 52 task contract — bounded allergy gateway

## Objective

Bound and minimize allergy data before the AI gateway creates sources or passes clinical JSON to the assistant.

## Acceptance criteria

- At most 100 allergy objects and source references leave the gateway.
- Only `id`, `allergene`, `reazione`, `gravita` and `documentato` are projected.
- Malformed input is ignored defensively and non-array input returns empty.
- More than 100 source entries sets `truncated=true`, preserving partial-result disclosure.
- Existing tenant and patient scope checks remain before data access.
- Focused tests, build, lint and independent reviews pass without P0/P1.

## Safety envelope

- No write path, database schema, authorization scope or clinical source data changes.
- Do not stage unrelated local changes.
