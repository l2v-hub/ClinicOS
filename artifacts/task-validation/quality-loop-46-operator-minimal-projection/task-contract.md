# Cycle 46 task contract — minimal operator projections

## Objective

Reduce operator-directory row width and keep sensitive User columns out of routine directory/admin database reads.

## Acceptance criteria

- Operational directory reads select only operator identity/display fields and `fullName`/`isActive` from User.
- Admin list reads add only phone, email and assigned-patient count required by the response.
- `passwordHash`, `entraObjectId` and User timestamps are absent from both projections.
- Existing response mapping, ordering, RBAC and cache policy remain unchanged.
- Focused tests, targeted lint, backend build and independent reviews pass without P0/P1.

## Safety envelope

- No schema, route, payload or authorization behavior changes.
- No pagination behavior change in this cycle.
- Do not stage unrelated local changes.
