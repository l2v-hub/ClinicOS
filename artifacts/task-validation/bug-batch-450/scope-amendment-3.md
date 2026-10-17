# Explicit scope amendment 3

Batch: bug-batch-450
Baseline: a516d42e31f6674c39c1d130c9706cd80a7ab4c6
Implementation round: 1 of 4, unchanged.

Issue: #475

Additional exact test files:
- frontend/src/lib/__tests__/pdfPreviewResources.test.ts

Reason and verification constraints:
Issue475 reproduced a real Vite-development PDF decoder asset URL mismatch: resource helper derives node_modules decoder directory while the pinned asset plugin serves assets/pdfjs version directory. Extend the existing helper behavior tests for the real development worker URL, pinned decoder files, production and non-root base paths. Keep version/path/asset authorization constraints and prove scanned JPX canvas rendering in a real browser; never replace missing asset with blank or skip decoding. Existing app helper and asset configuration already within original scope.

All four original frozen packet hashes are preserved. This amendment changes no clinical decision and grants no approval or release.
