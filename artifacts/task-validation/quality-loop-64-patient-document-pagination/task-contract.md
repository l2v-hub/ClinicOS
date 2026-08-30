# Cycle 64 task contract — patient document pagination

## Objective

Bound patient-document metadata reads and DOM growth for charts with large document histories while preserving exact source-document navigation.

## Acceptance criteria

- The metadata endpoint defaults to 50 rows, caps requests at 100 and uses `take + 1` keyset pagination ordered by `(sortOrder,id)`.
- The opaque cursor is versioned and bound to its patient; malformed and cross-patient cursors return 400.
- Metadata pages never select `dataBase64`; exact `sourceFileName` lookup is bounded and remains behind the existing patient-document access gate.
- Esami/Consulenze, imported documents and source preview use one shared abortable/sequence-safe page loader with deduplicated append.
- Each consumer distinguishes initial failure, valid empty data and partial/load-more failure, with retry and “Carica altri”.
- Source-target lookup never walks every page to find a cited filename.
- Focused/full tests, backend/frontend builds, cycle-scoped lint and independent security/UX reviews pass.

## Safety envelope

- No schema migration, document-byte storage, upload, content endpoint, RBAC or response metadata-field changes.
- Do not stage unrelated local changes.
