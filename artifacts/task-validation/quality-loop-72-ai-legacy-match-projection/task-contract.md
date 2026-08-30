# Cycle 72 task contract — project legacy clinical matches for AI searches

## Objective

Stop structured assistant search/correlation from transferring and deserializing complete chart JSON blobs when only one matching legacy allergy or therapy is needed.

## Acceptance criteria

- A shared PostgreSQL projection returns at most one ordered legacy allergy and therapy match per candidate patient.
- Only record ID, patient ID and bounded source fields leave PostgreSQL; `Cartella.data` is never selected.
- `searchPatients` and `correlate` each use one shared bulk query, with no per-patient query.
- Accent-insensitive substring matching and original array first-match order are preserved.
- Relational therapy remains authoritative when both relational and legacy matches exist.
- Result fields and source-reference types remain unchanged.
- Focused tests, backend build/lint, diff checks and independent security/performance reviews pass.

## Safety envelope

- No schema, frontend, authentication, cross-patient authorization or write-path change.
- Do not alter patient candidate limits or broaden assistant access.
- Do not stage unrelated local changes.
