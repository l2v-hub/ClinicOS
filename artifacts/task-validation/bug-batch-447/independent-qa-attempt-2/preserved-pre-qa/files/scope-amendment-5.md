# Explicit scope amendment 5

Batch: bug-batch-447
Baseline: a516d42e31f6674c39c1d130c9706cd80a7ab4c6
Implementation round: 1 of 4, unchanged.

Issue: #452

Additional exact test files:
- frontend/src/lib/__tests__/patientListIdentityGuard.test.ts

Reason and verification constraints:
Issue452 deliberately introduces bed-first location and hides wholly empty optional regime/NEWS columns; a fixed five-column source assertion no longer matches the required behavior. Preserve all tax-code identity/no-medical-record-number fallback, accessible same-name disambiguation, actions, valid values and intake-derived-CF provenance assertions. Replace only obsolete roster column and brittle source-length assumptions with actual rendered mixed/empty roster behavior: assigned bed first, supplied CF visible/accessibly retained, optional globally empty columns hidden, real regime/NEWS values retained. No broad deletion, skips or relaxing identity safeguards.

All four original frozen packet hashes are preserved. This amendment changes no clinical decision and grants no approval or release.
