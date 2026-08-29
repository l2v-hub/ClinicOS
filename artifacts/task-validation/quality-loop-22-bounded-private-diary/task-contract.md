# Cycle 22 — bounded, patient-scoped diary

## Baseline risk

The patient diary endpoint returned every matching clinical entry when callers omitted pagination, and the diary tab rendered the full response. An authenticated ordinary operator could also substitute any patient id in the route because authentication did not enforce patient scope. Create and update accepted client-provided author identity, allowing impersonation inside the clinical record.

## Acceptance criteria

- Default every diary read to a maximum of 50 entries and clamp explicit limits to 100.
- Use one-row look-ahead so `hasMore` is false at the exact cap and true only when data is omitted.
- Use stable keyset pagination ordered by `entryDateTime DESC, id DESC`; bind the cursor to active filters.
- Preserve bounded legacy offset compatibility without using it in the current UI.
- Add indexes supporting unfiltered and author-filtered keyset reads.
- Append pages without duplicates and ignore stale responses after patient/filter changes.
- Preserve loaded cards and expose retry feedback when load-more fails.
- Refresh the first page after create, edit, or delete.
- Keep the legacy fallback DOM bounded and disclose any truncation.
- Require patient existence and `registeredById` ownership for ordinary operators; allow manager/admin global scope.
- Return the same 404 for missing and out-of-scope patients, and fail closed when scope lookup fails.
- Derive author name/type from the server-side operator mapping and ignore client authorship fields.
- Mark every response, including auth errors, `private, no-store`.

## Safety envelope

- No clinical rows are rewritten or deleted by the migration; only read indexes change.
- Production Entra identity resolution is unchanged. Two legacy UI aliases are resolved only in explicit development/test demo mode, which remains disabled in production.
- Patient ownership uses the existing `Patient.registeredById` field as the conservative policy proxy. Legacy patients without an owner fail closed for ordinary operators.
- Rollback requires reverting this cycle and reverting the two index changes after checking query load.
