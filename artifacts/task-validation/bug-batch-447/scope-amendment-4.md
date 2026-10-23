# Explicit scope amendment 4

Batch: bug-batch-447
Baseline: a516d42e31f6674c39c1d130c9706cd80a7ab4c6
Implementation round: 1 of 4, unchanged.

Issues: #451, #452, #457

Additional exact test files:
- frontend/src/components/operator/__tests__/parameterReadingForm417.test.ts
- frontend/src/components/operator/__tests__/rosterOrderUi.test.ts
- frontend/src/lib/__tests__/clinicalHistory.test.ts
- frontend/src/lib/__tests__/therapyPages.test.ts

Reason and verification constraints:
Issues451/452 intentionally remove no-previous-value prose and desktop keypad and hide globally empty regime columns; retain exact11fieldorder/fullACVPU/rawkeyboard/noprefill/uncertainrequest identity and actual regime ordering. Issue457 requires current patient identity for print context and complete loading/error print gates now delegated to emergencyTransferContext. Add missing synthetic patient identity to existing print fixture and move implementation-shape assertions to the real helper while preserving every existing source/diagnosis-once/completepagination/denied/error oracle. therapyPages.test.ts overlaps batch432: do not edit it until root explicitly integrates stable432 changes, then preserve all added negative pagination regressions and reverify both groups. No source scope expansion or clinical policy decision.

All four original frozen packet hashes are preserved. This amendment changes no clinical decision and grants no approval or release.
