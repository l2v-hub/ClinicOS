# Cycle 75 task contract — bound clinical-section search excerpts

## Objective

Prevent direct and cross-patient clinical-section searches from transferring complete narrative text when only a source excerpt is returned to the assistant.

## Acceptance criteria

- `searchClinicalSections` reuses the centered PostgreSQL excerpt projection validated by correlation.
- Complete reviewed/original text remains inside PostgreSQL for full-text matching and is not selected into Node.
- Matches anywhere in the narrative remain discoverable; excerpt and source exact text remain identical.
- Row limit, ordering, ACL, patient/section filters and source IDs remain unchanged.
- Per-match truncation is explicit and assistant dispatch aggregates it for direct and cross-patient tools.
- Existing correlation behavior and boundary fix remain covered.
- Focused tests, backend build/lint, diff checks and independent reviews pass.

## Safety envelope

- No schema, frontend, auth, write-path or search-limit change.
- Preserve existing data fields and add only optional truncation metadata.
- Do not stage unrelated local changes.
