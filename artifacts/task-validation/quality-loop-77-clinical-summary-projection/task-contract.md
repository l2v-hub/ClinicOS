# Quality loop 77 — clinical summary projection

## Objective

Stop transferring full `Cartella.data` blobs for the patient-roster clinical summary while keeping
the existing response contract, requested order and ownership scope.

## Acceptance criteria

1. At most 100 requested patient IDs reach the projection query.
2. Ownership is resolved before clinical rows are loaded.
3. PostgreSQL returns only the status, boolean flags and numeric counts required by the roster.
4. Malformed/non-array JSON fields degrade to safe empty values instead of failing the endpoint.
5. Missing charts return the existing null/false/zero defaults.
6. Requested patient order and open-consegna counts are preserved.
7. Focused tests, backend build, lint and independent security/performance reviews pass.

## Safety envelope

- Read-only query; no schema migration.
- No change to patient scope or endpoint URL.
- No frontend contract change.
- No deployment until coordinated backend access is available.
