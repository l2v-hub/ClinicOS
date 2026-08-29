# Cycle 45 task contract — public medication abuse guard

## Objective

Bound CPU, database and memory cost on the unauthenticated AIFA medication lookup surface without making public open-data reads require an operator session.

## Acceptance criteria

- `/farmaci/cerca` and `/farmaci/dosaggi` reject inputs longer than 80 characters before service work.
- Both endpoints share a 60 requests/minute per-IP budget and return `429` with `Retry-After`.
- A separate 600 requests/minute process budget bounds work when callers rotate IPs.
- Rate-limit identity storage has periodic expiry and an LRU-bounded cardinality.
- Production trusts exactly one Railway proxy hop by default, with an explicit bounded override.
- Existing read-public/write-privileged authorization behavior remains unchanged.
- Focused tests, targeted lint, backend build and independent reviews pass without P0/P1.

## Safety envelope

- No patient data, medication result shape, schema or write behavior changes.
- Keep limits configurable through positive integer environment variables.
- Edge/distributed throttling remains a recommended deployment layer for multi-instance operation.
- Do not stage unrelated local changes.
