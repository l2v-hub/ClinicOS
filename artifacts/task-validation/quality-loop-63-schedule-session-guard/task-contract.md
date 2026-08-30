# Cycle 63 task contract — schedule mutation session guard

## Objective

Prevent an admin schedule save started in one authenticated session from restoring operational staffing data or feedback after logout/login rotates the session.

## Acceptance criteria

- `saveSchedule` captures the current session epoch before starting its PUT.
- A success response from an obsolete session cannot update schedules, feed state or toast.
- A failure from an obsolete session cannot display an error toast in the next session.
- Same-session success and failure behavior remains unchanged.
- Focused/full tests, production build, cycle-scoped lint and independent security/UX reviews pass.

## Safety envelope

- No endpoint, payload, persistence, RBAC or schedule editor behavior changes.
- Do not stage unrelated local changes.
