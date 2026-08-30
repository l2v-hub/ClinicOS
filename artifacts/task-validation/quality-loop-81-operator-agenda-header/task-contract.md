# Quality loop 81 — operator agenda header

## Objective

Make the operator agenda use the same breadcrumb, heading and action-axis contract as the other
primary operator pages without changing its data flow or appointment interactions.

## Acceptance criteria

1. The page exposes one canonical `PageHeader` with `ClinicOS / Agenda` and `Agenda operatore` h1.
2. Operator identity and selected date/range remain visible in the subtitle.
3. Day/week/month controls retain role, accessible label and `aria-pressed` state.
4. Previous/today/next controls retain their handlers and accessible labels.
5. At 600 px and below, view controls and navigation stack at full width with 44 px targets.
6. Fetch, state, routing, filtering and appointment rendering are unchanged.
7. Focused tests, frontend build, lint and independent security/UX reviews pass.

## Safety envelope

- Presentation-only change.
- No PHI source, cache, request or mutation change.
- Existing admin agenda remains unchanged.
- No deployment until coordinated backend access is available.
