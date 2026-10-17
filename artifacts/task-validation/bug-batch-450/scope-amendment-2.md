# Explicit scope amendment 2

Batch: bug-batch-450
Baseline: a516d42e31f6674c39c1d130c9706cd80a7ab4c6
Implementation round: 1 of 4, unchanged.

Issues: #472, #476

Additional exact test files:
- frontend/src/components/shared/sections/__tests__/import-source-decisions.test.ts

Reason and verification constraints:
Issues472/476 preserve review edits before leaving. Existing behavior-test custom React renderer lacks useEffect lifecycle now required by the real review save-handler registration. Extend the fixture to run lifecycle registration/cleanup realistically and add behavior assertions proving edited values persist through save/leave/resume. Preserve source immutability/conflict/defer/explicit decision and cancellation/error assertions; do not replace behavior tests with source matching, skip assertions or no-op the lifecycle to hide a defect.

All four original frozen packet hashes are preserved. This amendment changes no clinical decision and grants no approval or release.
