# Explicit scope amendment 3

Batch: bug-batch-447
Baseline: a516d42e31f6674c39c1d130c9706cd80a7ab4c6
Implementation round: 1 of 4, unchanged.

Issue: #447

Additional exact test files:
- frontend/src/lib/__tests__/patientChartNavigation.test.ts
- frontend/src/lib/__tests__/patientDetailWorkspace.test.ts

Reason and verification constraints:
Issue447 intentionally replaces Panoramica label and passive NEWS2-first tiles with Oggi actual doses/diary/vitals. Update only obsolete label/layout implementation assertions in the two existing tests; preserve every legacy/deep-link destination, unique section membership, role capabilities, keyboard tabs, exact therapy navigation, persistent modules, clinical-source/value and responsive behavior. Add actual behavior assertions for Today dose/diary/vitals rather than source-only oracles. No broad test removal, skips or weaker authorization checks.

All four original frozen packet hashes are preserved. This amendment changes no clinical decision and grants no approval or release.
