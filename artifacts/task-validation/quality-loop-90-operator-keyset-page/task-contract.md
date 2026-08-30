# Cycle 90 task contract — Operator keyset pages

## Problem

The compatibility roster correctly fails closed above 500 rows, but that leaves large facilities without a usable operator directory. The client needs a bounded successor that never downloads the whole roster automatically.

## Acceptance criteria

- Add admin and minimal operational directory page endpoints with a default of 50 and hard maximum of 100 rows.
- Use stable `(createdAt, id)` keyset pagination with a canonical opaque cursor bound to the active search.
- Provide bounded server-side search across organisational operator fields.
- Preserve exact admin totals for operators, active operators, and today's appointments even when only one page is loaded.
- Count today's appointments only for the current page and preserve minimal/admin projections and RBAC.
- Keep compatibility endpoints unchanged while the frontend migrates.
- Add no schema migration, Entra dependency, or deployment change.
- Focused tests, TypeScript build, lint, and independent reviews pass.
