# Cycle 25 — bounded therapy feed

## Baseline risk

The patient therapy endpoint loaded every therapy and every schedule in one query and returned one unbounded array. The operator chart and emergency-transfer print both assumed that array was complete, so a naive cap could silently omit clinically relevant medication. The assistant gateway repeated the same unbounded therapy read.

## Acceptance criteria

- Add a patient-scoped keyset feed with strict query keys, a 1–100 page limit, a filter-bound opaque cursor, and stable `createdAt, id` ordering.
- Bound nested schedules to the write invariant of 32 and report legacy corruption explicitly instead of truncating it.
- Keep the compatibility endpoint bounded and return an explicit error when an array response could not be complete.
- Add database indexes matching the patient keyset and nested schedule order.
- Load one therapy page in the operator chart, render 25 rows at a time, expose explicit load-more state, deduplicate appended rows, and reject stale patient responses.
- Return exact active/inactive totals, mark anomaly checks as partial while pages remain, and keep local table filters disabled until the full dataset is loaded.
- Load every active-therapy page for emergency transfer and prevent printing during loading or after any page failure.
- Bound and project assistant therapy context and propagate `truncated` when more rows exist.
- Preserve operator authentication, patient scope, private/no-store caching, and existing therapy mutation contracts.

## Safety envelope

- No therapy or schedule data is rewritten by the migration.
- No consumer may treat a partial response as a complete emergency medication list.
- Invalid limits, filters, cursor shapes, or cursor/filter mismatches fail with HTTP 400.
- The compatibility endpoint never silently clips rows.
