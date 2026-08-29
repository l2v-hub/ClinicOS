# Cycle 38 task contract — bounded assistant timeline

## Objective

Prevent patient timeline requests from loading an entire clinical history and full cartella JSON before the assistant's output cap, while preserving patient authorization, source traceability, internal-route compatibility, and partial-result disclosure.

## Acceptance criteria

- Tenant and patient ACL checks remain before every timeline query.
- Appointments query only the required fields and at most 101 rows with stable descending order.
- Diary reads transfer only required metadata and a maximum 240-character source excerpt, at most 101 rows.
- Vital signs are extracted as bounded scalar fields from `Cartella.data->parametriVitali` in PostgreSQL with non-array/non-object/type protection and a 101-row limit; the full cartella document is not loaded into Node.
- Malformed, impossible-date, non-string, or oversized vital fields are discarded fail-closed before sorting.
- The merged timeline returns at most 100 newest events with deterministic timestamp/kind/id ordering.
- Every returned event has the source at the same index; omitted events cannot leave orphan source references.
- Exact-size results are complete, while source look-ahead or merge overflow sets `truncated=true`.
- Assistant and internal API callers receive the bounded result; the existing assistant partial-result UI remains active.
- Focused tests, lint, build, and independent security/UX review pass without P0/P1.

## Safety envelope

- No schema migration or authorization change.
- No raw SQL constructed from string concatenation; all values remain Prisma parameters.
- Preserve the public timeline event shape (`at`, `kind`, `label`) and add only the backward-compatible `truncated` flag.
- Do not stage unrelated local changes.
