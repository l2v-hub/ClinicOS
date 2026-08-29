# Cycle 43 task contract — coherent bounded dashboard alerts

## Objective

Fix the production dashboard alert where patient and medication names visually merge, and make high-priority dashboard worklists bounded, responsive, and consistently accessible across operator and admin views.

## Acceptance criteria

- Patient name, medication chips, and anomaly count have separate visual hierarchy.
- The operator anomaly alert renders at most three patients and three medication names per patient, declaring omitted items.
- Operator and admin overdue-medication alerts share a three-item medication limit and declare omitted items.
- Compact tooltip and accessible-name text exposes at most three medication names and declares the remainder.
- Asynchronously appearing overdue-medication alerts use `role="alert"` in both dashboards.
- Dashboard rows have an opaque visible keyboard focus indicator and a minimum 44 px target.
- Admin imports the shared alert styles directly rather than depending on another lazy chunk.
- No horizontal page overflow at the 390 px mobile breakpoint.
- Focused/full tests, lint, build, browser verification, and independent security/UX review pass without P0/P1.

## Safety envelope

- No clinical calculation, API, schema, mutation, or authorization change.
- Preserve existing navigation destinations and anomaly/overdue counts.
- Do not stage unrelated local changes.
