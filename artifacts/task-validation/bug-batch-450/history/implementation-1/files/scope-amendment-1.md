# Explicit scope amendment 1

Batch: bug-batch-450
Baseline: a516d42e31f6674c39c1d130c9706cd80a7ab4c6
Implementation round: 1 of 4, unchanged.

Issues: #472, #473

Additional exact test files:
- frontend/src/components/shared/intake/IntakeDocumentPanel.tsx

Reason and verification constraints:
Issues472/473 require the original document remain accessible while editing at tablet/phone widths. Existing IntakeDocumentPanel forces a modal overlay/focus trap below1180px. Add optional persistent-inline presentation for the import caller, preserving existing manual/default overlay behavior, page cache authorization/cleanup, current-source isolation and accessible keyboard navigation. Prove simultaneous source and editable fields at responsive widths with real browser value/canvas assertions, not CSS/source-only checks.

All four original frozen packet hashes are preserved. This amendment changes no clinical decision and grants no approval or release.
