# Cycle 71 task contract — bound per-patient AI vital reads

## Objective

Prevent the assistant's per-patient vital-sign path from loading a complete clinical chart blob or creating unbounded result and source-reference arrays.

## Acceptance criteria

- PostgreSQL extracts only the vital array and applies label, numeric and date filters before `LIMIT`.
- Query look-ahead is 101; service data and source references never exceed 100 and remain index-aligned.
- Projected vital fields have explicit text bounds; clipping or a sentinel row sets `truncated: true`.
- Malformed/non-array chart JSON produces an empty bounded result.
- Query-plan `step.limit` is respected and truncation propagates through the query engine and assistant dispatch.
- Existing tenant/patient authorization, direct internal gateway response and audit behavior remain unchanged.
- Focused tests, backend build/lint, diff checks and independent security/performance reviews pass.

## Safety envelope

- No schema, frontend, write-path or cross-patient-vital change.
- Preserve existing `VitalItem` fields and source-reference contract.
- Do not stage unrelated local changes.
