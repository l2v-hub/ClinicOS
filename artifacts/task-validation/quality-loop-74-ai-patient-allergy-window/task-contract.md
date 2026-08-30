# Cycle 74 task contract — bound per-patient AI allergy reads

## Objective

Stop the assistant's per-patient allergy getter from transferring and deserializing the complete chart JSON before applying its existing 100-row safety bound.

## Acceptance criteria

- PostgreSQL expands only an array-valued allergy member and looks ahead at no more than 101 raw items.
- Only the five existing allergy fields leave PostgreSQL, each bounded to 240 characters.
- Result data and source references remain aligned and never exceed 100.
- Raw-item order, malformed-item skipping, clipping and `truncated` semantics remain equivalent to `boundAllergies`.
- Non-array/missing chart allergy JSON produces an empty non-truncated result.
- Tenant/patient ACL and audit behavior remain unchanged.
- Focused tests, backend build/lint, diff checks and independent reviews pass.

## Safety envelope

- No schema, frontend, authentication, write-path or response-shape change.
- Do not alter cross-patient search behavior.
- Do not stage unrelated local changes.
