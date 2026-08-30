# Cycle 68 task contract — navigation-scoped operator directory

## Objective

Remove the growing operator roster and appointment aggregation from ordinary login bootstrap while preventing directory failures from appearing as a valid empty list.

## Acceptance criteria

- Operator dashboard login makes no `/operators` or `/operators/directory` request.
- The directory loads once on the first route that consumes it and is cached for the session.
- Admin routes use the admin profile endpoint; operator routes use the minimal directory endpoint.
- Navigation and logout abort obsolete requests; sequence and session guards reject late responses.
- Initial loading blocks false empty UI; an initial error exposes retry.
- Background errors preserve and label the last valid snapshot.
- Existing operator shape, CRUD updates and consuming page contracts remain unchanged.
- Focused/full frontend tests, production build, cycle-scoped lint and independent security/performance reviews pass.

## Safety envelope

- No backend endpoint, response shape, RBAC or schema change.
- No pagination contract introduced in this cycle.
- Do not stage unrelated local changes.
