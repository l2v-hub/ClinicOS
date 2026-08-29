# Cycle 24 — therapy integrity and narrative resilience

## Baseline risk

A therapy update containing `schedules: null`, a non-array value, or only malformed entries was normalized to an empty list and then deleted every existing schedule. Impossible times such as `25:99`, oversized schedule arrays, invalid therapy date ranges, malformed medication-history limits, and invalid calendar dates were not rejected consistently. In the narrative UI, a stale request could replace the newly selected patient's sections, while failed saves closed the editor without actionable feedback.

## Acceptance criteria

- Treat only an explicit empty `schedules: []` as a request to clear schedules.
- Reject non-array/malformed schedules, impossible times, invalid quantities or units, and more than 32 schedule entries before any delete/write.
- Require real ISO calendar dates and reject `dataFine < dataInizio` on create and update.
- Keep the previous therapy and schedules unchanged after a rejected update.
- Parse medication-history date and limit strictly, default to 100, clamp at 500, and use deterministic `date, createdAt, id` ordering.
- Project only narrative fields consumed by the DTO.
- Abort stale narrative reads and apply results only for the latest request sequence.
- Surface load/save failures with an accessible retry message and preserve the unsaved draft.
- Preserve existing therapy and narrative response contracts.

## Safety envelope

- No schema migration or existing clinical-row rewrite.
- Validation executes before the schedule replacement transaction.
- Existing valid schedule normalization and explicit `[]` clearing remain supported.
- Therapy list pagination is intentionally deferred because its current consumers require a coordinated contract change; this cycle does not silently hide rows.
