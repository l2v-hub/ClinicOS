# Quality loop 34 — patient-route ownership

## Objective

Close the cross-operator patient IDOR across demographics, clinical-record, parameter, roster, and aggregate routes while retaining facility-wide access for admin and manager roles.

## Acceptance criteria

- Ordinary operators see only patients whose `registeredById` matches the verified actor.
- Ownership predicates execute before pagination, limits, projections, and aggregate calculations.
- Detail, demographic mutation, delete, and cartella routes return the same 404 for missing and out-of-scope patients.
- Parameter writes verify ownership inside the same transaction that updates the cartella.
- Clinical summaries load only authorized IDs and never query cartelle or handover counts for rejected IDs.
- Patient creation ignores client ownership and binds `registeredById` to the authenticated actor.
- Conflict responses do not disclose another patient's identifier.
- Admin and manager roles preserve global access.
- Focused tests, build, changed-file lint/format, dependency audit, and independent security/performance reviews pass.

## Safety envelope

- Keep the original worktree and unrelated user files untouched.
- One writer only; auditors remain read-only.
- Fail closed for legacy patients without an owner when accessed by an ordinary operator.
- Do not deploy without target credentials, configured Entra/PostgreSQL, migration evidence, and rollback authority.
