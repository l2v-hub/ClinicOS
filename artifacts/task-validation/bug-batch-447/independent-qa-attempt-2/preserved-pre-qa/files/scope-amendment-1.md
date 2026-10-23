# Explicit scope amendment 1

Batch: bug-batch-447
Baseline: a516d42e31f6674c39c1d130c9706cd80a7ab4c6
Implementation round: 1 of 4, unchanged.

Issue: #456

Additional exact test files:
- frontend/src/components/admin/__tests__/admin-dashboard-consistency.test.ts
- frontend/src/lib/__tests__/consegneReadModelGuard.test.ts

Reason and verification constraints:
Issue456 deliberately replaces the legacy passive KPI first screen and stale overview urgency source. Existing source-structure tests explicitly require those removed implementations. Change only obsolete implementation-shape assertions and add actual authoritative queue/render behavior assertions. Preserve pagination, count completeness, source error/retry, permissions, room recovery, exact patient/deep-link and unrelated operator guards; no skip, weaker oracle or blanket removal. New browser must prove first-screen action ordering/no passive KPI, diary+handover acknowledgements and no tomorrow doses.

All four original frozen packet hashes are preserved. This amendment changes no clinical decision and grants no approval or release.
