# Quality loop 79 — relational therapy match window

## Objective

Prevent patient search and correlation from loading every relational therapy for all candidate
patients before filtering the requested drug name in Node.

## Acceptance criteria

1. A shared bulk SQL helper filters therapy name before rows leave PostgreSQL.
2. Matching remains case-, accent- and substring-insensitive.
3. At most one deterministic relational therapy row is returned per candidate patient.
4. The query projects only bounded source fields required by the assistant.
5. Both `searchPatients` and `correlate` use the helper and retain legacy therapy fallback.
6. Source references retain the selected therapy record ID.
7. Focused tests, backend build, lint and independent security/performance reviews pass.

## Safety envelope

- Read-only gateway change; no schema migration.
- Candidate patient IDs remain the product of existing ACL-filtered searches.
- No new assistant capability or write action.
- No deployment until coordinated backend access is available.
